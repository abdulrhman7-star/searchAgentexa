-- Migration 001: Initial Crawler Tables and FTS5 Virtual Indexes
-- Applies initial schema for crawl, pages, files, links, and FTS5 search.

CREATE TABLE IF NOT EXISTS crawl (
  id TEXT PRIMARY KEY,
  host TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  stats_json TEXT
);

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

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  crawl_id TEXT NOT NULL,
  from_url TEXT NOT NULL,
  to_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pages_crawl ON pages(crawl_id);
CREATE INDEX IF NOT EXISTS idx_files_crawl ON files(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_host ON crawl(host);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title,
  description,
  text,
  content='pages',
  content_rowid='rowid'
);

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

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  ext,
  mime,
  content='files',
  content_rowid='rowid'
);

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
