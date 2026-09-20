import React, { useState, useEffect, useCallback } from 'react';
import { api, Lead, PipelineMetrics } from './services/api';
import { MetricsSummary } from './components/MetricsSummary';
import { FilterBar } from './components/FilterBar';
import { LeadTable } from './components/LeadTable';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { DiscoveryModal } from './components/DiscoveryModal';
import { SendEmailModal } from './components/SendEmailModal';
import { SimulateReplyModal } from './components/SimulateReplyModal';
import { Sparkles, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);
  const [replyModalLead, setReplyModalLead] = useState<Lead | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [leadsRes, metricsData] = await Promise.all([
        api.getLeads({
          search,
          status: statusFilter,
          tier: tierFilter,
          sortBy: 'score',
          sortOrder: 'desc',
          limit: 50
        }),
        api.getMetrics()
      ]);

      setLeads(leadsRes.data);
      setMetrics(metricsData);

      // If drawer is open, keep selected lead updated
      if (selectedLead) {
        const refreshed = leadsRes.data.find((l) => l.id === selectedLead.id);
        if (refreshed) {
          const detail = await api.getLead(refreshed.id);
          setSelectedLead(detail);
        }
      }
    } catch (err) {
      console.error('Failed to load leads or metrics', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tierFilter, selectedLead]);

  useEffect(() => {
    loadData();
  }, [search, statusFilter, tierFilter]);

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
      showToast(`⚡ Open event tracked for ${lead.firstName} (${lead.company.name})! Score +15 pts.`);
      await loadData();
    } catch (err: any) {
      showToast(`Error tracking open: ${err?.message || 'Failed'}`);
    }
  };

  const handleRecomputeLeadScore = async (lead: Lead) => {
    setIsRecomputing(true);
    try {
      await api.recomputeScore(lead.id);
      showToast(`Score recomputed for ${lead.firstName} from raw event history.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to recompute score.');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleRecomputeAll = async () => {
    setIsRecomputing(true);
    try {
      const res = await api.recomputeAll();
      showToast(`✅ Recomputed ${res.data?.total || 'all'} lead scores from raw immutable event log.`);
      await loadData();
    } catch (err: any) {
      showToast('Failed to batch recompute scores.');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleDiscoverLeads = async (icp: any) => {
    const res = await api.discoverLeads(icp);
    showToast(`🎉 Discovered & scored ${res.leadsFound} qualified apparel leads.`);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">StyleSense AI</h1>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Lead Intelligence
                </span>
              </div>
              <p className="text-xs text-gray-500">Apparel & Fashion Merchandising Prospecting Engine</p>
            </div>
          </div>

          {/* User & DB Status */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL (stylesense_dev)</span>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
                SS
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-gray-800">Sanskar Sinha</div>
                <div className="text-[10px] text-gray-400">Account Executive</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Header Intro */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Prospect Intelligence Board</h2>
            <p className="text-sm text-gray-500">
              Ranked fashion merchandising and inventory planning leads scored dynamically by ICP fit & real-time engagement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Appendix A Grounding:</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
              Enforced
            </span>
          </div>
        </div>

        {/* Pipeline Metrics */}
        <MetricsSummary metrics={metrics} loading={loading} />

        {/* Filters & Actions */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          onOpenDiscovery={() => setIsDiscoveryOpen(true)}
          onRecomputeAll={handleRecomputeAll}
          isRecomputing={isRecomputing}
        />

        {/* Lead Table */}
        <LeadTable
          leads={leads}
          loading={loading}
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
          showToast(`🚀 Outreach sent to ${emailModalLead?.firstName}! Marked as CONTACTED (+5 pts).`);
          loadData();
        }}
      />

      {/* Simulate Reply Modal */}
      <SimulateReplyModal
        lead={replyModalLead}
        isOpen={!!replyModalLead}
        onClose={() => setReplyModalLead(null)}
        onReplyProcessed={() => {
          showToast(`📩 Reply classified and score recomputed!`);
          loadData();
        }}
      />
    </div>
  );
};
export default App;
