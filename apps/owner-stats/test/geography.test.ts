import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import worker, { createHandler, type Env } from '../src/worker.js';
import { countryCode, geographyPanel } from '../src/geography.js';
import { readStats } from '../src/stats.js';
import { resetDatabase } from './database.js';

const settings = { ...env, COLLECTION_ENABLED: 'true', COLLECTION_MODE: 'edge' } as Env;
const request = (country: string | null, headers: Record<string, string> = {}) =>
  new Request('https://patternverse.org/library?private=answer', {
    headers: {
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
      'User-Agent': 'Example browser',
      'CF-IPCountry': 'US', // A supplied header must not override trusted edge metadata.
      ...headers,
    },
    cf: { country, city: 'Private city', latitude: '48.12', longitude: '11.54' },
  });
const handler = createHandler(
  undefined,
  async () => new Response('Original website', { headers: { 'Content-Type': 'text/html' } }),
);
beforeEach(() => resetDatabase(settings.STATS));

describe('country aggregates', () => {
  it('uses only Cloudflare country metadata and stores independent daily totals', async () => {
    for (const code of ['DE', 'DE', 'FR', null]) await handler(request(code), settings);
    const stats = await readStats(settings.STATS, 7);
    expect(stats.today).toBe(4);
    expect(stats.countries).toEqual([
      { country: 'DE', visits: 2 },
      { country: 'FR', visits: 1 },
      { country: 'ZZ', visits: 1 },
    ]);
    const rows = await settings.STATS.prepare('SELECT * FROM country_usage').all();
    expect(Object.keys(rows.results[0]!)).toEqual(['day', 'country', 'visits']);
    expect(JSON.stringify(rows.results)).not.toContain('Private');
    expect(JSON.stringify(rows.results)).not.toContain('48.12');
  });

  it('does not collect country data for opt-outs, private pages or non-navigation traffic', async () => {
    await handler(request('DE', { DNT: '1' }), settings);
    await handler(request('DE', { 'Sec-GPC': '1' }), settings);
    await handler(request('DE', { 'Sec-Fetch-Mode': 'cors' }), settings);
    await handler(new Request('https://patternverse.org/my', request('DE')), settings);
    expect((await readStats(settings.STATS, 7)).countries).toEqual([]);
  });

  it('matches the selected period and expires country totals after 180 days', async () => {
    await settings.STATS.batch([
      settings.STATS.prepare("INSERT INTO country_usage VALUES ('2026-10-23', 'DE', 2)"),
      settings.STATS.prepare("INSERT INTO country_usage VALUES ('2026-10-01', 'FR', 3)"),
      settings.STATS.prepare("INSERT INTO country_usage VALUES ('2000-01-01', 'US', 9)"),
    ]);
    const now = new Date('2026-10-23T12:00:00Z');
    expect((await readStats(settings.STATS, 7, now)).countries).toEqual([
      { country: 'DE', visits: 2 },
    ]);
    expect((await readStats(settings.STATS, 30, now)).countries).toEqual([
      { country: 'FR', visits: 3 },
      { country: 'DE', visits: 2 },
    ]);
    await worker.scheduled({} as ScheduledController, settings);
    expect(
      (await settings.STATS.prepare("SELECT * FROM country_usage WHERE day='2000-01-01'").all())
        .results,
    ).toEqual([]);
  });
});

describe('geographic presentation', () => {
  it('accepts only known broad country codes and handles absent or special locations', () => {
    expect(countryCode('DE')).toBe('DE');
    expect(countryCode('SG')).toBe('SG');
    for (const value of [undefined, null, '', 'XX', 'T1', 'ZZ', 'de', '<script>', '__proto__'])
      expect(countryCode(value)).toBe('ZZ');
  });

  it('renders fixed country circles and accessible exact totals, with honest missing history', () => {
    const html = geographyPanel(
      [
        { country: 'DE', visits: 4 },
        { country: 'SG', visits: 1 },
        { country: 'ZZ', visits: 2 },
      ],
      10,
    );
    expect(html).toContain('Germany');
    expect(html).toContain('Singapore');
    expect(html.match(/<circle /g)).toHaveLength(2);
    expect(html).toContain('5 of 10 visits have country data');
    expect(html).toContain('Earlier visits are not backfilled');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('https://');
  });

  it('shows an empty map without inventing country locations for earlier visits', () => {
    const html = geographyPanel([], 2);
    expect(html).toContain('No geographic data yet');
    expect(html).toContain('0 of 2 visits have country data');
    expect(html).not.toContain('<circle');
  });
});
