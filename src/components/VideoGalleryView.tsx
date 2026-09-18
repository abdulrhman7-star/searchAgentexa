import React, { useState } from 'react';
import { SearchResultItem, VideoMedia } from '../types';
import { Film, Play, ExternalLink, Tv, Radio } from 'lucide-react';

interface VideoGalleryViewProps {
  results: SearchResultItem[];
  onOpenVideoModal: (vid: VideoMedia) => void;
}

export const VideoGalleryView: React.FC<VideoGalleryViewProps> = ({
  results,
  onOpenVideoModal,
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Flatten videos from all results
  const allVideos = results.flatMap((r) =>
    r.videos.map((vid) => ({
      ...vid,
      sourceTitle: r.title,
      sourceUrl: r.url,
      sourceFavicon: r.favicon,
    }))
  );

  const filteredVideos = platformFilter === 'all'
    ? allVideos
    : allVideos.filter((v) => v.platform === platformFilter);

  if (allVideos.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 my-6 shadow-sm">
        <Film className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900">No Extracted Videos Found</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 font-light">
          Try a video search query or click "Deep Extract" on search result cards to extract embedded video streams.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full my-6">
      {/* Header & Platform Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-medium text-gray-900 flex items-center gap-2 tracking-tight">
            <Film className="w-5 h-5 text-gray-900" />
            <span>Extracted Video Hub</span>
            <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-full">
              {allVideos.length} videos
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-light">
            YouTube, Vimeo, TikTok, Twitch, and direct HTML5 / HLS (.m3u8) video streams extracted from search results.
          </p>
        </div>

        {/* Platform Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-full text-xs">
          {['all', 'youtube', 'vimeo', 'tiktok', 'twitch', 'html5', 'hls'].map((platform) => (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={`px-3 py-1.5 rounded-full font-medium capitalize transition-all ${
                platformFilter === platform
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVideos.map((vid, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-100 hover:border-black rounded-3xl overflow-hidden shadow-sm group transition-all duration-300 flex flex-col justify-between"
          >
            {/* Thumbnail Preview Area */}
            <div
              onClick={() => onOpenVideoModal(vid)}
              className="relative aspect-video bg-gray-100 overflow-hidden cursor-pointer"
            >
              {vid.thumbnailUrl ? (
                <img
                  src={vid.thumbnailUrl}
                  alt={vid.title || 'Video Thumbnail'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                  <Tv className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500 font-medium">{vid.title || 'Play Stream'}</span>
                </div>
              )}

              {/* Play Overlay Button */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black text-white">
                  {vid.platform}
                </span>
                {vid.format && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white text-black border border-gray-200">
                    {vid.format}
                  </span>
                )}
              </div>
            </div>

            {/* Title & Source Link */}
            <div className="p-5">
              <h4
                onClick={() => onOpenVideoModal(vid)}
                className="font-medium text-gray-900 text-sm hover:text-black transition-colors cursor-pointer line-clamp-2 mb-3"
              >
                {vid.title || 'Extracted Video'}
              </h4>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                <a
                  href={vid.sourceUrl || vid.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors flex items-center gap-1 truncate max-w-[200px] font-medium"
                >
                  <span className="truncate">{vid.sourceTitle}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                <button
                  onClick={() => onOpenVideoModal(vid)}
                  className="text-black font-semibold text-xs flex items-center gap-1"
                >
                  <span>Play</span>
                  <Play className="w-3 h-3 fill-black" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
