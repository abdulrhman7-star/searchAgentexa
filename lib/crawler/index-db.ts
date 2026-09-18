import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { CrawlJob, CrawledPage, CrawledFile, SiteSearchResult } from './types';

let dbClient: Client | null = null;
let isInitialized = false;

export function getDbClient(): Client {
  if (dbClient) return dbClient;

  const rawUrl = process.env.CRAWL_DB_URL || 'file:./data/crawl.db';

  if (rawUrl.startsWith('file:')) {
    const filePath = rawUrl.replace('file:', '');
    const absPath = path.resolve(filePath);
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbClient = createClient({
    url: rawUrl,
  });

  return dbClient;
}

export async function initDb(): Promise<void> {
  if (isInitialized) return;
  const client = getDbClient();

  // Create base tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS crawl (
      id TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      stats_json TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      crawl_id TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      description TEXT,
      text TEXT,
      headings TEXT,
      lang TEXT,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (crawl_id) REFERENCES crawl(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      crawl_id TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      ext TEXT,
      mime TEXT,
      size_bytes INTEGER,
      source_page TEXT,
      fetched_at INTEGER NOT NULL,
      FOREIGN KEY (crawl_id) REFERENCES crawl(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      crawl_id TEXT NOT NULL,
      from_url TEXT NOT NULL,
      to_url TEXT NOT NULL
    );
  `);

  // Create Indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_pages_crawl ON pages(crawl_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_files_crawl ON files(crawl_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_crawl_host ON crawl(host);`);

  // Create FTS5 virtual tables with content='pages' and content='files'
  try {
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
        title,
        description,
        text,
        content='pages',
        content_rowid='rowid'
      );
    `);

    // Triggers for pages_fts
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
        INSERT INTO pages_fts(rowid, title, description, text) VALUES (new.rowid, new.title, new.description, new.text);
      END;
    `);
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, description, text) VALUES('delete', old.rowid, old.title, old.description, old.text);
      END;
    `);
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
        INSERT INTO pages_fts(pages_fts, rowid, title, description, text) VALUES('delete', old.rowid, old.title, old.description, old.text);
        INSERT INTO pages_fts(rowid, title, description, text) VALUES (new.rowid, new.title, new.description, new.text);
      END;
    `);

    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
        name,
        ext,
        mime,
        content='files',
        content_rowid='rowid'
      );
    `);

    // Triggers for files_fts
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
        INSERT INTO files_fts(rowid, name, ext, mime) VALUES (new.rowid, new.name, new.ext, new.mime);
      END;
    `);
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, name, ext, mime) VALUES('delete', old.rowid, old.name, old.ext, old.mime);
      END;
    `);
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, name, ext, mime) VALUES('delete', old.rowid, old.name, old.ext, old.mime);
        INSERT INTO files_fts(rowid, name, ext, mime) VALUES (new.rowid, new.name, new.ext, new.mime);
      END;
    `);
  } catch (err) {
    console.warn('FTS5 initialization warning:', err);
  }

  // Cleanup crawls older than 7 days
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await client.execute({
      sql: `DELETE FROM crawl WHERE started_at < ?`,
      args: [sevenDaysAgo],
    });
  } catch {
    // Ignore cleanup error
  }

  isInitialized = true;
}

export async function saveCrawlJob(job: CrawlJob): Promise<void> {
  await initDb();
  const client = getDbClient();
  await client.execute({
    sql: `
      INSERT INTO crawl (id, host, started_at, finished_at, stats_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        finished_at = excluded.finished_at,
        stats_json = excluded.stats_json
    `,
    args: [
      job.id,
      job.host,
      job.startedAt,
      job.finishedAt || null,
      JSON.stringify({
        status: job.status,
        options: job.options,
        stats: job.stats,
        error: job.error,
      }),
    ],
  });
}

export async function updateCrawlJob(id: string, updates: Partial<CrawlJob>): Promise<void> {
  await initDb();
  const existing = await getCrawlById(id);
  if (!existing) return;

  const merged: CrawlJob = {
    ...existing,
    ...updates,
    stats: {
      ...existing.stats,
      ...(updates.stats || {}),
    },
    options: {
      ...existing.options,
      ...(updates.options || {}),
    },
  };

  await saveCrawlJob(merged);
}

export async function getCrawlByHost(host: string): Promise<CrawlJob | null> {
  await initDb();
  const client = getDbClient();
  const cleanHost = host.toLowerCase().trim();

  const res = await client.execute({
    sql: `SELECT id, host, started_at, finished_at, stats_json FROM crawl WHERE host = ? ORDER BY started_at DESC LIMIT 1`,
    args: [cleanHost],
  });

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const statsMeta = row.stats_json ? JSON.parse(row.stats_json as string) : {};

  return {
    id: row.id as string,
    host: row.host as string,
    seedUrl: `https://${row.host}`,
    status: statsMeta.status || 'completed',
    startedAt: row.started_at as number,
    finishedAt: (row.finished_at as number) || undefined,
    options: statsMeta.options || {},
    stats: statsMeta.stats || {
      pagesCount: 0,
      filesCount: 0,
      queuedCount: 0,
      errorsCount: 0,
      blockedCount: 0,
      elapsedMs: 0,
      percent: 100,
    },
    error: statsMeta.error,
  };
}

