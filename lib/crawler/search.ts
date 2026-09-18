import { searchLocalIndex, getCrawlById } from './index-db';
import { SiteSearchResult } from './types';

export interface SiteSearchRequest {
  crawlId: string;
  query: string;
  tabs?: ('pages' | 'files' | 'images' | 'videos')[];
  limit?: number;
}

export interface SiteSearchResponse {
  crawlId: string;
  host: string;
  query: string;
  elapsedMs: number;
  total: number;
  pages: SiteSearchResult[];
  files: SiteSearchResult[];
}

export async function executeSiteSearch(req: SiteSearchRequest): Promise<SiteSearchResponse> {
  const startTime = Date.now();
  const crawl = await getCrawlById(req.crawlId);
  const host = crawl?.host || 'site';

  const requestedTabs = (req.tabs || ['pages', 'files']).filter(
    (t): t is 'pages' | 'files' => t === 'pages' || t === 'files'
  );

  const results = await searchLocalIndex(
    req.crawlId,
    req.query,
    requestedTabs,
    req.limit || 30
  );

  const pages = results.filter((r) => r.type === 'page');
  const files = results.filter((r) => r.type === 'file');

  return {
    crawlId: req.crawlId,
    host,
    query: req.query,
    elapsedMs: Date.now() - startTime,
    total: results.length,
    pages,
    files,
  };
}
