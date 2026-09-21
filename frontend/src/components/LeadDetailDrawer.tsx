import React, { useState } from 'react';
import { Lead } from '../services/api';
import { 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Mail, 
  Eye, 
  MessageSquare, 
  History, 
  Award, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Copy, 
  Check, 
  Sparkles, 
  Terminal, 
  Clock 
} from 'lucide-react';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onSendEmail: (lead: Lead) => void;
  onSimulateOpen: (lead: Lead) => void;
  onSimulateReply: (lead: Lead) => void;
  onRecomputeScore: (lead: Lead) => void;
  onSimulateUnsubscribe: (lead: Lead) => void;
  onTestSendSuppressed: (lead: Lead) => void;
  isRecomputing: boolean;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  onClose,
  onSendEmail,
  onSimulateOpen,
  onSimulateReply,
  onRecomputeScore,
  onSimulateUnsubscribe,
  onTestSendSuppressed,
  isRecomputing
}) => {
  const [copiedToken, setCopiedToken] = useState(false);

  if (!lead) return null;

  const notes = lead.researchNotes || {};
  const score = lead.score?.currentScore ?? 0;
  const fitScore = lead.score?.fitScore ?? 0;
  const engScore = lead.score?.engagementScore ?? 0;
  const tier = lead.score?.tier || 'COLD';

  const handleCopyToken = () => {
    navigator.clipboard.writeText(lead.trackingToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-dark-900 border-l border-white/[0.1] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 text-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-dark-950/80 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 text-base shrink-0 shadow-lg shadow-emerald-500/10">
              {lead.firstName?.[0]}{lead.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {lead.firstName} {lead.lastName}
                </h2>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  tier === 'HOT' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                  tier === 'WARM' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  'bg-slate-500/15 text-slate-300 border-slate-500/30'
                }`}>
                  {tier} ({score} / 100)
                </span>
              </div>
              <p className="text-sm text-slate-300 font-medium mt-1">
                {lead.jobTitle} &bull; <span className="text-emerald-400 font-semibold">{lead.company.name}</span>
              </p>
              <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 font-mono">
                <span>{lead.email}</span>
                <span>&bull;</span>
                <span>{lead.company.region}</span>
                <span>&bull;</span>
                <span>{lead.company.sizeRange} emp</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-white/[0.08]">
            {lead.status === 'DISCOVERED' && (
              <button
                onClick={() => onSendEmail(lead)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-dark-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all"
              >
                <Mail className="w-4 h-4" /> Send Appendix A Email
              </button>
            )}

            {lead.status === 'CONTACTED' && (
              <button
                onClick={() => onSimulateOpen(lead)}
                className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-4 h-4" /> Track Pixel Open (+15 pts)
              </button>
            )}

            {lead.status !== 'UNSUBSCRIBED' && (
              <button
                onClick={() => onSimulateReply(lead)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Simulate Prospect Reply
              </button>
            )}

            <button
              onClick={() => onRecomputeScore(lead)}
              disabled={isRecomputing}
              className="px-3.5 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Deterministically recompute this lead's score from the raw immutable event history"
            >
              <History className={`w-4 h-4 text-slate-400 ${isRecomputing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Recompute Score</span>
            </button>
          </div>

          {/* Score Breakdown (Fit vs Engagement) */}
          <div className="bg-dark-850/80 border border-white/[0.08] rounded-2xl p-4.5 shadow-xl">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Score Breakdown & Formula
              </h3>
              <div className="text-right">
                <span className="text-2xl font-black text-white">{score}</span>
                <span className="text-xs text-slate-500"> / 100 max</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-2">
              <div className="bg-dark-900/90 p-3.5 rounded-xl border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">ICP Fit Score</span>
                  <span className="text-emerald-400 font-bold font-mono">{fitScore} / 50</span>
                </div>
                <div className="w-full bg-dark-950 rounded-full h-1.5 mt-2 border border-white/[0.06]">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(fitScore / 50) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Title: {lead.jobTitle} &bull; {lead.company.sizeRange} emp
                </div>
              </div>

              <div className="bg-dark-900/90 p-3.5 rounded-xl border border-white/[0.06]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Engagement Score</span>
                  <span className="text-purple-400 font-bold font-mono">{engScore} / 50</span>
                </div>
                <div className="w-full bg-dark-950 rounded-full h-1.5 mt-2 border border-white/[0.06]">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(engScore / 50) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Delivered (+5) &bull; Opened (+15) &bull; Replied (+30)
                </div>
              </div>
            </div>
          </div>

          {/* Deliverability, Tracking & Compliance Center */}
          <div className="border border-white/[0.08] rounded-2xl p-4.5 bg-dark-850/80 shadow-xl">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Deliverability & Compliance Center (CAN-SPAM / GDPR)
              </h3>
              {lead.status === 'UNSUBSCRIBED' ? (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> Suppressed (Score: 0)
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Opt-In Active
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Tracking Token & Pixel Links */}
              <div className="bg-dark-900/90 p-3.5 rounded-xl border border-white/[0.06]">
                <div className="flex justify-between items-center text-slate-400 mb-2.5">
                  <span className="font-semibold text-[11px]">Unique Tracking Token:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {lead.trackingToken}
                    </span>
                    <button
                      onClick={handleCopyToken}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.08] transition-colors"
                      title="Copy Tracking Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-[11px]">
                  <a
                    href={`/api/tracking/pixel/${lead.trackingToken}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" /> Test 1x1 Pixel Hit ↗
                  </a>
                  <a
                    href={`/api/tracking/unsubscribe/${lead.trackingToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Unsubscribe Page ↗
                  </a>
                </div>
              </div>

              {/* Compliance Status */}
              {lead.status === 'UNSUBSCRIBED' ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5">
                  <div className="font-bold text-rose-300 flex items-center gap-2 mb-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Non-Bypassable Suppression Gate: ACTIVE</span>
                  </div>
                  <p className="text-rose-300/90 text-[11px] leading-relaxed">
                    Lead is recorded in <code className="font-mono bg-rose-500/20 px-1 py-0.5 rounded text-[10px]">suppression_list</code>. All outreach sends are blocked at the database boundary before reaching any email provider with <strong>HTTP 409 Conflict</strong>.
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => onTestSendSuppressed(lead)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Test Send (Verify 409 Block Live)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-300 flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>CAN-SPAM Verified & Ready</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Footer includes physical address & RFC 8058 1-click opt-out header.
                    </p>
                  </div>
                  <button
                    onClick={() => onSimulateUnsubscribe(lead)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition-all shrink-0"
                  >
                    Simulate Opt-Out 🛑
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grounded Research & Appendix A Signals */}
          <div className="border border-white/[0.08] rounded-2xl p-4.5 bg-dark-850/80 shadow-xl">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Appendix A Grounded Research Signals
              </h3>
              {lead.sourceUrl && (
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  <span>Verified Citation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-dark-900/90 p-3.5 rounded-xl border border-white/[0.06]">
                <span className="font-semibold text-slate-400">Observed Signal (Research):</span>
                <p className="text-slate-200 mt-1 italic leading-relaxed">
                  &ldquo;{notes.observedSignalSentence || notes.observedSignalShort || 'Grounded trade publication signal'}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-dark-900/90 p-3 rounded-xl border border-white/[0.06]">
                  <span className="font-semibold text-slate-400 block text-[11px]">Pain Point Category:</span>
                  <p className="text-emerald-400 font-bold mt-1">{notes.painPointCategory || 'Inventory Allocation'}</p>
                </div>
                <div className="bg-dark-900/90 p-3 rounded-xl border border-white/[0.06]">
                  <span className="font-semibold text-slate-400 block text-[11px]">Mapped Capability:</span>
                  <p className="text-purple-400 font-bold mt-1">{notes.valuePropForPainPoint || 'Demand Forecasting'}</p>
                </div>
              </div>

              {notes.oneLineRelevanceHypothesis && (
                <div className="bg-dark-900/90 p-3 rounded-xl border border-white/[0.06]">
                  <span className="font-semibold text-slate-400 block text-[11px]">Relevance Hypothesis:</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">{notes.oneLineRelevanceHypothesis}</p>
                </div>
              )}
            </div>
          </div>

          {/* Score History Timeline */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3.5">
              <History className="w-4 h-4 text-amber-400" />
              Score History & Rationale Audit Trail
            </h3>

            {(!lead.scoreHistory || lead.scoreHistory.length === 0) ? (
              <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/[0.06] text-center text-xs text-slate-500 italic">
                No score events recorded yet for this prospect.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                {lead.scoreHistory.map((h) => (
                  <div key={h.id} className="relative pl-7 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-dark-900 shadow-sm shadow-emerald-400/50" />
                    <div className="bg-dark-850/90 p-3.5 rounded-xl border border-white/[0.08] shadow-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{h.triggerEvent.replace(/_/g, ' ')}</span>
                        <span className={`font-mono font-extrabold ${h.delta > 0 ? 'text-emerald-400' : h.delta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {h.delta > 0 ? `+${h.delta}` : h.delta} pts ({h.previousScore} &rarr; {h.newScore})
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{h.reason}</p>
                      <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
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
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3.5">
              <Mail className="w-4 h-4 text-blue-400" />
              Raw Email Events Store (Discrete Log)
            </h3>

            {(!lead.events || lead.events.length === 0) ? (
              <div className="p-4 bg-dark-850/80 rounded-2xl border border-white/[0.06] text-center text-xs text-slate-500 italic">
                No email events recorded yet. Click "Send Appendix A Email" to dispatch outreach.
              </div>
            ) : (
              <div className="space-y-2.5">
                {lead.events.map((ev) => (
                  <div key={ev.id} className="bg-dark-850/90 p-3.5 rounded-xl border border-white/[0.08] text-xs flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{ev.eventType}</span>
                        {ev.messageId && (
                          <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs">{ev.messageId}</span>
                        )}
                      </div>
                      {ev.payload?.subject && (
                        <p className="text-slate-300 text-[11px] truncate max-w-sm mt-1">
                          Subject: &ldquo;{ev.payload.subject}&rdquo;
                        </p>
                      )}
                      {ev.payload?.intent && (
                        <p className="text-emerald-400 text-[11px] mt-1 font-semibold">
                          Classified Intent: {ev.payload.intent} ({(ev.payload.confidence * 100).toFixed(0)}% confidence)
                        </p>
                      )}
                      {ev.payload?.ipHash && (
                        <p className="text-slate-500 text-[10px] font-mono mt-1">
                          Client IP Hash: {ev.payload.ipHash} (GDPR-hashed)
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
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