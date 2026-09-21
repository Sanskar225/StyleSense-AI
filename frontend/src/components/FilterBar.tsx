import React from 'react';
import { Search, Sparkles, RefreshCw, X, ArrowUpDown, Filter } from 'lucide-react';
import { PipelineMetrics } from '../services/api';

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  tierFilter: string;
  onTierFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  sortOrder: string;
  onSortOrderChange: (val: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  metrics: PipelineMetrics | null;
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
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onResetFilters,
  hasActiveFilters,
  metrics,
  onOpenDiscovery,
  onRecomputeAll,
  isRecomputing
}) => {
  const statuses = [
    { label: 'All Statuses', value: '', count: metrics?.totalLeads },
    { label: 'Discovered', value: 'DISCOVERED', count: metrics?.byStatus.discovered },
    { label: 'Contacted', value: 'CONTACTED', count: metrics?.byStatus.contacted },
    { label: 'Opened', value: 'OPENED', count: metrics?.byStatus.opened },
    { label: 'Replied', value: 'REPLIED', count: metrics?.byStatus.replied },
    { label: 'Unsubscribed', value: 'UNSUBSCRIBED', count: metrics?.byStatus.unsubscribed }
  ];

  const tiers = [
    { label: 'All Tiers', value: '', count: metrics?.totalLeads },
    { label: '🔥 Hot (75-100)', value: 'HOT', count: metrics?.byTier.hot },
    { label: '⚡ Warm (45-74)', value: 'WARM', count: metrics?.byTier.warm },
    { label: '❄️ Cold (0-44)', value: 'COLD', count: metrics?.byTier.cold }
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-3.5">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by prospect, company, title, or email..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier & Sort Dropdowns & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={tierFilter}
              onChange={(e) => onTierFilterChange(e.target.value)}
              className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
            >
              {tiers.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                onSortByChange(sb);
                onSortOrderChange(so);
              }}
              className="bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="score:desc">Score (Highest First)</option>
              <option value="score:asc">Score (Lowest First)</option>
              <option value="name:asc">Name (A &rarr; Z)</option>
              <option value="company:asc">Company (A &rarr; Z)</option>
              <option value="createdAt:desc">Most Recently Added</option>
            </select>
          </div>

          {/* Clear Filters Button (conditional) */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              title="Reset all search and status filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Replay / Recompute Scores Button */}
          <button
            onClick={onRecomputeAll}
            disabled={isRecomputing}
            title="Deterministically recompute all lead scores from raw immutable event log"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isRecomputing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recompute</span>
          </button>

          {/* AI Agent Lead Discovery Button */}
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Find Leads (ICP Agent)</span>
          </button>
        </div>
      </div>

      {/* Bottom Status Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-gray-100 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Status:</span>
        {statuses.map((s) => {
          const isActive = statusFilter === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onStatusFilterChange(s.value)}
              className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{s.label}</span>
              {s.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};