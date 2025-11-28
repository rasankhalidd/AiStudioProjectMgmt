
import { GoogleGenAI } from "@google/genai";
import { Ticket, AiTriage, AiTroubleshooting, AiClientResponse, TicketPriority, AiEmailDraft } from "../types";
import { CATEGORIES } from "../constants";

// --- API Key Configuration ---
// This robustly checks for the API key in both Cloud (process.env) and Local (import.meta.env) environments.
const getApiKey = () => {
  let key = '';

  // 1. Try Local Vite Environment (Must start with VITE_)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    key = import.meta.env.VITE_API_KEY;
    console.log("[Gemini Service] Loading key from VITE_API_KEY");
  }
  
  // 2. Try Cloud/Node Environment
  else {
    try {
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        key = process.env.API_KEY;
        console.log("[Gemini Service] Loading key from process.env.API_KEY");
      }
    } catch (e) {
      // process is not defined, ignore
    }
  }

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
  console.error("%c[Gemini Service] CRITICAL ERROR: API Key is missing!", "color: red; font-weight: bold; font-size: 14px;");
  console.log("If running locally, ensure you have a .env file with VITE_API_KEY=... and have restarted the server.");
} else {
  console.log(`%c[Gemini Service] API Key loaded successfully (${apiKey.substring(0, 4)}...)`, "color: green; font-weight: bold;");
}

// Initialize with the found key (or a dummy to prevent immediate crash, though calls will fail)
const ai = new GoogleGenAI({ apiKey: apiKey || 'MISSING_KEY' });

// --- Utilities ---

// Simple in-memory cache to save costs and latency
const cache = new Map<string, any>();

const getCacheKey = (ticketId: string, operation: string) => `${ticketId}:${operation}`;

// PII Redaction
const redactPII = (text: string): string => {
  // Redact Emails
  let redacted = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // Redact Phone Numbers (Generic patterns)
  redacted = redacted.replace(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g, '[REDACTED_PHONE]');
  return redacted;
};

// JSON Cleaner to handle Markdown code blocks from LLM
const cleanJson = (text: string): string => {
  // Remove markdown code blocks if present
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  if (match) {
    return match[1];
  }
  // If no blocks, try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
      return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
};

// --- Structured Generators ---

