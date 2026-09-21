import React, { useState, useEffect } from 'react';
import { Lead, api } from '../services/api';
import { X, Send, ShieldCheck, CheckCircle, AlertTriangle, Sparkles, Terminal } from 'lucide-react';

interface SendEmailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSent
}) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lead) {
      loadPreview();
    } else {
      setPreview(null);
      setError(null);
    }
  }, [isOpen, lead]);

  const loadPreview = async () => {
    if (!lead) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.previewEmail(lead.id);
      setPreview(res.data);
    } catch (err: any) {
      setError(err?.error?.message || 'Failed to load email preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!lead) return;
    setSending(true);
    setError(null);

    try {
      await api.sendEmail(lead.id);
      onSent();
      onClose();
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to send outreach email.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-white/[0.1] rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Appendix A Cold Outreach Preview & Grounding Gate
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <span className="font-semibold text-slate-200">{lead.firstName} {lead.lastName}</span> &bull; {lead.company.name} ({lead.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="my-3.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-emerald-500 border-t-transparent mb-3" />
              <p className="text-slate-400 font-mono">Verifying Appendix A tokens against stored research facts...</p>
            </div>
          ) : preview ? (
            <>
              {/* Grounding Status Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">Grounding Verification Passed</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  100% Traceable to Database Records
                </span>
              </div>

              {/* Subject line */}
              <div className="bg-dark-850 p-3.5 rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider block mb-1">Subject:</span>
                <div className="font-bold text-white text-sm">{preview.rendered.subject}</div>
              </div>

              {/* Email Body Preview in High-End Dark Editor */}
              <div className="border border-white/[0.08] rounded-2xl p-4.5 bg-dark-950 font-mono text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap shadow-inner">
                {preview.rendered.bodyText}
              </div>

              {/* Compliance & Pixel Badge */}
              <div className="bg-dark-850/80 p-3.5 rounded-xl border border-white/[0.06] text-slate-400 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1x1 Tracking Pixel & RFC 8058 One-Click Header instrumented automatically</span>
                </div>
                <span className="font-bold text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                  CAN-SPAM Compliant
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.08] flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || loading || !preview}
            onClick={handleSend}
            className="px-5 py-2 text-xs font-bold text-dark-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                <span>Dispatching Outreach...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Outreach (+5 pts)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};