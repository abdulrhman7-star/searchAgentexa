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
import { FilesResultsView } from './components/FilesResultsView';
import { FileFilterState } from './components/FileFilterBar';
import { CrawlProgress } from './components/search/CrawlProgress';
import { ActiveSiteChip } from './components/search/ActiveSiteChip';
import { SiteSearchResultsView } from './components/search/SiteSearchResultsView';
import { useCrawl } from '../lib/crawler/useCrawl';
import { CrawlOptions, SiteSearchResult } from '../lib/crawler/types';
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

  // Site Crawl & Scoped Search State
  const [site, setSite] = useState<string>('');
  const [crawlOptions, setCrawlOptions] = useState<CrawlOptions>({});
  const [siteResults, setSiteResults] = useState<SiteSearchResult[]>([]);
  const [siteSearchDurationMs, setSiteSearchDurationMs] = useState<number | undefined>(undefined);
  const crawl = useCrawl();

  // Search within crawled local index
  const performSiteSearch = async (targetCrawlId: string, q?: string) => {
    const queryStr = q !== undefined ? q : query;
    const startTime = Date.now();
    try {
      const response = await fetch('/api/search/site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          crawlId: targetCrawlId,
          query: queryStr,
          tabs: ['pages', 'files'],
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Site search failed with status ${response.status}`);
      }

      const data = await response.json();
      const combined = [...(data.pages || []), ...(data.files || [])];
      setSiteResults(combined);
      setSiteSearchDurationMs(Date.now() - startTime);
    } catch (err: any) {
      console.error('Site search error:', err);
    }
  };

  const handleClearSite = () => {
    setSite('');
    crawl.clear();
    setSiteResults([]);
  };

  // Auto-search local index when crawl finishes
  useEffect(() => {
    if (crawl.status === 'completed' && crawl.crawlId && site.trim()) {
      performSiteSearch(crawl.crawlId, query);
    }
  }, [crawl.status, crawl.crawlId]);

  // Files & Documents Filter Bar State
  const [fileFilters, setFileFilters] = useState<FileFilterState>({
    platforms: [],
    fileTypes: [],
    minSizeMb: undefined,
    maxSizeMb: undefined,
    dateAdded: 'any',
    customStartDate: undefined,
    customEndDate: undefined,
    language: 'any',
    hideFlagged: true,
    sort: 'relevance',
  });

  const performFilesSearch = async (customQuery?: string, customFilters?: FileFilterState) => {
    const q = customQuery !== undefined ? customQuery : query;
    if (!q.trim()) return;
    const f = customFilters || fileFilters;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/files/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          platforms: f.platforms,
          fileTypes: f.fileTypes,
          minSizeMb: f.minSizeMb,
          maxSizeMb: f.maxSizeMb,
          dateAdded: f.dateAdded,
          customStartDate: f.customStartDate,
          customEndDate: f.customEndDate,
          language: f.language,
          hideFlagged: f.hideFlagged,
          sort: f.sort,
          limit: 30,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResponse((prev) => {
          if (!prev) {
            return {
              query: q,
              requestId: `req_${Date.now()}`,
              searchType: 'auto',
              category: 'filehosts',
              results: [],
              files: data.results || [],
              totalFilesCount: data.total || 0,
              cached: data.cached,
            };
          }
          return {
            ...prev,
            files: data.results || [],
            totalFilesCount: data.total || 0,
          };
        });
      }
    } catch (err: any) {
      console.warn('Files search error:', err.message);
    } finally {
      setLoading(false);
    }
  };

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

    // If site input is specified, execute crawl and scoped local search!
    if (site.trim()) {
      setLoading(true);
      setError(null);
      try {
        let activeCrawlId = crawl.crawlId;
        if (!activeCrawlId || crawl.host !== site.trim().toLowerCase()) {
          activeCrawlId = await crawl.start(site, crawlOptions);
        }
        if (activeCrawlId) {
          await performSiteSearch(activeCrawlId, queryToUse);
        }
      } catch (err: any) {
        setError(err.message || 'Crawl failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!queryToUse.trim()) return;

    const catToUse = targetCategory || activeCategory;

    setLoading(true);
    setError(null);

    // If File Hosts category is active, also trigger direct Gofile query if configured
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
          filePlatforms: fileFilters.platforms,
          fileTypes: fileFilters.fileTypes,
          minSizeMb: fileFilters.minSizeMb,
          maxSizeMb: fileFilters.maxSizeMb,
          dateAdded: fileFilters.dateAdded,
          customStartDate: fileFilters.customStartDate,
          customEndDate: fileFilters.customEndDate,
          fileLanguage: fileFilters.language,
          hideFlaggedFiles: fileFilters.hideFlagged,
          fileSort: fileFilters.sort,
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
    if (newCat === 'filehosts') {
      if (!searchResponse?.files || searchResponse.files.length === 0) {
        performFilesSearch(query, fileFilters);
      }
      return;
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

      {/* 2. Main Search Bar with Site Field */}
      <SearchBar
        query={query}
        setQuery={setQuery}
        onSearch={(q) => performSearch(q)}
        onImageSearch={(img, filename, prompt) => performImageSearch(img, filename, prompt)}
        selectedImage={selectedImage}
        onClearImage={handleClearImage}
        loading={loading || crawl.isCrawling}
        site={site}
        setSite={setSite}
        crawlOptions={crawlOptions}
        setCrawlOptions={setCrawlOptions}
      />

      {/* Crawl Progress Panel & Active Site Status */}
      {site.trim() && (
        <div className="max-w-4xl mx-auto px-4 w-full mb-4">
          <CrawlProgress
            status={crawl.status}
            host={crawl.host || site}
            stats={crawl.stats}
            onCancel={crawl.cancel}
            onSearchWhileCrawling={() => {
              if (crawl.crawlId) performSiteSearch(crawl.crawlId, query);
            }}
            onClearIndex={handleClearSite}
            onRefresh={crawl.refresh}
            cached={crawl.cached}
          />

          {crawl.status === 'completed' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 font-medium">Active site scope:</span>
              <ActiveSiteChip
                site={crawl.host || site}
                pagesCount={crawl.stats?.pagesCount}
                filesCount={crawl.stats?.filesCount}
                onClear={handleClearSite}
                onRefresh={crawl.refresh}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Category Tabs Bar */}
      {!site.trim() && (
        <CategoryTabs
          activeCategory={activeCategory}
          setActiveCategory={handleCategoryTabChange}
          totalImagesCount={searchResponse?.totalImagesCount}
          totalVideosCount={searchResponse?.totalVideosCount}
          totalFilesCount={searchResponse?.totalFilesCount || searchResponse?.files?.length || 0}
          loading={loading}
        />
      )}

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
              {selectedImage
                ? 'Executing Visual Search & Semantic Pipeline...'
                : site.trim()
                ? `Crawling & Searching ${site}...`
                : 'Searching with Exa Neural Engine...'}
            </h3>
            <p className="text-xs text-gray-400 font-light max-w-sm">
              {selectedImage
                ? 'Running AI Vision OCR, entity detection, Exa queries, and deduplication.'
                : site.trim()
                ? 'Enumerating reachable pages, links, and public documents on target domain.'
                : 'Retrieving high-rank sources, extracting images, and parsing video channels.'}
            </p>
          </div>
        )}

        {/* Scoped Site Crawl Search Results */}
        {!loading && site.trim() && (
          <SiteSearchResultsView
            results={siteResults}
            site={crawl.host || site}
            query={query}
            elapsedMs={siteSearchDurationMs}
          />
        )}

        {/* AI Vision Pipeline Inspector (Shown on Visual Search) */}
        {!loading && !site.trim() && searchResponse?.visionAnalysis && (
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
        {!loading && !site.trim() && searchResponse && (
          <div>
            {/* Search Summary Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-gray-400 font-light">
              <div className="flex items-center gap-2 flex-wrap">
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
                <span>•</span>
                <span>
                  <strong className="text-gray-900 font-semibold">{searchResponse.totalFilesCount || searchResponse.files?.length || 0}</strong> files
                </span>
              </div>

              {searchResponse.costDollars !== undefined && (
                <div className="text-[11px] text-gray-400 font-mono">
                  ${searchResponse.costDollars.toFixed(4)}
                </div>
              )}
            </div>

            {/* TAB: "Files & Documents" */}
            {activeCategory === 'filehosts' && (
              <FilesResultsView
                files={searchResponse.files || []}
                loading={loading}
                query={query}
                filters={fileFilters}
                onFilterChange={(newF) => {
                  setFileFilters(newF);
                }}
                onSearchAgain={() => performFilesSearch(query, fileFilters)}
              />
            )}

            {/* TAB: "All" or "News" or "Papers" or "People" or "PDFs" */}
            {(activeCategory === 'all' ||
              activeCategory === 'news' ||
              activeCategory === 'papers' ||
              activeCategory === 'people' ||
              activeCategory === 'pdfs') && (
              <div className="space-y-6">
                {/* Highlight banner in 'All' tab if public files were discovered */}
                {activeCategory === 'all' && (searchResponse.files?.length ?? 0) > 0 && (
                  <div
                    onClick={() => setActiveCategory('filehosts')}
                    className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl flex items-center justify-between cursor-pointer hover:border-gray-400 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-black text-white rounded-xl">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">
                            {searchResponse.files?.length} Public Files & Documents Discovered
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Archive.org • Gofile • Cloud Hosts
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Direct downloads, books, archives, and spreadsheets available for this query.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 group-hover:underline flex items-center gap-1">
                      View all files &rarr;
                    </span>
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
