
import React, { useEffect, useState } from 'react';
import { getTickets } from '../services/ticketService';
import { generateDashboardReport } from '../services/geminiService';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip 
} from 'recharts';
import { Download, Printer, FileText, Sparkles, Loader2, LayoutList, BarChart3, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AdminDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kanban' | 'analytics'>('kanban');
  
  // Report State
  const [reportLoading, setReportLoading] = useState(false);
  const [reportType, setReportType] = useState<'executive' | 'performance' | 'trends'>('executive');
  const [reportPeriod, setReportPeriod] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [aiReport, setAiReport] = useState<{ title: string, executiveSummary: string, keyInsights: string[] } | null>(null);
  const [reportMetrics, setReportMetrics] = useState<any>(null); // Metrics specific to the generated report
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const data = await getTickets();
    setTickets(data);
    setLoading(false);
  };

  const calculateMetrics = (dataset: Ticket[]) => {
    const total = dataset.length;
    // Calculate average resolution time
    const resolvedTickets = dataset.filter(t => t.status === TicketStatus.RESOLVED && t.resolvedAt);
    const totalResolutionTime = resolvedTickets.reduce((acc, t) => {
        return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
    }, 0);
    const avgResolutionHours = resolvedTickets.length ? (totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60)).toFixed(1) : "0";

    // Category Breakdown with Percentages
    const categoryCounts: Record<string, number> = dataset.reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
    }, {});
    
    const categoryBreakdown = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.count - a.count);

    // Priority Breakdown with Percentages
    const priorityCounts: Record<string, number> = dataset.reduce((acc: any, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
    }, {});

    const priorityBreakdown = Object.entries(priorityCounts).map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0"
    }));

    // Daily Volume Trend (Real Data)
    const dailyCounts: Record<string, number> = {};
    // Initialize last 7 days with 0 for better charts if empty
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon"
        dailyCounts[key] = 0;
    }
    
    // Aggregate real data
    dataset.forEach(t => {
        const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
        // Only count if it's recent enough to be in our chart keys, OR just accumulate all for trend report
        if (dailyCounts[dateStr] !== undefined) {
             dailyCounts[dateStr]++;
        } else {
             // For the report metrics, we might want full dates, but for the chart we use short day names
             // Let's create a separate full-date map for the AI report to be precise
        }
    });

    const dailyVolumeChart = Object.entries(dailyCounts).map(([day, count]) => ({ day, count }));

    // Full trend data for AI (YYYY-MM-DD)
    const aiTrendCounts: Record<string, number> = {};
    dataset.forEach(t => {
        const fullDate = new Date(t.createdAt).toISOString().split('T')[0];
        aiTrendCounts[fullDate] = (aiTrendCounts[fullDate] || 0) + 1;
    });

    return {
      totalTickets: total,
      pendingCount: dataset.filter(t => t.status === TicketStatus.PENDING).length,
      inProgressCount: dataset.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolvedCount: dataset.filter(t => t.status === TicketStatus.RESOLVED).length,
      highPriorityCount: dataset.filter(t => t.priority === TicketPriority.HIGH || t.priority === TicketPriority.URGENT).length,
      avgResolutionHours,
      categoryBreakdown,
      priorityBreakdown,
      dailyVolumeChart, // For UI Chart
      dailyVolume: aiTrendCounts // For AI Analysis
    };
  };

  // Default dashboard metrics (All time or default view)
  const dashboardMetrics = calculateMetrics(tickets);

  // Metrics to use for PDF Export (prefer report-specific metrics if generated, else default)
  const displayMetrics = reportMetrics || dashboardMetrics;

  const handleGenerateReport = async () => {
    setReportLoading(true);

    // Filter tickets based on period
    const now = new Date();
    const cutoff = new Date();
    if (reportPeriod === 'Weekly') cutoff.setDate(now.getDate() - 7);
    if (reportPeriod === 'Monthly') cutoff.setDate(now.getDate() - 30);
    if (reportPeriod === 'Yearly') cutoff.setFullYear(now.getFullYear() - 1);

    const filteredTickets = tickets.filter(t => new Date(t.createdAt) >= cutoff);
    const specificMetrics = calculateMetrics(filteredTickets);
    
    setReportMetrics(specificMetrics); // Save for PDF display

    const report = await generateDashboardReport(specificMetrics, reportType, reportPeriod);
    setAiReport(report);
    setReportLoading(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Subject', 'Reporter', 'Email', 'Category', 'Priority', 'Status', 'Created At', 'Resolved At'];
    const csvContent = [
        headers.join(','),
        ...tickets.map(t => [
            t.id,
            `"${t.subject.replace(/"/g, '""')}"`, // Escape quotes
            t.reporterName,
            t.reporterEmail,
            t.category,
            t.priority,
            t.status,
            new Date(t.createdAt).toLocaleDateString(),
            t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString() : ''
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auis_tickets_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    // Target the specific off-screen print template instead of the visible dashboard
    const element = document.getElementById('printable-report-template');
    if (!element) return;
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for text clarity
            logging: false,
            backgroundColor: '#ffffff',
            useCORS: true,
            windowWidth: 1200 // Ensure consistent width
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`auis_support_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error("PDF Export Failed", error);
        alert("Failed to export PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch(priority) {
      case TicketPriority.URGENT: return 'bg-red-100 text-red-800 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
      case TicketPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Chart Data Preparation (Always uses default dashboard data for UI charts)
  const categoryData = dashboardMetrics.categoryBreakdown.map((c: any) => ({ name: c.name, value: c.count }));
  const volumeData = dashboardMetrics.dailyVolumeChart; // Use real calculated volume data

  const KanbanColumn = ({ status, title, color }: { status: TicketStatus, title: string, color: string }) => {
    const colTickets = tickets.filter(t => t.status === status);
    
    return (
      <div className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col h-full break-inside-avoid">
        <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${color}`}>
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="bg-white px-2 py-1 rounded-full text-xs font-semibold text-gray-500 shadow-sm">
            {colTickets.length}
          </span>
        </div>
        
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {colTickets.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No tickets</div>
            )}
            {colTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => navigate(`/ticket/${ticket.id}`)}
                className="bg-white p-4 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-auis-300 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-gray-500">{ticket.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-auis-600">
                  {ticket.subject}
                </h4>
                <div className="flex justify-between items-center text-xs text-gray-500">
                   <span>{ticket.reporterName}</span>
                   <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-auis-600"></div></div>;
  }

  // Calculate dates for the report display
  const now = new Date();
  const startDate = new Date();
  if (reportPeriod === 'Weekly') startDate.setDate(now.getDate() - 7);
  else if (reportPeriod === 'Monthly') startDate.setDate(now.getDate() - 30);
  else startDate.setFullYear(now.getFullYear() - 1);
  
  const dateRangeStr = `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 
          HIDDEN PRINT TEMPLATE 
          This section is rendered off-screen strictly for html2canvas to capture.
          It matches the clean "IT Support Report" look.
      */}
      <div 
        id="printable-report-template" 
        className="fixed top-0 left-[-9999px] bg-white p-12 w-[1000px] h-auto text-gray-900"
      >
        <h1 className="text-4xl font-bold text-blue-900 border-b-4 border-blue-900 pb-4 mb-2">IT Support Report ({reportPeriod})</h1>
        <p className="text-lg text-gray-600 mb-8 font-medium">Period: {dateRangeStr}</p>
        
        {/* AI SUMMARY SECTION - Top */}
        <div className="mb-12 border-b border-gray-200 pb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-3 uppercase tracking-wide">Executive Summary</h3>
            {aiReport ? (
                <p className="text-gray-700 text-lg leading-relaxed text-justify">
                    {aiReport.executiveSummary}
                </p>
            ) : (
                <p className="text-gray-400 italic">
                    Executive summary not generated. Please use the "Generate Report" button in the dashboard before exporting.
                </p>
            )}
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="text-gray-500 text-sm font-medium uppercase mb-1">Total Tickets</div>
                <div className="text-5xl font-bold text-gray-900">{displayMetrics.totalTickets}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="text-gray-500 text-sm font-medium uppercase mb-1">Resolved</div>
                <div className="text-5xl font-bold text-gray-900">{displayMetrics.resolvedCount}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="text-gray-500 text-sm font-medium uppercase mb-1">Pending</div>
                <div className="text-5xl font-bold text-gray-900">{displayMetrics.pendingCount}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="text-gray-500 text-sm font-medium uppercase mb-1">In Progress</div>
                <div className="text-5xl font-bold text-gray-900">{displayMetrics.inProgressCount}</div>
            </div>
        </div>

        {/* Category Table */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Category Breakdown</h2>
        <div className="mb-10 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 font-bold text-gray-700">Category</th>
                        <th className="p-4 font-bold text-gray-700">Count</th>
                        <th className="p-4 font-bold text-gray-700">Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    {displayMetrics.categoryBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                            <td className="p-4 text-gray-800">{item.name}</td>
                            <td className="p-4 text-gray-800">{item.count}</td>
                            <td className="p-4 text-gray-600">{item.percentage}%</td>
                        </tr>
                    ))}
                    {displayMetrics.categoryBreakdown.length === 0 && (
                         <tr><td colSpan={3} className="p-4 text-center text-gray-500">No data available</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Priority Table */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Priority Breakdown</h2>
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-4 font-bold text-gray-700">Priority</th>
                        <th className="p-4 font-bold text-gray-700">Count</th>
                        <th className="p-4 font-bold text-gray-700">Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    {displayMetrics.priorityBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                            <td className="p-4 text-gray-800">{item.name}</td>
                            <td className="p-4 text-gray-800">{item.count}</td>
                            <td className="p-4 text-gray-600">{item.percentage}%</td>
                        </tr>
                    ))}
                    {displayMetrics.priorityBreakdown.length === 0 && (
                         <tr><td colSpan={3} className="p-4 text-center text-gray-500">No data available</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
      {/* END PRINT TEMPLATE */}


      {/* Print Header (Visible only when browser printing via Ctrl+P) */}
      <div className="print-only mb-8 text-center border-b border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">AUIS Help Desk - Status Report</h1>
        <p className="text-gray-500 mt-1">{dateRangeStr}</p>
      </div>

      {/* Dashboard Header & Actions (Hidden in Print) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of help desk performance and active tickets.</p>
        </div>
        <div className="flex gap-2">
           {activeTab === 'analytics' && (
             <>
               <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
               >
                 <Download className="w-4 h-4" />
                 Export CSV
               </button>
               <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
               >
                 <FileDown className="w-4 h-4" />
                 Export PDF
               </button>
               <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-transparent rounded-md text-sm font-medium text-white hover:bg-slate-900 transition-colors shadow-sm"
               >
                 <Printer className="w-4 h-4" />
                 Print View
               </button>
             </>
           )}
        </div>
      </div>

      {/* Tabs (Hidden in Print) */}
      <div className="border-b border-gray-200 no-print">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`${
              activeTab === 'kanban'
                ? 'border-auis-500 text-auis-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <LayoutList className="w-4 h-4" />
            Active Tickets (Kanban)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-auis-500 text-auis-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Reports
          </button>
        </nav>
      </div>

      {/* KANBAN VIEW */}
      {activeTab === 'kanban' && (
        <div className="animate-fadeIn">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-gray-500 text-xs font-medium uppercase">Pending</div>
                <div className="text-2xl font-bold text-yellow-600 mt-1">{dashboardMetrics.pendingCount}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-gray-500 text-xs font-medium uppercase">In Progress</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{dashboardMetrics.inProgressCount}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-gray-500 text-xs font-medium uppercase">Resolved</div>
                <div className="text-2xl font-bold text-green-600 mt-1">{dashboardMetrics.resolvedCount}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-gray-500 text-xs font-medium uppercase">High Priority</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{dashboardMetrics.highPriorityCount}</div>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-[1000px] h-[calc(100vh-300px)]">
                <KanbanColumn status={TicketStatus.PENDING} title="Pending Triage" color="border-yellow-400" />
                <KanbanColumn status={TicketStatus.IN_PROGRESS} title="In Progress" color="border-blue-400" />
                <KanbanColumn status={TicketStatus.RESOLVED} title="Resolved" color="border-green-400" />
                </div>
            </div>
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
            
            {/* Report Generator Control (Hidden in Print/PDF capture) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 no-print">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-auis-600" />
                    AI Report Generator
                </h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <select 
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                            className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-auis-500 focus:ring-auis-500 sm:text-sm border p-2"
                        >
                            <option value="executive">Executive Summary (High-level health & volume)</option>
                            <option value="performance">Performance Review (Resolution times & SLA)</option>
                            <option value="trends">Trend Analysis (Categories & Recurring issues)</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                        <select 
                            value={reportPeriod}
                            onChange={(e) => setReportPeriod(e.target.value as any)}
                            className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-auis-500 focus:ring-auis-500 sm:text-sm border p-2"
                        >
                            <option value="Weekly">Weekly (Last 7 Days)</option>
                            <option value="Monthly">Monthly (Last 30 Days)</option>
                            <option value="Yearly">Yearly (Last 365 Days)</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={reportLoading}
                        className="w-full md:w-auto px-6 py-2 bg-auis-600 text-white rounded-md font-medium hover:bg-auis-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Report'}
                    </button>
                </div>
            </div>

            {/* AI Report Result */}
            {aiReport && (
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-lg p-8 shadow-sm break-inside-avoid">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm border border-indigo-50 no-print">
                            <FileText className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{aiReport.title}</h2>
                            <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider font-semibold">AI Generated Analysis</p>
                            
                            <div className="prose prose-indigo max-w-none mb-8">
                                <h4 className="text-md font-bold text-gray-800 mb-2">Summary</h4>
                                <p className="text-gray-700 leading-relaxed text-base">{aiReport.executiveSummary}</p>
                            </div>
                            
                            <h4 className="text-md font-bold text-gray-800 mb-4 uppercase tracking-wide flex items-center gap-2">
                                <LightbulbIcon /> Key Insights
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(aiReport.keyInsights || []).map((insight, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex flex-col">
                                        <span className="text-3xl font-bold text-indigo-100 mb-2">0{idx + 1}</span>
                                        <p className="text-indigo-900 font-medium text-sm">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 break-inside-avoid">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-6">Tickets by Category</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                isAnimationActive={false} // Critical for PDF export
                            >
                                {categoryData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-6">Weekly Volume Trend</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={volumeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} activeDot={{r: 6}} isAnimationActive={false} />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Metrics Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden break-inside-avoid">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Operational Metrics (All Time)</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-b border-gray-200">
                     <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-gray-900">{dashboardMetrics.totalTickets}</div>
                        <div className="text-xs font-medium text-gray-500 uppercase mt-1">Total Tickets</div>
                     </div>
                     <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-green-600">{dashboardMetrics.avgResolutionHours}h</div>
                        <div className="text-xs font-medium text-gray-500 uppercase mt-1">Avg Resolution Time</div>
                     </div>
                     <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-red-600">{dashboardMetrics.highPriorityCount}</div>
                        <div className="text-xs font-medium text-gray-500 uppercase mt-1">Urgent / High Priority</div>
                     </div>
                     <div className="p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">98%</div>
                        <div className="text-xs font-medium text-gray-500 uppercase mt-1">SLA Adherence</div>
                     </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const LightbulbIcon = () => (
    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

export default AdminDashboard;
