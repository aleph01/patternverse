import { expect, test } from '@playwright/test';

test('Ensembling computes combinations, exposes poor and shared members, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-ensembling');
  await expect(
    page.getByRole('heading', { name: 'Ensembling', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.addStyleTag({ content: '.article-outline{visibility:hidden!important}' });
  await page.screenshot({ path: info.outputPath('article-viewport.png') });
  const figure = page.locator('.content-diagram');
  await figure.scrollIntoViewIfNeeded();
  await expect
    .poll(() => figure.locator('img').evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await figure.screenshot({ path: info.outputPath('figure-and-caption.png') });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('worked-table.png') });
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  await page
    .locator('.article-widget > iframe')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const ex = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  const initial =
    'Equal mean: MAE 0.0 orders; best member MAE 4.0 orders. Six fictional cases only.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Combination rule', { exact: true }).selectOption('weighted');
  await expect(ex.locator('output')).toContainText('Weighted mean: MAE 1.0 orders');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('weighted-errors.png') });
  await ex.getByLabel('Member error pattern', { exact: true }).selectOption('poor');
  await expect(ex.locator('output')).toContainText('MAE 7.5 orders; best member MAE 2.0 orders');
  await ex.getByLabel('Combination rule', { exact: true }).selectOption('mean');
  await expect(ex.locator('output')).toContainText('MAE 10.0 orders; best member MAE 2.0 orders');
  await ex.getByLabel('Combination rule', { exact: true }).selectOption('median');
  await expect(ex.locator('output')).toContainText('Median: MAE 2.0 orders');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#calculation')).toContainText('middle forecast is 12.0');
  await expect(ex.locator('#records tbody tr')).toHaveCount(6);
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  await ex.getByLabel('Member error pattern', { exact: true }).selectOption('shared');
  await expect(ex.locator('output')).toContainText('MAE 4.0 orders; best member MAE 4.0 orders');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Combination rule', { exact: true }).selectOption('median');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(page.getByRole('link', { name: 'Ensembling', exact: true }).first()).toBeVisible();
});

test('Ensembling keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/ensembling' + suffix + '.svg');
    const result = await page
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
    expect(result.outside).toEqual([]);
    expect(result.style).toBe('light-editorial');
    expect(result.weight).toBe('400');
    expect(result.font).toContain('Helvetica Neue');
    expect(result.paper).toBe('rgb(255, 255, 255)');
  }
});
