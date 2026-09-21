import React from 'react';
import { Search, Sparkles, RefreshCw, X, ArrowUpDown, Filter, SlidersHorizontal } from 'lucide-react';
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
    { label: 'All Leads', value: '', count: metrics?.totalLeads },
    { label: 'Discovered', value: 'DISCOVERED', count: metrics?.byStatus.discovered },
    { label: 'Contacted', value: 'CONTACTED', count: metrics?.byStatus.contacted },
    { label: 'Opened', value: 'OPENED', count: metrics?.byStatus.opened },
    { label: 'Replied', value: 'REPLIED', count: metrics?.byStatus.replied },
    { label: 'Unsubscribed', value: 'UNSUBSCRIBED', count: metrics?.byStatus.unsubscribed }
  ];

  const tiers = [
    { label: 'All Tiers', value: '', count: metrics?.totalLeads },
    { label: '🔥 Hot (75–100)', value: 'HOT', count: metrics?.byTier.hot },
    { label: '⚡ Warm (45–74)', value: 'WARM', count: metrics?.byTier.warm },
    { label: '❄️ Cold (0–44)', value: 'COLD', count: metrics?.byTier.cold }
  ];

  return (
    <div className="bg-dark-850/80 border border-white/[0.08] p-4 rounded-2xl shadow-xl mb-6 space-y-3.5 backdrop-blur-xl">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
        {/* Search Bar with Linear/Raycast aesthetic */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by prospect, company, title, or email..."
            className="w-full pl-10 pr-16 py-2.5 bg-dark-900/90 border border-white/[0.08] hover:border-white/[0.16] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
          />
          <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/[0.1]"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Tier, Sort & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Dropdown */}
          <div className="flex items-center gap-1.5 bg-dark-900/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => onTierFilterChange(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {tiers.map((t) => (
                <option key={t.value} value={t.value} className="bg-dark-900 text-white">
                  {t.label} {t.count !== undefined ? `(${t.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-dark-900/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                onSortByChange(sb);
                onSortOrderChange(so);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="score:desc" className="bg-dark-900 text-white">Score (Highest First)</option>
              <option value="score:asc" className="bg-dark-900 text-white">Score (Lowest First)</option>
              <option value="name:asc" className="bg-dark-900 text-white">Name (A → Z)</option>
              <option value="company:asc" className="bg-dark-900 text-white">Company (A → Z)</option>
              <option value="createdAt:desc" className="bg-dark-900 text-white">Most Recently Added</option>
            </select>
          </div>

          {/* Clear Filters Button (conditional) */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors"
              title="Reset all search, status, and tier filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Replay / Recompute Button */}
          <button
            onClick={onRecomputeAll}
            disabled={isRecomputing}
            title="Deterministically recompute all lead scores from raw immutable event log"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-900/90 hover:bg-dark-800 border border-white/[0.08] hover:border-white/[0.16] text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRecomputing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Recompute</span>
          </button>

          {/* AI Agent Lead Discovery Button */}
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-dark-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Find Leads (ICP Agent)</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Pill Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-white/[0.06] scrollbar-none text-xs">
        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mr-1.5 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" />
          Filter:
        </span>
        {statuses.map((s) => {
          const isActive = statusFilter === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onStatusFilterChange(s.value)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap text-xs ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-dark-900/60 hover:bg-dark-900 text-slate-400 hover:text-slate-200 border border-white/[0.04] hover:border-white/[0.1]'
              }`}
            >
              <span>{s.label}</span>
              {s.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-white/[0.06] text-slate-400'
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