import { expect, test } from '@playwright/test';

test('Class Rebalancing refits scores, separates thresholds, inspects repetition and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-class-rebalancing');
  await expect(
    page.getByRole('heading', { name: 'Class Rebalancing', exact: true }).first(),
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
    'Defect weight 9; threshold 0.50. Selected fit: recall 90.0%, precision 50.0%, 90 false alarms. Training records only.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#metrics tbody tr').first()).toContainText('88.6%');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#scores tbody tr').nth(1)).toContainText('0.689655');
  await expect(ex.locator('#repetition')).toContainText('1,800 row appearances, 1,000 unique IDs');
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  await ex.getByLabel('Flag a score at least', { exact: true }).selectOption('0.9');
  await expect(ex.locator('output')).toContainText('recall 70.0%, precision 88.6%, 9 false alarms');
  await expect(ex.locator('#scores tbody tr').nth(1)).toContainText('0.689655');
  await ex.getByLabel('Defect weight · ordinary weight is 1', { exact: true }).selectOption('1');
  await expect(ex.locator('output')).toContainText('recall 0.0%, precision N/A, 0 false alarms');
  await expect(ex.locator('#scores tbody tr').nth(1)).toContainText('0.198020');
  await ex.getByLabel('Defect weight · ordinary weight is 1', { exact: true }).selectOption('27');
  await expect(ex.locator('#repetition')).toContainText('3,600 row appearances, 1,000 unique IDs');
  await ex.getByLabel('Flag a score at least', { exact: true }).selectOption('1');
  await expect(ex.locator('output')).toContainText('precision N/A, 0 false alarms');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Flag a score at least', { exact: true }).selectOption('0.8');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: 'Class Rebalancing', exact: true }).first(),
  ).toBeVisible();
});

test('Class Rebalancing keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/class-rebalancing' + suffix + '.svg');
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
