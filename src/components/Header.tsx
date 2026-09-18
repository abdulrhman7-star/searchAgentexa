import React from 'react';
import { Sparkles, SlidersHorizontal, Zap } from 'lucide-react';
import { SearchType } from '../types';

interface HeaderProps {
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  durationMs?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchType,
  setSearchType,
  showFilters,
  setShowFilters,
  durationMs,
}) => {
  return (
    <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-xl text-gray-900 tracking-tight">EXA SEARCH AI</h1>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                Media Engine
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Neural search & media extraction
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {durationMs !== undefined && durationMs > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 font-medium">
              <Zap className="w-3.5 h-3.5 text-gray-900" />
              <span>{durationMs}ms</span>
            </div>
          )}

          {/* Search Type Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs">
            {(['auto', 'fast', 'deep'] as SearchType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`px-3 py-1.5 rounded-full font-medium capitalize transition-all ${
                  searchType === type
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-2 transition-all ${
              showFilters
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="Search Filters & Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>
    </header>
  );
};

