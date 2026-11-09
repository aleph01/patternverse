import map from './geography.json' with { type: 'json' };
import type { UsageStats } from './stats.js';

const centers: Record<string, number[]> = map.centers;
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const number = (value: number) => new Intl.NumberFormat('en-GB').format(value);
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

/** Only a broad country code supplied by Cloudflare enters the aggregate database. */
export function countryCode(value: unknown): string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) && Object.hasOwn(centers, value)
    ? value
    : 'ZZ';
}

export function geographyPanel(countries: UsageStats['countries'], total: number): string {
  const located = countries.filter(({ country }) => countryCode(country) !== 'ZZ');
  const known = located.reduce((sum, row) => sum + row.visits, 0);
  const maximum = Math.max(1, ...located.map((row) => row.visits));
  const label = (code: string) => escape(names.of(code) ?? code);
  return `<section class="panel geography"><div class="geo-heading"><div><h2>Geographic clusters</h2><p class="muted">Country-level visits in the selected period. Larger circles mean more visits.</p></div><span class="geo-badge">${number(located.length)} ${located.length === 1 ? 'country' : 'countries'}</span></div>
  <div class="geo-layout"><div><svg class="world-map" viewBox="0 0 720 290" role="img" aria-labelledby="geo-title geo-description"><title id="geo-title">Visits by country</title><desc id="geo-description">Circles are placed at fixed country label positions, not visitor locations. Exact country totals follow the map.</desc><rect width="720" height="290" rx="12" fill="#edf2ed"/><path d="${map.outline}" fill="#d2ded2" stroke="#f8faf5" stroke-width="0.6"/>
  ${located
    .slice()
    .reverse()
    .map(({ country, visits }) => {
      const [longitude, latitude] = centers[country]!;
      const x = Math.round((longitude! + 180) * 20) / 10;
      const y = Math.round((85 - latitude!) * 20) / 10;
      const radius = Math.round((3 + 15 * Math.sqrt(visits / maximum)) * 10) / 10;
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#2b7058" fill-opacity=".65" stroke="#fffdf8" stroke-width="1.5"><title>${label(country)}: ${number(visits)} ${visits === 1 ? 'visit' : 'visits'}</title></circle>`;
    })
    .join(
      '',
    )}</svg><p class="geo-note muted">Approximate countries from the network connection. VPNs and proxies may change the result. Map: Natural Earth.</p></div>
  <div>${located.length ? `<table><thead><tr><th>Country / territory</th><th>Visits</th></tr></thead><tbody>${located.map(({ country, visits }) => `<tr><td>${label(country)}</td><td>${number(visits)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No geographic data yet. New visits will appear here.</p>'}</div></div>
  <p class="geo-note muted">${number(known)} of ${number(total)} visits have country data${total > known ? `; ${number(total - known)} have an unavailable location or predate geographic counting` : ''}. Earlier visits are not backfilled. Only daily country totals are retained, without cities, coordinates or IP addresses.</p></section>`;
}
