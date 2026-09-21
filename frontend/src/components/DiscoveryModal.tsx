import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle, Search, FileText, Database, Terminal } from 'lucide-react';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscover: (icp: {
    industry: string;
    region: string;
    companySize: string;
    targetTitles: string[];
  }) => Promise<void>;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ isOpen, onClose, onDiscover }) => {
  const [industry, setIndustry] = useState('Apparel & Fashion');
  const [region, setRegion] = useState('North America');
  const [companySize, setCompanySize] = useState('201-1000');
  const [titles, setTitles] = useState<string[]>([
    'Head of Merchandising',
    'VP Supply Chain',
    'Director of Demand Planning',
    'Inventory Allocation Manager'
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setError(null);

    try {
      await onDiscover({
        industry,
        region,
        companySize,
        targetTitles: titles
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete lead discovery');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/10">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              ICP Lead Discovery Agent (Section 3.4)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              2-step tool use (web_search + fetch_web_content) with verified source citations
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Vertical / Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-white/[0.08] hover:border-white/[0.14] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs text-white focus:outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="North America" className="bg-dark-900 text-white">North America</option>
                <option value="Europe" className="bg-dark-900 text-white">Europe</option>
                <option value="United Kingdom" className="bg-dark-900 text-white">United Kingdom</option>
                <option value="Global" className="bg-dark-900 text-white">Global</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Company Size Range
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="50-200" className="bg-dark-900 text-white">50–200 employees</option>
                <option value="201-1000" className="bg-dark-900 text-white">201–1,000 employees</option>
                <option value="1000+" className="bg-dark-900 text-white">1,000+ employees</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Decision-Maker Titles
            </label>
            <div className="grid grid-cols-2 gap-2">
              {titles.map((title, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-dark-950 px-3 py-2 rounded-xl border border-white/[0.06] text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Step Execution Blueprint Card */}
          <div className="bg-dark-950 p-3.5 rounded-2xl border border-white/[0.06] space-y-2 text-xs">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Tool Execution Pipeline:
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">1</span>
                <span>web_search(query: "apparel merchandising markdowns")</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">2</span>
                <span>fetch_web_content(url) ➔ Extract grounded signals</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 text-xs font-bold text-dark-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                  <span>Executing 2-Step Discovery...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run ICP Lead Discovery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};