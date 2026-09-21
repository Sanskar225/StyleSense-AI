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
  X,
  ShieldAlert,
  ArrowRight
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
  // Skeleton Loading State (Dark Luxury Skeletons)
  if (loading) {
    return (
      <div className="bg-dark-850/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Loading qualified prospects from PostgreSQL...
          </span>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3.5 w-1/3">
                <div className="w-9 h-9 rounded-xl bg-dark-700/60 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-dark-700/60 rounded-md w-3/4" />
                  <div className="h-2.5 bg-dark-800/60 rounded-md w-1/2" />
                </div>
              </div>
              <div className="w-1/4 space-y-2">
                <div className="h-3.5 bg-dark-700/60 rounded-md w-2/3" />
                <div className="h-2.5 bg-dark-800/60 rounded-md w-1/2" />
              </div>
              <div className="w-1/6">
                <div className="h-6 bg-dark-700/60 rounded-full w-24" />
              </div>
              <div className="w-1/6 space-y-2">
                <div className="h-4 bg-dark-700/60 rounded-md w-16" />
                <div className="h-2 bg-dark-800/60 rounded-full w-full" />
              </div>
              <div className="w-20 h-8 bg-dark-700/60 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Real Context-Aware Empty States
  if (leads.length === 0) {
    const isFiltered = searchQuery || statusFilter || tierFilter;

    return (
      <div className="bg-dark-850/80 border border-white/[0.08] rounded-2xl p-14 text-center shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-inner">
          <SearchX className="w-8 h-8 text-slate-400" />
        </div>

        {searchQuery ? (
          <>
            <h3 className="text-lg font-bold text-white mb-1.5">
              No results found for &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              We couldn't find any prospects matching your search term across names, fashion brands, job titles, or emails.
            </p>
          </>
        ) : statusFilter || tierFilter ? (
          <>
            <h3 className="text-lg font-bold text-white mb-1.5">
              No leads match your active filters
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              There are currently 0 prospects matching the active {statusFilter ? `status (${statusFilter})` : ''}{statusFilter && tierFilter ? ' and ' : ''}{tierFilter ? `tier (${tierFilter})` : ''} filter.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-1.5">
              Prospecting Pipeline is Empty
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              No leads currently exist in the database. Use the 2-step AI Discovery agent to find and ground qualified fashion brands from industry trade publications.
            </p>
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {isFiltered && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-dark-900 hover:bg-dark-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/[0.08] transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}

          {onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-dark-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Discovered
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Contacted
          </span>
        );
      case 'OPENED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Opened (Pixel)
          </span>
        );
      case 'REPLIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs shadow-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Replied (High Intent)
          </span>
        );
      case 'UNSUBSCRIBED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Unsubscribed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier) {
      case 'HOT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Flame className="w-3 h-3 text-rose-400" /> HOT
          </span>
        );
      case 'WARM':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Zap className="w-3 h-3 text-amber-400" /> WARM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <Snowflake className="w-3 h-3 text-slate-400" /> COLD
          </span>
        );
    }
  };

  const getRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-dark-950 font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/30 border border-amber-300 shrink-0" title="Top Ranked Prospect">
          #1
        </span>
      );
    }
    if (idx === 1) {
      return (
        <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-slate-200 to-slate-400 text-dark-950 font-black text-xs flex items-center justify-center shadow-md shadow-slate-300/20 border border-slate-200 shrink-0">
          #2
        </span>
      );
    }
    if (idx === 2) {
      return (
        <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 text-amber-100 font-black text-xs flex items-center justify-center shadow-md shadow-amber-700/20 border border-amber-600 shrink-0">
          #3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-xl bg-dark-900 text-slate-400 font-mono font-bold text-xs flex items-center justify-center border border-white/[0.08] shrink-0">
        #{idx + 1}
      </span>
    );
  };

  // Avatar gradient based on initials
  const getAvatarGradient = (name: string) => {
    const charCode = name.charCodeAt(0) % 4;
    switch (charCode) {
      case 0:
        return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300';
      case 1:
        return 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300';
      case 2:
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300';
      default:
        return 'from-amber-500/20 to-rose-500/20 border-amber-500/40 text-amber-300';
    }
  };

  return (
    <div className="bg-dark-850/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-dark-900/90 border-b border-white/[0.06] text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-4">Rank & Prospect</th>
              <th scope="col" className="px-5 py-4">Company & Demographic</th>
              <th scope="col" className="px-5 py-4">Outreach Status</th>
              <th scope="col" className="px-5 py-4">Lead Score (0–100)</th>
              <th scope="col" className="px-5 py-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {leads.map((lead, idx) => {
              const score = lead.score?.currentScore ?? 0;
              const fit = lead.score?.fitScore ?? 0;
              const engagement = lead.score?.engagementScore ?? 0;
              const tier = lead.score?.tier || 'COLD';
              const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`;

              return (
                <tr
                  key={lead.id}
                  className="hover:bg-white/[0.03] transition-all duration-150 cursor-pointer group"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Prospect Info */}
                  <td className="px-5 py-4.5">
                    <div className="flex items-center gap-3.5">
                      {getRankBadge(idx)}
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarGradient(lead.firstName)}`}>
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5 text-sm">
                          <span>{lead.firstName} {lead.lastName}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">{lead.jobTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lead.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Company Info */}
                  <td className="px-5 py-4.5">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{lead.company.name}</span>
                      {lead.sourceUrl && (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Verified trade publication research citation"
                          className="text-emerald-400 hover:text-emerald-300 transition-colors p-0.5 rounded hover:bg-emerald-500/10"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{lead.company.industry}</span>
                      <span>&bull;</span>
                      <span>{lead.company.sizeRange} emp</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{lead.company.region}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4.5 whitespace-nowrap">
                    <div>
                      {getStatusBadge(lead.status)}
                    </div>
                    {lead.suppression && (
                      <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 mt-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Suppression Active</span>
                      </div>
                    )}
                  </td>

                  {/* Score & Tier with Dual Neon Bar */}
                  <td className="px-5 py-4.5">
                    <div className="w-48">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-white text-lg leading-none tracking-tight">
                          {score}
                          <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
                        </span>
                        {getTierBadge(tier)}
                      </div>
                      {/* Split Neon Bar */}
                      <div 
                        className="w-full bg-dark-950 rounded-full h-2 overflow-hidden flex border border-white/[0.08]"
                        title={`Total: ${score} | Fit: ${fit}/50 | Engagement: ${engagement}/50`}
                      >
                        <div
                          className="bg-emerald-500 h-2 transition-all duration-300 shadow-sm shadow-emerald-500/50"
                          style={{ width: `${Math.min(100, fit * 2)}%` }}
                        />
                        <div
                          className="bg-purple-500 h-2 transition-all duration-300 shadow-sm shadow-purple-500/50"
                          style={{ width: `${Math.min(100, engagement * 2)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono font-bold mt-1.5 flex justify-between">
                        <span className="text-emerald-400">Fit: {fit}</span>
                        <span className="text-purple-400">Eng: {engagement}</span>
                      </div>
                    </div>
                  </td>

                  {/* Interactive Quick Actions */}
                  <td className="px-5 py-4.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.status === 'DISCOVERED' && (
                        <button
                          onClick={() => onSendEmail(lead)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                          title="Generate & Send Appendix A Outreach with Grounding Check"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Email</span>
                        </button>
                      )}

                      {lead.status === 'CONTACTED' && (
                        <button
                          onClick={() => onSimulateOpen(lead)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                          title="Simulate 1x1 Pixel Hit (+15 pts)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Track Open</span>
                        </button>
                      )}

                      {lead.status !== 'UNSUBSCRIBED' && (
                        <button
                          onClick={() => onSimulateReply(lead)}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                          title="Simulate Inbound Reply (+30 pts)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="p-1.5 rounded-xl hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors ml-1"
                        title="Open Lead Intelligence Drawer"
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