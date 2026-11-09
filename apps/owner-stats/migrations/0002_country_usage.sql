-- Independent country totals: no per-visit location, IP address or page association.
CREATE TABLE IF NOT EXISTS country_usage (
  day TEXT NOT NULL,
  country TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country)
);
