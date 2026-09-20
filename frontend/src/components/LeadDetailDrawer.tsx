import React from 'react';
import { Lead } from '../services/api';
import { X, ExternalLink, ShieldCheck, Mail, Eye, MessageSquare, History, Award, Layers } from 'lucide-react';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onSendEmail: (lead: Lead) => void;
  onSimulateOpen: (lead: Lead) => void;
  onSimulateReply: (lead: Lead) => void;
  onRecomputeScore: (lead: Lead) => void;
  isRecomputing: boolean;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  onClose,
  onSendEmail,
  onSimulateOpen,
  onSimulateReply,
  onRecomputeScore,
  isRecomputing
}) => {
  if (!lead) return null;

  const notes = lead.researchNotes || {};
  const score = lead.score?.currentScore ?? 0;
  const fitScore = lead.score?.fitScore ?? 0;
  const engScore = lead.score?.engagementScore ?? 0;
  const tier = lead.score?.tier || 'COLD';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h2>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                tier === 'HOT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                tier === 'WARM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {tier} ({score} pts)
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium mt-0.5">
              {lead.jobTitle} &bull; <span className="text-emerald-700">{lead.company.name}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{lead.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
            {lead.status === 'DISCOVERED' && (
              <button
                onClick={() => onSendEmail(lead)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Mail className="w-4 h-4" /> Send Appendix A Email
              </button>
            )}

            {lead.status === 'CONTACTED' && (
              <button
                onClick={() => onSimulateOpen(lead)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-4 h-4" /> Track Pixel Open (+15 pts)
              </button>
            )}

            {lead.status !== 'UNSUBSCRIBED' && (
              <button
                onClick={() => onSimulateReply(lead)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" /> Simulate Prospect Reply
              </button>
            )}

            <button
              onClick={() => onRecomputeScore(lead)}
              disabled={isRecomputing}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5"
            >
              <History className="w-4 h-4" /> Recompute Score
            </button>
          </div>

          {/* Score Breakdown Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Score Breakdown (0–100)
              </h3>
              <span className="text-lg font-extrabold text-slate-900">{score} / 100</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-gray-500 font-medium">ICP Fit Score</div>
                <div className="text-xl font-bold text-emerald-600">{fitScore} <span className="text-xs text-gray-400 font-normal">/ 50 max</span></div>
                <div className="text-[11px] text-gray-500 mt-1">Role, Industry & Size Match</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-gray-500 font-medium">Engagement Score</div>
                <div className="text-xl font-bold text-indigo-600">{engScore} <span className="text-xs text-gray-400 font-normal">/ 50 max</span></div>
                <div className="text-[11px] text-gray-500 mt-1">Delivered, Opens & Replies</div>
              </div>
            </div>
          </div>

          {/* Grounded Research & Appendix A Signals */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Appendix A Grounded Research Signals
              </h3>
              {lead.sourceUrl && (
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                >
                  <span>View Source Citation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-lg">
                <span className="font-semibold text-gray-700">Observed Signal:</span>
                <p className="text-gray-600 mt-0.5 italic">"{notes.observedSignalSentence || notes.observedSignalShort || 'N/A'}"</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="font-semibold text-gray-700">Pain Point Category:</span>
                  <p className="text-emerald-700 font-medium mt-0.5">{notes.painPointCategory || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="font-semibold text-gray-700">Mapped Capability:</span>
                  <p className="text-indigo-700 font-medium mt-0.5">{notes.valuePropForPainPoint || 'N/A'}</p>
                </div>
              </div>

              {notes.oneLineRelevanceHypothesis && (
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="font-semibold text-gray-700">Relevance Hypothesis:</span>
                  <p className="text-gray-600 mt-0.5">{notes.oneLineRelevanceHypothesis}</p>
                </div>
              )}
            </div>
          </div>

          {/* Score History Timeline (Audit Trail) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5 mb-3">
              <History className="w-4 h-4 text-amber-600" />
              Score History & Rationale Audit Trail
            </h3>

            {(!lead.scoreHistory || lead.scoreHistory.length === 0) ? (
              <p className="text-xs text-gray-400 italic">No score events recorded yet.</p>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {lead.scoreHistory.map((h) => (
                  <div key={h.id} className="relative pl-7 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{h.triggerEvent.replace(/_/g, ' ')}</span>
                        <span className={`font-bold ${h.delta > 0 ? 'text-emerald-600' : h.delta < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                          {h.delta > 0 ? `+${h.delta}` : h.delta} pts ({h.previousScore} &rarr; {h.newScore})
                        </span>
                      </div>
                      <p className="text-gray-600">{h.reason}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw Email Events Store */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5 mb-3">
              <Mail className="w-4 h-4 text-blue-600" />
              Raw Email Events Store (Discrete Log)
            </h3>

            {(!lead.events || lead.events.length === 0) ? (
              <p className="text-xs text-gray-400 italic">No email events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {lead.events.map((ev) => (
                  <div key={ev.id} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-800">{ev.eventType}</span>
                      {ev.payload?.subject && (
                        <p className="text-gray-500 text-[11px] truncate max-w-sm mt-0.5">
                          "{ev.payload.subject}"
                        </p>
                      )}
                      {ev.payload?.intent && (
                        <p className="text-emerald-600 text-[11px] mt-0.5 font-medium">
                          Intent: {ev.payload.intent} ({(ev.payload.confidence * 100).toFixed(0)}% confidence)
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
