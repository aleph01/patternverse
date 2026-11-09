import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'content/assets');
const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, secondary = false) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${secondary ? '#626962' : '#252c28'}">${esc(value)}</text>`;
const rect = (x, y, width, height, accent = false, white = false) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${white ? '#fff' : accent ? '#edf5f0' : '#f1f2ef'}" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.2"/>`;
const arrow = (d) =>
  `<path d="${d}" fill="none" stroke="#00855b" stroke-width="1.5" marker-end="url(#arrow)"/>`;
function svg(title, description, width, height, drawing) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial"><title id="title">${esc(title)}</title><desc id="desc">${esc(description)}</desc><style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}rect,path{vector-effect:non-scaling-stroke;stroke-linejoin:miter;stroke-linecap:butt}</style><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/>${drawing}</svg>\n`;
}
const article = await readFile(resolve(root, 'content/patterns/federated-identity.md'), 'utf8');
const figures = [
  ...article.matchAll(/!\[(.*?)\]\(\.\.\/assets\/software-engineering\/(.*?)\.svg "/g),
].map((m) => [m[2], m[1]]);
if (figures.length !== 2) throw new Error('Expected two Federated Identity figures.');
function trust(phone) {
  let d = text(
    24,
    36,
    phone ? 'Federate sign-in' : 'Delegate authentication, retain local access',
    24,
  );
  d += text(
    24,
    78,
    phone
      ? 'Keep local access decisions.'
      : 'One OpenID Connect code-flow sign-in, summarized in four phases.',
    phone ? 18 : 19,
    true,
  );
  if (phone) {
    d +=
      rect(24, 112, 312, 176) +
      text(40, 150, '1 Portal starts sign-in', 21) +
      text(40, 190, 'Approved issuer + callback', 17) +
      text(40, 224, 'Bound browser transaction', 18) +
      text(40, 260, 'State · nonce · PKCE challenge', 17, true);
    d += arrow('M72 288V360') + text(96, 330, 'Browser redirect', 18, true);
    d +=
      rect(24, 364, 312, 184, true) +
      text(40, 404, '2 Provider authenticates', 21) +
      text(40, 444, 'Credentials stay here.', 18) +
      text(40, 480, 'Issues authorization code', 18) +
      text(40, 520, 'Code returns via browser', 17, true);
    d +=
      arrow('M72 548V636') +
      text(96, 586, 'Code callback, then', 17, true) +
      text(96, 616, 'TLS token exchange', 17, true);
    d +=
      rect(24, 640, 312, 240, true, true) +
      text(40, 680, '3 Portal verifies identity', 21) +
      text(40, 724, 'Code + PKCE verifier', 18) +
      text(40, 760, 'Issuer · signature · audience', 17) +
      text(40, 796, 'Time · transaction binding', 17) +
      text(40, 838, 'Resolve (issuer, subject)', 18) +
      text(40, 870, 'After protocol validation', 17, true);
    d += arrow('M72 880V952') + text(96, 924, 'Local account resolved', 17, true);
    d +=
      rect(24, 956, 312, 232) +
      text(40, 996, '4 Local session + access', 21) +
      text(40, 1040, 'Create the portal’s session.', 18) +
      text(40, 1076, 'Check local report permission.', 17) +
      text(40, 1116, 'RP / IdP session lifetimes', 17, true) +
      text(40, 1150, 'are managed separately.', 18, true);
    d +=
      text(24, 1236, 'OIDC code flow + PKCE example.', 18) +
      text(24, 1274, 'Arrows summarize phases.', 17, true);
  } else {
    d +=
      rect(24, 112, 672, 136) +
      text(40, 152, '1 Portal starts sign-in', 23) +
      text(40, 194, 'Trusted issuer · registered callback', 19) +
      text(40, 230, 'State · nonce · PKCE challenge (S256)', 19, true);
    d += arrow('M72 248V316') + text(96, 290, 'Browser redirects to approved provider', 19, true);
    d +=
      rect(24, 320, 672, 152, true) +
      text(40, 360, '2 Provider authenticates user', 23) +
      text(40, 404, 'Credentials remain at the identity provider.', 19) +
      text(40, 444, 'Returns authorization code through the browser.', 19, true);
    d += arrow('M72 472V548') + text(96, 514, 'Code callback, then TLS token exchange', 19, true);
    d +=
      rect(24, 552, 672, 184, true, true) +
      text(40, 592, '3 Portal verifies returned identity', 23) +
      text(40, 632, 'Exchange code + PKCE verifier over TLS', 19) +
      text(40, 672, 'Issuer · signature · audience · time', 19) +
      text(40, 712, 'Transaction binding · resolve (issuer, subject)', 19, true);
    d += arrow('M72 736V812') + text(96, 780, 'Verified identity → local account', 19, true);
    d +=
      rect(24, 816, 672, 176) +
      text(40, 856, '4 Portal establishes its session', 23) +
      text(40, 900, 'Local permissions govern each report request.', 19) +
      text(40, 940, 'Authenticated does not imply permitted.', 19) +
      text(40, 976, 'The IdP session has a separate lifetime.', 18, true);
    d += text(24, 1044, 'Illustrated form: OpenID Connect authorization code + PKCE.', 18, true);
  }
  return svg(
    'Delegated authentication and local authority',
    figures[0][1],
    phone ? 360 : 720,
    phone ? 1304 : 1080,
    d,
  );
}
function accounts(phone) {
  let d = text(
    24,
    36,
    phone ? 'Identity ≠ report permission' : 'Issuer scopes identity; the portal grants access',
    phone ? 22 : 24,
  );
  d += text(
    24,
    78,
    phone
      ? 'After protocol validation.'
      : 'Fixture values have already passed protocol validation.',
    phone ? 18 : 19,
    true,
  );
  const rows = [
    ['North / subject 17', 'sam@example.test', 'a1', 'Allowed', true],
    ['South / subject 17', 'sam@example.test', 'b9', 'Denied', true],
    ['North / subject 18', 'sam@example.test', 'Unlinked', 'Denied', false],
    ['North / subject 17', 'new@example.test', 'a1', 'Allowed', true],
    ['North / subject 17', 'Local grant revoked', 'a1', 'Denied', true],
  ];
  if (phone) {
    rows.forEach(([name, detail, account, result, linked], i) => {
      const y = 112 + i * 196;
      d +=
        rect(24, y, 312, 168, linked) +
        text(40, y + 34, name, 20) +
        text(40, y + 66, detail, 18, true) +
        text(40, y + 104, 'Local account: ' + account, 18) +
        text(40, y + 142, 'Summary: ' + result.toLowerCase(), 18);
    });
    d += text(24, 1120, 'Email alone never links accounts.', 19);
  } else {
    d +=
      text(40, 132, 'Federated identity', 19, true) +
      text(376, 132, 'Account', 19, true) +
      text(552, 132, 'Summary', 19, true);
    rows.forEach(([name, detail, account, result, linked], i) => {
      const y = 160 + i * 128;
      d +=
        rect(24, y, 672, 108, false, true) +
        text(40, y + 38, name, 21) +
        text(40, y + 78, detail, 18, true) +
        arrow('M340 ' + (y + 56) + 'H364') +
        text(376, y + 62, account, 20) +
        text(552, y + 62, result, 20);
      if (linked) d += arrow('M516 ' + (y + 56) + 'H544');
    });
    d += text(24, 834, 'Same subject or email does not merge issuer namespaces.', 19);
  }
  return svg(
    'Issuer-qualified accounts and local permissions',
    figures[1][1],
    phone ? 360 : 720,
    phone ? 1144 : 880,
    d,
  );
}
const manifestPath = resolve(assets, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(assets, 'software-engineering'), { recursive: true });
for (const [index, draw] of [trust, accounts].entries())
  for (const phone of [false, true]) {
    const relative = `software-engineering/${figures[index][0]}${phone ? '-mobile' : ''}.svg`;
    const source = draw(phone);
    await writeFile(resolve(assets, relative), source);
    const [, width, height] = source.match(/viewBox="0 0 (\d+) (\d+)"/);
    manifest[relative] = { width: Number(width), height: Number(height) };
  }
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Two Federated Identity figures and separate phone layouts generated.');
