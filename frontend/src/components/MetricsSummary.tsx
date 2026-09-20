import React from 'react';
import { PipelineMetrics } from '../services/api';
import { Users, Send, Eye, MessageSquare, Award } from 'lucide-react';

interface MetricsSummaryProps {
  metrics: PipelineMetrics | null;
  loading: boolean;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-pulse h-24" />
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
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Contacted',
      value: metrics.byStatus.contacted + metrics.byStatus.opened + metrics.byStatus.replied,
      icon: Send,
      subtext: `${metrics.byStatus.contacted} waiting for open`,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Open Rate',
      value: `${metrics.rates.openRatePercent}%`,
      icon: Eye,
      subtext: `${metrics.byStatus.opened + metrics.byStatus.replied} tracked opens`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'Reply Rate',
      value: `${metrics.rates.replyRatePercent}%`,
      icon: MessageSquare,
      subtext: `${metrics.byStatus.replied} prospect replies`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Average Lead Score',
      value: `${metrics.rates.averageScore} / 100`,
      icon: Award,
      subtext: `${metrics.byTier.hot} Hot | ${metrics.byTier.warm} Warm | ${metrics.byTier.cold} Cold`,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-400 mt-1">{card.subtext}</div>
          </div>
        );
      })}
    </div>
  );
};
