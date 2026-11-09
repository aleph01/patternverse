import { expect, test } from '@playwright/test';
test('computes packed deployment quantization, clipping, controls and resets in the article sandbox', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-quantize-for-deployment');
  await expect(
    page.getByRole('heading', { name: 'Quantize for Deployment', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  const style = '.article-outline{visibility:hidden!important}';
  await page.screenshot({ path: info.outputPath('quantize-article.png'), style });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({ path: info.outputPath('quantize-illustration.png'), style });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('quantize-table.png'), style });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const ex = page
      .frameLocator('iframe[title="Deployment quantization explorer"]')
      .frameLocator('iframe'),
    initial = 'D2. Float winner A. Quantized winner B. Agreement 2/4. Clipped inputs 0.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#storage')).toContainText('19');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#scores-table', 'scores'],
  ])
    await ex
      .locator(selector)
      .screenshot({ path: info.outputPath('quantize-' + name + '.png'), style });
  await ex.locator('#values summary').click();
  await expect(ex.locator('#weights-data tr')).toHaveCount(6);
  await ex.locator('#values').screenshot({ path: info.outputPath('quantize-values.png'), style });
  await ex.locator('#bytes summary').click();
  await expect(ex.locator('#byte-values')).toContainText('00 70 2b');
  await ex.locator('#bytes').screenshot({ path: info.outputPath('quantize-bytes.png'), style });
  await ex.getByLabel('Weight scale granularity', { exact: true }).selectOption('channel');
  await expect(ex.locator('output')).toContainText('Quantized winner A.');
  await expect(ex.locator('#storage')).toContainText('23');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('quantize-per-row.png'), style });
  await ex.getByLabel('Input to inspect', { exact: true }).selectOption('D3');
  await expect(ex.locator('output')).toContainText('Quantized winner B.');
  await expect(ex.locator('output')).toContainText('Clipped inputs 1.');
  await ex
    .locator('#mechanism')
    .screenshot({ path: info.outputPath('quantize-clipped.png'), style });
  await ex.getByLabel('Range used to calibrate inputs', { exact: true }).selectOption('covered');
  await expect(ex.locator('output')).toContainText('Quantized winner A.');
  await expect(ex.locator('output')).toContainText('Clipped inputs 0.');
  await ex.getByLabel('Input precision', { exact: true }).selectOption('4');
  await ex.getByLabel('Range used to calibrate inputs', { exact: true }).selectOption('outlier');
  await ex.getByLabel('Input to inspect', { exact: true }).selectOption('D4');
  await expect(ex.locator('output')).toContainText('Float winner B. Quantized winner A.');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('quantize-wide.png'), style });
  await ex.getByLabel('Weight precision', { exact: true }).selectOption('8');
  await expect(ex.locator('#weights-data')).toContainText('127');
  await ex.locator('#data summary').click();
  await ex.locator('#data').screenshot({ path: info.outputPath('quantize-data.png'), style });
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  for (const id of ['#values', '#bytes', '#data'])
    await expect(ex.locator(id)).toHaveJSProperty('open', false);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('#mechanism text').first()).toHaveCSS('fill', 'rgb(37, 44, 40)');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('quantize-dark.png'), style });
  await page.emulateMedia({ colorScheme: 'light' });
  await ex.getByLabel('Weight precision', { exact: true }).selectOption('8');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(page.getByRole('link', { name: /Quantize for Deployment/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/quantize-for-deployment' + suffix + '.svg');
    const outside = await page
      .locator('svg')
      .first()
      .evaluate((svg) => {
        const root = svg as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return [...root.querySelectorAll('text')].flatMap((label) => {
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
        });
      });
    expect(outside).toEqual([]);
  }
});
