CREATE TABLE IF NOT EXISTS news_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_key TEXT NOT NULL UNIQUE,
  canonical_title TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 1,
  confidence_label TEXT NOT NULL DEFAULT 'single_source'
);

CREATE TABLE IF NOT EXISTS article_cluster_map (
  article_id INTEGER NOT NULL,
  cluster_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (article_id),
  FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  FOREIGN KEY (cluster_id) REFERENCES news_clusters (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_clusters_last_seen ON news_clusters (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_article_cluster_map_cluster_id ON article_cluster_map (cluster_id);

CREATE TABLE IF NOT EXISTS system_status_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  feed_ok_count INTEGER NOT NULL DEFAULT 0,
  feed_error_count INTEGER NOT NULL DEFAULT 0,
  feed_total_count INTEGER NOT NULL DEFAULT 0,
  ai_ok INTEGER NOT NULL DEFAULT 0,
  article_count INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_status_generated_at ON system_status_snapshots (generated_at);
