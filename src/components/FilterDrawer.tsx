import React from 'react';
import { SearchFilterParams, SearchType } from '../types';
import { SlidersHorizontal, X, Globe, Calendar, Layers, ShieldAlert, HardDrive } from 'lucide-react';

const FILE_HOST_PRESETS = [
  { label: 'Gofile', domain: 'gofile.io' },
  { label: 'Archive.org', domain: 'archive.org' },
  { label: 'MediaFire', domain: 'mediafire.com' },
  { label: 'HuggingFace', domain: 'huggingface.co' },
  { label: 'MEGA', domain: 'mega.nz' },
  { label: 'Zenodo', domain: 'zenodo.org' },
];

interface FilterDrawerProps {
  filters: SearchFilterParams;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilterParams>>;
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  filters,
  setFilters,
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-6 sm:p-8 bg-white border border-gray-100 rounded-3xl shadow-lg animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-black" />
          <h3 className="font-semibold text-sm text-gray-900 tracking-tight">Search & Extraction Settings</h3>
        </div>

        <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search Mode & Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-black" />
            Algorithm Type
          </label>
          <select
            value={filters.type || 'auto'}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as SearchType })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 focus:outline-none focus:border-black font-medium"
          >
            <option value="auto">Auto (Balanced Speed & Quality ~1s)</option>
            <option value="fast">Fast (~450ms Latency)</option>
            <option value="instant">Instant (~250ms Real-time)</option>
            <option value="deep-lite">Deep Lite (Synthesized Output)</option>
            <option value="deep">Deep (Multi-step Research 4-15s)</option>
            <option value="deep-reasoning">Deep Reasoning (Maximum Reasoning 12-40s)</option>
          </select>
        </div>

        {/* Include Domains */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-black" />
            Include Domains
          </label>
          <input
            type="text"
            placeholder="e.g. gofile.io, archive.org"
            value={filters.includeDomains?.join(', ') || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                includeDomains: e.target.value
                  ? e.target.value.split(',').map((d) => d.trim()).filter(Boolean)
                  : undefined,
              })
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 focus:outline-none focus:border-black placeholder:text-gray-400 mb-2"
          />
          <div className="flex flex-wrap gap-1">
            {FILE_HOST_PRESETS.map((preset) => {
              const isSelected = filters.includeDomains?.includes(preset.domain);
              return (
                <button
                  key={preset.domain}
                  type="button"
                  onClick={() => {
                    const current = filters.includeDomains || [];
                    const next = isSelected
                      ? current.filter((d) => d !== preset.domain)
                      : [...current, preset.domain];
                    setFilters({
                      ...filters,
                      includeDomains: next.length > 0 ? next : undefined,
                    });
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exclude Domains */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
            Exclude Domains
          </label>
          <input
            type="text"
            placeholder="e.g. pinterest.com, spam.com"
            value={filters.excludeDomains?.join(', ') || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                excludeDomains: e.target.value
                  ? e.target.value.split(',').map((d) => d.trim()).filter(Boolean)
                  : undefined,
              })
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 focus:outline-none focus:border-black placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Date Filters & Crawl Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-black" />
            Start Published Date
          </label>
          <input
            type="date"
            value={filters.startPublishedDate || ''}
            onChange={(e) => setFilters({ ...filters, startPublishedDate: e.target.value || undefined })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 focus:outline-none focus:border-black font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Number of Results</label>
          <select
            value={filters.numResults || 20}
            onChange={(e) => setFilters({ ...filters, numResults: Number(e.target.value) })}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 focus:outline-none focus:border-black font-medium"
          >
            <option value={10}>10 Results</option>
            <option value={20}>20 Results (Recommended)</option>
            <option value={30}>30 Results</option>
            <option value={50}>50 Results</option>
          </select>
        </div>

        {/* Live Media Extraction Toggle */}
        <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
          <div>
            <span className="text-xs font-semibold text-gray-900 block">Live Media Crawler</span>
            <span className="text-[11px] text-gray-400">Extract OpenGraph, HTML5 & videos</span>
          </div>

          <button
            type="button"
            onClick={() => setFilters({ ...filters, enableCrawl: !filters.enableCrawl })}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              filters.enableCrawl !== false ? 'bg-black' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                filters.enableCrawl !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onApplyFilters();
            onClose();
          }}
          className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded-full shadow-sm transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};
