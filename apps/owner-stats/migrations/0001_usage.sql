-- Aggregate counts only: no raw events, visitor IDs, addresses, user agents or content.
CREATE TABLE IF NOT EXISTS daily_usage (
  day TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS page_usage (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);
CREATE TABLE IF NOT EXISTS source_usage (
  day TEXT NOT NULL,
  source TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source)
);
