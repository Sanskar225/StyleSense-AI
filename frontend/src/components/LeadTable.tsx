import React from 'react';
import { Lead } from '../services/api';
import { Mail, Eye, MessageSquare, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  onSelectLead: (lead: Lead) => void;
  onSendEmail: (lead: Lead) => void;
  onSimulateOpen: (lead: Lead) => void;
  onSimulateReply: (lead: Lead) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  loading,
  onSelectLead,
  onSendEmail,
  onSimulateOpen,
  onSimulateReply
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3" />
        <p className="text-gray-500 text-sm">Loading qualified prospect list...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">No Leads Found</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
          No prospects match your current search or filter criteria. Try adjusting your filters or use the ICP Agent to discover new leads.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISCOVERED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Discovered</span>;
      case 'CONTACTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Contacted</span>;
      case 'OPENED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Opened (Pixel)</span>;
      case 'REPLIED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Replied</span>;
      case 'UNSUBSCRIBED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Unsubscribed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'HOT':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'WARM':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3.5">Rank & Prospect</th>
              <th scope="col" className="px-5 py-3.5">Company & Industry</th>
              <th scope="col" className="px-5 py-3.5">Outreach Status</th>
              <th scope="col" className="px-5 py-3.5">Lead Score (0-100)</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
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
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Prospect Info */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                      <div>
                        <div className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{lead.jobTitle}</div>
                        <div className="text-xs text-gray-400">{lead.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Company Info */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                      <span>{lead.company.name}</span>
                      {lead.sourceUrl && (
                        <a
                          href={lead.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="View verified research citation"
                          className="text-gray-400 hover:text-emerald-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lead.company.industry} &bull; {lead.company.sizeRange} emp
                    </div>
                    <div className="text-xs text-gray-400">{lead.company.region}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                    {lead.suppression && (
                      <div className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3 h-3" /> Suppressed
                      </div>
                    )}
                  </td>

                  {/* Score & Tier */}
                  <td className="px-5 py-4">
                    <div className="w-48">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-base">{score}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getTierColor(tier)}`}>
                          {tier}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-2 transition-all duration-300"
                          style={{ width: `${Math.min(100, fit * 2)}%` }}
                          title={`Fit: ${fit}/50`}
                        />
                        <div
                          className="bg-indigo-500 h-2 transition-all duration-300"
                          style={{ width: `${Math.min(100, engagement * 2)}%` }}
                          title={`Engagement: ${engagement}/50`}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                        <span>Fit: {fit}</span>
                        <span>Engagement: {engagement}</span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.status === 'DISCOVERED' && (
                        <button
                          onClick={() => onSendEmail(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Generate & Send Appendix A Outreach"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Send Email</span>
                        </button>
                      )}

                      {lead.status === 'CONTACTED' && (
                        <button
                          onClick={() => onSimulateOpen(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Simulate 1x1 Pixel Open Event"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Track Open</span>
                        </button>
                      )}

                      {lead.status !== 'UNSUBSCRIBED' && (
                        <button
                          onClick={() => onSimulateReply(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Simulate Inbound Reply & Classification"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="View Full History"
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
