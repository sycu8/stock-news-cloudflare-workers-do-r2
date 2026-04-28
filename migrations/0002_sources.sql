CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'html_list')),
  base_url TEXT,
  feed_url TEXT,
  list_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  allow_crawl INTEGER NOT NULL DEFAULT 0,
  respect_robots INTEGER NOT NULL DEFAULT 1,
  extractor_key TEXT,
  notes TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES news_sources (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_sources_enabled ON news_sources (enabled);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_id ON crawl_runs (source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_created_at ON crawl_runs (created_at);
