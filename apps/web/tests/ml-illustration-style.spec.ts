import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
const metadata = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const assets: { title: string; asset: string }[] = metadata.patterns.flatMap(
  (p: { title: string; visual: { asset: string; compact_asset: string } }) => [
    { title: p.title, asset: p.visual.asset },
    { title: p.title + ' · phone', asset: p.visual.compact_asset },
  ],
);
test('reviews every original and phone illustration in the light editorial style', async ({
  page,
  isMobile,
}, info) => {
  test.skip(isMobile, 'Both authored variants are measured and captured in the desktop run.');
  for (const { asset } of assets) {
    await page.goto('/assets/' + asset);
    const measured = await page
      .locator('svg')
      .first()
      .evaluate((el) => {
        const root = el as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return {
          style: root.dataset.mlStyle,
          weight: getComputedStyle(root.querySelector('text')!).fontWeight,
          font: getComputedStyle(root.querySelector('text')!).fontFamily,
          paper: getComputedStyle(root).backgroundColor,
          outside: [...root.querySelectorAll('text')].flatMap((label) => {
            const b = label.getBBox(),
              m = label.getCTM()!;
            return [
              [b.x, b.y],
              [b.x + b.width, b.y + b.height],
            ].some(([x, y]) => {
              const p = root.createSVGPoint();
              p.x = x;
              p.y = y;
              const q = p.matrixTransform(m);
              return q.x < -1 || q.y < -1 || q.x > limit.width + 1 || q.y > limit.height + 1;
            })
              ? [label.textContent]
              : [];
          }),
        };
      });
    expect(measured.style, asset).toBe('light-editorial');
    expect(measured.weight, asset).toBe('400');
    expect(measured.font, asset).toContain('Helvetica Neue');
    expect(measured.paper, asset).toBe('rgb(255, 255, 255)');
    expect(measured.outside, asset).toEqual([]);
    await page
      .locator('svg')
      .first()
      .screenshot({ path: info.outputPath(asset.split('/').at(-1)!.replace('.svg', '.png')) });
  }
  for (let i = 0; i < assets.length; i += 6) {
    const group = assets.slice(i, i + 6);
    await page.goto('/');
    await page.setViewportSize({ width: 1200, height: 1120 });
    await page.setContent(
      '<html><head><style>body{margin:0;background:#fff;font:16px Helvetica,Arial,sans-serif;color:#252c28}.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:20px}figure{margin:0;height:520px;display:flex;flex-direction:column;border-top:1px solid #a6aca3}figcaption{height:48px;padding:10px 0}img{width:100%;height:460px;object-fit:contain;object-position:center top}</style></head><body><div class="sheet">' +
        group
          .map(
            (v) =>
              '<figure><figcaption>' +
              v.title +
              '</figcaption><img src="/assets/' +
              v.asset +
              '"/></figure>',
          )
          .join('') +
        '</div></body></html>',
    );
    await page
      .locator('img')
      .evaluateAll((els) => Promise.all(els.map((el) => (el as HTMLImageElement).decode())));
    await page.screenshot({
      path: info.outputPath('contact-' + (i / 6 + 1) + '.png'),
      fullPage: true,
    });
  }
});
test('keeps representative illustrations light and readable inside the article', async ({
  page,
  isMobile,
}, info) => {
  for (const slug of [
    'hashed-feature',
    'quantize-for-deployment',
    'hierarchical-forecast-reconciliation',
  ]) {
    await page.goto('/pattern/ml-' + slug);
    const im = page.locator('.content-diagram img').first();
    await im.scrollIntoViewIfNeeded();
    await expect
      .poll(() => im.evaluate((v: HTMLImageElement) => v.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    await im.screenshot({
      path: info.outputPath(slug + '-article.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.emulateMedia({ colorScheme: 'dark' });
    await im.screenshot({
      path: info.outputPath(slug + '-dark.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
    await page.emulateMedia({ colorScheme: 'light' });
  }
});
