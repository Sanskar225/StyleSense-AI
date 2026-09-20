import React, { useState } from 'react';
import { Lead, api } from '../services/api';
import { X, MessageSquare, Sparkles, CheckCircle2, AlertCircle, Send, Check } from 'lucide-react';

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
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Interested (High Intent)</span>;
      case 'needs_info':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Needs Info / Questions</span>;
      case 'not_now':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Not Now / Delay</span>;
      case 'wrong_person':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Wrong Person / Referral</span>;
      case 'unsubscribe':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">Unsubscribe / Suppress</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{intent}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Simulate Inbound Reply & Intent Classifier</h3>
            <p className="text-xs text-gray-500">
              Simulating prospect response from <span className="font-semibold text-gray-700">{lead.firstName} {lead.lastName}</span> ({lead.company.name})
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {!result ? (
            <form onSubmit={handleSimulate} className="space-y-4">
              {/* Quick sample chips */}
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Or load quick sample scenario:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickSamples.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(sample.text)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-gray-600 text-xs transition-colors"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Prospect Inbound Reply Text
                </label>
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Paste email reply from prospect here..."
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Classifying Intent & Drafting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Classify Reply & Draft Response</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Classification and Contextual Draft Result */
            <div className="space-y-4">
              {/* Result Banner */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-gray-900 text-sm">Classification Completed</span>
                  </div>
                  {getIntentBadge(result.classification.intent)}
                </div>

                <div className="text-xs text-gray-600 space-y-1 mt-2">
                  <div>
                    <span className="font-semibold text-gray-700">Model Confidence:</span> {(result.classification.confidence * 100).toFixed(0)}%
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Suggested Salesperson Action:</span> {result.classification.suggestedAction}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Score Impact:</span>{' '}
                    <span className={`font-bold ${result.scoreDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.scoreDelta > 0 ? `+${result.scoreDelta}` : result.scoreDelta} pts &rarr; New Score: {result.newScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Drafted Response Card */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI-Drafted Response (For Human Salesperson Approval)
                  </span>
                  <span className="text-[10px] text-gray-400">Contextual Brand Voice</span>
                </div>

                <div className="text-xs font-semibold text-gray-700 mb-1">
                  Subject: <span className="text-gray-900">{result.classification.draftedResponse.subject}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg text-gray-800 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {result.classification.draftedResponse.body}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
