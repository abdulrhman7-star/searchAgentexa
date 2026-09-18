'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '../../src/components/SearchBar';
import { CrawlProgress } from '../../src/components/search/CrawlProgress';
import { ActiveSiteChip } from '../../src/components/search/ActiveSiteChip';
import { SiteSearchResultsView } from '../../src/components/search/SiteSearchResultsView';
import { useCrawl } from '../../lib/crawler/useCrawl';
import { CrawlOptions, SiteSearchResult } from '../../lib/crawler/types';
import { Globe, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState<string>('');
  const [site, setSite] = useState<string>('');
  const [crawlOptions, setCrawlOptions] = useState<CrawlOptions>({});
  const [siteResults, setSiteResults] = useState<SiteSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchDurationMs, setSearchDurationMs] = useState<number | undefined>(undefined);
  const [searchError, setSearchError] = useState<string | null>(null);

  const crawl = useCrawl();

  // Search within local crawl index
  const runSiteSearch = useCallback(
    async (targetCrawlId: string, q: string) => {
      setSearchLoading(true);
      setSearchError(null);
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
            query: q,
            tabs: ['pages', 'files'],
            limit: 50,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        const combined = [...(data.pages || []), ...(data.files || [])];
        setSiteResults(combined);
        setSearchDurationMs(Date.now() - startTime);
      } catch (err: any) {
        setSearchError(err.message || 'Site search failed');
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  // Main Search handler
  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;

    if (site.trim()) {
      // 1. Start or check crawl for site
      const activeCrawlId = crawl.crawlId;
      if (!activeCrawlId || crawl.host !== site.trim().toLowerCase()) {
        const newCrawlId = await crawl.start(site, crawlOptions);
        if (newCrawlId) {
          await runSiteSearch(newCrawlId, q);
        }
      } else {
        await runSiteSearch(activeCrawlId, q);
      }
    } else {
      // Standard search logic or redirect to main
      if (q.trim()) {
        window.location.href = `/?q=${encodeURIComponent(q)}`;
      }
    }
  };

  // Re-search when crawl completes if user was waiting
  useEffect(() => {
    if (crawl.status === 'completed' && crawl.crawlId) {
      runSiteSearch(crawl.crawlId, query);
    }
  }, [crawl.status, crawl.crawlId, query, runSiteSearch]);

  const handleClearSite = () => {
    setSite('');
    crawl.clear();
    setSiteResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm">
            E
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-none">
              Site Crawl & Index Engine
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Domain crawling, page extraction, and public file enumeration
            </p>
          </div>
        </div>

        <a
          href="/"
          className="text-xs font-medium text-gray-600 hover:text-black transition-colors"
        >
          ← Return to Full Search
        </a>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search Bar with Site Field */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={() => handleSearch()}
          loading={crawl.isCrawling || searchLoading}
          site={site}
          setSite={setSite}
          crawlOptions={crawlOptions}
          setCrawlOptions={setCrawlOptions}
        />

        {/* Crawl Progress Panel */}
        {site && (
          <CrawlProgress
            status={crawl.status}
            host={crawl.host || site}
            stats={crawl.stats}
            onCancel={crawl.cancel}
            onSearchWhileCrawling={() => {
              if (crawl.crawlId) runSiteSearch(crawl.crawlId, query);
            }}
            onClearIndex={handleClearSite}
            onRefresh={crawl.refresh}
            cached={crawl.cached}
          />
        )}

        {/* Active Site Scope Chip */}
        {site && crawl.status === 'completed' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Searching within:</span>
            <ActiveSiteChip
              site={crawl.host || site}
              pagesCount={crawl.stats?.pagesCount}
              filesCount={crawl.stats?.filesCount}
              onClear={handleClearSite}
              onRefresh={crawl.refresh}
            />
          </div>
        )}

        {/* Search Error */}
        {searchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Results View */}
        {siteResults.length > 0 && (
          <SiteSearchResultsView
            results={siteResults}
            site={crawl.host || site}
            query={query}
            elapsedMs={searchDurationMs}
          />
        )}

        {/* Informational Guidance Card when idle */}
        {!site && (
          <div className="mt-12 p-8 bg-white border border-gray-200 rounded-3xl text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Crawl Any Site & Enumerate Public Documents
            </h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Enter a domain (e.g. <span className="font-mono text-gray-800">example.com</span>) in
              the <strong>Site</strong> field next to search. The crawler will respect robots.txt,
              discover pages and public files (PDF, DOCX, ZIP, etc.), and index them locally for
              instant full-text search.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
