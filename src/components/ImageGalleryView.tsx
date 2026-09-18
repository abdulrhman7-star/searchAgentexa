import React, { useState } from 'react';
import { SearchResultItem, ImageMedia } from '../types';
import { Image as ImageIcon, ExternalLink, Maximize2, Filter } from 'lucide-react';

interface ImageGalleryViewProps {
  results: SearchResultItem[];
  onOpenLightbox: (img: ImageMedia) => void;
}

export const ImageGalleryView: React.FC<ImageGalleryViewProps> = ({
  results,
  onOpenLightbox,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Flatten images from all results
  const allImages = results.flatMap((r) =>
    r.images.map((img) => ({
      ...img,
      sourceTitle: r.title,
      sourceUrl: r.url,
      sourceFavicon: r.favicon,
    }))
  );

  const filteredImages = filterType === 'all'
    ? allImages
    : allImages.filter((img) => img.type === filterType);

  if (allImages.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 my-6 shadow-sm">
        <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900">No Extracted Images Found</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 font-light">
          Try a different search query or click "Deep Extract" on search results to crawl page HTML for images.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full my-6">
      {/* Controls & Counts */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-medium text-gray-900 flex items-center gap-2 tracking-tight">
            <ImageIcon className="w-5 h-5 text-gray-900" />
            <span>Extracted Image Gallery</span>
            <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-full">
              {allImages.length} images
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-light">
            Aggregated OpenGraph, Twitter Cards, srcset, and on-page images across search results.
          </p>
        </div>

        {/* Filter Type */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Tag:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-gray-200 text-gray-900 text-xs rounded-full px-4 py-1.5 focus:outline-none focus:border-black font-medium"
          >
            <option value="all">All Types</option>
            <option value="og">OpenGraph (og:image)</option>
            <option value="twitter">Twitter Card</option>
            <option value="img">Inline & Srcset</option>
            <option value="jsonld">JSON-LD Schema</option>
            <option value="exa">Exa Extracted</option>
          </select>
        </div>
      </div>

      {/* Responsive Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredImages.map((img, idx) => (
          <div
            key={idx}
            onClick={() => onOpenLightbox(img)}
            className="group relative aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 hover:border-black cursor-pointer transition-all duration-300 shadow-sm"
          >
            <img
              src={img.url}
              alt={img.alt || img.title || 'Extracted Gallery Image'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).parentElement!.style.display = 'none';
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between text-white">
              <div className="flex justify-end">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white text-black">
                  {img.type}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-white truncate mb-1">
                  {img.alt || img.title || 'View Full Image'}
                </p>
                <div className="flex items-center justify-between text-[11px] text-gray-300 pt-1 border-t border-white/20">
                  <span className="truncate max-w-[120px]">{img.sourceTitle}</span>
                  <Maximize2 className="w-3.5 h-3.5 text-white shrink-0" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
