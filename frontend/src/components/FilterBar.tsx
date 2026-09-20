import React from 'react';
import { Search, Sparkles, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  tierFilter: string;
  onTierFilterChange: (val: string) => void;
  onOpenDiscovery: () => void;
  onRecomputeAll: () => void;
  isRecomputing: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  onOpenDiscovery,
  onRecomputeAll,
  isRecomputing
}) => {
  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Discovered', value: 'DISCOVERED' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Opened', value: 'OPENED' },
    { label: 'Replied', value: 'REPLIED' },
    { label: 'Unsubscribed', value: 'UNSUBSCRIBED' }
  ];

  const tiers = [
    { label: 'All Tiers', value: '' },
    { label: '🔥 Hot (75-100)', value: 'HOT' },
    { label: '⚡ Warm (45-74)', value: 'WARM' },
    { label: '❄️ Cold (0-44)', value: 'COLD' }
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search prospect, company, title..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Filter Pills / Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={tierFilter}
          onChange={(e) => onTierFilterChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {tiers.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Replay / Recompute Button */}
        <button
          onClick={onRecomputeAll}
          disabled={isRecomputing}
          title="Recompute all scores from raw event history"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${isRecomputing ? 'animate-spin' : ''}`} />
          <span>Recompute</span>
        </button>

        {/* AI Agent Lead Discovery Button */}
        <button
          onClick={onOpenDiscovery}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Find Leads (ICP Agent)</span>
        </button>
      </div>
    </div>
  );
};
