import React, { useState } from 'react';
import { Lead, api } from '../services/api';
import { X, MessageSquare, Sparkles, CheckCircle2, AlertCircle, Send, Check, Terminal, Bot } from 'lucide-react';

interface SimulateReplyModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onReplyProcessed: () => void;
}

export const SimulateReplyModal: React.FC<SimulateReplyModalProps> = ({
  lead,
  isOpen,
  onClose,
  onReplyProcessed
}) => {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const quickSamples = [
    {
      label: 'Interested (Meeting)',
      text: `Hi Sanskar, thanks for reaching out. We actually just wrapped our Q3 review and markdown pressures on our seasonal collection is a huge issue. Can we connect this Thursday at 2pm ET?`
    },
    {
      label: 'Needs Info (One-Pager)',
      text: `Could you share a one-pager on how StyleSense AI integrates with Shopify Plus and NetSuite? What historical sales and POS data do you require?`
    },
    {
      label: 'Not Now (Budget Freeze)',
      text: `Thanks for the email Sanskar. We just finalized our tech budget freeze for Q4, so we aren't reviewing any new SaaS tools right now. Check back with me in February.`
    },
    {
      label: 'Wrong Person (Referral)',
      text: `I actually transitioned over to Brand Marketing last month. You should reach out to Sarah Jenkins who leads Demand Planning & Merchandising.`
    },
    {
      label: 'Unsubscribe (Opt-out)',
      text: `Please remove my name and email from your outreach list immediately. Do not contact me again.`
    }
  ];

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.simulateReply(lead.id, replyText);
      setResult(res.data);
      onReplyProcessed();
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to process reply simulation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setReplyText('');
    setError(null);
    onClose();
  };

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'interested':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">Interested (High Intent)</span>;
      case 'needs_info':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">Needs Info / Questions</span>;
      case 'not_now':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Not Now / Delay</span>;
      case 'wrong_person':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">Wrong Person / Referral</span>;
      case 'unsubscribe':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Unsubscribe / Suppress</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">{intent}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-white/[0.1] rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Simulate Inbound Reply & Intent Classifier
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulating prospect reply from <span className="font-semibold text-slate-200">{lead.firstName} {lead.lastName}</span> ({lead.company.name})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {!result ? (
            <form onSubmit={handleSimulate} className="space-y-4">
              {/* Quick sample chips */}
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Select a test buyer persona:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickSamples.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(sample.text)}
                      className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-dark-850 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300 text-slate-300 text-xs transition-all"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Prospect Inbound Reply Text
                </label>
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Paste prospect email reply here or select a quick sample above..."
                  className="w-full p-4 bg-dark-950 border border-white/[0.08] hover:border-white/[0.14] focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Classifying Intent...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Classify & Record Reply (+30 pts)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Result Screen */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Intent Card */}
              <div className="bg-dark-850 p-4 rounded-2xl border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase font-mono">Predicted Intent:</span>
                  {getIntentBadge(result.classification.intent)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-dark-900 p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-slate-500 block font-mono text-[10px]">Model Confidence:</span>
                    <span className="text-lg font-bold text-white font-mono">
                      {(result.classification.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-dark-900 p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-slate-500 block font-mono text-[10px]">Detected Sentiment:</span>
                    <span className="text-lg font-bold text-emerald-400 capitalize">
                      {result.classification.sentiment || 'Positive'}
                    </span>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  <strong className="text-slate-300">Reasoning:</strong> {result.classification.reasoning}
                </p>
              </div>

              {/* Status & Score Update */}
              <div className="bg-dark-850 p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs block font-mono">Outreach Status & Score Delta:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-white text-sm">{result.newStatus}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                      +{result.scoreDelta} pts
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] block font-mono">New Score:</span>
                  <span className="text-2xl font-black text-white font-mono">{result.newScore} / 100</span>
                </div>
              </div>

              {/* Auto-Drafted AI Response */}
              {result.draftResponse && (
                <div className="bg-dark-850 p-4 rounded-2xl border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Auto-Drafted Response for Salesperson:
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Ready to Review
                    </span>
                  </div>
                  <div className="bg-dark-950 p-3.5 rounded-xl border border-white/[0.06] font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {result.draftResponse.body}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-xs font-bold text-dark-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};