import React from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw, X, ShieldAlert, Sparkles } from 'lucide-react';
import { CrawlStats, CrawlStatus } from '../../../lib/crawler/types';

interface CrawlProgressProps {
  status: CrawlStatus;
  host: string;
  stats: CrawlStats | null;
  onCancel: () => void;
  onSearchWhileCrawling?: () => void;
  onClearIndex: () => void;
  onRefresh?: () => void;
  cached?: boolean;
}

export const CrawlProgress: React.FC<CrawlProgressProps> = ({
  status,
  host,
  stats,
  onCancel,
  onSearchWhileCrawling,
  onClearIndex,
  onRefresh,
  cached = false,
}) => {
  if (status === 'idle' || !host) {
    return null;
  }

  const pages = stats?.pagesCount ?? 0;
  const files = stats?.filesCount ?? 0;
  const queued = stats?.queuedCount ?? 0;
  const errors = stats?.errorsCount ?? 0;
  const percent = stats?.percent ?? (status === 'completed' ? 100 : 15);
  const elapsedSec = Math.round((stats?.elapsedMs ?? 0) / 1000);

  // When finished / completed or cached
  if (status === 'completed') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="my-3 p-3 sm:p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in slide-in-from-top-1 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-emerald-950">
              Indexed: <span className="underline decoration-emerald-400">{host}</span>
            </span>
            <span className="text-emerald-700 ml-1.5 font-mono">
              — {pages} pages, {files} files {elapsedSec > 0 ? `in ${elapsedSec}s` : ''}{' '}
              {cached ? '(cached)' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-2.5 py-1 text-emerald-800 bg-white/80 border border-emerald-200 hover:bg-white rounded-lg transition-colors font-medium flex items-center gap-1 text-[11px]"
              title="Re-crawl and update index"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Index</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClearIndex}
            aria-label="Clear local site index"
            className="px-2.5 py-1 text-emerald-900 bg-emerald-100/60 hover:bg-emerald-200/70 rounded-lg transition-colors font-medium flex items-center gap-1 text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear index</span>
          </button>
        </div>
      </div>
    );
  }

  // When error
  if (status === 'error') {
    return (
      <div
        role="alert"
        className="my-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-900 animate-in fade-in"
      >
        <div className="flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>
            Failed to crawl <strong>{host}</strong>. Check if the site is reachable or requires
            authentication.
          </span>
        </div>
        <button
          type="button"
          onClick={onClearIndex}
          className="px-2.5 py-1 text-red-800 bg-white border border-red-200 hover:bg-red-100 rounded-lg text-[11px]"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // When actively crawling
  return (
    <div
      role="status"
      aria-live="polite"
      className="my-3 p-4 bg-white border border-gray-200/90 rounded-2xl shadow-xs space-y-3 text-xs text-gray-800 animate-in fade-in slide-in-from-top-1"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 text-black animate-spin" />
          <span className="font-semibold text-gray-950 text-sm">
            Crawling & indexing <span className="font-mono text-xs text-blue-600">{host}</span> ...
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-500">
          Elapsed: {elapsedSec}s • {percent}%
        </span>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-600 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
        <div>
          Pages: <strong className="text-gray-900">{pages}</strong>
        </div>
        <div>
          Files: <strong className="text-gray-900">{files}</strong>
        </div>
        <div>
          Queued: <strong className="text-gray-900">{queued}</strong>
        </div>
        <div>
          Errors: <strong className="text-gray-900">{errors}</strong>
        </div>
        {stats?.blockedCount ? (
          <div className="text-amber-700 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Blocked by robots.txt: <strong>{stats.blockedCount}</strong>
          </div>
        ) : null}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-black h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(5, Math.min(100, percent))}%` }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl text-xs transition-colors"
        >
          Cancel Crawl (إلغاء)
        </button>

        {onSearchWhileCrawling && (
          <button
            type="button"
            onClick={onSearchWhileCrawling}
            className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Search while crawling (بحث فوري في الفهرس المتاح)</span>
          </button>
        )}
      </div>
    </div>
  );
};
