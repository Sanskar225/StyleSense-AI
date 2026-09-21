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
  Calendar, 
  UserCheck 
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                tier === 'HOT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                tier === 'WARM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {tier} ({score} / 100)
              </span>
            </div>
            <p className="text-sm text-gray-700 font-medium mt-1">
              {lead.jobTitle} &bull; <span className="text-emerald-700 font-semibold">{lead.company.name}</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{lead.email}</span>
              <span>&bull;</span>
              <span>{lead.company.region}</span>
              <span>&bull;</span>
              <span>{lead.company.sizeRange} employees</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
            {lead.status === 'DISCOVERED' && (
              <button
                onClick={() => onSendEmail(lead)}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Mail className="w-4 h-4" /> Send Appendix A Email
              </button>
            )}

            {lead.status === 'CONTACTED' && (
              <button
                onClick={() => onSimulateOpen(lead)}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Eye className="w-4 h-4" /> Track Pixel Open (+15 pts)
              </button>
            )}

            {lead.status !== 'UNSUBSCRIBED' && (
              <button
                onClick={() => onSimulateReply(lead)}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Simulate Prospect Reply
              </button>
            )}

            <button
              onClick={() => onRecomputeScore(lead)}
              disabled={isRecomputing}
              className="px-3.5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Deterministically recompute this lead's score from the raw event history"
            >
              <History className={`w-4 h-4 text-gray-500 ${isRecomputing ? 'animate-spin' : ''}`} />
              <span>Recompute Score</span>
            </button>
          </div>

          {/* Score Breakdown (Fit vs Engagement) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Score Breakdown & Formula
              </h3>
              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-900">{score}</span>
                <span className="text-xs text-gray-500"> / 100 max</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">ICP Fit Score</span>
                  <span className="text-emerald-700 font-bold">{fitScore} / 50</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(fitScore / 50) * 100}%` }} />
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  Role: {lead.jobTitle} &bull; {lead.company.sizeRange} emp &bull; {lead.company.region}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Engagement Score</span>
                  <span className="text-indigo-700 font-bold">{engScore} / 50</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(engScore / 50) * 100}%` }} />
                </div>
                <div className="text-[11px] text-gray-500 mt-2">
                  Delivered (+5) &bull; Opened (+15) &bull; Replied (+30)
                </div>
              </div>
            </div>
          </div>

          {/* Deliverability, Tracking & Compliance Center (Section 3.2) */}
          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Deliverability & Compliance Center (CAN-SPAM / GDPR)
              </h3>
              {lead.status === 'UNSUBSCRIBED' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Suppressed (Score: 0)
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Opt-In Active
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Tracking Token & Pixel Links */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center text-gray-600 mb-2">
                  <span className="font-semibold text-[11px]">Unique Tracking Token:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {lead.trackingToken}
                    </span>
                    <button
                      onClick={handleCopyToken}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                      title="Copy Tracking Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-[11px]">
                  <a
                    href={`/api/tracking/pixel/${lead.trackingToken}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3 h-3" /> Test 1x1 Pixel Hit ↗
                  </a>
                  <a
                    href={`/api/tracking/unsubscribe/${lead.trackingToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Unsubscribe Page ↗
                  </a>
                </div>
              </div>

              {/* Compliance Enforcement Status */}
              {lead.status === 'UNSUBSCRIBED' ? (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <div className="font-bold text-rose-800 flex items-center gap-1.5 mb-1 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Non-Bypassable Suppression Gate: ACTIVE</span>
                  </div>
                  <p className="text-rose-700 text-[11px] leading-relaxed">
                    Lead is recorded in <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-[10px]">suppression_list</code>. All outreach sends are blocked before reaching any email provider with <strong>HTTP 409 Conflict</strong>.
                  </p>
                  <div className="mt-2.5">
                    <button
                      onClick={() => onTestSendSuppressed(lead)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Test Send (Verify 409 Block Live)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-emerald-800 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>CAN-SPAM Verified & Ready</span>
                    </div>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      Footer includes physical address & RFC 8058 1-click opt-out header.
                    </p>
                  </div>
                  <button
                    onClick={() => onSimulateUnsubscribe(lead)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-semibold text-[11px] transition-colors shrink-0 shadow-2xs"
                  >
                    Simulate Opt-Out 🛑
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grounded Research & Appendix A Signals */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Appendix A Grounded Research Signals
              </h3>
              {lead.sourceUrl && (
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold"
                >
                  <span>Verified Citation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="font-semibold text-gray-700">Observed Signal (Research):</span>
                <p className="text-gray-800 mt-1 italic leading-relaxed">
                  &ldquo;{notes.observedSignalSentence || notes.observedSignalShort || 'Grounded trade publication signal'}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-700 block text-[11px]">Pain Point Category:</span>
                  <p className="text-emerald-700 font-bold mt-0.5">{notes.painPointCategory || 'Inventory Allocation'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-700 block text-[11px]">Mapped Capability:</span>
                  <p className="text-indigo-700 font-bold mt-0.5">{notes.valuePropForPainPoint || 'Demand Forecasting'}</p>
                </div>
              </div>

              {notes.oneLineRelevanceHypothesis && (
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-700 block text-[11px]">Relevance Hypothesis:</span>
                  <p className="text-gray-600 mt-0.5 leading-relaxed">{notes.oneLineRelevanceHypothesis}</p>
                </div>
              )}
            </div>
          </div>

          {/* Score History Timeline (Audit Trail) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-3">
              <History className="w-4 h-4 text-amber-600" />
              Score History & Rationale Audit Trail
            </h3>

            {(!lead.scoreHistory || lead.scoreHistory.length === 0) ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                No score events recorded yet for this prospect.
              </div>
            ) : (
              <div className="space-y-2.5 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {lead.scoreHistory.map((h) => (
                  <div key={h.id} className="relative pl-7 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">{h.triggerEvent.replace(/_/g, ' ')}</span>
                        <span className={`font-extrabold ${h.delta > 0 ? 'text-emerald-600' : h.delta < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                          {h.delta > 0 ? `+${h.delta}` : h.delta} pts ({h.previousScore} &rarr; {h.newScore})
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{h.reason}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw Email Events Store (Discrete Log) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-3">
              <Mail className="w-4 h-4 text-blue-600" />
              Raw Email Events Store (Discrete Log)
            </h3>

            {(!lead.events || lead.events.length === 0) ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 italic">
                No email events recorded yet. Click "Send Appendix A Email" to dispatch outreach.
              </div>
            ) : (
              <div className="space-y-2">
                {lead.events.map((ev) => (
                  <div key={ev.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{ev.eventType}</span>
                        {ev.messageId && (
                          <span className="font-mono text-[10px] text-gray-400 truncate max-w-xs">{ev.messageId}</span>
                        )}
                      </div>
                      {ev.payload?.subject && (
                        <p className="text-gray-600 text-[11px] truncate max-w-sm mt-0.5">
                          Subject: &ldquo;{ev.payload.subject}&rdquo;
                        </p>
                      )}
                      {ev.payload?.intent && (
                        <p className="text-emerald-700 text-[11px] mt-0.5 font-semibold">
                          Classified Intent: {ev.payload.intent} ({(ev.payload.confidence * 100).toFixed(0)}% confidence)
                        </p>
                      )}
                      {ev.payload?.ipHash && (
                        <p className="text-gray-400 text-[10px] font-mono mt-0.5">
                          Client IP Hash: {ev.payload.ipHash} (GDPR-hashed)
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
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