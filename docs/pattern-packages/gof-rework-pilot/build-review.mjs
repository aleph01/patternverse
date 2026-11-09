import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const directory = new URL('./', import.meta.url);
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
// Reuse the syntax highlighter already installed with the local development tooling.
const rootRequire = createRequire(new URL('../../../package.json', import.meta.url));
const wranglerRequire = createRequire(rootRequire.resolve('wrangler'));
const miniflareRequire = createRequire(wranglerRequire.resolve('miniflare'));
const toolingRequire = createRequire(miniflareRequire.resolve('youch'));
const { tokenize } = toolingRequire('@speed-highlight/core');
const [unifiedModule, parseModule, gfmModule, rehypeModule, stringifyModule] = await Promise.all(
  ['unified', 'remark-parse', 'remark-gfm', 'remark-rehype', 'rehype-stringify'].map(
    (name) => import(require.resolve(name)),
  ),
);
const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 19, anchor = 'start', fill = '#252c28') =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${escape(value)}</text>`;
const rect = (x, y, width, height, fill = '#f1f2ef', stroke = '#a6aca3', extra = '') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" ${extra}/>`;
const path = (d, accent = false, arrow = false) =>
  `<path d="${d}" fill="none" stroke="${accent ? '#00855b' : '#a6aca3'}" stroke-width="1.5"${arrow ? ` marker-end="url(#arrow${accent ? '-green' : ''})"` : ''}/>`;

