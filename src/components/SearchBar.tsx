import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Camera,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Eye,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { SiteField } from './search/SiteField';
import { CrawlOptions } from '../../lib/crawler/types';

export interface SampleImageOption {
  label: string;
  sublabel: string;
  url: string;
  filename: string;
}

export const SAMPLE_IMAGE_PRESETS: SampleImageOption[] = [
  {
    label: '☕ Artisan Coffee & Beans',
    sublabel: 'Coffee cup, crema foam, whole roasted beans',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/500px-A_small_cup_of_coffee.JPG',
    filename: 'coffee_espresso_beans.jpg',
  },
  {
    label: '🤖 Humanoid Robotics & AI',
    sublabel: 'Bipedal robotics prototype and neural optics',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80',
    filename: 'humanoid_robot_ai.jpg',
  },
  {
    label: '🏔️ Alpine Mountain Peak',
    sublabel: 'Snow peaks, glacial lake reflection',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    filename: 'alpine_mountain_nature.jpg',
  },
  {
    label: '🏎️ Electric GT Supercar',
    sublabel: 'Aerodynamic carbon performance vehicle',
    url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&auto=format&fit=crop&q=80',
    filename: 'electric_gt_supercar.jpg',
  },
];

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q?: string) => void;
  onImageSearch?: (image: string, filename?: string, prompt?: string) => void;
  selectedImage?: { urlOrData: string; filename?: string } | null;
  onClearImage?: () => void;
  loading: boolean;
  site?: string;
  setSite?: (s: string) => void;
  crawlOptions?: CrawlOptions;
  setCrawlOptions?: (opts: CrawlOptions) => void;
}

