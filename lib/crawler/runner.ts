import { UrlFrontier } from './frontier';
import { Fetcher } from './fetcher';
import { Parser } from './parser';
import {
  saveCrawlJob,
  updateCrawlJob,
  savePage,
  saveFile,
  saveLinks,
  getCrawlById,
  getCrawlByHost,
} from './index-db';
import { CrawlJob, CrawlOptions, CrawlStats, CrawlEvent } from './types';

// In-memory active crawlers registry to support cancellation and live progress polling
const activeCrawlers = new Map<
  string,
  {
    controller: AbortController;
    job: CrawlJob;
    listeners: Set<(event: CrawlEvent) => void>;
  }
>();

export function getActiveCrawl(crawlId: string) {
  return activeCrawlers.get(crawlId);
}

export function cancelCrawl(crawlId: string): boolean {
  const active = activeCrawlers.get(crawlId);
  if (active) {
    active.controller.abort();
    active.job.status = 'cancelled';
    active.job.finishedAt = Date.now();
    updateCrawlJob(crawlId, { status: 'cancelled', finishedAt: Date.now() });
    for (const listener of active.listeners) {
      listener({
        type: 'done',
        data: { stats: active.job.stats, reason: 'cancelled_by_user' },
      });
    }
    activeCrawlers.delete(crawlId);
    return true;
  }
  return false;
}

export class CrawlRunner {
  private job: CrawlJob;
  private options: CrawlOptions;
  private frontier: UrlFrontier;
  private fetcher: Fetcher;
  private parser: Parser;
  private controller: AbortController;
  private listeners = new Set<(event: CrawlEvent) => void>();

