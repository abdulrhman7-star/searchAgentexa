import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  FolderArchive,
  Music,
  Video,
  FileCode,
  FileSpreadsheet,
  Globe,
  Tag,
} from 'lucide-react';
import { SiteSearchResult } from '../../../lib/crawler/types';

interface SiteSearchResultsViewProps {
  results: SiteSearchResult[];
  site: string;
  query: string;
  elapsedMs?: number;
}

export const SiteSearchResultsView: React.FC<SiteSearchResultsViewProps> = ({
  results,
  site,
  query,
  elapsedMs,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pages' | 'files'>('all');
  const [selectedExt, setSelectedExt] = useState<string>('all');

  const pages = results.filter((r) => r.type === 'page');
  const files = results.filter((r) => r.type === 'file');

  const availableExts = Array.from(
    new Set(files.map((f) => f.ext).filter(Boolean))
  ) as string[];

  const filtered = results.filter((item) => {
    if (activeTab === 'pages' && item.type !== 'page') return false;
    if (activeTab === 'files' && item.type !== 'file') return false;
    if (item.type === 'file' && selectedExt !== 'all' && item.ext !== selectedExt) {
      return false;
    }
    return true;
  });

  const getFileIcon = (ext?: string) => {
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FolderArchive className="w-5 h-5 text-amber-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="w-5 h-5 text-purple-500" />;
      case 'mp4':
      case 'mkv':
      case 'webm':
        return <Video className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileCode className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50/80 border border-gray-200/80 rounded-2xl">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>
              Local Crawl Results for <span className="font-mono text-black">{site}</span>
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {query ? `Searching for "${query}"` : 'All crawled resources'} • {results.length}{' '}
            discovered items ({pages.length} pages, {files.length} files)
            {elapsedMs ? ` in ${elapsedMs}ms` : ''}
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-200/70 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-black shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            All ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'pages'
                ? 'bg-white text-black shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Pages ({pages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'files'
                ? 'bg-white text-black shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Files ({files.length})
          </button>
        </div>
      </div>

      {/* Extension Pills (when files are available) */}
      {availableExts.length > 0 && activeTab !== 'pages' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Extensions:
          </span>
          <button
            type="button"
            onClick={() => setSelectedExt('all')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
              selectedExt === 'all'
                ? 'bg-black text-white font-semibold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ALL
          </button>
          {availableExts.map((ext) => (
            <button
              key={ext}
              type="button"
              onClick={() => setSelectedExt(ext)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] uppercase transition-colors ${
                selectedExt === ext
                  ? 'bg-black text-white font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              .{ext}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 px-4 bg-gray-50 rounded-2xl border border-gray-100">
          <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No matching indexed items</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search term or clear filters to view all crawled pages and files.
          </p>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3.5">
        {filtered.map((item) => {
          if (item.type === 'file') {
            return (
              <div
                key={item.id}
                className="p-4 bg-white border border-gray-200/90 rounded-2xl hover:border-black/30 hover:shadow-xs transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    {getFileIcon(item.ext)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md font-mono text-[10px] uppercase font-bold">
                        {item.ext || 'FILE'}
                      </span>
                      {item.sizeBytes ? (
                        <span className="text-[11px] text-gray-500 font-mono">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-sm font-semibold text-gray-900 break-all leading-snug">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-blue-600 hover:text-blue-800"
                        dangerouslySetInnerHTML={{ __html: item.snippet || item.title }}
                      />
                    </h3>

                    {item.sourcePage && (
                      <p className="text-[11px] text-gray-400 truncate">
                        Discovered on:{' '}
                        <a
                          href={item.sourcePage}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-gray-500"
                        >
                          {item.sourcePage}
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="p-2 text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Download / Direct Open"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          }

          // Page Result
          return (
            <div
              key={item.id}
              className="p-4 bg-white border border-gray-200/90 rounded-2xl hover:border-black/30 hover:shadow-xs transition-all space-y-1.5"
            >
              <div className="flex items-center gap-2 text-[11px] text-gray-500 truncate">
                <span className="font-mono text-gray-400">{item.url}</span>
                {item.lang && (
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] uppercase">
                    {item.lang}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-blue-600 hover:text-blue-800"
                >
                  {item.title}
                </a>
              </h3>

              {item.snippet && (
                <p
                  className="text-xs text-gray-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.snippet }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
