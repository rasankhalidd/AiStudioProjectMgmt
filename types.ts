
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export enum TicketStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum TicketCategory {
  LOGIN = 'Credentials / Login',
  NETWORK = 'Network & Wi-Fi',
  LMS = 'LMS (Moodle)',
  EMAIL = 'Email & Communication',
  HARDWARE = 'Hardware',
  SOFTWARE = 'Software / Applications',
  ACCESS = 'Access & Permissions',
  OTHER = 'Other / General IT'
}

export enum DeviceType {
  PC = 'PC',
  MAC = 'Mac',
  MOBILE = 'Mobile',
  TABLET = 'Tablet'
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// Structured AI Types
export interface AiTriage {
  adminSummary: string;
  prioritySuggestion: TicketPriority;
  triageSteps: string[];
  etaBand: string;
  confidence: number;
}

export interface AiTroubleshooting {
  hypotheses: { rootCause: string; confidence: number }[];
  commandsOrChecks: { commandOrCheck: string; why: string }[];
  logsToRequest: string[];
}

export interface AiClientResponse {
  clientSummary: string;
  clientActions: string[];
}

export interface AiEmailDraft {
  subject: string;
  plain_text: string;
  html: string;
}

export interface Ticket {
  id: string;
  reporterId?: string;
  reporterName: string;
  reporterEmail: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  deviceType: DeviceType;
  osBrowser: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  attachments: Attachment[];
  consentAiSearch: boolean;
  
  // Structured AI Fields
  aiTriage?: AiTriage;
  aiTroubleshooting?: AiTroubleshooting;
  aiClientResponse?: AiClientResponse;
  
  // Legacy/Simple fields (kept for backward compatibility if needed, but preferred structured)
  aiSummary?: string; 
  aiRecommendation?: string;

  aiPredictedCategory?: string;
  aiCategoryConfidence?: number;
  aiKeywords?: string[];
  internalNotes: string[];
}

export interface DashboardMetrics {
  totalTickets: number;
  pending: number;
  inProgress: number;
  resolved: number;
  avgResolutionTimeHours: number;
}
