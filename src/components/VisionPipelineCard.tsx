import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  Type,
  Tag,
  Palette,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Search,
  Check,
  Copy,
  Cpu,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { VisionAnalysisResult } from '../types';

interface VisionPipelineCardProps {
  vision: VisionAnalysisResult;
  sourceImage?: string | null;
  onSelectQuery?: (query: string) => void;
  onSelectKeyword?: (keyword: string) => void;
}

export const VisionPipelineCard: React.FC<VisionPipelineCardProps> = ({
  vision,
  sourceImage,
  onSelectQuery,
  onSelectKeyword,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="bg-white border border-gray-200/90 rounded-3xl p-5 sm:p-6 shadow-sm mb-8 transition-all duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 tracking-tight">AI Vision & Semantic Pipeline</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Multi-Modal Grounded
              </span>
            </div>
            <p className="text-xs text-gray-500 font-light mt-0.5">
              OCR • Entities • Logos • Palette • Multi-Query Generation • Deduplication • AI Ranking
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 px-3.5 py-1.5 rounded-full border border-gray-200 transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Hide Pipeline</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Inspect Pipeline</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Main Flow Stepper Indicator */}
      <div className="py-4 border-b border-gray-100/80 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max text-[11px] font-medium text-gray-500">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-900">
            <ImageIcon className="w-3.5 h-3.5 text-gray-700" />
            <span>1. User Image</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Eye className="w-3.5 h-3.5" />
            <span>2. AI Vision (OCR + Entities + Palette)</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Cpu className="w-3.5 h-3.5" />
            <span>3. Query Generator</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Layers className="w-3.5 h-3.5" />
            <span>4. Exa & Media Crawl</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="w-3.5 h-3.5" />
            <span>5. Deduplication & AI Ranking</span>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="pt-5 space-y-6">
          {/* Top Row: Visual Preview + Description */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {sourceImage && (
              <div className="md:col-span-4 lg:col-span-3">
                <div className="relative group overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm aspect-4/3 flex items-center justify-center">
                  <img
                    src={sourceImage}
                    alt="Analyzed subject"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center justify-between">
                    <span>Source Input</span>
                    <span className="text-gray-300">Target</span>
                  </div>
                </div>
              </div>
            )}

            <div className={sourceImage ? 'md:col-span-8 lg:col-span-9' : 'md:col-span-12'}>
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 block mb-1">
                  Semantic Visual Description
                </span>
                <p className="text-sm sm:text-base text-gray-800 font-normal leading-relaxed">
                  {vision.description}
                </p>
              </div>

              {/* Color Palette Swatches */}
              {vision.colors && vision.colors.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-gray-400" />
                    Palette:
                  </span>
                  {vision.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-xs text-xs"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="font-medium text-gray-800">{color.name}</span>
                      <span className="text-[10px] font-mono text-gray-400">{color.hex}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid of Extracted Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* 1. OCR (Detected Text) */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-blue-600" />
                  Detected OCR Text
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {vision.ocr.length} items
                </span>
              </div>
              {vision.ocr.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {vision.ocr.map((text, idx) => (
                    <span
                      key={idx}
                      onClick={() => handleCopy(text)}
                      className="cursor-pointer group inline-flex items-center gap-1 text-xs bg-white hover:bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 font-mono transition-colors"
                      title="Click to copy text"
                    >
                      <span>"{text}"</span>
                      {copiedText === text ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No visible embedded text detected.</p>
              )}
            </div>

            {/* 2. Recognized People / Places / Products */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-600" />
                  People / Places / Products
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {vision.entities.length} detected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vision.entities.map((entity, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectKeyword?.(entity)}
                    className="text-xs bg-purple-50/80 hover:bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200/80 font-medium transition-colors"
                  >
                    {entity}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Logos & Semantic Keywords */}
            <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Logos & Semantic Tags
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {vision.keywords.length} tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vision.logos.map((logo, idx) => (
                  <span
                    key={`logo-${idx}`}
                    className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 font-medium"
                  >
                    🏷️ {logo}
                  </span>
                ))}
                {vision.keywords.map((kw, idx) => (
                  <button
                    key={`kw-${idx}`}
                    onClick={() => onSelectKeyword?.(kw)}
                    className="text-xs bg-white hover:bg-gray-100 text-gray-700 hover:text-black px-2.5 py-1 rounded-lg border border-gray-200 transition-colors"
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Multi-Modal Search Queries */}
          <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-800" />
                <span className="text-xs font-semibold text-gray-900 tracking-tight">
                  Generated Multi-Source Queries
                </span>
              </div>
              <span className="text-[11px] text-gray-400">Click query to run as direct search</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Exa Query */}
              <button
                onClick={() => onSelectQuery?.(vision.generatedQueries.exaQuery)}
                className="text-left group p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                      <Search className="w-3 h-3" /> Exa Web Query
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-xs text-gray-800 font-medium line-clamp-2">
                    "{vision.generatedQueries.exaQuery}"
                  </p>
                </div>
              </button>

              {/* Video Query */}
              <button
                onClick={() => onSelectQuery?.(vision.generatedQueries.videoQuery)}
                className="text-left group p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                      <Video className="w-3 h-3" /> Video Query
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-xs text-gray-800 font-medium line-clamp-2">
                    "{vision.generatedQueries.videoQuery}"
                  </p>
                </div>
              </button>

              {/* Image Query */}
              <button
                onClick={() => onSelectQuery?.(vision.generatedQueries.imageQuery)}
                className="text-left group p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Image Query
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-xs text-gray-800 font-medium line-clamp-2">
                    "{vision.generatedQueries.imageQuery}"
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
