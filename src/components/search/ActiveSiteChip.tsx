import React from 'react';
import { Globe, X, RefreshCw, Layers } from 'lucide-react';

interface ActiveSiteChipProps {
  site: string;
  pagesCount?: number;
  filesCount?: number;
  onClear: () => void;
  onRefresh?: () => void;
}

export const ActiveSiteChip: React.FC<ActiveSiteChipProps> = ({
  site,
  pagesCount,
  filesCount,
  onClear,
  onRefresh,
}) => {
  if (!site) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 text-white rounded-full text-xs shadow-xs animate-in fade-in zoom-in-95">
      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
      <span className="font-semibold text-white tracking-tight">{site}</span>

      {(pagesCount !== undefined || filesCount !== undefined) && (
        <span className="text-[11px] text-gray-300 font-mono px-1.5 py-0.5 bg-gray-800 rounded-full flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" />
          <span>
            {pagesCount ?? 0}p • {filesCount ?? 0}f
          </span>
        </span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 hover:text-blue-300 transition-colors"
          title="Refresh index"
          aria-label="Refresh index"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}

      <button
        type="button"
        onClick={onClear}
        className="p-0.5 hover:text-red-400 transition-colors ml-0.5"
        title="Remove site scope"
        aria-label="Remove site scope"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
