// Explicit maintenance task, never run during a build or from the dashboard.
// Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/
import { writeFile } from 'node:fs/promises';

const root = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
async function load(name) {
  const response = await fetch(`${root}${name}.geojson`);
  if (!response.ok) throw new Error(`Map data unavailable: ${response.status}`);
  return response.json();
}
const [land, countries] = await Promise.all([
  load('ne_110m_land'),
  load('ne_50m_admin_0_countries'),
]);
const round = (value) => Math.round(value * 10) / 10;
const outline = land.features
  .flatMap(({ geometry }) =>
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates,
  )
  // Antarctica is outside this compact map's extent.
  .filter((polygon) => polygon[0].some(([, latitude]) => latitude > -60))
  .flatMap((polygon) => polygon)
  .map((ring) => {
    const points = ring.map(([longitude, latitude]) => [
      round((longitude + 180) * 2),
      round((85 - latitude) * 2),
    ]);
    return `M${points.map((point) => point.join(',')).join('L')}Z`;
  })
  .join('');
const centers = {};
for (const { properties: country } of countries.features) {
  const code = country.ISO_A2_EH;
  if (!/^[A-Z]{2}$/.test(code)) continue;
  centers[code] = [round(country.LABEL_X), round(country.LABEL_Y)];
}
// Cloudflare may identify Kosovo separately from Serbia.
centers.XK ??= [20.9, 42.6];
await writeFile(
  new URL('../src/geography.json', import.meta.url),
  JSON.stringify({
    source: 'Natural Earth, public domain (110m land; 50m country label positions)',
    sourceUrl: root,
    outline,
    centers,
  }) + '\n',
);