export async function getCrawlById(id: string): Promise<CrawlJob | null> {
  await initDb();
  const client = getDbClient();

  const res = await client.execute({
    sql: `SELECT id, host, started_at, finished_at, stats_json FROM crawl WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const statsMeta = row.stats_json ? JSON.parse(row.stats_json as string) : {};

  return {
    id: row.id as string,
    host: row.host as string,
    seedUrl: `https://${row.host}`,
    status: statsMeta.status || 'completed',
    startedAt: row.started_at as number,
    finishedAt: (row.finished_at as number) || undefined,
    options: statsMeta.options || {},
    stats: statsMeta.stats || {
      pagesCount: 0,
      filesCount: 0,
      queuedCount: 0,
      errorsCount: 0,
      blockedCount: 0,
      elapsedMs: 0,
      percent: 100,
    },
    error: statsMeta.error,
  };
}

export async function deleteCrawl(id: string): Promise<boolean> {
  await initDb();
  const client = getDbClient();
  await client.execute({
    sql: `DELETE FROM pages WHERE crawl_id = ?`,
    args: [id],
  });
  await client.execute({
    sql: `DELETE FROM files WHERE crawl_id = ?`,
    args: [id],
  });
  await client.execute({
    sql: `DELETE FROM links WHERE crawl_id = ?`,
    args: [id],
  });
  const res = await client.execute({
    sql: `DELETE FROM crawl WHERE id = ?`,
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function savePage(page: CrawledPage): Promise<void> {
  await initDb();
  const client = getDbClient();
  const pageId = page.id || `pg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await client.execute({
    sql: `
      INSERT INTO pages (id, crawl_id, url, title, description, text, headings, lang, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        text = excluded.text,
        headings = excluded.headings,
        lang = excluded.lang,
        fetched_at = excluded.fetched_at
    `,
    args: [
      pageId,
      page.crawlId,
      page.url,
      page.title || '',
      page.description || '',
      page.text || '',
      page.headings || '',
      page.lang || 'en',
      page.fetchedAt || Date.now(),
    ],
  });
}

export async function saveFile(file: CrawledFile): Promise<void> {
  await initDb();
  const client = getDbClient();
  const fileId = file.id || `fl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await client.execute({
    sql: `
      INSERT INTO files (id, crawl_id, url, name, ext, mime, size_bytes, source_page, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        name = excluded.name,
        ext = excluded.ext,
        mime = excluded.mime,
        size_bytes = excluded.size_bytes,
        source_page = excluded.source_page,
        fetched_at = excluded.fetched_at
    `,
    args: [
      fileId,
      file.crawlId,
      file.url,
      file.name,
      file.ext || '',
      file.mime || '',
      file.sizeBytes || null,
      file.sourcePage || null,
      file.fetchedAt || Date.now(),
    ],
  });
}

export async function saveLinks(crawlId: string, fromUrl: string, toUrls: string[]): Promise<void> {
  if (toUrls.length === 0) return;
  await initDb();
  const client = getDbClient();
  const batchStatements = toUrls.slice(0, 50).map((toUrl) => ({
    sql: `INSERT INTO links (id, crawl_id, from_url, to_url) VALUES (?, ?, ?, ?)`,
    args: [
      `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      crawlId,
      fromUrl,
      toUrl,
    ],
  }));

  try {
    await client.batch(batchStatements, 'deferred');
  } catch {
    // Ignore link batch insertion errors
  }
}

export async function searchLocalIndex(
  crawlId: string,
  rawQuery: string,
  tabs: ('pages' | 'files')[] = ['pages', 'files'],
  limit = 25
): Promise<SiteSearchResult[]> {
  await initDb();
  const client = getDbClient();
  const results: SiteSearchResult[] = [];

  const sanitizedQuery = rawQuery
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `"${w}"*`)
    .join(' OR ');

  // If query is blank, fetch recent pages and files
  const isBlank = !sanitizedQuery;

  if (tabs.includes('pages')) {
    try {
      if (isBlank) {
        const pagesRes = await client.execute({
          sql: `SELECT id, crawl_id, url, title, description, text, lang FROM pages WHERE crawl_id = ? ORDER BY fetched_at DESC LIMIT ?`,
          args: [crawlId, limit],
        });
        for (const r of pagesRes.rows) {
          results.push({
            id: r.id as string,
            crawlId: r.crawl_id as string,
            type: 'page',
            url: r.url as string,
            title: (r.title as string) || (r.url as string),
            snippet: (r.description as string) || (r.text as string)?.slice(0, 180) || '',
            lang: r.lang as string,
          });
        }
      } else {
        // Query FTS5 with snippet
        const ftsRes = await client.execute({
          sql: `
            SELECT 
              p.id, p.crawl_id, p.url, p.title, p.lang,
              snippet(pages_fts, 2, '<mark class="bg-yellow-100 text-yellow-900 font-semibold px-0.5 rounded">', '</mark>', '…', 14) AS snip,
              bm25(pages_fts) AS rank
            FROM pages_fts
            JOIN pages p ON p.rowid = pages_fts.rowid
            WHERE pages_fts MATCH ? AND p.crawl_id = ?
            ORDER BY rank
            LIMIT ?
          `,
          args: [sanitizedQuery, crawlId, limit],
        });

        for (const r of ftsRes.rows) {
          results.push({
            id: r.id as string,
            crawlId: r.crawl_id as string,
            type: 'page',
            url: r.url as string,
            title: (r.title as string) || (r.url as string),
            snippet: r.snip as string,
            score: typeof r.rank === 'number' ? Math.abs(r.rank) : undefined,
            lang: r.lang as string,
          });
        }

        // Fallback LIKE if FTS had 0 matches
        if (results.length === 0) {
          const words = rawQuery.trim().split(/\s+/).filter(Boolean);
          const likePattern = `%${words[0] || ''}%`;
          const fallbackRes = await client.execute({
            sql: `
              SELECT id, crawl_id, url, title, description, text, lang 
              FROM pages 
              WHERE crawl_id = ? AND (title LIKE ? OR text LIKE ? OR url LIKE ?)
              LIMIT ?
            `,
            args: [crawlId, likePattern, likePattern, likePattern, limit],
          });
          for (const r of fallbackRes.rows) {
            results.push({
              id: r.id as string,
              crawlId: r.crawl_id as string,
              type: 'page',
              url: r.url as string,
              title: (r.title as string) || (r.url as string),
              snippet: (r.description as string) || (r.text as string)?.slice(0, 180) || '',
              lang: r.lang as string,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Pages FTS search error:', err);
    }
  }

  if (tabs.includes('files')) {
    try {
      if (isBlank) {
        const filesRes = await client.execute({
          sql: `SELECT id, crawl_id, url, name, ext, mime, size_bytes, source_page FROM files WHERE crawl_id = ? ORDER BY fetched_at DESC LIMIT ?`,
          args: [crawlId, limit],
        });
        for (const r of filesRes.rows) {
          results.push({
            id: r.id as string,
            crawlId: r.crawl_id as string,
            type: 'file',
            url: r.url as string,
            title: r.name as string,
            ext: r.ext as string,
            mime: r.mime as string,
            sizeBytes: (r.size_bytes as number) || undefined,
            sourcePage: r.source_page as string,
          });
        }
      } else {
        const ftsFilesRes = await client.execute({
          sql: `
            SELECT 
              f.id, f.crawl_id, f.url, f.name, f.ext, f.mime, f.size_bytes, f.source_page,
              snippet(files_fts, 0, '<mark class="bg-yellow-100 text-yellow-900 font-semibold px-0.5 rounded">', '</mark>', '…', 8) AS snip,
              bm25(files_fts) AS rank
            FROM files_fts
            JOIN files f ON f.rowid = files_fts.rowid
            WHERE files_fts MATCH ? AND f.crawl_id = ?
            ORDER BY rank
            LIMIT ?
          `,
          args: [sanitizedQuery, crawlId, limit],
        });

        for (const r of ftsFilesRes.rows) {
          results.push({
            id: r.id as string,
            crawlId: r.crawl_id as string,
            type: 'file',
            url: r.url as string,
            title: r.name as string,
            snippet: r.snip as string,
            ext: r.ext as string,
            mime: r.mime as string,
            sizeBytes: (r.size_bytes as number) || undefined,
            sourcePage: r.source_page as string,
            score: typeof r.rank === 'number' ? Math.abs(r.rank) : undefined,
          });
        }

        // Fallback LIKE for files
        if (ftsFilesRes.rows.length === 0) {
          const words = rawQuery.trim().split(/\s+/).filter(Boolean);
          const likePattern = `%${words[0] || ''}%`;
          const fallbackFilesRes = await client.execute({
            sql: `
              SELECT id, crawl_id, url, name, ext, mime, size_bytes, source_page 
              FROM files 
              WHERE crawl_id = ? AND (name LIKE ? OR ext LIKE ? OR url LIKE ?)
              LIMIT ?
            `,
            args: [crawlId, likePattern, likePattern, likePattern, limit],
          });
          for (const r of fallbackFilesRes.rows) {
            results.push({
              id: r.id as string,
              crawlId: r.crawl_id as string,
              type: 'file',
              url: r.url as string,
              title: r.name as string,
              ext: r.ext as string,
              mime: r.mime as string,
              sizeBytes: (r.size_bytes as number) || undefined,
              sourcePage: r.source_page as string,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Files FTS search error:', err);
    }
  }

  return results;
}
