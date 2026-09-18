import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CategoryTabs } from './components/CategoryTabs';
import { AIAnswerCard } from './components/AIAnswerCard';
import { ResultCard } from './components/ResultCard';
import { ImageGalleryView } from './components/ImageGalleryView';
import { VideoGalleryView } from './components/VideoGalleryView';
import { MediaLightboxModal } from './components/MediaLightboxModal';
import { FilterDrawer } from './components/FilterDrawer';
import { VisionPipelineCard } from './components/VisionPipelineCard';
import {
  ExaSearchResponse,
  CategoryTab,
  SearchType,
  ImageMedia,
  VideoMedia,
  SearchFilterParams,
} from './types';
import {
  Sparkles,
  Loader2,
  Search,
  Info,
  AlertCircle,
  RefreshCw,
  Zap,
  HardDrive,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Check,
} from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState<string>('latest developments in LLMs 2026');
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [searchType, setSearchType] = useState<SearchType>('auto');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gofile Integration State
  const [queryGofileDirect, setQueryGofileDirect] = useState<boolean>(true);
  const [gofileResults, setGofileResults] = useState<any[]>([]);
  const [gofileLoading, setGofileLoading] = useState<boolean>(false);
  const [gofileNote, setGofileNote] = useState<string | null>(null);
  const [gofileFolderId, setGofileFolderId] = useState<string>('');
  const [showFolderConfig, setShowFolderConfig] = useState<boolean>(false);

  const [selectedImage, setSelectedImage] = useState<{ urlOrData: string; filename?: string } | null>(null);
  const [searchResponse, setSearchResponse] = useState<ExaSearchResponse | null>(null);

  // Active Lightbox Media State
  const [lightboxImage, setLightboxImage] = useState<ImageMedia | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<VideoMedia | null>(null);

  // Filter Drawer State
  const [filters, setFilters] = useState<SearchFilterParams>({
    query: 'latest developments in LLMs 2026',
    type: 'auto',
    numResults: 20,
    enableCrawl: true,
  });

  const fetchGofileSearch = async (searchQuery: string, folder?: string) => {
    if (!searchQuery.trim()) return;
    setGofileLoading(true);
    try {
      const folderParam = folder !== undefined ? folder : gofileFolderId;
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (folderParam && folderParam.trim()) {
        params.append('folderId', folderParam.trim());
      }
      const res = await fetch(`/api/gofile-search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGofileResults(data.results || []);
        setGofileNote(data.note || null);
      }
    } catch (err: any) {
      console.warn('Gofile query error:', err.message);
    } finally {
      setGofileLoading(false);
    }
  };

  const performSearch = async (searchQuery?: string, targetCategory?: CategoryTab) => {
    const queryToUse = searchQuery !== undefined ? searchQuery : query;
    if (!queryToUse.trim()) return;

    const catToUse = targetCategory || activeCategory;

    setLoading(true);
    setError(null);

    // If File Hosts category is active and direct Gofile querying is enabled, trigger Gofile search in parallel
    if (catToUse === 'filehosts' && queryGofileDirect) {
      fetchGofileSearch(queryToUse);
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryToUse,
          type: searchType,
          category: catToUse,
          numResults: filters.numResults || 20,
          includeDomains: filters.includeDomains,
          excludeDomains: filters.excludeDomains,
          startPublishedDate: filters.startPublishedDate,
          endPublishedDate: filters.endPublishedDate,
          enableCrawl: filters.enableCrawl !== false,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to complete search request');
      }

      const data: ExaSearchResponse = await response.json();
      setSearchResponse(data);
    } catch (err: any) {
      console.error('Search Execution Error:', err);
      setError(err.message || 'Search execution failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const performImageSearch = async (
    imageInput: string,
    filename?: string,
    userPrompt?: string,
    targetCategory?: CategoryTab
  ) => {
    setLoading(true);
    setError(null);
    setSelectedImage({ urlOrData: imageInput, filename });

    const catToUse = targetCategory || activeCategory;

    try {
      const response = await fetch('/api/search-by-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageInput,
          filename: filename || 'uploaded_image.jpg',
          prompt: userPrompt || query,
          category: catToUse,
          filters: {
            type: searchType,
            numResults: filters.numResults || 20,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to complete image-based search');
      }

      const data: ExaSearchResponse = await response.json();
      setSearchResponse(data);
      if (data.visionAnalysis?.generatedQueries.exaQuery && !query.trim()) {
        setQuery(data.visionAnalysis.generatedQueries.exaQuery);
      }
    } catch (err: any) {
      console.error('Image Search Error:', err);
      setError(err.message || 'Image-based search pipeline failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial default search on mount
  useEffect(() => {
    performSearch('latest developments in LLMs 2026', 'all');
  }, []);

  // Handle Tab Switch
  const handleCategoryTabChange = (newCat: CategoryTab) => {
    setActiveCategory(newCat);
    if (newCat === 'filehosts' && queryGofileDirect) {
      fetchGofileSearch(query);
    }
    if (newCat !== 'images' && newCat !== 'videos' && searchResponse?.category !== newCat) {
      if (selectedImage) {
        performImageSearch(selectedImage.urlOrData, selectedImage.filename, query, newCat);
      } else {
        performSearch(query, newCat);
      }
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
  };

  // Deep Extract Media for single result
  const handleExtractDeepMedia = async (url: string, resultId: string) => {
    try {
      const res = await fetch('/api/extract-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) return;

      const mediaData = await res.json();
      if (!mediaData || (!mediaData.images?.length && !mediaData.videos?.length)) return;

      setSearchResponse((prev) => {
        if (!prev) return prev;

        const updatedResults = prev.results.map((r) => {
          if (r.id !== resultId) return r;

          const existingImgUrls = new Set(r.images.map((img) => img.url));
          const newImages = [...r.images];
          (mediaData.images || []).forEach((img: ImageMedia) => {
            if (!existingImgUrls.has(img.url)) newImages.push(img);
          });

          const existingVidUrls = new Set(r.videos.map((vid) => vid.url));
          const newVideos = [...r.videos];
          (mediaData.videos || []).forEach((vid: VideoMedia) => {
            if (!existingVidUrls.has(vid.url)) newVideos.push(vid);
          });

          return {
            ...r,
            images: newImages,
            videos: newVideos,
            crawledMedia: true,
          };
        });

        let totalImagesCount = 0;
        let totalVideosCount = 0;
        updatedResults.forEach((r) => {
          totalImagesCount += r.images.length;
          totalVideosCount += r.videos.length;
        });

        return {
          ...prev,
          results: updatedResults,
          totalImagesCount,
          totalVideosCount,
        };
      });
    } catch (err) {
      console.error('Deep extract error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-black selection:text-white">
      {/* 1. Top Navigation & App Header */}
      <Header
        searchType={searchType}
        setSearchType={(st) => {
          setSearchType(st);
          setFilters((prev) => ({ ...prev, type: st }));
        }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        durationMs={searchResponse?.durationMs}
      />

      {/* 2. Main Search Bar */}
      <SearchBar
        query={query}
        setQuery={setQuery}
        onSearch={(q) => performSearch(q)}
        onImageSearch={(img, filename, prompt) => performImageSearch(img, filename, prompt)}
        selectedImage={selectedImage}
        onClearImage={handleClearImage}
        loading={loading}
      />

      {/* 3. Category Tabs Bar */}
      <CategoryTabs
        activeCategory={activeCategory}
        setActiveCategory={handleCategoryTabChange}
        totalImagesCount={searchResponse?.totalImagesCount}
        totalVideosCount={searchResponse?.totalVideosCount}
        loading={loading}
      />

      {/* 4. Filter Drawer */}
      <FilterDrawer
        filters={filters}
        setFilters={setFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={() => performSearch()}
      />

      {/* 5. Main Results Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-5 bg-white border border-rose-200 rounded-3xl flex items-start gap-3.5 text-rose-900 text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Search Request Failed</span>
              <span className="text-rose-700 font-light">{error}</span>
            </div>
          </div>
        )}

        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="relative w-12 h-12 mb-5">
              <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1 tracking-tight">
              {selectedImage ? 'Executing Visual Search & Semantic Pipeline...' : 'Searching with Exa Neural Engine...'}
            </h3>
            <p className="text-xs text-gray-400 font-light max-w-sm">
              {selectedImage
                ? 'Running AI Vision OCR, entity detection, Exa queries, and deduplication.'
                : 'Retrieving high-rank sources, extracting images, and parsing video channels.'}
            </p>
          </div>
        )}

        {/* AI Vision Pipeline Inspector (Shown on Visual Search) */}
        {!loading && searchResponse?.visionAnalysis && (
          <VisionPipelineCard
            vision={searchResponse.visionAnalysis}
            sourceImage={searchResponse.sourceImage || selectedImage?.urlOrData}
            onSelectQuery={(q) => {
              setQuery(q);
              performSearch(q);
            }}
            onSelectKeyword={(kw) => {
              setQuery(kw);
              performSearch(kw);
            }}
          />
        )}

        {/* Search Results Display */}
        {!loading && searchResponse && (
          <div>
            {/* Search Summary Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-gray-400 font-light">
              <div className="flex items-center gap-2">
                <span>
                  Found <strong className="text-gray-900 font-semibold">{searchResponse.results.length}</strong> results
                </span>
                <span>•</span>
                <span>
                  <strong className="text-gray-900 font-semibold">{searchResponse.totalImagesCount}</strong> images
                </span>
                <span>•</span>
                <span>
                  <strong className="text-gray-900 font-semibold">{searchResponse.totalVideosCount}</strong> videos
                </span>
              </div>

              {searchResponse.costDollars !== undefined && (
                <div className="text-[11px] text-gray-400 font-mono">
                  ${searchResponse.costDollars.toFixed(4)}
                </div>
              )}
            </div>

            {/* TAB: "All" or "Files & Storage" or "News" or "Papers" or "People" or "PDFs" */}
            {(activeCategory === 'all' ||
              activeCategory === 'filehosts' ||
              activeCategory === 'news' ||
              activeCategory === 'papers' ||
              activeCategory === 'people' ||
              activeCategory === 'pdfs') && (
              <div className="space-y-6">
                {activeCategory === 'filehosts' && (
                  <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs space-y-4">
                    {/* Top Row: Info & Gofile Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900">Cloud Storage & File Hosts</h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800">
                              Netlify & REST API
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Search public repositories and query Gofile API directly.
                          </p>
                        </div>
                      </div>

                      {/* Controls: Gofile Toggle & Folder Config */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setShowFolderConfig(!showFolderConfig)}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors flex items-center gap-1.5 ${
                            showFolderConfig || gofileFolderId
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>{gofileFolderId ? `Folder: ${gofileFolderId.slice(0, 8)}...` : 'Folder ID'}</span>
                        </button>

                        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                          <span className="text-xs font-medium text-gray-700">Gofile API</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={queryGofileDirect}
                            onClick={() => {
                              const next = !queryGofileDirect;
                              setQueryGofileDirect(next);
                              if (next && gofileResults.length === 0) {
                                fetchGofileSearch(query);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              queryGofileDirect ? 'bg-black' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                queryGofileDirect ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Optional Folder ID configuration */}
                    {showFolderConfig && (
                      <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-medium text-gray-700">Gofile Folder ID / Share Code</label>
                          <span className="text-[10px] text-gray-400">Leaves blank for root folder or public search</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 9f8e7d6c-5b4a-3928 or x7k2p9Qm"
                            value={gofileFolderId}
                            onChange={(e) => setGofileFolderId(e.target.value)}
                            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-black"
                          />
                          <button
                            type="button"
                            onClick={() => fetchGofileSearch(query, gofileFolderId)}
                            className="px-3 py-1.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                          >
                            Search Folder
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Gofile Status & Direct API Results */}
                    {queryGofileDirect && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">Gofile Live Files</span>
                            {gofileLoading && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            )}
                            {!gofileLoading && gofileResults.length > 0 && (
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {gofileResults.length} found
                              </span>
                            )}
                          </div>
                          {gofileNote && (
                            <span className="text-[11px] text-gray-500 italic max-w-md truncate">
                              {gofileNote}
                            </span>
                          )}
                        </div>

                        {/* Gofile Results List */}
                        {gofileResults.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                            {gofileResults.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-200/70 hover:border-gray-300 transition-colors group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 text-gray-600 group-hover:text-blue-600">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate leading-snug">
                                      {item.name || item.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                      {item.sizeFormatted && (
                                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                          {item.sizeFormatted}
                                        </span>
                                      )}
                                      <span className="capitalize">{item.type || 'file'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={item.downloadUrl || item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors"
                                    title="Open or Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 transition-colors"
                                    title="View Source Page"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : !gofileLoading ? (
                          <div className="p-3 rounded-2xl bg-gray-50/60 border border-dashed border-gray-200 text-center">
                            <p className="text-xs text-gray-500">
                              Direct Gofile API query is active. Results will appear here when files match or shared links are resolved.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* 🧠 AI Answer Section */}
                {searchResponse.aiAnswer && (
                  <AIAnswerCard aiAnswer={searchResponse.aiAnswer} />
                )}

                {/* Search Results List */}
                {searchResponse.results.length > 0 ? (
                  searchResponse.results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      onOpenImageLightbox={(img) => setLightboxImage(img)}
                      onOpenVideoModal={(vid) => setLightboxVideo(vid)}
                      onExtractDeepMedia={handleExtractDeepMedia}
                    />
                  ))
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Search Results Found</h3>
                    <p className="text-sm text-gray-400 max-w-md mx-auto mt-1 font-light">
                      Try broadening your search query or removing domain filters.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: "Images" */}
            {activeCategory === 'images' && (
              <ImageGalleryView
                results={searchResponse.results}
                onOpenLightbox={(img) => setLightboxImage(img)}
              />
            )}

            {/* TAB: "Videos" */}
            {activeCategory === 'videos' && (
              <VideoGalleryView
                results={searchResponse.results}
                onOpenVideoModal={(vid) => setLightboxVideo(vid)}
              />
            )}
          </div>
        )}
      </main>

      {/* 6. Media Lightbox Modal */}
      <MediaLightboxModal
        image={lightboxImage}
        video={lightboxVideo}
        onClose={() => {
          setLightboxImage(null);
          setLightboxVideo(null);
        }}
      />

      {/* 7. Footer */}
      <footer className="border-t border-gray-100 bg-white py-8 mt-16 text-center text-xs text-gray-400 font-light">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gray-900" />
            <span className="font-semibold text-gray-900">Exa AI Search & Media Engine</span>
          </div>

          <div>
            Powered by Exa Search API • Cheerio Media Extractor • Gemini AI
          </div>
        </div>
      </footer>
    </div>
  );
}
