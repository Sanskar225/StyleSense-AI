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
  Terminal, 
  Flame 
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
      num: '01',
      title: 'AI Lead Discovery',
      desc: '2-step search-then-extract (web_search + fetch_web_content) with verified source citations.',
      icon: Sparkles,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      actionLabel: 'Run Discovery',
      action: onOpenDiscovery
    },
    {
      num: '02',
      title: 'Appendix A Outreach',
      desc: 'Enforced grounding blocks hallucinations; includes CAN-SPAM physical address & RFC 8058 header.',
      icon: Mail,
      iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      badge: 'Click "Send Email" on Discovered lead'
    },
    {
      num: '03',
      title: '1x1 Pixel Open (+15 pts)',
      desc: 'Serves 42-byte binary GIF89a, anti-cache headers, GDPR SHA-256 IP hashing.',
      icon: Eye,
      iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      badge: 'Click "Track Open" on Contacted lead'
    },
    {
      num: '04',
      title: 'Inbound Reply (+30 pts)',
      desc: '5-class intent classifier (100% benchmark) with sentiment & entity extraction.',
      icon: MessageSquare,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      badge: 'Click "Reply" on any active lead'
    },
    {
      num: '05',
      title: 'Suppression Gate (409)',
      desc: 'RFC 8058 1-click opt-out. Subsequent send attempts are blocked with HTTP 409 Conflict.',
      icon: ShieldAlert,
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      badge: 'Test in Lead Detail Drawer'
    },
    {
      num: '06',
      title: 'Deterministic Replay',
      desc: 'Recomputes score from immutable raw events log; proves event/derived-state separation.',
      icon: RefreshCw,
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      actionLabel: isRecomputing ? 'Recomputing...' : 'Replay Scores',
      action: onRecomputeAll
    }
  ];

  return (
    <div className="relative bg-dark-900/90 border border-white/[0.1] rounded-2xl shadow-2xl p-4.5 mb-6 text-white backdrop-blur-xl overflow-hidden">
      {/* Background ambient neon glow */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-96 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div 
        className="flex items-center justify-between cursor-pointer select-none" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-dark-950 font-black shadow-lg shadow-emerald-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Interactive Reviewer Checklist & Lifecycle Guide
              </h3>
              <span className="text-[10px] font-mono uppercase font-bold bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Demo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify all 6 core rubric criteria live in under 60 seconds with instant feedback.
            </p>
          </div>
        </div>

        <button 
          className="p-1.5 rounded-xl hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
          aria-label={isOpen ? "Collapse guide" : "Expand guide"}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Steps Grid */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.num}
                className="group relative bg-dark-850/80 hover:bg-dark-800/90 border border-white/[0.06] hover:border-white/[0.14] rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border text-xs ${s.iconColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 tracking-wide">{s.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {s.num}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
                  {s.action ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        s.action();
                      }}
                      disabled={isRecomputing}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                      {s.actionLabel} &rarr;
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono italic">
                      {s.badge}
                    </span>
                  )}
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};