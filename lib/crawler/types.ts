export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  includeSubdomains?: boolean;
  respectRobotsTxt?: boolean;
  sameOriginOnly?: boolean;
  includeFileTypes?: string[];
  pathPrefix?: string;
  concurrency?: number;
  delayMs?: number;
  userAgent?: string;
  timeBudgetMs?: number;
}

export interface CrawlStats {
  pagesCount: number;
  filesCount: number;
  queuedCount: number;
  errorsCount: number;
  blockedCount: number;
  elapsedMs: number;
  percent: number;
  currentUrl?: string;
}

export type CrawlStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';

export interface CrawlJob {
  id: string;
  host: string;
  seedUrl: string;
  status: CrawlStatus;
  startedAt: number;
  finishedAt?: number;
  options: CrawlOptions;
  stats: CrawlStats;
  error?: string;
}

export interface CrawledPage {
  id?: string;
  crawlId: string;
  url: string;
  title: string;
  description?: string;
  text: string;
  headings?: string;
  lang?: string;
  fetchedAt: number;
}

export interface CrawledFile {
  id?: string;
  crawlId: string;
  url: string;
  name: string;
  ext: string;
  mime?: string;
  sizeBytes?: number;
  sourcePage?: string;
  fetchedAt: number;
}

export type CrawlEvent =
  | { type: 'progress'; data: CrawlStats }
  | { type: 'page'; data: { url: string; title: string; depth: number } }
  | { type: 'file'; data: { url: string; name: string; ext: string; sizeBytes?: number } }
  | { type: 'done'; data: { stats: CrawlStats; reason?: string } }
  | { type: 'error'; data: { message: string } };

export interface SiteSearchResult {
  id: string;
  crawlId: string;
  type: 'page' | 'file';
  url: string;
  title: string;
  snippet?: string;
  ext?: string;
  mime?: string;
  sizeBytes?: number;
  sourcePage?: string;
  score?: number;
  lang?: string;
}

export const DEFAULT_FILE_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'xlsx',
  'xls',
  'pptx',
  'ppt',
  'zip',
  'rar',
  '7z',
  'tar.gz',
  'mp3',
  'mp4',
  'mkv',
  'epub',
  'csv',
  'txt',
  'json',
  'xml',
  'iso',
];
