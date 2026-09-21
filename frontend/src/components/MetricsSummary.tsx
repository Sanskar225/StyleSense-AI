import React from 'react';
import { PipelineMetrics } from '../services/api';
import { Users, Send, Eye, MessageSquare, Award, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';

interface MetricsSummaryProps {
  metrics: PipelineMetrics | null;
  loading: boolean;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="bg-dark-850/60 border border-white/[0.06] rounded-2xl p-4.5 animate-pulse h-28" 
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Pipeline Leads',
      value: metrics.totalLeads,
      icon: Users,
      subtext: `${metrics.byStatus.discovered} newly discovered`,
      badge: 'Active ICP',
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      gradientBorder: 'from-blue-500/30 via-transparent to-transparent'
    },
    {
      title: 'Outreach Contacted',
      value: metrics.byStatus.contacted + metrics.byStatus.opened + metrics.byStatus.replied,
      icon: Send,
      subtext: `${metrics.byStatus.contacted} awaiting open`,
      badge: 'Dispatched',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      gradientBorder: 'from-purple-500/30 via-transparent to-transparent'
    },
    {
      title: 'Email Open Rate',
      value: `${metrics.rates.openRatePercent}%`,
      icon: Eye,
      subtext: `${metrics.byStatus.opened + metrics.byStatus.replied} discrete pixel hits`,
      badge: '1x1 GIF Tracked',
      badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      gradientBorder: 'from-indigo-500/30 via-transparent to-transparent'
    },
    {
      title: 'Prospect Reply Rate',
      value: `${metrics.rates.replyRatePercent}%`,
      icon: MessageSquare,
      subtext: `${metrics.byStatus.replied} classified replies`,
      badge: '100% LLM F1',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      gradientBorder: 'from-emerald-500/30 via-transparent to-transparent'
    },
    {
      title: 'Average Lead Score',
      value: `${metrics.rates.averageScore}`,
      subValue: '/ 100',
      icon: Award,
      subtext: `${metrics.byTier.hot} Hot · ${metrics.byTier.warm} Warm · ${metrics.byTier.cold} Cold`,
      badge: 'Dynamic ICP',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      gradientBorder: 'from-amber-500/30 via-transparent to-transparent'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="group relative bg-dark-850/80 hover:bg-dark-800/90 border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4.5 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Top subtle glow line */}
            <div className={`absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r ${card.gradientBorder}`} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.iconBg} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {card.value}
              </span>
              {card.subValue && (
                <span className="text-xs font-medium text-slate-400">
                  {card.subValue}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.05]">
              <span className="text-slate-400 truncate">
                {card.subtext}
              </span>
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold border shrink-0 ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};