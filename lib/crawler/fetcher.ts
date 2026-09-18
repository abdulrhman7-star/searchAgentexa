import { fetch as undiciFetch } from 'undici';
import robotsParser from 'robots-parser';
import { CrawlOptions } from './types';

export interface FetchResult {
  url: string;
  status: number;
  contentType: string;
  html?: string;
  isFile: boolean;
  mime?: string;
  sizeBytes?: number;
  blocked?: boolean;
  isJsOnly?: boolean;
  error?: string;
}

export class Fetcher {
  private userAgent: string;
  private respectRobots: boolean;
  private robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();
  private maxHtmlSizeBytes = 5 * 1024 * 1024; // 5 MB

  constructor(options: CrawlOptions = {}) {
    this.userAgent =
      options.userAgent ||
      process.env.CRAWL_USER_AGENT ||
      'SiteCrawlerBot/1.0 (+https://example.com/bot)';
    this.respectRobots = options.respectRobotsTxt ?? true;
  }

  public async getRobots(origin: string): Promise<ReturnType<typeof robotsParser> | null> {
    if (!this.respectRobots) return null;
    if (this.robotsCache.has(origin)) {
      return this.robotsCache.get(origin) || null;
    }

    try {
      const robotsUrl = `${origin}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await undiciFetch(robotsUrl, {
        method: 'GET',
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 200) {
        const text = await res.text();
        const robot = robotsParser(robotsUrl, text);
        this.robotsCache.set(origin, robot);
        return robot;
      } else {
        this.robotsCache.set(origin, null);
        return null;
      }
    } catch {
      this.robotsCache.set(origin, null);
      return null;
    }
  }

  public async isUrlAllowedByRobots(url: string): Promise<boolean> {
    if (!this.respectRobots) return true;
    try {
      const origin = new URL(url).origin;
      const robot = await this.getRobots(origin);
      if (!robot) return true;

      // robots-parser returns undefined if not matching, true if allowed, false if disallowed
      const allowed = robot.isAllowed(url, this.userAgent);
      return allowed !== false;
    } catch {
      return true;
    }
  }

  public async fetchUrl(
    targetUrl: string,
    abortSignal?: AbortSignal,
    retries = 2
  ): Promise<FetchResult> {
    // 1. Check robots.txt
    const allowed = await this.isUrlAllowedByRobots(targetUrl);
    if (!allowed) {
      return {
        url: targetUrl,
        status: 403,
        contentType: '',
        isFile: false,
        blocked: true,
        error: 'Disallowed by robots.txt',
      };
    }

    let attempt = 0;
    let delay = 1000;

    while (attempt <= retries) {
      if (abortSignal?.aborted) {
        throw new Error('Crawl operation cancelled by user');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const abortListener = () => controller.abort();
      if (abortSignal) {
        abortSignal.addEventListener('abort', abortListener, { once: true });
      }

      try {
        const response = await undiciFetch(targetUrl, {
          method: 'GET',
          headers: {
            'User-Agent': this.userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          },
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeoutId);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortListener);
        }

        // Handle Rate limiting 429 or 503
        if ((response.status === 429 || response.status === 503) && attempt < retries) {
          const retryAfterHeader = response.headers.get('retry-after');
          let waitMs = delay * Math.pow(2, attempt);
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds)) {
              waitMs = Math.min(parsedSeconds * 1000, 30000);
            }
          }
          await new Promise((r) => setTimeout(r, waitMs));
          attempt++;
          continue;
        }

        const rawContentType = response.headers.get('content-type') || '';
        const contentType = rawContentType.toLowerCase().split(';')[0].trim();
        const contentLength = response.headers.get('content-length');
        const sizeBytes = contentLength ? parseInt(contentLength, 10) : undefined;

        // Check if response is non-HTML file (e.g. PDF, zip, docx, etc.)
        const isHtml =
          contentType.includes('text/html') ||
          contentType.includes('application/xhtml+xml') ||
          contentType === '';

        if (!isHtml) {
          // File download detected! Do NOT download body; we capture metadata
          return {
            url: response.url || targetUrl,
            status: response.status,
            contentType,
            isFile: true,
            mime: contentType,
            sizeBytes,
          };
        }

        if (response.status >= 400) {
          return {
            url: response.url || targetUrl,
            status: response.status,
            contentType,
            isFile: false,
            error: `HTTP status ${response.status}`,
          };
        }

        // Stream HTML with max size limit (5MB)
        const reader = response.body?.getReader();
        if (!reader) {
          const html = await response.text();
          return {
            url: response.url || targetUrl,
            status: response.status,
            contentType,
            html,
            isFile: false,
            sizeBytes: Buffer.byteLength(html, 'utf8'),
            isJsOnly: this.detectJsOnly(html),
          };
        }

        const chunks: Uint8Array[] = [];
        let bytesReceived = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bytesReceived += value.length;
            chunks.push(value);
            if (bytesReceived > this.maxHtmlSizeBytes) {
              await reader.cancel();
              break;
            }
          }
        }

        const totalBuffer = Buffer.concat(chunks);
        const html = totalBuffer.toString('utf8');

        return {
          url: response.url || targetUrl,
          status: response.status,
          contentType,
          html,
          isFile: false,
          sizeBytes: bytesReceived,
          isJsOnly: this.detectJsOnly(html),
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortListener);
        }

        if (abortSignal?.aborted) {
          throw new Error('Crawl cancelled');
        }

        if (attempt < retries) {
          attempt++;
          await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
          continue;
        }

        return {
          url: targetUrl,
          status: 0,
          contentType: '',
          isFile: false,
          error: err.message || 'Fetch failed',
        };
      }
    }

    return {
      url: targetUrl,
      status: 0,
      contentType: '',
      isFile: false,
      error: 'Max retries exceeded',
    };
  }

  // Detect Cloudflare / JS-only Single Page Applications
  private detectJsOnly(html: string): boolean {
    if (!html || html.length < 500) return true;
    const lower = html.toLowerCase();
    const hasNoscriptMsg =
      lower.includes('you need to enable javascript to run this app') ||
      lower.includes('javascript is required') ||
      lower.includes('enable javascript and cookies to continue') ||
      lower.includes('cloudflare ray id') ||
      lower.includes('challenge-form');

    const hasMinimalBody =
      /<body[^>]*>\s*<div id="(root|app|__next)"><\/div>\s*<script/i.test(html);

    return hasNoscriptMsg || hasMinimalBody;
  }
}
