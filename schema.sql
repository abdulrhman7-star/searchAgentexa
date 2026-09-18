-- ============================================================================
-- Site Crawler & Local FTS5 Search Database Schema
-- Compatible with SQLite3 and LibSQL / Turso
-- ============================================================================

-- Base Crawl Jobs Table
CREATE TABLE IF NOT EXISTS crawl (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  stats_json TEXT
);

-- Crawled Web Pages
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

-- Discovered Public Files & Downloads
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

-- Page Links Graph
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  crawl_id TEXT NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL
);

-- Indexes for Fast Scoped Joins
CREATE INDEX IF NOT EXISTS idx_pages_crawl ON pages(crawl_id);
CREATE INDEX IF NOT EXISTS idx_files_crawl ON files(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_host ON crawl(host);

-- Full Text Search (FTS5) for Web Pages
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title,
  description,
  text,
  content='pages',
  content_rowid='rowid'
);

-- Triggers for pages_fts Synchronization
CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, title, description, text) VALUES (new.rowid, new.title, new.description, new.text);
END;

CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, description, text) VALUES('delete', old.rowid, old.title, old.description, old.text);
END;

CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, description, text) VALUES('delete', old.rowid, old.title, old.description, old.text);
  INSERT INTO pages_fts(rowid, title, description, text) VALUES (new.rowid, new.title, new.description, new.text);
END;

-- Full Text Search (FTS5) for Files & Downloads
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  ext,
  mime,
  content='files',
  content_rowid='rowid'
);

-- Triggers for files_fts Synchronization
CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, ext, mime) VALUES (new.rowid, new.name, new.ext, new.mime);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ext, mime) VALUES('delete', old.rowid, old.name, old.ext, old.mime);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, ext, mime) VALUES('delete', old.rowid, old.name, old.ext, old.mime);
  INSERT INTO files_fts(rowid, name, ext, mime) VALUES (new.rowid, new.name, new.ext, new.mime);
END;
