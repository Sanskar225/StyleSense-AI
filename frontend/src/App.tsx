import React, { useState, useEffect, useCallback } from 'react';
import { api, Lead, PipelineMetrics } from './services/api';
import { MetricsSummary } from './components/MetricsSummary';
import { FilterBar } from './components/FilterBar';
import { LeadTable } from './components/LeadTable';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { DiscoveryModal } from './components/DiscoveryModal';
import { SendEmailModal } from './components/SendEmailModal';
import { SimulateReplyModal } from './components/SimulateReplyModal';
import { DemoGuideBanner } from './components/DemoGuideBanner';
import { Sparkles, Database, CheckCircle, AlertCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filter & Search & Sort states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & Drawers
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);
  const [replyModalLead, setReplyModalLead] = useState<Lead | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [leadsRes, metricsData] = await Promise.all([
        api.getLeads({
          search,
          status: statusFilter,
          tier: tierFilter,
          sortBy,
          sortOrder,
          limit: 100
        }),
        api.getMetrics()
      ]);

      setLeads(leadsRes.data);
      setMetrics(metricsData);

      // If detail drawer is open, keep selected lead in sync
      if (selectedLead) {
        const refreshed = leadsRes.data.find((l) => l.id === selectedLead.id);
        if (refreshed) {
          const detail = await api.getLead(refreshed.id);
          setSelectedLead(detail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load leads or metrics', err);
      const errMsg = err?.error?.message || err?.message || 'Could not connect to StyleSense backend API.';
      setApiError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tierFilter, sortBy, sortOrder, selectedLead]);

  useEffect(() => {
    loadData();
  }, [search, statusFilter, tierFilter, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTierFilter('');
    setSortBy('score');
    setSortOrder('desc');
  };

  const handleSelectLead = async (lead: Lead) => {
    try {
      const fullLead = await api.getLead(lead.id);
      setSelectedLead(fullLead);
    } catch (e) {
      setSelectedLead(lead);
    }
  };

  const handleSimulateOpen = async (lead: Lead) => {
    try {
      await api.simulateOpen(lead.id);
      showToast(`⚡ Open event tracked for ${lead.firstName} (${lead.company.name})! Score +15 pts.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(`Error tracking open: ${err?.message || 'Failed'}`, 'error');
    }
  };

  const handleRecomputeLeadScore = async (lead: Lead) => {
    setIsRecomputing(true);
    try {
      await api.recomputeScore(lead.id);
      showToast(`Score recomputed for ${lead.firstName} from raw event history.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast('Failed to recompute score.', 'error');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleRecomputeAll = async () => {
    setIsRecomputing(true);
    try {
      const res = await api.recomputeAll();
      showToast(`✅ Recomputed ${res.data?.total || 'all'} lead scores from raw immutable event log.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast('Failed to batch recompute scores.', 'error');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleDiscoverLeads = async (icp: any) => {
    const res = await api.discoverLeads(icp);
    showToast(`🎉 Discovered & scored ${res.leadsFound} qualified apparel leads.`, 'success');
    await loadData();
  };

  const handleSimulateUnsubscribe = async (lead: Lead) => {
    try {
      await api.simulateUnsubscribe(lead.id);
      showToast(`🛑 ${lead.email} opted out & added to suppression list. Score reset to 0.`, 'info');
      await loadData();
      const updated = await api.getLead(lead.id);
      setSelectedLead(updated);
    } catch (err: any) {
      showToast(`Failed to unsubscribe: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleTestSendSuppressed = async (lead: Lead) => {
    try {
      await api.sendEmail(lead.id);
      showToast('Sent successfully', 'success');
      await loadData();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'HTTP 409 Conflict: Recipient is in suppression list';
      showToast(`🛑 [RECIPIENT_SUPPRESSED] ${msg}`, 'error');
    }
  };

  const hasActiveFilters = Boolean(search || statusFilter || tierFilter || sortBy !== 'score' || sortOrder !== 'desc');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Dynamic Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom duration-200 ${
            toast.type === 'error' ? 'bg-rose-950 border border-rose-700' :
            toast.type === 'info' ? 'bg-slate-900 border border-slate-700' :
            'bg-emerald-950 border border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">StyleSense AI</h1>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Lead Intelligence Console
                </span>
              </div>
              <p className="text-xs text-gray-500">Apparel & Fashion Merchandising Prospecting Engine</p>
            </div>
          </div>

          {/* System & DB Status */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>PostgreSQL (stylesense_dev)</span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                SS
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-gray-800">Sanskar Sinha</div>
                <div className="text-[10px] text-gray-400">Account Executive</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Header Intro */}
        <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Prospect Intelligence Board</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Ranked fashion merchandising and inventory planning leads scored dynamically by ICP fit & real-time engagement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Appendix A Grounding:</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Enforced (Zero Hallucination)
            </span>
          </div>
        </div>

        {/* Global Connection / API Error Banner */}
        {apiError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="font-bold">Backend Connection Issue:</strong> {apiError}
                <div className="text-gray-500 mt-0.5">Please ensure the backend API server is running on <code className="font-mono bg-rose-100 px-1 py-0.2 rounded">http://localhost:4000</code></div>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ml-4"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Interactive Evaluation & Demo Guide Banner */}
        <DemoGuideBanner
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          onRecomputeAll={handleRecomputeAll}
          isRecomputing={isRecomputing}
        />

        {/* Pipeline Metrics Summary Cards */}
        <MetricsSummary metrics={metrics} loading={loading} />

        {/* Advanced Filter, Sort & Search Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          metrics={metrics}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          onRecomputeAll={handleRecomputeAll}
          isRecomputing={isRecomputing}
        />

        {/* Lead Table with Skeletons & Granular Empty States */}
        <LeadTable
          leads={leads}
          loading={loading}
          searchQuery={search}
          statusFilter={statusFilter}
          tierFilter={tierFilter}
          onResetFilters={handleResetFilters}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          onSelectLead={handleSelectLead}
          onSendEmail={(lead) => setEmailModalLead(lead)}
          onSimulateOpen={handleSimulateOpen}
          onSimulateReply={(lead) => setReplyModalLead(lead)}
        />
      </main>

      {/* Slide-in Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSendEmail={(lead) => setEmailModalLead(lead)}
        onSimulateOpen={handleSimulateOpen}
        onSimulateReply={(lead) => setReplyModalLead(lead)}
        onRecomputeScore={handleRecomputeLeadScore}
        onSimulateUnsubscribe={handleSimulateUnsubscribe}
        onTestSendSuppressed={handleTestSendSuppressed}
        isRecomputing={isRecomputing}
      />

      {/* ICP Discovery Modal */}
      <DiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onDiscover={handleDiscoverLeads}
      />

      {/* Send Appendix A Email Modal */}
      <SendEmailModal
        lead={emailModalLead}
        isOpen={!!emailModalLead}
        onClose={() => setEmailModalLead(null)}
        onSent={() => {
          showToast(`🚀 Outreach sent to ${emailModalLead?.firstName}! Marked as CONTACTED (+5 pts).`, 'success');
          loadData();
        }}
      />

      {/* Simulate Reply Modal */}
      <SimulateReplyModal
        lead={replyModalLead}
        isOpen={!!replyModalLead}
        onClose={() => setReplyModalLead(null)}
        onReplyProcessed={() => {
          showToast(`📩 Reply classified and score recomputed from event history!`, 'success');
          loadData();
        }}
      />
    </div>
  );
};
export default App;