const SAMPLE_QUERIES = [
  { label: '🤖 Frontier AI Models 2026', query: 'compare the latest frontier AI model releases 2026' },
  { label: '⚛️ Quantum Computing Breakthroughs', query: 'recent breakthroughs in quantum computing hardware' },
  { label: '🌱 AgTech Series A Startups', query: 'agtech startups in US that raised series A funding' },
  { label: '🎬 Movie Trailers & Reviews', query: 'top trending movie trailers and official video previews' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  setQuery,
  onSearch,
  onImageSearch,
  selectedImage,
  onClearImage,
  loading,
  site,
  setSite,
  crawlOptions,
  setCrawlOptions,
}) => {
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowImageModal(false);
      }
    };
    if (showImageModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImageModal]);

  // Support pasting image from clipboard anywhere on window
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                onImageSearch?.(base64, blob.name || 'clipboard-image.png', query);
                setShowImageModal(false);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSearch, query]);

  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        onImageSearch?.(base64, file.name, query);
        setShowImageModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrlInput.trim()) {
      onImageSearch?.(imageUrlInput.trim(), 'web_image.jpg', query);
      setImageUrlInput('');
      setShowImageModal(false);
    }
  };

  const handlePresetSelect = (preset: SampleImageOption) => {
    onImageSearch?.(preset.url, preset.filename, query);
    setShowImageModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImage) {
      onImageSearch?.(selectedImage.urlOrData, selectedImage.filename, query);
    } else if (query.trim() || site?.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 relative">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-white border border-gray-200 rounded-full shadow-sm focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200 p-1.5">
          {/* Left Icon or Image Chip */}
          <div className="pl-3.5 pr-2 flex items-center">
            {selectedImage ? (
              <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 py-1 px-2.5 rounded-full text-xs font-medium text-gray-800 shrink-0">
                <img
                  src={selectedImage.urlOrData}
                  alt="Search query thumbnail"
                  className="w-5 h-5 rounded-full object-cover border border-black/10"
                />
                <span className="max-w-[110px] truncate text-[11px]">
                  {selectedImage.filename || 'Visual Target'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearImage?.();
                  }}
                  className="p-0.5 text-gray-400 hover:text-black rounded-full transition-colors ml-0.5"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                <Search className="w-5 h-5 group-focus-within:text-black transition-colors" />
              </div>
            )}
          </div>

          {/* Input text */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              selectedImage
                ? 'Optional: Ask specific details about this image or press Search...'
                : site?.trim()
                ? `Search within crawled ${site}... (or leave empty to browse all)`
                : 'Search with Exa AI & Extract Images, Videos, or Search by Image...'
            }
            className="w-full py-3 pr-2 text-gray-900 bg-transparent text-sm sm:text-base focus:outline-none placeholder:text-gray-400 min-w-0"
          />

          {/* Clear text button */}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Site Field (Desktop inline) */}
          {setSite && (
            <div className="hidden md:flex items-center shrink-0 mr-1.5">
              <SiteField
                site={site || ''}
                setSite={setSite}
                options={crawlOptions || {}}
                setOptions={setCrawlOptions || (() => {})}
                disabled={loading}
              />
            </div>
          )}

          {/* Visual Search Camera Button */}
          <button
            type="button"
            onClick={() => setShowImageModal(!showImageModal)}
            className={`p-2.5 rounded-full transition-all mr-1.5 flex items-center gap-1 shrink-0 ${
              selectedImage || showImageModal
                ? 'bg-black text-white'
                : 'text-gray-500 hover:text-black hover:bg-gray-100'
            }`}
            title="Search by image (AI Vision + Exa + Video)"
          >
            <Camera className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Image</span>
          </button>

          {/* Main Submit Button */}
          <button
            type="submit"
            disabled={loading || (!query.trim() && !selectedImage && !site?.trim())}
            className="px-5 sm:px-6 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-full shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : selectedImage ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Visual Search</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>

        {/* Mobile Site Field (Stacked below bar) */}
        {setSite && (
          <div className="flex md:hidden mt-2.5 justify-end px-2">
            <SiteField
              site={site || ''}
              setSite={setSite}
              options={crawlOptions || {}}
              setOptions={setCrawlOptions || (() => {})}
              disabled={loading}
            />
          </div>
        )}
      </form>

      {/* Popover / Modal for Image Search Upload */}
      {showImageModal && (
        <div
          ref={modalRef}
          className="absolute left-4 right-4 sm:left-auto sm:right-4 top-full mt-3 w-auto sm:w-[480px] bg-white border border-gray-200 rounded-3xl shadow-xl p-5 z-40 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Search with AI Vision & Exa</h4>
            </div>
            <button
              onClick={() => setShowImageModal(false)}
              className="p-1 text-gray-400 hover:text-black rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-4 border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-black bg-gray-50 scale-[1.01]'
                : 'border-gray-200 hover:border-gray-400 bg-gray-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-gray-200 flex items-center justify-center mx-auto mb-2 text-gray-700">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-gray-900 mb-0.5">
              Drag & drop an image here, or <span className="underline">browse files</span>
            </p>
            <p className="text-[11px] text-gray-400 font-light">
              Supports PNG, JPG, WEBP • You can also press <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">Ctrl+V</kbd> to paste
            </p>
          </div>

          {/* Paste Image URL Form */}
          <form onSubmit={handleUrlSubmit} className="mt-4">
            <label className="text-[11px] font-medium text-gray-500 block mb-1.5">
              Or paste an image web link:
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full text-xs py-2.5 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!imageUrlInput.trim()}
                className="px-3.5 py-2.5 bg-black hover:bg-gray-800 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-colors shrink-0"
              >
                Load
              </button>
            </div>
          </form>

          {/* 1-Click Preset Samples */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Try with a sample image:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_IMAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all text-left group"
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-9 h-9 rounded-lg object-cover border border-black/5 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <span className="text-xs font-medium text-gray-900 block truncate group-hover:text-black">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-gray-400 block truncate">
                      {preset.sublabel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Quick Queries (When No Image Selected) */}
      {!selectedImage && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-gray-900" />
            Try:
          </span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sample.query);
                onSearch(sample.query);
              }}
              className="text-xs bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 px-3.5 py-1.5 rounded-full border border-gray-200 transition-all font-medium"
            >
              {sample.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
