import React, { useState } from 'react';
import { SearchResultItem, ImageMedia, VideoMedia } from '../types';
import {
  ExternalLink,
  Calendar,
  User,
  Star,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Maximize2,
  RefreshCw,
  Sparkles,
  Film,
  Link2,
  HardDrive,
} from 'lucide-react';

interface ResultCardProps {
  result: SearchResultItem;
  onOpenImageLightbox: (img: ImageMedia) => void;
  onOpenVideoModal: (vid: VideoMedia) => void;
  onExtractDeepMedia: (url: string, resultId: string) => Promise<void>;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onOpenImageLightbox,
  onOpenVideoModal,
  onExtractDeepMedia,
}) => {
  const [extracting, setExtracting] = useState(false);
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'images' | 'videos'>('all');

  const domain = (() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return result.url;
    }
  })();

  const handleDeepExtract = async () => {
    setExtracting(true);
    try {
      await onExtractDeepMedia(result.url, result.id);
    } finally {
      setExtracting(false);
    }
  };

  const highlights = result.highlights || [];
  const displayHighlights = showAllHighlights ? highlights : highlights.slice(0, 2);

  const imagesCount = result.images?.length || 0;
  const videosCount = result.videos?.length || 0;

  return (
    <article className="w-full bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
      {/* 1. Header Metadata */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {result.favicon ? (
            <img
              src={result.favicon}
              alt=""
              className="w-4 h-4 rounded-full shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-gray-500">{domain[0]?.toUpperCase()}</span>
            </div>
          )}
          <span className="text-xs font-semibold text-gray-900 truncate">{domain}</span>
          <span className="text-gray-300">•</span>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 truncate max-w-xs transition-colors"
          >
            {result.url}
          </a>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
          {result.publishedDate && (
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {result.publishedDate.split('T')[0]}
            </span>
          )}
          {result.author && (
            <span className="hidden sm:flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {result.author}
            </span>
          )}
        </div>
      </div>

      {/* 2. Result Badges & Title */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(result.isPublicFileHost || result.fileHostName || domain.includes('gofile.io') || domain.includes('archive.org')) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <HardDrive className="w-3 h-3 text-blue-600 shrink-0" />
            <span>
              {result.fileHostName ||
                (domain.includes('gofile.io')
                  ? 'Gofile Public Link'
                  : domain.includes('archive.org')
                  ? 'Internet Archive'
                  : 'Public File Host')}
            </span>
          </div>
        )}

        {result.relevanceReason && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{result.relevanceReason}</span>
            {result.score !== undefined && (
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                ({Math.round(result.score * 100)}% match)
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="text-lg sm:text-xl font-medium text-gray-900 hover:text-black transition-colors mb-2 line-clamp-2 leading-snug">
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2">
          <span>{result.title}</span>
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity shrink-0 mt-1" />
        </a>
      </h3>

      {/* 3. Summary / Text Description */}
      {(result.summary || result.text) && (
        <p className="text-sm text-gray-600 leading-relaxed mb-5 font-light">
          {result.summary || (result.text ? `${result.text.slice(0, 240)}...` : '')}
        </p>
      )}

      {/* 4. Highlights Section */}
      {highlights.length > 0 && (
        <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-gray-900 fill-gray-900" />
              Key Extracts
            </span>
            {highlights.length > 2 && (
              <button
                onClick={() => setShowAllHighlights(!showAllHighlights)}
                className="text-[11px] font-semibold text-gray-700 hover:text-black transition-colors"
              >
                {showAllHighlights ? 'Show Less' : `Show All (${highlights.length})`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {displayHighlights.map((hl, idx) => (
              <p
                key={idx}
                className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-100 leading-relaxed font-light italic border-l-2 border-l-black"
              >
                "{hl}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Media Categories Navigation for this Result */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mr-1">
            Media
          </span>
          <button
            onClick={() => setActiveMediaTab('all')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeMediaTab === 'all'
                ? 'bg-black text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All ({imagesCount + videosCount})
          </button>
          {imagesCount > 0 && (
            <button
              onClick={() => setActiveMediaTab('images')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-colors ${
                activeMediaTab === 'images'
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              Images ({imagesCount})
            </button>
          )}
          {videosCount > 0 && (
            <button
              onClick={() => setActiveMediaTab('videos')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-colors ${
                activeMediaTab === 'videos'
                  ? 'bg-black text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <VideoIcon className="w-3 h-3" />
              Videos ({videosCount})
            </button>
          )}
        </div>

        {/* Deep Extract Trigger */}
        <button
          onClick={handleDeepExtract}
          disabled={extracting}
          className="text-xs text-gray-700 hover:text-black font-medium flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors disabled:opacity-50"
          title="Crawl full HTML to discover hidden images and embedded video streams"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${extracting ? 'animate-spin text-black' : ''}`} />
          <span className="hidden sm:inline">{extracting ? 'Extracting...' : 'Deep Extract'}</span>
        </button>
      </div>

      {/* 5. 🖼️ Images Category Gallery for this Result */}
      {(activeMediaTab === 'all' || activeMediaTab === 'images') && imagesCount > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gray-900" />
              Images ({imagesCount})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {result.images.slice(0, 10).map((img, idx) => (
              <div
                key={idx}
                onClick={() => onOpenImageLightbox(img)}
                className="group/img relative aspect-video sm:aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 hover:border-black cursor-pointer transition-all duration-200 shadow-xs"
              >
                <img
                  src={img.url}
                  alt={img.alt || img.title || 'Extracted Media Image'}
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).parentElement!.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-white text-black px-1.5 py-0.5 rounded-full w-max mb-1">
                    {img.type}
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-[10px] text-gray-200">{img.alt || 'View Image'}</span>
                    <Maximize2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. 🎥 Videos Category for this Result */}
      {(activeMediaTab === 'all' || activeMediaTab === 'videos') && videosCount > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-gray-900" />
              Videos ({videosCount})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {result.videos.map((vid, idx) => (
              <div
                key={idx}
                onClick={() => onOpenVideoModal(vid)}
                className="group/vid bg-gray-50 border border-gray-200 hover:border-black rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 mb-2 flex items-center justify-center">
                  {vid.thumbnailUrl ? (
                    <img
                      src={vid.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Film className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md group-hover/vid:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  <span className="absolute bottom-2 left-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black text-white">
                    {vid.platform}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-900 truncate">{vid.title || 'Extracted Video'}</span>
                  <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {vid.format || 'stream'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Extracted Page Links */}
      {result.links && result.links.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-900 font-medium flex items-center gap-1 select-none">
              <Link2 className="w-3.5 h-3.5" />
              <span>Extracted Page Links ({result.links.length})</span>
            </summary>
            <div className="mt-3 flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {result.links.slice(0, 15).map((l, idx) => (
                <a
                  key={idx}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 px-3 py-1 rounded-full border border-gray-200 truncate max-w-xs transition-colors font-medium"
                >
                  {l}
                </a>
              ))}
            </div>
          </details>
        </div>
      )}
    </article>
  );
};
