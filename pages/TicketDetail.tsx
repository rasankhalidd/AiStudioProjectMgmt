
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketById, updateTicketStatus, addInternalNote, updateTicketAi } from '../services/ticketService';
import { generateAdminTriage, generateTroubleshooting, generateClientResponse, generateEmailDraft } from '../services/geminiService';
import { Ticket, TicketStatus, UserRole, TicketPriority, AiEmailDraft } from '../types';
import { useAuth } from '../App';
import { ArrowLeft, User, Calendar, Monitor, Tag, Bot, Send, Loader2, FileText, Lightbulb, BrainCircuit, CheckSquare, Terminal, MessageCircle, AlertTriangle, Clock, Mail } from 'lucide-react';

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<'triage' | 'troubleshoot' | 'client'>('triage');
  
  // Email Draft State
  const [emailDraft, setEmailDraft] = useState<AiEmailDraft | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (id) fetchTicket(id);
  }, [id]);

  const fetchTicket = async (ticketId: string) => {
    setLoading(true);
    const data = await getTicketById(ticketId);
    setTicket(data || null);
    setLoading(false);
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  // Auto-generate AI for admins if missing
  useEffect(() => {
    if (isAdmin && ticket && !generatingAi && !loading) {
        if (!ticket.aiTriage && !ticket.aiTroubleshooting) {
            handleGenerateAi();
        }
    }
  }, [ticket?.id, isAdmin, ticket?.aiTriage]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (ticket) {
      await updateTicketStatus(ticket.id, newStatus);
      fetchTicket(ticket.id);
    }
  };

  const handleAddNote = async () => {
    if (ticket && note.trim()) {
      await addInternalNote(ticket.id, note);
      setNote('');
      fetchTicket(ticket.id);
    }
  };

  const handleGenerateAi = async () => {
    if (!ticket) return;
    setGeneratingAi(true);
    
    try {
        const [triage, troubleshoot, client] = await Promise.all([
            ticket.aiTriage ? Promise.resolve(ticket.aiTriage) : generateAdminTriage(ticket),
            ticket.aiTroubleshooting ? Promise.resolve(ticket.aiTroubleshooting) : generateTroubleshooting(ticket),
            ticket.aiClientResponse ? Promise.resolve(ticket.aiClientResponse) : generateClientResponse(ticket)
        ]);
        
        await updateTicketAi(ticket.id, { 
            aiTriage: triage, 
            aiTroubleshooting: troubleshoot,
            aiClientResponse: client
        });
        fetchTicket(ticket.id);
    } catch (err) {
        console.error("Failed to generate AI content", err);
    } finally {
        setGeneratingAi(false);
    }
  };

  const handleGenerateEmail = async () => {
      if (!ticket) return;
      setGeneratingEmail(true);
      setEmailDraft(null);
      setShowEmailModal(true);
      
      try {
          // Detect event type based on status (simple logic for demo)
          const eventType = ticket.status === TicketStatus.RESOLVED ? 'resolved' : 'created';
          const draft = await generateEmailDraft(ticket, eventType);
          setEmailDraft(draft);
      } catch (err) {
          console.error(err);
      } finally {
          setGeneratingEmail(false);
      }
  }

  if (loading) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin text-auis-600" /></div>;
  if (!ticket) return <div className="p-8 text-center text-red-600">Ticket not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{ticket.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === TicketStatus.RESOLVED ? 'bg-green-100 text-green-800' : 
                        ticket.status === TicketStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {ticket.status}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{ticket.subject}</h1>
            </div>
            
            {isAdmin && (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleGenerateEmail}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Generate Email Draft"
                    >
                        <Mail className="w-4 h-4" />
                        <span className="hidden sm:inline">Email Draft</span>
                    </button>

                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                        <select 
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                            className="text-sm border-gray-300 rounded-md focus:ring-auis-500 focus:border-auis-500 bg-white"
                        >
                            <option value={TicketStatus.PENDING}>Pending</option>
                            <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
                            <option value={TicketStatus.RESOLVED}>Resolved</option>
                        </select>
                    </div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Reporter</span>
                    <span className="font-medium">{ticket.reporterName}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Category</span>
                    <span className="font-medium">{ticket.category}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
                <Monitor className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Device</span>
                    <span className="font-medium">{ticket.deviceType}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Created</span>
                    <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                </div>
                {!ticket.consentAiSearch && (
                    <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs border border-amber-100">
                        <AlertTriangle className="w-4 h-4" />
                        <span>AI Consent not given. PII Redaction enabled for AI services.</span>
                    </div>
                )}
            </div>

            {/* AI Operations Center */}
            {(isAdmin || ticket.aiTriage) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-bold text-gray-800">AI Operations Center</h2>
                        </div>
                        {generatingAi ? (
                             <span className="flex items-center gap-2 text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full">
                                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                             </span>
                        ) : !ticket.aiTriage && (
                            <button onClick={handleGenerateAi} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700">
                                Start Analysis
                            </button>
                        )}
                    </div>

                    {ticket.aiTriage ? (
                        <div>
                             {/* Tabs */}
                            <div className="flex border-b border-gray-200">
                                <button 
                                    onClick={() => setActiveAiTab('triage')}
                                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeAiTab === 'triage' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <CheckSquare className="w-4 h-4" /> Triage & Summary
                                </button>
                                <button 
                                    onClick={() => setActiveAiTab('troubleshoot')}
                                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeAiTab === 'troubleshoot' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Terminal className="w-4 h-4" /> Technical Specs
                                </button>
                                <button 
                                    onClick={() => setActiveAiTab('client')}
                                    className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeAiTab === 'client' ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MessageCircle className="w-4 h-4" /> Client View
                                </button>
                            </div>

                            <div className="p-6 min-h-[300px]">
                                {/* TRIAGE TAB */}
                                {activeAiTab === 'triage' && ticket.aiTriage && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-2">Technical Summary</h4>
                                            <p className="text-indigo-900 text-sm leading-relaxed">{ticket.aiTriage.adminSummary}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Suggested Priority</span>
                                                <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                                                    ticket.aiTriage.prioritySuggestion === TicketPriority.URGENT ? 'bg-red-100 text-red-700' :
                                                    ticket.aiTriage.prioritySuggestion === TicketPriority.HIGH ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {ticket.aiTriage.prioritySuggestion}
                                                </span>
                                            </div>
                                            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Estimated ETA</span>
                                                <div className="flex items-center gap-2 text-gray-800 font-bold text-lg">
                                                    <Clock className="w-5 h-5 text-gray-400" />
                                                    {ticket.aiTriage.etaBand}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <CheckSquare className="w-4 h-4 text-indigo-600" /> Triage Checklist
                                            </h4>
                                            <ul className="space-y-2">
                                                {(ticket.aiTriage.triageSteps || []).map((step, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 text-sm text-gray-700 border border-transparent hover:border-gray-100">
                                                        <input type="checkbox" className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* TROUBLESHOOTING TAB */}
                                {activeAiTab === 'troubleshoot' && ticket.aiTroubleshooting && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 mb-3">Root Cause Hypotheses</h4>
                                            <div className="space-y-3">
                                                {(ticket.aiTroubleshooting.hypotheses || []).map((h, i) => (
                                                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                                                        <div className="flex justify-between text-sm font-medium mb-1">
                                                            <span className="text-gray-800">{h.rootCause}</span>
                                                            <span className="text-gray-500">{Math.round(h.confidence * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${h.confidence * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-gray-600" /> Suggested Commands & Checks
                                            </h4>
                                            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-3">
                                                {(ticket.aiTroubleshooting.commandsOrChecks || []).map((cmd, i) => (
                                                    <div key={i} className="border-b border-gray-700 last:border-0 pb-3 last:pb-0">
                                                        <div className="text-emerald-400 font-bold mb-1">$ {cmd.commandOrCheck}</div>
                                                        <div className="text-gray-500"># {cmd.why}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CLIENT TAB */}
                                {activeAiTab === 'client' && ticket.aiClientResponse && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center">
                                            <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                                            <h4 className="text-blue-900 font-bold mb-2">Proposed Client Response</h4>
                                            <p className="text-blue-800 text-sm italic">"{ticket.aiClientResponse.clientSummary}"</p>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 mb-3">Action Items for User</h4>
                                            <ul className="space-y-2">
                                                {(ticket.aiClientResponse.clientActions || []).map((action, i) => (
                                                    <li key={i} className="flex items-start gap-3 bg-white p-3 border border-gray-200 rounded-lg text-sm text-gray-700">
                                                        <div className="mt-0.5 bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {i + 1}
                                                        </div>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400 italic">
                            Analysis pending...
                        </div>
                    )}
                </div>
            )}

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Attachments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {ticket.attachments.map((file: any) => (
                            <div key={file.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                <FileText className="w-8 h-8 text-gray-400 mr-3 group-hover:text-auis-600" />
                                <div className="overflow-hidden">
                                    <div className="text-sm font-medium truncate text-gray-700 group-hover:text-gray-900">{file.name}</div>
                                    <div className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            
            {/* AI Classification Card */}
            {ticket.aiPredictedCategory && (
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-md p-5 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <BrainCircuit className="w-5 h-5 text-indigo-200" />
                        <span className="font-bold text-sm uppercase tracking-wide opacity-90">AI Classification</span>
                    </div>
                    
                    <div className="text-2xl font-bold mb-1">{ticket.aiPredictedCategory}</div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 bg-white/20 rounded-full h-1.5">
                            <div className="bg-white h-1.5 rounded-full" style={{ width: `${(ticket.aiCategoryConfidence || 0) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-mono">{Math.round((ticket.aiCategoryConfidence || 0) * 100)}%</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {ticket.aiKeywords?.map((kw, i) => (
                            <span key={i} className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/20">
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Internal Notes */}
            {isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        Internal Notes
                    </h3>
                    <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
                        {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                        ticket.internalNotes.map((n, i) => (
                            <div key={i} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-gray-800 shadow-sm">
                                {n}
                            </div>
                        ))
                        ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4">No notes yet.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add note..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-auis-500 focus:ring-auis-500 border p-2 text-sm bg-gray-50"
                        />
                        <button 
                        onClick={handleAddNote}
                        disabled={!note.trim()}
                        className="bg-gray-900 text-white p-2 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                        <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Email Draft Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-auis-600" /> AI Email Draft
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <div className="p-6">
              {generatingEmail ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-auis-600 mb-3" />
                  <p className="text-gray-500 font-medium">Generating draft based on {ticket.status} status...</p>
                </div>
              ) : emailDraft ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                    <input 
                      readOnly 
                      value={emailDraft.subject} 
                      className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-800 font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Body (HTML Preview)</label>
                    <div 
                      className="w-full bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-800 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: emailDraft.html }}
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => setShowEmailModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm font-medium hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button 
                      className="px-4 py-2 bg-auis-600 text-white rounded text-sm font-medium hover:bg-auis-700 flex items-center gap-2"
                      onClick={() => { alert('In a real app, this would send via SendGrid!'); setShowEmailModal(false); }}
                    >
                      <Send className="w-4 h-4" /> Send Email
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-red-500">Failed to generate draft.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