function svg(title, description, width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-style="light-editorial">
<title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc>
<style>:root{color-scheme:only light}svg{background:#fff}text{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;letter-spacing:0}path,rect{vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:butt}</style>
<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#a6aca3" stroke-width="1.2"/></marker><marker id="arrow-green" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L7 4L0 7" fill="none" stroke="#00855b" stroke-width="1.2"/></marker></defs>
<rect width="${width}" height="${height}" fill="#fff"/>
${body}
</svg>\n`;
}

const boundaryDescription =
  'Before, checkout contains validation, standard pricing, express pricing, and confirmation. After, checkout keeps validation and confirmation but delegates its price calculation through one contract to a selected strategy. Standard and express are alternative implementations.';
const boundary = (compact) => {
  const block = (x, y, after) =>
    text(x, y + 22, after ? 'After' : 'Before', 23) +
    rect(x, y + 44, 304, 254) +
    text(x + 20, y + 76, 'Checkout', 22) +
    text(x + 20, y + 117, 'Validate order') +
    (after
      ? rect(x + 20, y + 139, 264, 66, '#edf5f0', '#00855b') +
        text(x + 36, y + 166, 'Call selected pricing', 19) +
        text(x + 36, y + 190, 'Shipment → Quote', 17, 'start', '#626962')
      : rect(x + 20, y + 139, 264, 66, '#fff') +
        text(x + 36, y + 166, 'Standard pricing rule', 19) +
        text(x + 36, y + 190, 'Express pricing rule', 19)) +
    text(x + 20, y + 245, 'Continue checkout') +
    (after
      ? path(`M${x + 284} ${y + 172}H${x + 294}V${y + 330}H${x + 276}`, true, true) +
        rect(x + 20, y + 310, 254, 68, '#edf5f0', '#00855b') +
        text(x + 36, y + 338, 'Selected pricing strategy', 18) +
        text(x + 36, y + 362, 'Standard or express', 17, 'start', '#626962')
      : text(x + 2, y + 334, 'A new rule changes checkout.', 18, 'start', '#626962'));
  return svg(
    'Strategy moves the pricing rule out of checkout',
    boundaryDescription,
    compact ? 360 : 720,
    compact ? 848 : 438,
    compact
      ? block(28, 16, false) +
          block(28, 402, true) +
          text(28, 821, 'One process. A replaceable policy.', 18)
      : block(24, 16, false) +
          block(392, 16, true) +
          text(24, 422, 'One process. A replaceable policy.', 19),
  );
};

const collaborationDescription =
  'First, the customer option express is mapped to an express pricing strategy at the application boundary. Then checkout calls the selected express strategy with a shipment and receives a quote. Standard pricing remains an unused alternative and is not called.';
const collaboration = (compact) => {
  if (compact)
    return svg(
      'Select the strategy before calling it',
      collaborationDescription,
      360,
      688,
      text(24, 36, '1  Select at the boundary', 22) +
        rect(24, 62, 312, 64, '#fff') +
        text(44, 89, 'Customer option', 17, 'start', '#626962') +
        text(44, 113, 'Express', 20) +
        path('M180 126V163', true, true) +
        rect(24, 164, 312, 62, '#edf5f0', '#00855b') +
        text(44, 191, 'Supply express pricing', 20) +
        text(44, 214, 'Choose once for this checkout', 17, 'start', '#626962') +
        text(24, 278, '2  Call during checkout', 22) +
        rect(24, 302, 312, 58) +
        text(44, 338, 'Checkout workflow', 20) +
        path('M180 360V430', true, true) +
        text(198, 390, 'Shipment', 18) +
        rect(24, 431, 312, 66, '#edf5f0', '#00855b') +
        text(44, 459, 'Express pricing', 20) +
        text(44, 483, 'Selected strategy', 17, 'start', '#626962') +
        path('M24 462H12V330H24', false, true) +
        rect(24, 529, 312, 60, '#fff', '#a6aca3', 'stroke-dasharray="5 4"') +
        text(44, 556, 'Standard pricing', 19, 'start', '#626962') +
        text(44, 579, 'Alternative; not called', 17, 'start', '#626962') +
        text(24, 629, 'The return arrow carries a quote.', 17) +
        text(24, 657, 'Selection and calculation stay separate.', 17),
    );
  return svg(
    'Select the strategy before calling it',
    collaborationDescription,
    720,
    470,
    text(24, 36, '1  Select at the application boundary', 23) +
      rect(24, 62, 236, 70, '#fff') +
      text(44, 91, 'Customer option', 18, 'start', '#626962') +
      text(44, 118, 'Express', 21) +
      path('M260 97H432', true, true) +
      text(346, 81, 'Select', 18, 'middle') +
      rect(434, 62, 262, 70, '#edf5f0', '#00855b') +
      text(454, 91, 'Supply express pricing', 20) +
      text(454, 118, 'For this checkout', 18, 'start', '#626962') +
      path('M24 168H696') +
      text(24, 211, '2  Call during checkout', 23) +
      rect(24, 258, 236, 76) +
      text(142, 303, 'Checkout workflow', 21, 'middle') +
      path('M260 280H432', true, true) +
      text(346, 265, 'Shipment', 18, 'middle') +
      path('M434 319H262', false, true) +
      text(346, 343, 'Quote', 18, 'middle') +
      rect(434, 258, 262, 76, '#edf5f0', '#00855b') +
      text(454, 290, 'Express pricing', 21) +
      text(454, 316, 'Selected strategy', 18, 'start', '#626962') +
      rect(434, 366, 262, 68, '#fff', '#a6aca3', 'stroke-dasharray="5 4"') +
      text(454, 395, 'Standard pricing', 20, 'start', '#626962') +
      text(454, 420, 'Alternative; not called', 18, 'start', '#626962') +
      text(
        24,
        454,
        'The contract defines the call. Application code chooses the implementation.',
        18,
      ),
  );
};

for (const [name, make] of [
  ['strategy-boundary', boundary],
  ['strategy-collaboration', collaboration],
]) {
  await writeFile(new URL(`${name}.svg`, directory), make(false));
  await writeFile(new URL(`${name}-mobile.svg`, directory), make(true));
}

const processor = unifiedModule
  .unified()
  .use(parseModule.default)
  .use(gfmModule.default)
  .use(rehypeModule.default)
  .use(function highlightCode() {
    return async (tree) => {
      const aliases = { python: 'py', javascript: 'js', typescript: 'ts', rust: 'rs' };
      async function visit(node) {
        if (node.type === 'element' && node.tagName === 'pre') {
          const code = node.children.find((child) => child.tagName === 'code');
          const language = code?.properties?.className
            ?.find((name) => name.startsWith('language-'))
            ?.slice('language-'.length);
          if (language) {
            const source = code.children.map((child) => child.value ?? '').join('');
            const children = [];
            await tokenize(source, aliases[language] ?? language, (value, kind) => {
              if (!value) return;
              const textNode = { type: 'text', value };
              children.push(
                kind
                  ? {
                      type: 'element',
                      tagName: 'span',
                      properties: { className: [`syntax-${kind}`] },
                      children: [textNode],
                    }
                  : textNode,
              );
            });
            code.children = children;
            const label = language === 'python' ? 'Python' : language;
            node.properties = {
              ...node.properties,
              'data-language': label,
              tabIndex: 0,
              role: 'region',
              ariaLabel: `${label} code example`,
            };
          }
          return;
        }
        for (const child of node.children ?? []) await visit(child);
      }
      await visit(tree);
    };
  })
  .use(stringifyModule.default);

async function markdown(source) {
  const body = source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/\[\[([a-z-]+)\|([^\]]+)\]\]/g, '[$2](https://patternverse.org/pattern/$1)');
  return String(await processor.process(body)).replace(
    /<p><img src="(strategy-[a-z-]+)\.svg" alt="([^"]+)" title="([^"]+)"><\/p>/g,
    '<figure><picture><source media="(max-width: 580px)" srcset="$1-mobile.svg"><img src="$1.svg" alt="$2"></picture><figcaption>$3</figcaption></figure>',
  );
}

const css = `:root{color-scheme:only light;color:#252c28;background:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0}a{color:#007d55;text-underline-offset:3px}header{border-bottom:1px solid #e2e5df;padding:20px max(22px,calc((100vw - 1040px)/2))}nav{display:flex;flex-wrap:wrap;gap:18px;font-size:14px}nav a{color:#626962}nav a[aria-current=page]{color:#007d55}main{max-width:776px;margin:54px auto 90px;padding:0 28px}main.wide{max-width:1080px}.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#626962;margin-bottom:12px}h1{font-weight:550;font-size:46px;line-height:1.1;letter-spacing:-.035em;margin:0 0 18px}h2{font-weight:560;font-size:27px;line-height:1.25;margin:44px 0 18px;letter-spacing:-.02em}h3{font-size:20px;line-height:1.35;font-weight:560;margin:28px 0 12px}p,li{font-size:17px;line-height:1.8}p{margin:17px 0}.summary{font-size:20px;line-height:1.55;color:#626962;margin-bottom:34px}figure{margin:30px -1px}picture,img{display:block;width:100%;height:auto}figcaption{font-size:14px;line-height:1.6;color:#626962;margin-top:14px}pre{font-size:14px;line-height:1.65;background:#f4f5f2;padding:22px;overflow-x:auto;border:1px solid #e2e5df}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}table{border-collapse:collapse;width:100%;margin:24px 0;font-size:15px;line-height:1.6}th,td{text-align:left;vertical-align:top;padding:13px 12px;border-bottom:1px solid #dfe4dd}th{font-weight:550;background:#f1f2ef}td:first-child{width:22%}.table-scroll{overflow-x:auto}.collection{list-style:none;padding:0}.collection li{padding:20px 0;border-bottom:1px solid #e2e5df}.collection a{font-size:22px;text-decoration:none}.collection p{margin:5px 0 0;color:#626962;font-size:16px}footer{font-size:13px;color:#626962;margin-top:50px;padding-top:20px;border-top:1px solid #e2e5df}@media(max-width:580px){header{padding:17px 22px}main{margin:34px auto 60px;padding:0 22px}h1{font-size:38px}h2{font-size:25px;margin-top:36px}.summary{font-size:18px}p,li{font-size:16px;line-height:1.75}figure{margin:24px 0}pre{padding:15px;font-size:12px}th,td{min-width:145px}td:last-child{min-width:240px}}`;

const syntaxCss = `pre[data-language]::before{content:attr(data-language);display:block;font:500 12px system-ui,sans-serif;color:#626962;margin-bottom:14px}pre:focus-visible{outline:2px solid #00855b;outline-offset:3px}.syntax-kwd{color:#7a2d89}.syntax-str,.syntax-esc{color:#176043}.syntax-func{color:#174a8b}.syntax-class,.syntax-type{color:#7b4218}.syntax-num,.syntax-bool{color:#8a3b22}.syntax-cmnt{color:#626962}.syntax-oper{color:#48564c}.syntax-var{color:#174a8b}`;

function page(title, summary, body, current = 'article', wide = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — GoF editorial pilot</title><style>${css}${syntaxCss}</style></head><body><header><nav aria-label="Review pages">${[
    ['article', 'index.html', 'Strategy pilot'],
    ['outline', 'outline.html', 'Shared outline'],
    ['collection', 'collection.html', 'One GoF collection'],
  ]
    .map(
      ([id, href, label]) =>
        `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`,
    )
    .join(
      '',
    )}</nav></header><main${wide ? ' class="wide"' : ''}><div class="eyebrow">GoF Design Patterns · Review draft</div><h1>${escape(title)}</h1><p class="summary">${escape(summary)}</p>${body}<footer>Editorial pilot · 28 October 2026 · Prepared for review before the collection rollout.</footer></main></body></html>\n`;
}

const article = await readFile(new URL('strategy.md', directory), 'utf8');
const outline = await readFile(new URL('outline.md', directory), 'utf8');
await writeFile(
  new URL('index.html', directory),
  page(
    'Strategy',
    'Make a varying algorithm or policy explicit and replaceable behind a common contract.',
    await markdown(article),
  ),
);
await writeFile(
  new URL('outline.html', directory),
  page(
    'Software pattern article outline',
    'A shared article structure, one GoF collection, and the current editorial illustration style.',
    (await markdown(outline.replace(/^# Software pattern article outline\n/, ''))).replace(
      /<table>[\s\S]*?<\/table>/g,
      '<div class="table-scroll" role="region" aria-label="Article outline" tabindex="0">$&</div>',
    ),
    'outline',
    true,
  ),
);

const gof = JSON.parse(await readFile(new URL('../gof.json', directory), 'utf8'));
const patterns = [...gof.patterns].sort((a, b) => a.title.localeCompare(b.title, 'en'));
await writeFile(
  new URL('collection.html', directory),
  page(
    'GoF Design Patterns',
    '23 recurring designs for objects and their collaborations.',
    `<p>Explore the problem each design addresses, how it works, and the costs it introduces. The patterns are listed alphabetically. Each article connects to nearby designs to help you compare the choices.</p><ul class="collection">${patterns
      .map(
        (pattern) =>
          `<li><a href="${pattern.id === 'strategy' ? 'index.html' : `https://patternverse.org/pattern/${pattern.id}`}"${pattern.id === 'strategy' ? ' aria-label="Strategy review draft"' : ''}>${escape(pattern.title)}</a><p>${escape(pattern.short_description)}</p></li>`,
      )
      .join('')}</ul>`,
    'collection',
  ),
);
console.log(`Review written to ${fileURLToPath(new URL('index.html', directory))}`);
