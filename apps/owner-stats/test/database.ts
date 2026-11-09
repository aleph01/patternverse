import migration from '../migrations/0001_usage.sql?raw';
import countries from '../migrations/0002_country_usage.sql?raw';

export async function resetDatabase(db: D1Database): Promise<void> {
  // D1 exec expects one statement per line.
  await db.exec(
    `${migration}\n${countries}`
      .replace(/--[^\n]*/g, '')
      .replace(/\s+/g, ' ')
      .split(';')
      .filter((sql) => sql.trim())
      .map((sql) => `${sql};`)
      .join('\n'),
  );
  await db.batch(
    ['daily_usage', 'page_usage', 'source_usage', 'country_usage'].map((table) =>
      db.prepare(`DELETE FROM ${table}`),
    ),
  );
}
