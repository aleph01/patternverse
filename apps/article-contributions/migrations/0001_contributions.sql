CREATE TABLE contributions (
  id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  article_path TEXT NOT NULL,
  article_revision TEXT NOT NULL,
  article_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected','archived')),
  label TEXT NOT NULL DEFAULT '',
  reviewer_note TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX contributions_inbox ON contributions(status, created_at DESC);
CREATE INDEX contributions_article ON contributions(article_path, created_at DESC);
CREATE TABLE contribution_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contribution_id TEXT NOT NULL REFERENCES contributions(id),
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  created_at TEXT NOT NULL
);