  constructor(site: string, options: CrawlOptions = {}, existingCrawlId?: string) {
    // Normalize target host and seed URL
    let cleanSite = site.trim().replace(/^[a-zA-Z]+:\/\//, '');
    cleanSite = cleanSite.split('/')[0].toLowerCase();
    const seedUrl = `https://${cleanSite}`;

    const crawlId =
      existingCrawlId ||
      `crw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.options = {
      maxPages: options.maxPages ?? 500,
      maxDepth: options.maxDepth ?? 3,
      includeSubdomains: options.includeSubdomains ?? false,
      respectRobotsTxt: options.respectRobotsTxt ?? true,
      sameOriginOnly: options.sameOriginOnly ?? true,
      includeFileTypes: options.includeFileTypes,
      pathPrefix: options.pathPrefix,
      concurrency: options.concurrency ?? 4,
      delayMs: options.delayMs ?? 200,
      userAgent: options.userAgent,
      timeBudgetMs: options.timeBudgetMs ?? 300000, // 5 min default
    };

    const initialStats: CrawlStats = {
      pagesCount: 0,
      filesCount: 0,
      queuedCount: 1,
      errorsCount: 0,
      blockedCount: 0,
      elapsedMs: 0,
      percent: 0,
    };

    this.job = {
      id: crawlId,
      host: cleanSite,
      seedUrl,
      status: 'running',
      startedAt: Date.now(),
      options: this.options,
      stats: initialStats,
    };

    this.controller = new AbortController();
    this.frontier = new UrlFrontier(seedUrl, this.options);
    this.fetcher = new Fetcher(this.options);
    this.parser = new Parser(this.options.includeFileTypes);
  }

  public get crawlId(): string {
    return this.job.id;
  }

  public get currentJob(): CrawlJob {
    return this.job;
  }

  public on(listener: (event: CrawlEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CrawlEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in crawl listener:', err);
      }
    }
  }

  public async run(): Promise<CrawlJob> {
    // Register in active crawls registry
    activeCrawlers.set(this.job.id, {
      controller: this.controller,
      job: this.job,
      listeners: this.listeners,
    });

    await saveCrawlJob(this.job);

    const startTime = Date.now();
    const timeBudget = this.options.timeBudgetMs ?? 300000;
    const maxPages = this.options.maxPages ?? 500;
    const concurrency = Math.min(Math.max(this.options.concurrency ?? 4, 1), 8);

    let activeWorkers = 0;
    let stopReason = 'completed';

    const processNext = async (): Promise<void> => {
      while (!this.controller.signal.aborted) {
        // Check time budget
        const elapsed = Date.now() - startTime;
        if (elapsed > timeBudget) {
          stopReason = 'budget_exhausted';
          break;
        }

        // Check page quota
        if (this.job.stats.pagesCount >= maxPages) {
          stopReason = 'max_pages_reached';
          break;
        }

        const item = this.frontier.dequeue();
        if (!item) {
          break;
        }

        this.job.stats.currentUrl = item.url;
        this.job.stats.queuedCount = this.frontier.size;
        this.emitProgress();

        // Politeness delay
        try {
          const host = new URL(item.url).hostname;
          await this.frontier.waitPoliteness(host);
        } catch {
          // Ignore URL parse error
        }

        try {
          const fetchRes = await this.fetcher.fetchUrl(item.url, this.controller.signal);

          if (fetchRes.blocked) {
            this.job.stats.blockedCount++;
            continue;
          }

          if (fetchRes.isFile) {
            // It's a binary file download
            const pathParts = new URL(fetchRes.url).pathname.split('/');
            const filename = pathParts.pop() || 'download';
            const extMatch = filename.match(/\.([a-z0-9]+)$/i);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';

            await saveFile({
              crawlId: this.job.id,
              url: fetchRes.url,
              name: decodeURIComponent(filename),
              ext,
              mime: fetchRes.mime || fetchRes.contentType,
              sizeBytes: fetchRes.sizeBytes,
              fetchedAt: Date.now(),
            });

            this.job.stats.filesCount++;
            this.emit({
              type: 'file',
              data: {
                url: fetchRes.url,
                name: filename,
                ext,
                sizeBytes: fetchRes.sizeBytes,
              },
            });
          } else if (fetchRes.html) {
            const parsed = this.parser.parseHtml(fetchRes.html, fetchRes.url);

            await savePage({
              crawlId: this.job.id,
              url: fetchRes.url,
              title: parsed.page.title,
              description: parsed.page.description,
              text: parsed.page.text,
              headings: parsed.page.headings,
              lang: parsed.page.lang,
              fetchedAt: Date.now(),
            });

            this.job.stats.pagesCount++;
            this.emit({
              type: 'page',
              data: {
                url: fetchRes.url,
                title: parsed.page.title,
                depth: item.depth,
              },
            });

            // Save and emit discovered files on this page
            for (const file of parsed.discoveredFiles) {
              await saveFile({
                crawlId: this.job.id,
                url: file.url,
                name: file.name,
                ext: file.ext,
                mime: file.mime,
                sizeBytes: file.sizeBytes,
                sourcePage: fetchRes.url,
                fetchedAt: Date.now(),
              });
              this.job.stats.filesCount++;
              this.emit({
                type: 'file',
                data: {
                  url: file.url,
                  name: file.name,
                  ext: file.ext,
                  sizeBytes: file.sizeBytes,
                },
              });
            }

            // Save outgoing links
            await saveLinks(this.job.id, fetchRes.url, parsed.discoveredLinks);

            // Enqueue new links
            const nextDepth = item.depth + 1;
            for (const nextUrl of parsed.discoveredLinks) {
              this.frontier.enqueue(nextUrl, nextDepth, Math.max(10, 100 - nextDepth * 20));
            }
          } else if (fetchRes.error) {
            this.job.stats.errorsCount++;
          }
        } catch (err: any) {
          if (this.controller.signal.aborted) {
            stopReason = 'cancelled_by_user';
            break;
          }
          this.job.stats.errorsCount++;
        }

        this.job.stats.queuedCount = this.frontier.size;
        this.job.stats.elapsedMs = Date.now() - startTime;
        this.emitProgress();
      }
    };

    try {
      const workers = Array.from({ length: concurrency }).map(() => {
        activeWorkers++;
        return processNext().finally(() => {
          activeWorkers--;
        });
      });

      await Promise.all(workers);
    } catch (err: any) {
      if (this.controller.signal.aborted) {
        stopReason = 'cancelled_by_user';
      } else {
        this.job.status = 'error';
        this.job.error = err.message || 'Crawl failed';
        this.emit({ type: 'error', data: { message: this.job.error || 'Crawl failed' } });
      }
    } finally {
      this.job.finishedAt = Date.now();
      this.job.stats.elapsedMs = Date.now() - startTime;
      this.job.stats.queuedCount = 0;
      this.job.stats.percent = 100;
      this.job.status =
        stopReason === 'cancelled_by_user'
          ? 'cancelled'
          : this.job.status === 'error'
          ? 'error'
          : 'completed';

      await updateCrawlJob(this.job.id, {
        status: this.job.status,
        finishedAt: this.job.finishedAt,
        stats: this.job.stats,
      });

      this.emit({
        type: 'done',
        data: { stats: this.job.stats, reason: stopReason },
      });

      activeCrawlers.delete(this.job.id);
    }

    return this.job;
  }

  private emitProgress() {
    const maxPages = this.options.maxPages ?? 500;
    const progressEstimate = Math.min(
      99,
      Math.round(
        (this.job.stats.pagesCount / Math.max(maxPages, this.job.stats.pagesCount + this.frontier.size)) *
          100
      )
    );
    this.job.stats.percent = isNaN(progressEstimate) ? 0 : progressEstimate;
    this.emit({ type: 'progress', data: { ...this.job.stats } });
  }
}

// Start or retrieve cached crawl helper
export async function startOrGetCrawl(
  site: string,
  options: CrawlOptions = {},
  forceRefresh = false
): Promise<{ crawlId: string; cached: boolean; runner?: CrawlRunner }> {
  let cleanHost = site.trim().replace(/^[a-zA-Z]+:\/\//, '');
  cleanHost = cleanHost.split('/')[0].toLowerCase();

  // 1. Check if there is an existing crawl that is younger than 24h
  if (!forceRefresh) {
    const existing = await getCrawlByHost(cleanHost);
    if (existing && existing.status === 'completed' && existing.finishedAt) {
      const ageHours = (Date.now() - existing.finishedAt) / (1000 * 60 * 60);
      if (ageHours < 24) {
        return { crawlId: existing.id, cached: true };
      }
    }
  }

  // 2. Check if a crawler is currently active for this host
  for (const [id, active] of activeCrawlers.entries()) {
    if (active.job.host === cleanHost && active.job.status === 'running') {
      return { crawlId: id, cached: false };
    }
  }

  // 3. Spawn a new crawl runner
  const runner = new CrawlRunner(cleanHost, options);
  // Start in background
  runner.run().catch((err) => console.error('Background crawl error:', err));

  return { crawlId: runner.crawlId, cached: false, runner };
}
