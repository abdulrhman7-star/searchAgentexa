import React, { useState } from 'react';
import {
  FilePlatform,
} from '../../lib/providers/file-provider';
import {
  Filter,
  Shield,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Globe,
  HardDrive,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
} from 'lucide-react';

export interface FileFilterState {
  platforms: FilePlatform[];
  fileTypes: string[];
  minSizeMb?: number;
  maxSizeMb?: number;
  dateAdded: 'any' | '24h' | 'week' | 'month' | 'year' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  language: 'any' | 'en' | 'ar';
  hideFlagged: boolean;
  sort: 'relevance' | 'newest' | 'size' | 'popularity';
}

interface FileFilterBarProps {
  filters: FileFilterState;
  onChange: (filters: FileFilterState) => void;
  onSearchAgain?: () => void;
  isSearching?: boolean;
}

const PLATFORMS: { id: FilePlatform; label: string; iconColor: string }[] = [
  { id: 'archive', label: 'Archive.org', iconColor: 'text-amber-600' },
  { id: 'gofile', label: 'Gofile', iconColor: 'text-emerald-600' },
  { id: 'mediafire', label: 'MediaFire', iconColor: 'text-blue-600' },
  { id: 'gdrive', label: 'Google Drive (public)', iconColor: 'text-yellow-600' },
  { id: 'dropbox', label: 'Dropbox (public)', iconColor: 'text-sky-600' },
  { id: 'mega', label: 'Mega.nz', iconColor: 'text-red-600' },
  { id: '4shared', label: '4shared', iconColor: 'text-indigo-600' },
  { id: 'web', label: 'Any / Open Web', iconColor: 'text-gray-600' },
];

const FILE_TYPE_GROUPS = [
  {
    category: 'Documents',
    types: [
      { id: 'pdf', label: 'PDF' },
      { id: 'doc', label: 'DOC/DOCX', aliases: ['doc', 'docx'] },
      { id: 'xls', label: 'XLS/XLSX', aliases: ['xls', 'xlsx'] },
      { id: 'ppt', label: 'PPT/PPTX', aliases: ['ppt', 'pptx'] },
      { id: 'epub', label: 'EPUB' },
      { id: 'txt', label: 'TXT' },
    ],
  },
  {
    category: 'Archives & Images',
    types: [
      { id: 'zip', label: 'ZIP' },
      { id: 'rar', label: 'RAR' },
      { id: '7z', label: '7Z' },
      { id: 'tar.gz', label: 'TAR.GZ' },
      { id: 'iso', label: 'ISO' },
      { id: 'dmg', label: 'DMG' },
    ],
  },
  {
    category: 'Media',
    types: [
      { id: 'mp3', label: 'MP3' },
      { id: 'mp4', label: 'MP4' },
      { id: 'mkv', label: 'MKV' },
    ],
  },
  {
    category: 'Software & OS',
    types: [
      { id: 'apk', label: 'APK' },
      { id: 'exe', label: 'EXE' },
      { id: 'msi', label: 'MSI' },
      { id: 'deb', label: 'DEB' },
      { id: 'rpm', label: 'RPM' },
    ],
  },
  {
    category: 'Data & P2P',
    types: [
      { id: 'torrent', label: 'TORRENT' },
      { id: 'json', label: 'JSON' },
      { id: 'xml', label: 'XML' },
      { id: 'csv', label: 'CSV' },
    ],
  },
];

