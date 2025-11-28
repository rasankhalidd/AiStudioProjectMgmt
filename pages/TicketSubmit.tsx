
import React, { useState } from 'react';
import { useAuth } from '../App';
import { CATEGORIES, PRIORITIES, DEVICE_TYPES } from '../constants';
import { TicketCategory, TicketPriority, DeviceType } from '../types';
import { createTicket } from '../services/ticketService';
import { suggestSolution, predictTicketCategory } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle, Loader2, Sparkles, BrainCircuit } from 'lucide-react';

const TicketSubmit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [predictedCat, setPredictedCat] = useState<{ category: string, confidence: number, keywords: string[] } | null>(null);

  const [formData, setFormData] = useState({
    reporterName: '', // Start empty to avoid "John Doe" pre-fill
    reporterEmail: '', // Start empty
    subject: '',
    description: '',
    category: TicketCategory.OTHER,
    priority: TicketPriority.MEDIUM,
    deviceType: DeviceType.PC,
    osBrowser: '',
    consentAiSearch: false,
    files: [] as File[]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: Array.from(e.target.files || []) }));
    }
  };

  const handleAiAssist = async () => {
    if (!formData.description || !formData.category) return;
    setAiLoading(true);
    setAiSuggestion(null);
    const suggestion = await suggestSolution(formData.description, formData.category);
    setAiSuggestion(suggestion);
    setAiLoading(false);
  };

  const handleAutoCategorize = async () => {
    if (!formData.description || !formData.subject) return;
    setCatLoading(true);
    setPredictedCat(null);
    const result = await predictTicketCategory(formData.subject, formData.description);
    setPredictedCat({ 
        category: result.predictedCategory, 
        confidence: result.confidence,
        keywords: result.keywords 
    });
    setCatLoading(false);
  };

  const applyCategory = () => {
    if (predictedCat) {
        setFormData(prev => ({ ...prev, category: predictedCat.category as TicketCategory }));
        setPredictedCat(null); // Clear after applying to avoid clutter
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock file upload processing
    const attachments = formData.files.map((f, i) => ({
      id: `att-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f) // In real app, this would be an S3 URL
    }));

    try {
      await createTicket({
        reporterName: formData.reporterName,
        reporterEmail: formData.reporterEmail,
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        deviceType: formData.deviceType,
        osBrowser: formData.osBrowser,
        consentAiSearch: formData.consentAiSearch,
        attachments,
        aiPredictedCategory: predictedCat?.category, // Save even if not applied
        aiCategoryConfidence: predictedCat?.confidence,
        aiKeywords: predictedCat?.keywords
      });
      navigate('/admin'); // Redirect to dashboard (or my tickets) for demo visibility
    } catch (error) {
      console.error("Failed to submit", error);
    } finally {
      setLoading(false);
    }
  };

  // Shared input class for consistency: Dark background, White text
  const inputClass = "mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white placeholder-gray-400 shadow-sm focus:border-auis-500 focus:ring-auis-500 sm:text-sm border p-2";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Support Ticket</h1>
        <p className="text-gray-500 mb-8">Please provide as much detail as possible so we can help you quickly.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reporter Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="e.g. Ali Ahmed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="reporterEmail"
                value={formData.reporterEmail}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="name@auis.edu.krd"
              />
            </div>
          </div>

          {/* Issue Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className={inputClass}
              placeholder="e.g., Cannot login to Moodle"
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Detailed Description</label>
                <button 
                    type="button" 
                    onClick={handleAiAssist}
                    disabled={aiLoading || !formData.description.length}
                    className="text-xs flex items-center gap-1 text-auis-600 hover:text-auis-700 font-medium disabled:opacity-50"
                >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Get AI Suggestions
                </button>
            </div>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
              className={inputClass}
              placeholder="Describe the issue in detail..."
            />
            
            {/* AI Suggestion Box */}
            {aiSuggestion && (
                <div className="mt-4 p-4 bg-auis-50 rounded-md border border-auis-100 animate-fadeIn">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-auis-800 mb-2">
                        <Sparkles className="w-4 h-4 text-auis-600" />
                        AI Recommendation
                    </h4>
                    <div className="text-sm text-auis-700 whitespace-pre-wrap">{aiSuggestion}</div>
                    <div className="mt-3 text-xs text-auis-600">
                        Does this solve your issue? If so, you don't need to submit a ticket!
                    </div>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                 <button
                    type="button"
                    onClick={handleAutoCategorize}
                    disabled={catLoading || !formData.description || !formData.subject}
                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                 >
                    {catLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                    Auto-detect
                 </button>
              </div>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={inputClass}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {predictedCat && (
                <div className="mt-2 text-xs bg-indigo-50 p-2 rounded border border-indigo-100 flex justify-between items-center animate-fadeIn">
                    <div>
                        <span className="text-indigo-800 font-semibold">Suggested: {predictedCat.category}</span>
                        <span className="text-indigo-500 ml-1">({Math.round(predictedCat.confidence * 100)}% confidence)</span>
                    </div>
                    {formData.category !== predictedCat.category && (
                        <button 
                            type="button" 
                            onClick={applyCategory}
                            className="text-indigo-700 underline font-medium hover:text-indigo-900"
                        >
                            Apply
                        </button>
                    )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={inputClass}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Device Type</label>
              <select
                name="deviceType"
                value={formData.deviceType}
                onChange={handleChange}
                className={inputClass}
              >
                {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">OS / Browser</label>
              <input
                type="text"
                name="osBrowser"
                value={formData.osBrowser}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Windows 11 / Chrome"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Attachments</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-auis-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-auis-600 hover:text-auis-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-auis-500">
                    <span>Upload files</span>
                    <input id="file-upload" name="files" type="file" className="sr-only" multiple onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>
            {formData.files.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Selected: {formData.files.map(f => f.name).join(', ')}
              </div>
            )}
          </div>

          {/* Consent */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="consentAiSearch"
                name="consentAiSearch"
                type="checkbox"
                checked={formData.consentAiSearch}
                onChange={handleChange}
                className="focus:ring-auis-500 h-4 w-4 text-auis-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="consentAiSearch" className="font-medium text-gray-700">AI Assistance Consent</label>
              <p className="text-gray-500">I agree to let AI tools process my ticket details to suggest solutions and summarize the issue for support staff.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-auis-600 hover:bg-auis-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auis-500 disabled:opacity-70 transition-all"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketSubmit;
