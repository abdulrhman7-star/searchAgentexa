import React, { useState } from 'react';
import { FileResult, formatFileSize } from '../../lib/providers/file-provider';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
  Download,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface FileResultCardProps {
  file: FileResult;
  index?: number;
}

export const FileResultCard: React.FC<FileResultCardProps> = ({ file, index = 0 }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(file.url || file.landingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Determine file icon and styling based on extension
  const ext = (file.ext || 'file').toLowerCase();

  const getTheme = () => {
    if (ext === 'pdf') {
      return {
        bg: 'bg-red-50 text-red-600 border-red-200',
        badge: 'bg-red-100 text-red-800',
        icon: FileText,
      };
    }
    if (['doc', 'docx', 'txt', 'epub'].includes(ext)) {
      return {
        bg: 'bg-blue-50 text-blue-600 border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        icon: FileText,
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: FileSpreadsheet,
      };
    }
    if (['zip', 'rar', '7z', 'tar.gz', 'iso', 'dmg'].includes(ext)) {
      return {
        bg: 'bg-amber-50 text-amber-600 border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        icon: FileArchive,
      };
    }
    if (['mp4', 'mkv', 'mov', 'avi'].includes(ext)) {
      return {
        bg: 'bg-purple-50 text-purple-600 border-purple-200',
        badge: 'bg-purple-100 text-purple-800',
        icon: FileVideo,
      };
    }
    if (['mp3', 'wav', 'flac'].includes(ext)) {
      return {
        bg: 'bg-rose-50 text-rose-600 border-rose-200',
        badge: 'bg-rose-100 text-rose-800',
        icon: FileAudio,
      };
    }
    if (['json', 'xml', 'torrent'].includes(ext)) {
      return {
        bg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
        badge: 'bg-cyan-100 text-cyan-800',
        icon: FileCode,
      };
    }
    return {
      bg: 'bg-gray-50 text-gray-600 border-gray-200',
      badge: 'bg-gray-100 text-gray-800',
      icon: HardDrive,
    };
  };

  const theme = getTheme();
  const IconComponent = theme.icon;

  const getProviderInfo = () => {
    switch (file.provider) {
      case 'archive':
        return { name: 'Archive.org', color: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'gofile':
        return { name: 'Gofile', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'mediafire':
        return { name: 'MediaFire', color: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'gdrive':
        return { name: 'Google Drive', color: 'bg-yellow-100 text-yellow-900 border-yellow-300' };
      case 'dropbox':
        return { name: 'Dropbox', color: 'bg-sky-100 text-sky-900 border-sky-300' };
      case 'mega':
        return { name: 'Mega.nz', color: 'bg-red-100 text-red-900 border-red-300' };
      case '4shared':
        return { name: '4shared', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      default:
        return { name: 'Open Web File', color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const providerInfo = getProviderInfo();

  // Format date
  const formattedDate = file.uploadedAt
    ? new Date(file.uploadedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : undefined;

  const safetyPercentage = Math.round((file.safetyScore ?? 0.85) * 100);
  const isHighSafety = safetyPercentage >= 75;

  return (
    <div
      id={`file-card-${file.id || index}`}
      className="group bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:border-gray-400 hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        {/* Top Header Row: Platform Badge + Safety Score */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${providerInfo.color} uppercase tracking-wider flex items-center gap-1`}
            >
              <HardDrive className="w-3 h-3" />
              <span>{providerInfo.name}</span>
            </span>

            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${theme.badge}`}
            >
              {ext.toUpperCase()}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isHighSafety ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
            title={`Safety & Trust score: ${safetyPercentage}%`}
          >
            {isHighSafety ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>{safetyPercentage}% Trust</span>
          </div>
        </div>

        {/* Content: Thumbnail / Preview Icon + Title */}
        <div className="flex gap-3.5 items-start mb-3">
          {file.thumbnail ? (
            <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 relative group-hover:shadow-xs transition-all">
              <img
                src={file.thumbnail}
                alt={file.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border ${theme.bg}`}
            >
              <IconComponent className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <a
              href={file.url || file.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm sm:text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug group-hover:underline"
              title={file.title}
            >
              {file.title}
            </a>

            {/* Direct Link or Landing URL Host */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 truncate">
              <span className="truncate max-w-xs">{file.landingUrl || file.url}</span>
              <ArrowUpRight className="w-3 h-3 text-gray-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Metadata Details Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mb-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-800">{formatFileSize(file.sizeBytes)}</span>
          </div>

          {formattedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{formattedDate}</span>
            </div>
          )}

          {file.popularity !== undefined && file.popularity > 0 && (
            <div className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>{file.popularity.toLocaleString()} hits</span>
            </div>
          )}

          {file.mime && (
            <span className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]" title={file.mime}>
              {file.mime}
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
        <a
          id={`btn-open-${file.id || index}`}
          href={file.landingUrl || file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open</span>
        </a>

        <button
          id={`btn-copy-${file.id || index}`}
          type="button"
          onClick={handleCopy}
          className={`py-2 px-3 text-xs font-medium rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          title="Copy direct or landing URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <a
          id={`btn-dl-${file.id || index}`}
          href={file.url || file.landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-black text-white hover:bg-gray-800 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
};
