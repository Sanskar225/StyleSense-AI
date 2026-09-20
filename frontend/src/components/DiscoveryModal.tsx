import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">ICP Lead Discovery Agent</h3>
            <p className="text-xs text-gray-500">2-step search-then-extract flow with source URL grounding</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Target Industry
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Company Size Range
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="50-200">50–200 employees</option>
                <option value="201-1000">201–1,000 employees</option>
                <option value="1000+">1,000+ employees</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Target Decision-Maker Titles
            </label>
            <div className="space-y-1.5">
              {titles.map((title, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
            <strong>Grounding Guarantee:</strong> Leads extracted will include verified company research citations, observed signals (markdowns, return spikes, stockouts), and initial fit score computation.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Researching Fashion Leads...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run ICP Discovery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
