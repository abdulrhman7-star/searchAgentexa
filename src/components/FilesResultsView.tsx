import React, { useState, useMemo } from 'react';
import { FileResult } from '../../lib/providers/file-provider';
import { FileFilterBar, FileFilterState } from './FileFilterBar';
import { FileResultCard } from './FileResultCard';
import {
  FolderArchive,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  HardDrive,
  FilterX,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface FilesResultsViewProps {
  files: FileResult[];
  loading: boolean;
  query: string;
  filters: FileFilterState;
  onFilterChange: (filters: FileFilterState) => void;
  onSearchAgain?: () => void;
}

export const FilesResultsView: React.FC<FilesResultsViewProps> = ({
  files,
  loading,
  query,
  filters,
  onFilterChange,
  onSearchAgain,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Client-side quick filter refinement in case state changes before re-fetching
  const displayedFiles = useMemo(() => {
    let result = [...files];

    // Filter by platform
    if (filters.platforms && filters.platforms.length > 0) {
      const allowedPlats = new Set(filters.platforms);
      result = result.filter((f) => allowedPlats.has(f.provider));
    }

    // Filter by file types
    if (filters.fileTypes && filters.fileTypes.length > 0) {
      const allowedTypes = new Set(filters.fileTypes.map((t) => t.toLowerCase()));
      result = result.filter((f) => {
        if (!f.ext) return true;
        return allowedTypes.has(f.ext.toLowerCase());
      });
    }

    // Filter by size
    if (filters.minSizeMb !== undefined && !isNaN(filters.minSizeMb)) {
      const minBytes = filters.minSizeMb * 1024 * 1024;
      result = result.filter((f) => f.sizeBytes === undefined || f.sizeBytes >= minBytes);
    }
    if (filters.maxSizeMb !== undefined && !isNaN(filters.maxSizeMb)) {
      const maxBytes = filters.maxSizeMb * 1024 * 1024;
      result = result.filter((f) => f.sizeBytes === undefined || f.sizeBytes <= maxBytes);
    }

    // Filter by language
    if (filters.language && filters.language !== 'any') {
      result = result.filter((f) => !f.language || f.language === 'other' || f.language === filters.language);
    }

    // Filter by safety
    if (filters.hideFlagged) {
      result = result.filter((f) => (f.safetyScore || 1) >= 0.65);
    }

    // Sort
    if (filters.sort === 'newest') {
      result.sort((a, b) => {
        const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (filters.sort === 'size') {
      result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else if (filters.sort === 'popularity') {
      result.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    return result;
  }, [files, filters]);

  // Distinct platform breakdown count
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of displayedFiles) {
      counts[f.provider] = (counts[f.provider] || 0) + 1;
    }
    return counts;
  }, [displayedFiles]);

  return (
    <div className="w-full">
      {/* 1. Filter Bar Component */}
      <FileFilterBar
        filters={filters}
        onChange={onFilterChange}
        onSearchAgain={onSearchAgain}
        isSearching={loading}
      />

      {/* 2. Search Summary & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-sm sm:text-base">
            <FolderArchive className="w-4 h-4 text-gray-700" />
            <span>Files & Documents Discovery</span>
          </div>

          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold">
            {displayedFiles.length} {displayedFiles.length === 1 ? 'file' : 'files'} found
          </span>

          {query && (
            <span className="text-xs text-gray-500 truncate max-w-xs">
              for &ldquo;<strong className="text-gray-800">{query}</strong>&rdquo;
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-gray-100 p-0.5 rounded-lg flex items-center">
            <button
              id="view-mode-grid"
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'grid' ? 'bg-white text-black shadow-xs font-semibold' : 'text-gray-500 hover:text-black'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              id="view-mode-list"
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                viewMode === 'list' ? 'bg-white text-black shadow-xs font-semibold' : 'text-gray-500 hover:text-black'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Platform Distribution Badges */}
      {displayedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5 px-1">
          <span className="text-xs text-gray-400 font-medium">Discovered from:</span>
          {Object.entries(platformCounts).map(([provider, count]) => (
            <span
              key={provider}
              className="text-[11px] px-2.5 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 font-medium flex items-center gap-1"
            >
              <HardDrive className="w-3 h-3 text-gray-400" />
              <span className="capitalize">{provider}:</span>
              <strong className="text-gray-900">{count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* 4. Results Grid or Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex gap-3">
                <div className="w-12 h-14 bg-gray-200 rounded-xl shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <div className="h-8 bg-gray-200 rounded-xl flex-1"></div>
                <div className="h-8 bg-gray-200 rounded-xl flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedFiles.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {displayedFiles.map((file, idx) => (
            <FileResultCard key={file.id || idx} file={file} index={idx} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
          <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FilterX className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
            No files matched your filter criteria
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-5 leading-relaxed">
            Try resetting your file platform selection, loosening the size range, or clearing file
            type constraints to discover public files across Archive.org, Gofile, and cloud drives.
          </p>
          <button
            id="btn-empty-reset-filters"
            type="button"
            onClick={() =>
              onFilterChange({
                platforms: [],
                fileTypes: [],
                minSizeMb: undefined,
                maxSizeMb: undefined,
                dateAdded: 'any',
                language: 'any',
                hideFlagged: true,
                sort: 'relevance',
              })
            }
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-xs"
          >
            Reset File Filters
          </button>
        </div>
      )}
    </div>
  );
};
