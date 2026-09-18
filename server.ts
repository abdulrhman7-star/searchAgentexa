import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { searchExa, crawlAndExtractMedia } from './server/mediaExtractor';
import { generateSmartAnswer, generateImageSearchAnswer } from './agent';
import { executeImageSearchPipeline } from './server/visionSearch';
import { handler as gofileHandler } from './netlify/functions/gofile-search.js';
import { globalFileRegistry } from './server/providers/fileSearchAggregator';
import { startOrGetCrawl, getActiveCrawl, cancelCrawl, CrawlRunner } from './lib/crawler/runner';
import { getCrawlById, deleteCrawl } from './lib/crawler/index-db';
import { executeSiteSearch } from './lib/crawler/search';

dotenv.config();

// Create in-memory cache with 5 minute TTL (300 seconds)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      exaConfigured: true,
      openAIConfigured: !!process.env.OPENAI_API_KEY,
      cacheStats: searchCache.getStats(),
    });
  });

  // Extract media on-demand endpoint
  app.post('/api/extract-media', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      console.log(`[API /extract-media] Crawling media for: ${url}`);
      const mediaResult = await crawlAndExtractMedia(url, 4000);
      if (!mediaResult) {
        return res.json({ images: [], videos: [] });
      }
      return res.json(mediaResult);
    } catch (err: any) {
      console.error('[API /extract-media Error]:', err.message || err);
      return res.status(500).json({ error: err.message || 'Failed to extract media' });
    }
  });

  // Gofile REST API Search Endpoint (proxies netlify/functions/gofile-search)
  app.get('/api/gofile-search', async (req, res) => {
    try {
      const q = (req.query.q || req.query.query || '').toString();
      const token = (req.query.token || process.env.GOFILE_API_TOKEN || '').toString();
      const folderId = (req.query.folderId || process.env.GOFILE_FOLDER_ID || '').toString();

      const result = await gofileHandler({
        queryStringParameters: { q, token, folderId },
        httpMethod: 'GET',
      } as any);

      res.status(result.statusCode).json(JSON.parse(result.body));
    } catch (err: any) {
      console.error('[API /gofile-search Error]:', err.message || err);
      res.status(500).json({ status: 'error', message: err.message || 'Gofile search failed' });
    }
  });

  // Dedicated Files & Documents Search Endpoint (Archive.org, Gofile, Mediafire, Google Drive, Dropbox, Mega, Open Web)
  app.post('/api/files/search', async (req, res) => {
    const startTime = Date.now();
    try {
      const {
        query,
        platforms,
        fileTypes,
        minSizeMb,
        maxSizeMb,
        dateAdded,
        customStartDate,
        customEndDate,
        language,
        hideFlagged,
        sort,
        limit,
      } = req.body;

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const cacheKey = `files_${JSON.stringify(req.body)}`;
      const cached = searchCache.get<any>(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true, durationMs: Date.now() - startTime });
      }

      const fileResults = await globalFileRegistry.searchAll({
        query: query.trim(),
        platforms,
        fileTypes,
        minSizeMb: minSizeMb ? Number(minSizeMb) : undefined,
        maxSizeMb: maxSizeMb ? Number(maxSizeMb) : undefined,
        dateAdded,
        customStartDate,
        customEndDate,
        language,
        hideFlagged: hideFlagged !== false,
        sort: sort || 'relevance',
        limit: limit ? Number(limit) : 24,
      });

      const responsePayload = {
        results: fileResults,
        total: fileResults.length,
        durationMs: Date.now() - startTime,
        cached: false,
      };

      searchCache.set(cacheKey, responsePayload, 300);
      return res.json(responsePayload);
    } catch (err: any) {
      console.error('[API /api/files/search Error]:', err.message || err);
      return res.status(500).json({ error: err.message || 'Files search failed' });
    }
  });

  // Main Search Endpoint
  app.post('/api/search', async (req, res) => {
    const startTime = Date.now();
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string' || !query.trim()) {
        console.warn('[API /search 400]: Missing or empty search query');
        return res.status(400).json({ error: 'Search query is required' });
      }

      const normalizedQuery = query.trim();
      const cacheKey = `search_${JSON.stringify({
        q: normalizedQuery.toLowerCase(),
        type: req.body.type || 'auto',
        category: req.body.category || 'all',
        numResults: req.body.numResults || 5,
        includeDomains: req.body.includeDomains || [],
        excludeDomains: req.body.excludeDomains || [],
        startPublishedDate: req.body.startPublishedDate || '',
        enableCrawl: req.body.enableCrawl !== false,
      })}`;

      // 1. Check Cache
      const cachedResult = searchCache.get<any>(cacheKey);
      if (cachedResult) {
        console.log(`[Cache HIT ⚡] Returning 5-min cached response for: "${normalizedQuery}"`);
        return res.json({
          ...cachedResult,
          durationMs: Date.now() - startTime,
          cached: true,
        });
      }

      console.log(`[Cache MISS 🔍] Executing Exa search for: "${normalizedQuery}"`);

      // 2. Perform Exa Search
      const { results, exaResponse, totalImagesCount, totalVideosCount } = await searchExa(normalizedQuery, req.body);

      // Execute Files & Documents search if category is filehosts/pdfs or if filePlatforms/fileTypes are requested
      let fileResults: any[] = [];
      if (req.body.category === 'filehosts' || req.body.category === 'pdfs' || req.body.filePlatforms || req.body.fileTypes) {
        try {
          fileResults = await globalFileRegistry.searchAll({
            query: normalizedQuery,
            platforms: req.body.filePlatforms,
            fileTypes: req.body.fileTypes,
            minSizeMb: req.body.minSizeMb,
            maxSizeMb: req.body.maxSizeMb,
            dateAdded: req.body.dateAdded,
            customStartDate: req.body.customStartDate,
            customEndDate: req.body.customEndDate,
            language: req.body.fileLanguage,
            hideFlagged: req.body.hideFlaggedFiles !== false,
            sort: req.body.fileSort || 'relevance',
            limit: 24,
          });
        } catch (fErr: any) {
          console.warn('[API /search File Provider Error]:', fErr.message);
        }
      }

      // 3. Synthesize Smart AI Answer using agent.ts
      let smartAnswerText = '';
      try {
        smartAnswerText = await generateSmartAnswer(normalizedQuery, results);
      } catch (aiErr: any) {
        console.error('[AI Answer Error]:', aiErr.message || aiErr);
        smartAnswerText = `Summary unavailable due to an error: ${aiErr.message || 'Unknown error'}`;
      }

      const citations = results.slice(0, 6).map((r) => ({
        url: r.url,
        title: r.title,
      }));

      const aiAnswer = {
        content: smartAnswerText,
        grounding: [
          {
            field: 'content',
            citations,
            confidence: 'high',
          },
        ],
      };

      const durationMs = Date.now() - startTime;

      const responsePayload = {
        query: normalizedQuery,
        requestId: exaResponse?.requestId || `req_${Date.now()}`,
        searchType: req.body.type || 'auto',
        category: req.body.category || 'all',
        results,
        files: fileResults,
        totalFilesCount: fileResults.length,
        aiAnswer,
        costDollars: exaResponse?.costDollars?.total,
        totalImagesCount,
        totalVideosCount,
        durationMs,
        cached: false,
      };

      // 4. Store in Cache (5 minutes TTL)
      searchCache.set(cacheKey, responsePayload);

      return res.json(responsePayload);
    } catch (err: any) {
      console.error('[API /search Error]:', err.stack || err.message || err);
      return res.status(500).json({
        error: err.message || 'Exa search failed',
      });
    }
  });

  // Multimodal Image-based Search Endpoint (User Image -> AI Vision -> Query Generator -> Exa/Video/Image -> Deduplication -> AI Ranking)
  app.post('/api/search-by-image', async (req, res) => {
    const startTime = Date.now();
    try {
      const { image, filename, prompt, category = 'all', filters = {} } = req.body;

      if (!image || typeof image !== 'string' || !image.trim()) {
        console.warn('[API /search-by-image 400]: Missing image payload');
        return res.status(400).json({ error: 'Image data or URL is required' });
      }

      const imageSnippet = image.length > 200 ? `${image.slice(0, 100)}...${image.slice(-50)}` : image;
      const cacheKey = `img_search_${filename || 'img'}_${image.length}_${category}_${JSON.stringify(filters)}`;

      const cached = searchCache.get<any>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT ⚡] Returning cached visual search for: "${filename || 'uploaded image'}"`);
        return res.json({
          ...cached,
          durationMs: Date.now() - startTime,
          cached: true,
        });
      }

      console.log(`[Cache MISS 🖼️] Executing Image Search Pipeline for: "${filename || imageSnippet}"`);

      // 1. Run Complete Vision Search Pipeline
      const pipelineResult = await executeImageSearchPipeline({
        image,
        filename,
        userPrompt: prompt,
        category,
        filters,
      });

      // 2. Synthesize AI Answer grounded in Visual Analysis + Top Web Sources
      let smartAnswerText = '';
      try {
        smartAnswerText = await generateImageSearchAnswer(pipelineResult.visionAnalysis, pipelineResult.results);
      } catch (aiErr: any) {
        console.error('[Vision AI Answer Error]:', aiErr.message || aiErr);
        smartAnswerText = `### Visual Search Results\n\nIdentified: **${pipelineResult.visionAnalysis.description}**\n\nTop match: [${pipelineResult.results[0]?.title || 'Source'}](${pipelineResult.results[0]?.url || '#'})`;
      }

      const citations = pipelineResult.results.slice(0, 6).map((r) => ({
        url: r.url,
        title: r.title,
      }));

      const aiAnswer = {
        content: smartAnswerText,
        grounding: [
          {
            field: 'content',
            citations,
            confidence: 'high',
          },
        ],
      };

      const responsePayload = {
        query: pipelineResult.visionAnalysis.generatedQueries.exaQuery || 'Image Search',
        requestId: `img_req_${Date.now()}`,
        searchType: filters.type || 'auto',
        category: category as any,
        results: pipelineResult.results,
        files: pipelineResult.files,
        totalFilesCount: pipelineResult.totalFilesCount,
        aiAnswer,
        visionAnalysis: pipelineResult.visionAnalysis,
        sourceImage: image,
        costDollars: 0.002,
        totalImagesCount: pipelineResult.totalImagesCount,
        totalVideosCount: pipelineResult.totalVideosCount,
        durationMs: Date.now() - startTime,
        cached: false,
      };

      // 3. Store in cache (5 minutes TTL)
      searchCache.set(cacheKey, responsePayload);

      return res.json(responsePayload);
    } catch (err: any) {
      console.error('[API /search-by-image Error]:', err.stack || err.message || err);
      return res.status(500).json({
        error: err.message || 'Image-based search pipeline failed',
      });
    }
  });

  // ==========================================
  // Crawler & Scoped Site Search Endpoints
  // ==========================================

  // POST /api/crawl/start (SSE streaming)
  app.post('/api/crawl/start', async (req, res) => {
    try {
      const { site, pathPrefix, options } = req.body;
      if (!site || typeof site !== 'string') {
        return res.status(400).json({ error: 'Valid site domain is required' });
      }

      const mergedOptions = {
        ...(options || {}),
        ...(pathPrefix ? { pathPrefix } : {}),
      };

      const { crawlId, cached, runner } = await startOrGetCrawl(site, mergedOptions);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) res.flushHeaders();

      // Emit initial meta
      res.write(`data: ${JSON.stringify({ type: 'meta', crawlId, cached, site })}\n\n`);

      if (cached) {
        const existing = await getCrawlById(crawlId);
        if (existing) {
          res.write(
            `data: ${JSON.stringify({
              type: 'done',
              data: { stats: existing.stats, reason: 'cached_index' },
              crawlId,
              cached: true,
            })}\n\n`
          );
        }
        res.end();
        return;
      }

      if (runner) {
        const cleanup = runner.on((event) => {
          try {
            res.write(`data: ${JSON.stringify({ ...event, crawlId, cached: false })}\n\n`);
            if (event.type === 'done' || event.type === 'error') {
              cleanup();
              res.end();
            }
          } catch {
            cleanup();
          }
        });

        req.on('close', () => {
          cleanup();
        });
      } else {
        const active = getActiveCrawl(crawlId);
        if (active) {
          const listener = (event: any) => {
            try {
              res.write(`data: ${JSON.stringify({ ...event, crawlId, cached: false })}\n\n`);
              if (event.type === 'done' || event.type === 'error') {
                active.listeners.delete(listener);
                res.end();
              }
            } catch {
              active.listeners.delete(listener);
            }
          };
          active.listeners.add(listener);
          req.on('close', () => {
            active.listeners.delete(listener);
          });
        } else {
          res.end();
        }
      }
    } catch (err: any) {
      console.error('[API /crawl/start Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Crawl failed to start' });
      }
    }
  });

  // GET /api/crawl/:id (stats snapshot)
  app.get('/api/crawl/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const active = getActiveCrawl(id);
      if (active) {
        return res.json(active.job);
      }
      const crawl = await getCrawlById(id);
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl job not found' });
      }
      return res.json(crawl);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/crawl/:id (cancel crawl & delete index)
  app.delete('/api/crawl/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const cancelled = cancelCrawl(id);
      await deleteCrawl(id);
      return res.json({ success: true, cancelled });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/crawl/:id/refresh (re-crawl in background)
  app.post('/api/crawl/:id/refresh', async (req, res) => {
    try {
      const id = req.params.id;
      const crawl = await getCrawlById(id);
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl job not found' });
      }
      const runner = new CrawlRunner(crawl.host, crawl.options, crawl.id);
      runner.run().catch((err) => console.error('Refresh crawl error:', err));
      return res.json({
        success: true,
        crawlId: runner.crawlId,
        message: 'Re-crawl started in background',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/search/site (SSE streaming search within crawled site)
  app.post('/api/search/site', async (req, res) => {
    try {
      const { crawlId, query = '', tabs = ['pages', 'files'], limit = 30 } = req.body;
      if (!crawlId) {
        return res.status(400).json({ error: 'crawlId is required' });
      }

      const searchResponse = await executeSiteSearch({
        crawlId,
        query,
        tabs,
        limit,
      });

      // If client requests standard JSON
      if (req.headers.accept?.includes('application/json')) {
        return res.json(searchResponse);
      }

      // Default SSE streaming format as specified in contract
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (res.flushHeaders) res.flushHeaders();

      res.write(
        `data: ${JSON.stringify({
          type: 'meta',
          host: searchResponse.host,
          crawlId: searchResponse.crawlId,
        })}\n\n`
      );

      if (searchResponse.pages.length > 0) {
        res.write(
          `data: ${JSON.stringify({
            type: 'batch',
            tab: 'pages',
            results: searchResponse.pages,
          })}\n\n`
        );
      }

      if (searchResponse.files.length > 0) {
        res.write(
          `data: ${JSON.stringify({
            type: 'batch',
            tab: 'files',
            results: searchResponse.files,
          })}\n\n`
        );
      }

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          elapsedMs: searchResponse.elapsedMs,
          total: searchResponse.total,
        })}\n\n`
      );

      res.end();
    } catch (err: any) {
      console.error('[API /search/site Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Site search failed' });
      }
    }
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exa Search AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
