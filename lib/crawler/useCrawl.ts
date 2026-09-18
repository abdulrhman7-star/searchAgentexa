import { useState, useCallback, useRef } from 'react';
import { CrawlOptions, CrawlStats, CrawlStatus } from './types';

export interface UseCrawlReturn {
  status: CrawlStatus;
  stats: CrawlStats | null;
  crawlId: string | null;
  host: string | null;
  cached: boolean;
  isCrawling: boolean;
  error: string | null;
  start: (site: string, options?: CrawlOptions) => Promise<string | null>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

const INITIAL_STATS: CrawlStats = {
  pagesCount: 0,
  filesCount: 0,
  queuedCount: 0,
  errorsCount: 0,
  blockedCount: 0,
  elapsedMs: 0,
  percent: 0,
};

export function useCrawl(): UseCrawlReturn {
  const [status, setStatus] = useState<CrawlStatus>('idle');
  const [stats, setStats] = useState<CrawlStats | null>(null);
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentCrawlIdRef = useRef<string | null>(null);
  const currentHostRef = useRef<string | null>(null);
  const currentOptionsRef = useRef<CrawlOptions | undefined>(undefined);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    setStats(null);
    setCrawlId(null);
    setHost(null);
    setCached(false);
    setError(null);
    currentCrawlIdRef.current = null;
    currentHostRef.current = null;
  }, []);

  const cancel = useCallback(async () => {
    const id = currentCrawlIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (id) {
      try {
        await fetch(`/api/crawl/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Error cancelling crawl:', err);
      }
    }
    setStatus('cancelled');
  }, []);

  const start = useCallback(
    async (site: string, options?: CrawlOptions): Promise<string | null> => {
      const cleanSite = site.trim().replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].toLowerCase();
      if (!cleanSite) return null;

      clear();
      setHost(cleanSite);
      currentHostRef.current = cleanSite;
      currentOptionsRef.current = options;
      setStatus('running');
      setStats(INITIAL_STATS);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/crawl/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site: cleanSite,
            options,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body not supported by browser');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let resolvedCrawlId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const payload = JSON.parse(trimmed.slice(5).trim());

                if (payload.crawlId && !resolvedCrawlId) {
                  resolvedCrawlId = payload.crawlId;
                  setCrawlId(payload.crawlId);
                  currentCrawlIdRef.current = payload.crawlId;
                }

                if (payload.cached !== undefined) {
                  setCached(payload.cached);
                }

                if (payload.type === 'progress') {
                  setStats(payload.data);
                } else if (payload.type === 'page' || payload.type === 'file') {
                  // Minor increment feedback
                  setStats((prev) =>
                    prev
                      ? {
                          ...prev,
                          pagesCount:
                            payload.type === 'page' ? prev.pagesCount + 1 : prev.pagesCount,
                          filesCount:
                            payload.type === 'file' ? prev.filesCount + 1 : prev.filesCount,
                        }
                      : null
                  );
                } else if (payload.type === 'done') {
                  setStatus('completed');
                  if (payload.data?.stats) {
                    setStats(payload.data.stats);
                  }
                } else if (payload.type === 'error') {
                  setError(payload.data?.message || 'Crawler encountered an error');
                  setStatus('error');
                }
              } catch {
                // Ignore parse errors on individual SSE frames
              }
            }
          }
        }

        setStatus((prev) => (prev === 'running' ? 'completed' : prev));
        return resolvedCrawlId || currentCrawlIdRef.current;
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          setStatus('cancelled');
        } else {
          setError(err.message || 'Crawl failed');
          setStatus('error');
        }
        return null;
      }
    },
    [clear]
  );

  const refresh = useCallback(async () => {
    const id = currentCrawlIdRef.current;
    const h = currentHostRef.current;
    if (!h) return;

    if (id) {
      try {
        await fetch(`/api/crawl/${id}/refresh`, { method: 'POST' });
      } catch {
        // Fallback to start
      }
    }
    await start(h, currentOptionsRef.current);
  }, [start]);

  return {
    status,
    stats,
    crawlId,
    host,
    cached,
    isCrawling: status === 'running',
    error,
    start,
    cancel,
    refresh,
    clear,
  };
}
