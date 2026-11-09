export type DayUsage = { day: string; visits: number; views: number };
export type UsageStats = {
  updated: string;
  days: number;
  today: number;
  week: number;
  month: number;
  views: number;
  daily: DayUsage[];
  pages: { path: string; views: number }[];
  sources: { source: string; visits: number }[];
  countries: { country: string; visits: number }[];
};

export async function readStats(
  db: D1Database,
  days: number,
  now = new Date(),
): Promise<UsageStats> {
  const date = (offset: number) =>
    new Date(now.getTime() - offset * 86400000).toISOString().slice(0, 10);
  const result = await db.batch([
    db
      .prepare(
        'SELECT day, visits, views FROM daily_usage WHERE day >= ? AND day <= ? ORDER BY day',
      )
      .bind(date(29), date(0)),
    db
      .prepare(
        'SELECT path, SUM(views) AS views FROM page_usage WHERE day >= ? AND day <= ? GROUP BY path ORDER BY views DESC, path LIMIT 10',
      )
      .bind(date(days - 1), date(0)),
    db
      .prepare(
        'SELECT source, SUM(visits) AS visits FROM source_usage WHERE day >= ? AND day <= ? GROUP BY source ORDER BY visits DESC, source LIMIT 4',
      )
      .bind(date(days - 1), date(0)),
    db
      .prepare(
        'SELECT country, SUM(visits) AS visits FROM country_usage WHERE day >= ? AND day <= ? GROUP BY country ORDER BY visits DESC, country',
      )
      .bind(date(days - 1), date(0)),
  ]);
  const rows = result[0]!.results as DayUsage[];
  const daily = Array.from({ length: days }, (_, i) => {
    const day = date(days - i - 1);
    return rows.find((row) => row.day === day) ?? { day, visits: 0, views: 0 };
  });
  return {
    updated: now.toISOString(),
    days,
    today: rows.find((row) => row.day === date(0))?.visits ?? 0,
    week: rows.filter((row) => row.day >= date(6)).reduce((sum, row) => sum + row.visits, 0),
    month: rows.reduce((sum, row) => sum + row.visits, 0),
    views: daily.reduce((sum, row) => sum + row.views, 0),
    daily,
    pages: result[1]!.results as UsageStats['pages'],
    sources: result[2]!.results as UsageStats['sources'],
    countries: result[3]!.results as UsageStats['countries'],
  };
}