export const generateAdminTriage = async (ticket: Ticket): Promise<AiTriage> => {
  if (!apiKey) {
    console.warn("Attempted AI Triage without API Key");
    return {
        adminSummary: "AI Unavailable (Missing API Key)",
        prioritySuggestion: TicketPriority.MEDIUM,
        triageSteps: ["Check .env configuration"],
        etaBand: "Unknown",
        confidence: 0
    };
  }

  const cacheKey = getCacheKey(ticket.id, 'triage');
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const defaultTriage: AiTriage = {
    adminSummary: "AI unavailable.",
    prioritySuggestion: TicketPriority.MEDIUM,
    triageSteps: ["Manual triage required"],
    etaBand: "Unknown",
    confidence: 0
  };

  try {
    const description = ticket.consentAiSearch ? ticket.description : redactPII(ticket.description);
    
    const prompt = `
      You are an IT helpdesk assistant. Produce a concise technical summary and triage plan.
      
      Input:
      Subject: "${ticket.subject}"
      Description: "${description}"
      Category: "${ticket.category}"
      Device: "${ticket.deviceType}"

      Instructions:
      1. Summary: 2-3 sentences technical summary.
      2. Priority: Suggest [Low, Medium, High, Urgent].
      3. Triage Steps: 3-5 imperative steps.
      4. ETA: e.g. "1-4 hours".
      5. Confidence: 0.0-1.0.

      Return strictly JSON:
      {
        "adminSummary": "string",
        "prioritySuggestion": "string",
        "triageSteps": ["string"],
        "etaBand": "string",
        "confidence": number
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.text || "{}";
    const cleanedJson = cleanJson(rawText);
    const parsed = JSON.parse(cleanedJson);
    
    // Deep merge with default to ensure arrays exist
    const result = { ...defaultTriage, ...parsed };
    // Safety check for arrays
    if (!Array.isArray(result.triageSteps)) result.triageSteps = [];

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Triage Error", error);
    return defaultTriage;
  }
};

export const generateTroubleshooting = async (ticket: Ticket): Promise<AiTroubleshooting> => {
  if (!apiKey) return {
      hypotheses: [],
      commandsOrChecks: [],
      logsToRequest: []
  };

  const cacheKey = getCacheKey(ticket.id, 'troubleshoot');
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const defaultTroubleshooting: AiTroubleshooting = {
      hypotheses: [{ rootCause: "Manual investigation needed", confidence: 1 }],
      commandsOrChecks: [],
      logsToRequest: []
  };

  try {
    const description = ticket.consentAiSearch ? ticket.description : redactPII(ticket.description);

    const prompt = `
      You are a technical expert. Provide detailed troubleshooting steps.
      
      Input:
      Issue: "${ticket.subject}" - "${description}"
      Category: "${ticket.category}"

      Return strictly JSON:
      {
        "hypotheses": [{"rootCause": "string", "confidence": number}],
        "commandsOrChecks": [{"commandOrCheck": "string", "why": "string"}],
        "logsToRequest": ["string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.text || "{}";
    const cleanedJson = cleanJson(rawText);
    const parsed = JSON.parse(cleanedJson);

    const result = { ...defaultTroubleshooting, ...parsed };
    // Safety checks
    if (!Array.isArray(result.hypotheses)) result.hypotheses = [];
    if (!Array.isArray(result.commandsOrChecks)) result.commandsOrChecks = [];
    if (!Array.isArray(result.logsToRequest)) result.logsToRequest = [];

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    return defaultTroubleshooting;
  }
};

export const generateClientResponse = async (ticket: Ticket): Promise<AiClientResponse> => {
  if (!apiKey) return {
      clientSummary: "We have received your ticket.",
      clientActions: []
  };

  const cacheKey = getCacheKey(ticket.id, 'client');
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const defaultClient: AiClientResponse = {
      clientSummary: "We have received your ticket and are reviewing it.",
      clientActions: ["Please wait for an agent to contact you."]
  };

  try {
    // ALWAYS redact for client facing unless explicit override, but here strictly relying on consent flag
    const description = ticket.consentAiSearch ? ticket.description : redactPII(ticket.description);

    const prompt = `
      You are a friendly customer support agent. Write a response to the user.
      
      Input:
      User: "${ticket.reporterName}"
      Issue: "${description}"

      Instructions:
      1. clientSummary: Friendly 1-2 sentence acknowledgement.
      2. clientActions: 2-3 simple non-technical things they can do or expect.

      Return strictly JSON:
      {
        "clientSummary": "string",
        "clientActions": ["string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.text || "{}";
    const cleanedJson = cleanJson(rawText);
    const parsed = JSON.parse(cleanedJson);

    const result = { ...defaultClient, ...parsed };
    if (!Array.isArray(result.clientActions)) result.clientActions = [];

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    return defaultClient;
  }
};

export const generateEmailDraft = async (ticket: Ticket, eventType: 'created' | 'resolved'): Promise<AiEmailDraft> => {
  if (!apiKey) return {
      subject: `Ticket ${ticket.id}`,
      plain_text: "API Key missing. Please configure .env",
      html: "<p>API Key missing. Please configure .env</p>"
  };

  // No cache for emails usually as they are event specific, but could key by status
  const cacheKey = getCacheKey(ticket.id, `email_${eventType}`);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const description = ticket.consentAiSearch ? ticket.description : redactPII(ticket.description);
    const clientSummary = ticket.aiClientResponse?.clientSummary || "";

    const prompt = `
      You are a professional IT helpdesk email composer.
      Event Type: "${eventType}" (created or resolved)
      Ticket ID: "${ticket.id}"
      Subject: "${ticket.subject}"
      Reporter: "${ticket.reporterName}"
      Status: "${ticket.status}"
      Description: "${description}"
      AI Summary: "${clientSummary}"

      Instructions:
      1. If created: Confirm receipt, thank user, list next steps.
      2. If resolved: Confirm resolution, thank user.
      3. HTML should be safe (no scripts), simple styling.

      Return strictly JSON:
      {
        "subject": "string",
        "plain_text": "string",
        "html": "string (sanitized HTML)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.text || "{}";
    const cleanedJson = cleanJson(rawText);
    const parsed = JSON.parse(cleanedJson);

    // Basic validation
    const result: AiEmailDraft = {
        subject: parsed.subject || `[AUIS Help Desk] Update on Ticket ${ticket.id}`,
        plain_text: parsed.plain_text || "Please check your ticket dashboard for updates.",
        html: parsed.html || "<p>Please check your ticket dashboard for updates.</p>"
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
      console.error("Email Gen Error", error);
      return {
          subject: `Ticket ${ticket.id} Update`,
          plain_text: "Error generating email preview.",
          html: "<p>Error generating email preview.</p>"
      };
  }
}

// --- Original Functions (Refined) ---

export const suggestSolution = async (description: string, category: string): Promise<string> => {
  if (!apiKey) return "AI Suggestion unavailable (No API Key detected).";

  try {
    // Redact by default for pre-submission checks to be safe
    const safeDesc = redactPII(description);
    
    const prompt = `
      User is reporting an IT issue. Provide a short, bulleted list (max 3 items) of self-help steps they can try before submitting a ticket.
      Category: ${category}
      Issue Description: ${safeDesc}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text || "No suggestions available.";

  } catch (error) {
    console.error("Gemini Suggestion Error", error);
    return "Unable to retrieve suggestions at this time.";
  }
}

export const generateDashboardReport = async (metrics: any, reportType: 'executive' | 'performance' | 'trends' = 'executive', reportPeriod: string = 'Monthly'): Promise<{ title: string, executiveSummary: string, keyInsights: string[] }> => {
  if (!apiKey) return {
      title: "Error",
      executiveSummary: "API Key missing. Cannot generate report. Check browser console for details.",
      keyInsights: []
  };

  try {
    let instructions = "";
    
    // Specialize instructions based on report type
    if (reportType === 'performance') {
        instructions = `
            Focus primarily on operational efficiency metrics.
            - Analyze 'avgResolutionHours' (${metrics.avgResolutionHours} hours).
            - Compare 'resolvedCount' vs 'pendingCount'.
            - Discuss SLA adherence and the handling of High/Urgent priority tickets.
            - Provide recommendations for improving response times.
        `;
    } else if (reportType === 'trends') {
        instructions = `
            Focus primarily on patterns and volume over time.
            - Analyze the 'dailyVolume' data (if available) to identify busiest days or recent spikes.
            - Correlate volume with 'categoryBreakdown' to identify recurring systemic issues (e.g. Wi-Fi outages).
            - Discuss if ticket volume is increasing or decreasing compared to typical levels.
        `;
    } else {
        // Executive (Default)
        instructions = `
            Provide a high-level strategic overview of IT Support health.
            - Summarize the types of issues reported based on 'categoryBreakdown'.
            - Mention any critical blocks based on 'highPriorityCount'.
            - Give a general sentiment on the stability of the IT infrastructure.
        `;
    }

    const prompt = `
      You are a specialized IT Reporting Assistant. Generate a "${reportPeriod} ${reportType.toUpperCase()}" report based on the provided metrics.
      
      Input Metrics:
      ${JSON.stringify(metrics, null, 2)}

      Specific Goal: ${instructions}

      Instructions:
      1. "title": Professional title.
      2. "executiveSummary": A comprehensive narrative (approx 4-5 sentences) following the specific goal above.
      3. "keyInsights": Exactly 3 actionable bullet points relevant to the ${reportType} analysis.
      
      Return valid JSON schema:
      {
        "title": "string",
        "executiveSummary": "string",
        "keyInsights": ["string", "string", "string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanedJson = cleanJson(text);
    const parsed = JSON.parse(cleanedJson);
    
    const result = {
        title: parsed.title || "IT Support Report",
        executiveSummary: parsed.executiveSummary || "Summary unavailable.",
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : []
    };

    return result;

  } catch (error) {
    console.error("Gemini Report Error", error);
    return {
      title: "Dashboard Analysis",
      executiveSummary: "Unable to generate AI report at this time.",
      keyInsights: ["Analyze metrics manually."]
    };
  }
}

export const predictTicketCategory = async (subject: string, description: string): Promise<{ predictedCategory: string, confidence: number, keywords: string[] }> => {
  if (!apiKey) return {
      predictedCategory: "Other / General IT",
      confidence: 0.0,
      keywords: ["api_missing"]
  };

  try {
    // Redact by default for prediction
    const safeDesc = redactPII(description);
    const categoriesList = CATEGORIES.join(', ');
    
    const prompt = `
      Classify this IT ticket.
      Subject: "${subject}"
      Description: "${safeDesc}"
      Allowed Categories: [${categoriesList}]

      Return valid JSON:
      {
        "predictedCategory": "string",
        "confidence": number,
        "keywords": ["string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanedJson = cleanJson(text);
    const parsed = JSON.parse(cleanedJson);
    
    return parsed;
  } catch (error) {
    console.error("Gemini Classification Error", error);
    return {
      predictedCategory: "Other / General IT",
      confidence: 0.0,
      keywords: ["manual_review"]
    };
  }
}
