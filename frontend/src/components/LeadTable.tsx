import React from 'react';
import { Lead } from '../services/api';
import { 
  Mail, 
  Eye, 
  MessageSquare, 
  ExternalLink, 
  ShieldCheck, 
  ChevronRight, 
  Flame, 
  Zap, 
  Snowflake, 
  SearchX, 
  Sparkles, 
  RefreshCw,
  X
} from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  searchQuery?: string;
  statusFilter?: string;
  tierFilter?: string;
  onResetFilters?: () => void;
  onOpenDiscovery?: () => void;
  onSelectLead: (lead: Lead) => void;
  onSendEmail: (lead: Lead) => void;
  onSimulateOpen: (lead: Lead) => void;
  onSimulateReply: (lead: Lead) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  loading,
  searchQuery = '',
  statusFilter = '',
  tierFilter = '',
  onResetFilters,
  onOpenDiscovery,
  onSelectLead,
  onSendEmail,
  onSimulateOpen,
  onSimulateReply
}) => {
  // Skeleton Loading State
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Loading prospects from PostgreSQL...</span>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-7 h-7 rounded-lg bg-gray-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="w-1/4 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="w-1/6">
                <div className="h-5 bg-gray-200 rounded-full w-20" />
              </div>
              <div className="w-1/6 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded w-16" />
                <div className="h-2 bg-gray-100 rounded-full w-full" />
              </div>
              <div className="w-16 h-7 bg-gray-200 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Real Empty State Handlers
  if (leads.length === 0) {
    const isFiltered = searchQuery || statusFilter || tierFilter;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <SearchX className="w-7 h-7" />
        </div>

        {searchQuery ? (
          <>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              No results found for &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
              No prospects match your search term across prospect names, companies, job titles, or emails.
            </p>
          </>
        ) : statusFilter || tierFilter ? (
          <>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              No leads match your active filters
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
              There are currently 0 leads matching the selected {statusFilter ? `status (${statusFilter})` : ''}{statusFilter && tierFilter ? ' and ' : ''}{tierFilter ? `tier (${tierFilter})` : ''}.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Prospecting Pipeline is Empty
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
              No leads currently exist in the database. Use the 2-step AI Discovery agent to find and ground qualified fashion brands.
            </p>
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isFiltered && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}

          {onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discover Leads with AI</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISCOVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Discovered
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Contacted
          </span>
        );
      case 'OPENED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Opened (Pixel)
          </span>
        );
      case 'REPLIED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Replied
          </span>
        );
      case 'UNSUBSCRIBED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Unsubscribed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'HOT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500" /> HOT
          </span>
        );
      case 'WARM':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Zap className="w-3 h-3 text-amber-500" /> WARM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
            <Snowflake className="w-3 h-3 text-slate-400" /> COLD
          </span>
        );
    }
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-300" title="Top Ranked Prospect">
          #1
        </span>
      );
    }
    if (idx === 1) {
      return (
        <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-300">
          #2
        </span>
      );
    }
    if (idx === 2) {
      return (
        <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 font-bold text-xs flex items-center justify-center border border-orange-300">
          #3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-lg bg-gray-50 text-gray-500 font-bold text-xs flex items-center justify-center border border-gray-200">
        #{idx + 1}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3.5">Rank & Prospect</th>
              <th scope="col" className="px-5 py-3.5">Company & Demographic</th>
              <th scope="col" className="px-5 py-3.5">Outreach Status</th>
              <th scope="col" className="px-5 py-3.5">Lead Score (0–100)</th>
              <th scope="col" className="px-5 py-3.5 text-right">Interactive Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead, idx) => {
              const score = lead.score?.currentScore ?? 0;
              const fit = lead.score?.fitScore ?? 0;
              const engagement = lead.score?.engagementScore ?? 0;
              const tier = lead.score?.tier || 'COLD';

              return (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Prospect Info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {getRankBadge(idx)}
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <span>{lead.firstName} {lead.lastName}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">{lead.jobTitle}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{lead.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Company Info */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <span>{lead.company.name}</span>
                      {lead.sourceUrl && (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="View verified research citation"
                          className="text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {lead.company.industry} &bull; {lead.company.sizeRange} emp
                    </div>
                    <div className="text-xs text-gray-400">{lead.company.region}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>
                      {getStatusBadge(lead.status)}
                    </div>
                    {lead.suppression && (
                      <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                        <span>Suppression Active</span>
                      </div>
                    )}
                  </td>

                  {/* Score & Tier */}
                  <td className="px-5 py-4">
                    <div className="w-48">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-gray-900 text-lg leading-none">
                          {score}
                          <span className="text-xs font-normal text-gray-400 ml-1">/ 100</span>
                        </span>
                        {getTierBadge(tier)}
                      </div>
                      {/* Split Progress Bar */}
                      <div 
                        className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex border border-gray-200"
                        title={`Total: ${score} | Fit: ${fit}/50 | Engagement: ${engagement}/50`}
                      >
                        <div
                          className="bg-emerald-500 h-2 transition-all duration-300"
                          style={{ width: `${Math.min(100, fit * 2)}%` }}
                        />
                        <div
                          className="bg-indigo-500 h-2 transition-all duration-300"
                          style={{ width: `${Math.min(100, engagement * 2)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-medium text-gray-400 mt-1 flex justify-between">
                        <span className="text-emerald-700">Fit: {fit}</span>
                        <span className="text-indigo-700">Eng: {engagement}</span>
                      </div>
                    </div>
                  </td>

                  {/* Interactive Quick Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.status === 'DISCOVERED' && (
                        <button
                          onClick={() => onSendEmail(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors border border-emerald-200"
                          title="Generate & Send Appendix A Outreach with Grounding Check"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Email</span>
                        </button>
                      )}

                      {lead.status === 'CONTACTED' && (
                        <button
                          onClick={() => onSimulateOpen(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-200"
                          title="Simulate 1x1 Transparent GIF Tracking Pixel Hit (+15 pts)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Track Open</span>
                        </button>
                      )}

                      {lead.status !== 'UNSUBSCRIBED' && (
                        <button
                          onClick={() => onSimulateReply(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1 transition-colors border border-purple-200"
                          title="Simulate Inbound Reply with 5-Class Sentiment Classifier (+30 pts)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="View Full History, Citations & Compliance Drawer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};