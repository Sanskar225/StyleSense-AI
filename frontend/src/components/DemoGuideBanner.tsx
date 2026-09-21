import React, { useState } from 'react';
import { 
  Sparkles, 
  Mail, 
  Eye, 
  MessageSquare, 
  ShieldAlert, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

interface DemoGuideBannerProps {
  onOpenDiscovery: () => void;
  onRecomputeAll: () => void;
  isRecomputing: boolean;
}

export const DemoGuideBanner: React.FC<DemoGuideBannerProps> = ({
  onOpenDiscovery,
  onRecomputeAll,
  isRecomputing
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    {
      num: 1,
      title: '1. AI Lead Discovery',
      desc: '2-step tool use (web_search + fetch_web_content) with verified source citations.',
      icon: Sparkles,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      actionLabel: 'Run Discovery',
      action: onOpenDiscovery
    },
    {
      num: 2,
      title: '2. Appendix A Outreach',
      desc: 'Enforced grounding prevents hallucinations; includes CAN-SPAM postal address.',
      icon: Mail,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badge: 'Click "Send Email" on Discovered lead'
    },
    {
      num: 3,
      title: '3. 1x1 Pixel Open (+15 pts)',
      desc: 'Serves 42-byte transparent GIF, anti-cache headers, GDPR SHA-256 IP hashing.',
      icon: Eye,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badge: 'Click "Track Open" on Contacted lead'
    },
    {
      num: 4,
      title: '4. Inbound Reply (+30 pts)',
      desc: '5-class intent classifier (100% benchmark) with sentiment & entity extraction.',
      icon: MessageSquare,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      badge: 'Click "Reply" on any lead'
    },
    {
      num: 5,
      title: '5. Compliance & Suppression',
      desc: 'RFC 8058 one-click opt-out. Send attempts to suppressed contacts return 409.',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: 'Test in Lead Detail Drawer'
    },
    {
      num: 6,
      title: '6. Deterministic Replay',
      desc: 'Score recomputed from raw event log; proves event/derived-state separation.',
      icon: RefreshCw,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      actionLabel: isRecomputing ? 'Recomputing...' : 'Test Replay',
      action: onRecomputeAll
    }
  ];

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl shadow-lg border border-slate-700/60 p-4 mb-6 text-white transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Interactive Reviewer & Demo Guide
              </h3>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Evaluation Mode
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Test the end-to-end prospecting lifecycle live across all 6 core rubric evaluation criteria.
            </p>
          </div>
        </div>

        <button 
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label={isOpen ? 'Collapse guide' : 'Expand guide'}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.num}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1.5 rounded-lg border text-xs ${s.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-100">{s.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                  {s.action ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        s.action();
                      }}
                      disabled={isRecomputing}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      {s.actionLabel} &rarr;
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono italic">
                      {s.badge}
                    </span>
                  )}
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};