import React, { useState } from 'react';
import { ImageMedia, VideoMedia } from '../types';
import { X, ExternalLink, Copy, Check, Download, Play, Maximize2 } from 'lucide-react';

interface MediaLightboxModalProps {
  image: ImageMedia | null;
  video: VideoMedia | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  image,
  video,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!image && !video) return null;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-black text-white">
              {image ? `IMAGE • ${image.type}` : `VIDEO • ${video?.platform}`}
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">
              {image?.title || image?.alt || video?.title || 'Media Viewer'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Area */}
        <div className="p-6 bg-gray-50 flex items-center justify-center min-h-[320px] max-h-[60vh] overflow-hidden relative border-b border-gray-100">
          {image && (
            <img
              src={image.url}
              alt={image.alt || 'Full View'}
              className="max-h-[55vh] w-auto max-w-full object-contain rounded-2xl shadow-md"
            />
          )}

          {video && (
            <div className="w-full h-full aspect-video flex items-center justify-center bg-black rounded-2xl overflow-hidden shadow-md">
              {video.embedUrl ? (
                <iframe
                  src={video.embedUrl}
                  title={video.title || 'Video Player'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : video.format === 'mp4' || video.format === 'webm' || video.platform === 'html5' ? (
                <video
                  src={video.url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[55vh] object-contain"
                />
              ) : (
                <div className="p-8 text-center text-white">
                  <Play className="w-12 h-12 text-white mx-auto mb-3" />
                  <p className="text-sm text-gray-300 font-medium mb-4">
                    External Stream: {video.title || video.url}
                  </p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-semibold rounded-full shadow-lg transition-colors hover:bg-gray-100"
                  >
                    <span>Open External Stream</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Details & Actions */}
        <div className="p-5 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-400 truncate max-w-md">
            <span className="font-semibold text-gray-900 mr-2">URL:</span>
            <span className="text-gray-500 font-mono text-[11px] select-all truncate">
              {image?.url || video?.url}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyUrl(image?.url || video?.url || '')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <a
              href={image?.url || video?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded-full flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span>Open Original</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
