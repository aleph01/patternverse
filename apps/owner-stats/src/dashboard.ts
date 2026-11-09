import type { UsageStats } from './stats.js';
import { geographyPanel } from './geography.js';

const escape = (value: string | number): string =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
const number = (value: number) => new Intl.NumberFormat('en-GB').format(value);

export function dashboard(stats: UsageStats): string {
  const maximum = Math.max(1, ...stats.daily.map((day) => day.visits));
  const table = (heading: string, label: string, rows: [string, number][]) => `
    <section class="panel"><h2>${heading}</h2>${rows.length ? `<table><thead><tr><th>${label}</th><th>Count</th></tr></thead><tbody>${rows.map(([name, count]) => `<tr><td>${escape(name)}</td><td>${number(count)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No visits recorded in this period yet.</p>'}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Website statistics · Patternverse</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f3f0e8;color:#243b35;font:16px/1.5 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:40px 24px 64px}header{display:flex;justify-content:space-between;gap:24px;align-items:center}a{color:#215748;text-underline-offset:4px}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase}h1{font:normal clamp(30px,5vw,48px)/1.15 Georgia,serif;margin:8px 0 12px}h2{font-size:18px;margin:0 0 20px}.muted,footer{color:#596c64}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:32px 0}.panel,.card{border:1px solid #d9dfd5;background:#fffdf8;border-radius:14px;padding:24px}.card strong{display:block;font-size:38px;line-height:1.3;margin-top:8px}.period{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:20px}.period a{padding:6px 12px;border:1px solid #ccd7ca;border-radius:20px;text-decoration:none}.period a[aria-current]{color:white;background:#285849}.chart{height:180px;display:flex;align-items:flex-end;gap:4px;border-bottom:1px solid #ccd7ca;padding-top:16px}.bar{flex:1;background:#497a60;min-height:2px;border-radius:3px 3px 0 0}.chart-labels{display:flex;justify-content:space-between;font-size:12px;margin-top:8px}.columns{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-top:16px}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{padding:10px 0;text-align:left;border-bottom:1px solid #e7ebe2;overflow-wrap:anywhere}th:last-child,td:last-child{width:70px;text-align:right}th{font-size:12px;color:#596c64}footer{font-size:13px;margin-top:24px}details{margin-top:16px}summary{cursor:pointer}details table{margin-top:12px}svg{vertical-align:middle}@media(max-width:640px){main{padding:24px 16px}.cards{gap:8px}.card{padding:14px}.card strong{font-size:30px}.columns{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column;gap:8px}.panel{padding:18px}}
    .geography{margin-top:16px}.geo-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.geo-heading h2{margin-bottom:4px}.geo-heading p{margin:0 0 20px;font-size:14px}.geo-badge{white-space:nowrap;border:1px solid #d9dfd5;border-radius:20px;padding:4px 10px;font-size:12px}.geo-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(170px,1fr);gap:24px;align-items:start}.world-map{display:block;width:100%;height:auto}.geo-note{font-size:12px;line-height:1.6;margin-bottom:0}.geo-layout table{font-size:14px}.geo-layout th,.geo-layout td{padding:8px 0}@media(max-width:760px){.geo-layout{grid-template-columns:1fr;gap:12px}.geo-heading{gap:8px}}
  </style></head><body><main><header><div><span class="eyebrow">Patternverse · Owner only</span><h1>Website statistics</h1><p class="muted">A small view of interest in the public website.</p></div><a href="/cdn-cgi/access/logout">Sign out</a></header>
  <div class="cards" aria-label="Visit totals"><div class="card">Today<strong>${number(stats.today)}</strong></div><div class="card">Last 7 days<strong>${number(stats.week)}</strong></div><div class="card">Last 30 days<strong>${number(stats.month)}</strong></div></div>
  <section class="panel"><div class="period"><h2 style="margin:0 auto 0 0">Visits over time</h2>${[7, 30].map((days) => `<a href="/owner/stats?days=${days}"${stats.days === days ? ' aria-current="page"' : ''}>${days} days</a>`).join('')}</div><p class="muted">${number(stats.views)} public page views in this period</p>
  <div class="chart" role="img" aria-label="Daily visits; exact counts are in the table below">${stats.daily.map((day) => `<div class="bar" style="height:${Math.max(1, Math.round((day.visits / maximum) * 100))}%" title="${escape(day.day)}: ${number(day.visits)} visits"></div>`).join('')}</div><div class="chart-labels"><span>${escape(stats.daily[0]!.day)}</span><span>${escape(stats.daily.at(-1)!.day)}</span></div>
  <details><summary>View daily counts</summary><table><thead><tr><th>Date (UTC)</th><th>Visits</th><th>Page views</th></tr></thead><tbody>${stats.daily.map((day) => `<tr><td>${day.day}</td><td>${number(day.visits)}</td><td>${number(day.views)}</td></tr>`).join('')}</tbody></table></details></section>
  ${geographyPanel(
    stats.countries,
    stats.daily.reduce((sum, day) => sum + day.visits, 0),
  )}
  <div class="columns">${table(
    'Public arrival pages',
    'Page',
    stats.pages.map((row) => [row.path, row.views]),
  )}${table(
    'Where visits came from',
    'Source',
    stats.sources.map((row) => [row.source, row.visits]),
  )}</div>
  <footer><p>Visits are estimates of interest, not unique people. Each successful online public page load from browser navigation counts as a visit and page view. Repeat visitors and reloads can count again. Navigation handled inside the app, offline or cached reading, privacy opt-outs and known bots are not recorded; automated or fabricated requests may still affect totals.</p><p>Only daily aggregate counts, including country totals, are stored, for 180 days. No analytics cookies, visitor IDs, IP addresses, precise locations, query strings, practice responses or conversations are stored in these statistics. Owner sign-in uses a necessary authentication cookie.</p><p>Dates use UTC. Updated ${escape(stats.updated.replace('T', ' ').slice(0, 19))} UTC. <a href="/owner/stats?days=${stats.days}">Refresh statistics</a></p></footer></main></body></html>`;
}
