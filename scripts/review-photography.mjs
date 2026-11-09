import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Run against a local production preview; captures stay outside the repository.
const root = fileURLToPath(new URL('../', import.meta.url));
const output =
  process.env.PHOTOGRAPHY_REVIEW_OUTPUT ?? resolve(tmpdir(), 'patternverse-photography-review');
const base = process.env.PHOTOGRAPHY_REVIEW_URL ?? 'http://127.0.0.1:4186';
const { chromium } = await import(
  pathToFileURL(resolve(root, 'apps/web/node_modules/@playwright/test/index.mjs')).href
);
await mkdir(output, { recursive: true });
const metadata = JSON.parse(
  await readFile(root + '/docs/pattern-packages/photography.json', 'utf8'),
);
const manifest = JSON.parse(await readFile(root + '/content/assets/manifest.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const report = { figures: [], pages: [], assets: [], errors: [] };
// A sticky contents bar is useful while reading, but can obscure part of an
// isolated tall-figure capture when Playwright scrolls the viewport to it.
const figureCaptureStyle = '.article-outline { visibility: hidden !important; }';
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', (e) => report.errors.push(e.message));
    for (const article of metadata.patterns) {
      const response = await page.goto(base + '/pattern/' + article.id);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow || response.status() !== 200)
        throw Error(article.id + ': overflow or HTTP failure at ' + width);
      report.pages.push({
        route: 'pattern/' + article.id,
        width,
        status: response.status(),
        overflow,
      });
      if (width === 320) continue;
      const figures = page.locator('.entity-article figure');
      if ((await figures.count()) !== article.visuals.length)
        throw Error(article.id + ': unexpected figure count at ' + width);
      for (let i = 0; i < (await figures.count()); i++) {
        const figure = figures.nth(i);
        await figure.scrollIntoViewIfNeeded();
        await figure.locator('img').evaluate((im) => im.decode());
        const src = await figure.locator('img').getAttribute('src');
        const name = article.id + '-' + i + '-' + width + '.png';
        await figure.screenshot({
          path: output + '/' + name,
          timeout: 10000,
          style: figureCaptureStyle,
        });
        const region = figure.locator('.diagram-scroll');
        if (await region.count()) {
          const dims = await region.evaluate((el) => ({
            viewport: el.clientWidth,
            content: el.scrollWidth,
          }));
          if (dims.content > dims.viewport) {
            await region.focus();
            await page.keyboard.press('End');
            await region.evaluate((el) => {
              el.scrollLeft = el.scrollWidth;
            });
            if ((await region.evaluate((el) => el.scrollLeft)) === 0)
              throw Error('Diagram cannot scroll: ' + src);
            await figure.screenshot({
              path: output + '/' + article.id + '-' + i + '-' + width + '-scrolled.png',
              timeout: 10000,
              style: figureCaptureStyle,
            });
          }
        }
        report.figures.push({ article: article.id, width, src, screenshot: name });
      }
    }
    for (const route of [
      'concept/photography-foundations',
      'verse/photography',
      ...metadata.groups.map((g) => 'collection/' + g.id),
    ]) {
      const response = await page.goto(base + '/' + route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      report.pages.push({ route, width, status: response.status(), overflow });
      if (overflow || response.status() !== 200) throw Error(route + ' failed at ' + width);
      if (width !== 320)
        await page.screenshot({
          path: output + '/' + route.replace('/', '-') + '-' + width + '.png',
          fullPage: true,
          timeout: 10000,
        });
      if (route === 'concept/photography-foundations' && width !== 320) {
        const figures = page.locator('.entity-article figure');
        if ((await figures.count()) !== 3) throw Error('Expected three foundations illustrations');
        for (let index = 0; index < (await figures.count()); index++) {
          const figure = figures.nth(index);
          await figure.scrollIntoViewIfNeeded();
          await figure.locator('img').evaluate((image) => image.decode());
          const name = `photography-foundations-${index}-${width}.png`;
          await figure.screenshot({
            path: output + '/' + name,
            timeout: 10000,
            style: figureCaptureStyle,
          });
          report.figures.push({
            article: 'photography-foundations',
            width,
            src: await figure.locator('img').getAttribute('src'),
            screenshot: name,
          });
        }
      }
    }
    await page.close();
  }
  const context = await browser.newContext();
  for (const file of Object.keys(manifest)) {
    const response = await context.request.get(base + '/assets/' + file);
    if (response.status() !== 200) throw Error('Missing asset: ' + file);
    report.assets.push({
      file,
      status: response.status(),
      type: response.headers()['content-type'],
    });
  }
  const license = await context.request.get(base + '/assets/photography/licenses/gfdl-1-2.txt');
  report.license = {
    status: license.status(),
    fullText: (await license.text()).includes('GNU Free Documentation License'),
  };
  if (license.status() !== 200 || !report.license.fullText) throw Error('License failed');
  await context.close();
} catch (e) {
  report.errors.push(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  if (report.errors.length) process.exitCode = 1;
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      output,
      figures: report.figures.length,
      pages: report.pages.length,
      assets: report.assets.length,
      errors: report.errors,
    }),
  );
}
