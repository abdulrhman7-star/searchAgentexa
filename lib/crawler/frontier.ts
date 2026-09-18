import { CrawlOptions } from './types';

export interface FrontierItem {
  url: string;
  depth: number;
  priority: number;
}

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /\.onion$/i,
  /\.local$/i,
];

export function isBlockedOrPrivateHost(host: string, blocklist: string[] = []): boolean {
  const cleanHost = host.toLowerCase().trim();

  // Check private IP patterns
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(cleanHost)) {
      return true;
    }
  }

  // Check blocklist
  for (const item of blocklist) {
    const cleanItem = item.toLowerCase().trim();
    if (cleanItem && (cleanHost === cleanItem || cleanHost.endsWith('.' + cleanItem))) {
      return true;
    }
  }

  return false;
}

export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);

    // Only allow http / https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip hash fragment
    parsed.hash = '';

    // Strip common tracker query params
    const trackerParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'msclkid',
      '_ga',
    ];
    for (const param of trackerParams) {
      parsed.searchParams.delete(param);
    }

    // Normalize path trailing slash (keep root /)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export class UrlFrontier {
  private queue: FrontierItem[] = [];
  private visitedUrls = new Set<string>();
  private queuedUrls = new Set<string>();
  private seedHost: string;
  private seedOrigin: string;
  private pathPrefix?: string;
  private options: CrawlOptions;
  private lastFetchTimeByHost = new Map<string, number>();
  private blocklist: string[] = [];

  constructor(seedUrl: string, options: CrawlOptions = {}) {
    const parsedSeed = new URL(seedUrl);
    this.seedHost = parsedSeed.hostname.toLowerCase();
    this.seedOrigin = parsedSeed.origin.toLowerCase();
    this.options = {
      maxPages: options.maxPages ?? 500,
      maxDepth: options.maxDepth ?? 3,
      includeSubdomains: options.includeSubdomains ?? false,
      sameOriginOnly: options.sameOriginOnly ?? true,
      delayMs: options.delayMs ?? 200,
      ...options,
    };

    if (options.pathPrefix) {
      let prefix = options.pathPrefix.trim();
      if (!prefix.startsWith('/')) prefix = '/' + prefix;
      this.pathPrefix = prefix;
    }

    const envBlocklist = process.env.CRAWL_BLOCKLIST || '';
    this.blocklist = envBlocklist.split(',').map((s) => s.trim()).filter(Boolean);

    // Enqueue seed URL
    this.enqueue(seedUrl, 0, 100);
  }

  public enqueue(rawUrl: string, depth: number, priority = 50): boolean {
    const normalized = normalizeUrl(rawUrl, this.seedOrigin);
    if (!normalized) return false;

    // Check if visited or already queued
    if (this.visitedUrls.has(normalized) || this.queuedUrls.has(normalized)) {
      return false;
    }

    // Depth check
    const maxDepth = this.options.maxDepth ?? 3;
    if (depth > maxDepth) {
      return false;
    }

    // Max pages bound check on queued + visited
    const maxPages = this.options.maxPages ?? 500;
    if (this.visitedUrls.size + this.queue.length >= maxPages * 3) {
      return false;
    }

    // Validate origin / host rules
    try {
      const parsed = new URL(normalized);
      const urlHost = parsed.hostname.toLowerCase();

      // Check private IPs / blocklist
      if (isBlockedOrPrivateHost(urlHost, this.blocklist)) {
        return false;
      }

      // Check same origin / subdomains
      if (this.options.includeSubdomains) {
        const isExact = urlHost === this.seedHost;
        const isSub = urlHost.endsWith('.' + this.seedHost);
        if (!isExact && !isSub) {
          return false;
        }
      } else if (this.options.sameOriginOnly) {
        if (urlHost !== this.seedHost) {
          return false;
        }
      }

      // Check path prefix if configured
      if (this.pathPrefix) {
        if (!parsed.pathname.startsWith(this.pathPrefix)) {
          return false;
        }
      }
    } catch {
      return false;
    }

    this.queuedUrls.add(normalized);
    this.queue.push({ url: normalized, depth, priority });

    // Keep queue sorted by priority descending, then depth ascending
    this.queue.sort((a, b) => b.priority - a.priority || a.depth - b.depth);
    return true;
  }

  public dequeue(): FrontierItem | null {
    if (this.queue.length === 0) return null;
    const item = this.queue.shift()!;
    this.queuedUrls.delete(item.url);
    this.visitedUrls.add(item.url);
    return item;
  }

  public markVisited(url: string) {
    this.visitedUrls.add(url);
  }

  public isVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  public async waitPoliteness(host: string): Promise<void> {
    const delay = this.options.delayMs ?? 200;
    if (delay <= 0) return;

    const lastTime = this.lastFetchTimeByHost.get(host) || 0;
    const now = Date.now();
    const elapsed = now - lastTime;
    if (elapsed < delay) {
      await new Promise((r) => setTimeout(r, delay - elapsed));
    }
    this.lastFetchTimeByHost.set(host, Date.now());
  }

  public get size(): number {
    return this.queue.length;
  }

  public get visitedCount(): number {
    return this.visitedUrls.size;
  }
}