export const FileFilterBar: React.FC<FileFilterBarProps> = ({
  filters,
  onChange,
  onSearchAgain,
  isSearching = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const activeFiltersCount =
    (filters.platforms.length > 0 ? 1 : 0) +
    (filters.fileTypes.length > 0 ? 1 : 0) +
    (filters.minSizeMb || filters.maxSizeMb ? 1 : 0) +
    (filters.dateAdded !== 'any' ? 1 : 0) +
    (filters.language !== 'any' ? 1 : 0) +
    (filters.sort !== 'relevance' ? 1 : 0) +
    (!filters.hideFlagged ? 1 : 0);

  const togglePlatform = (platform: FilePlatform) => {
    let next: FilePlatform[];
    if (filters.platforms.includes(platform)) {
      next = filters.platforms.filter((p) => p !== platform);
    } else {
      next = [...filters.platforms, platform];
    }
    onChange({ ...filters, platforms: next });
  };

  const toggleFileType = (typeId: string, aliases?: string[]) => {
    const all = aliases ? [typeId, ...aliases] : [typeId];
    const isSelected = filters.fileTypes.some((t) => all.includes(t.toLowerCase()));

    let next: string[];
    if (isSelected) {
      next = filters.fileTypes.filter((t) => !all.includes(t.toLowerCase()));
    } else {
      next = [...filters.fileTypes, ...all];
    }
    onChange({ ...filters, fileTypes: next });
  };

  const isTypeActive = (typeId: string, aliases?: string[]) => {
    const all = aliases ? [typeId, ...aliases] : [typeId];
    return filters.fileTypes.some((t) => all.includes(t.toLowerCase()));
  };

  const resetFilters = () => {
    onChange({
      platforms: [],
      fileTypes: [],
      minSizeMb: undefined,
      maxSizeMb: undefined,
      dateAdded: 'any',
      customStartDate: undefined,
      customEndDate: undefined,
      language: 'any',
      hideFlagged: true,
      sort: 'relevance',
    });
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 overflow-hidden transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/80 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-black text-white rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm text-gray-900">Files & Documents Filter Engine</span>
            <span className="ml-2 text-xs text-gray-500 hidden sm:inline">
              Multi-host discovery across Archive.org, Gofile, MediaFire, Cloud drives, and open web
            </span>
          </div>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-black text-white rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              id="btn-reset-file-filters"
              onClick={resetFilters}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-gray-200 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {onSearchAgain && (
            <button
              id="btn-apply-file-search"
              onClick={onSearchAgain}
              disabled={isSearching}
              className="text-xs font-medium bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSearching ? 'Filtering...' : 'Apply Filters'}
            </button>
          )}

          <button
            id="btn-toggle-filter-bar"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-200"
            aria-label="Toggle Filter Bar"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-5 divide-y divide-gray-100 text-xs sm:text-sm">
          {/* 1. Host Platforms Multi-Select */}
          <div className="pt-0">
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-semibold text-gray-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span>Host Platform</span>
                <span className="text-gray-400 font-normal text-xs">(multi-select)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, platforms: [] })}
                  className={`text-xs ${
                    filters.platforms.length === 0 ? 'text-black font-semibold' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  All Platforms
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((plat) => {
                const selected = filters.platforms.includes(plat.id);
                return (
                  <button
                    key={plat.id}
                    id={`filter-plat-${plat.id}`}
                    type="button"
                    onClick={() => togglePlatform(plat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border text-xs font-medium transition-all ${
                      selected
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        selected ? 'bg-white text-black border-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{plat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. File Types Multi-Select Chips */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-gray-500" />
                <span>File Types & Formats</span>
                <span className="text-gray-400 font-normal text-xs">(multi-select chips)</span>
              </label>
              {filters.fileTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, fileTypes: [] })}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Clear types
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {FILE_TYPE_GROUPS.map((group) => (
                <div key={group.category} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 w-24 shrink-0 uppercase tracking-wider">
                    {group.category}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.types.map((ft) => {
                      const active = isTypeActive(ft.id, ft.aliases);
                      return (
                        <button
                          key={ft.id}
                          id={`filter-ft-${ft.id}`}
                          type="button"
                          onClick={() => toggleFileType(ft.id, ft.aliases)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            active
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {ft.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Size Range, Date Added, Language, Safety & Sort Controls */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Size Range */}
            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs">
                Size Range (MB)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="input-min-size"
                  type="number"
                  placeholder="Min MB"
                  min="0"
                  value={filters.minSizeMb !== undefined ? filters.minSizeMb : ''}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      minSizeMb: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                />
                <span className="text-gray-400">–</span>
                <input
                  id="input-max-size"
                  type="number"
                  placeholder="Max MB"
                  min="0"
                  value={filters.maxSizeMb !== undefined ? filters.maxSizeMb : ''}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      maxSizeMb: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              {/* Quick Size Presets */}
              <div className="flex gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, minSizeMb: undefined, maxSizeMb: 10 })}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                >
                  &lt;10MB
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, minSizeMb: 10, maxSizeMb: 100 })}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                >
                  10-100MB
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, minSizeMb: 100, maxSizeMb: undefined })}
                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                >
                  &gt;100MB
                </button>
              </div>
            </div>

            {/* Date Added */}
            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>Date Added / Uploaded</span>
              </label>
              <select
                id="select-date-added"
                value={filters.dateAdded}
                onChange={(e) =>
                  onChange({ ...filters, dateAdded: e.target.value as FileFilterState['dateAdded'] })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="any">Any Date</option>
                <option value="24h">Past 24 hours</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {filters.dateAdded === 'custom' && (
                <div className="mt-2 flex gap-1">
                  <input
                    type="date"
                    value={filters.customStartDate || ''}
                    onChange={(e) => onChange({ ...filters, customStartDate: e.target.value })}
                    className="w-1/2 px-2 py-1 text-[11px] border border-gray-200 rounded"
                  />
                  <input
                    type="date"
                    value={filters.customEndDate || ''}
                    onChange={(e) => onChange({ ...filters, customEndDate: e.target.value })}
                    className="w-1/2 px-2 py-1 text-[11px] border border-gray-200 rounded"
                  />
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-gray-500" />
                <span>Language</span>
              </label>
              <div className="flex gap-1.5">
                {[
                  { id: 'any', label: 'Any' },
                  { id: 'en', label: 'English' },
                  { id: 'ar', label: 'العربية' },
                ].map((l) => (
                  <button
                    key={l.id}
                    id={`filter-lang-${l.id}`}
                    type="button"
                    onClick={() => onChange({ ...filters, language: l.id as any })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      filters.language === l.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Safety Checkbox */}
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="checkbox-hide-flagged"
                    type="checkbox"
                    checked={filters.hideFlagged}
                    onChange={(e) => onChange({ ...filters, hideFlagged: e.target.checked })}
                    className="w-3.5 h-3.5 text-black rounded border-gray-300 focus:ring-black"
                  />
                  <Shield className={`w-3.5 h-3.5 ${filters.hideFlagged ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-xs text-gray-700 font-medium">Hide flagged / copyright-risky</span>
                </label>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="font-semibold text-gray-800 block mb-1.5 text-xs flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span>Sort Order</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'newest', label: 'Newest' },
                  { id: 'size', label: 'Size (Desc)' },
                  { id: 'popularity', label: 'Popularity' },
                ].map((s) => (
                  <button
                    key={s.id}
                    id={`filter-sort-${s.id}`}
                    type="button"
                    onClick={() => onChange({ ...filters, sort: s.id as any })}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      filters.sort === s.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
