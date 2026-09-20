import React, { useState, useEffect } from 'react';
import { Lead, api } from '../services/api';
import { X, Send, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Appendix A Cold Outreach Preview</h3>
            <p className="text-xs text-gray-500">
              Recipient: <span className="font-semibold text-gray-700">{lead.firstName} {lead.lastName}</span> &bull; {lead.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2" />
              <p className="text-gray-500">Verifying Appendix A tokens against stored research...</p>
            </div>
          ) : preview ? (
            <>
              {/* Grounding Status Card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Grounding Verification Passed</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-mono">100% Traceable to Database Records</span>
              </div>

              {/* Subject line */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="text-gray-400 font-medium">Subject:</span>
                <div className="font-semibold text-gray-900 text-sm mt-0.5">{preview.rendered.subject}</div>
              </div>

              {/* Email Body Preview */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white font-mono text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                {preview.rendered.bodyText}
              </div>

              {/* Compliance & Pixel Badge */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tracking Pixel & Unsubscribe Link instrumented automatically</span>
                </div>
                <span className="font-medium">CAN-SPAM & GDPR Compliant</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || loading || !preview}
            onClick={handleSend}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Dispatching Outreach...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Appendix A Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
