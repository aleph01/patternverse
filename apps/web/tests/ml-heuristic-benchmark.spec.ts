import { expect, test } from '@playwright/test';

test('Heuristic Benchmark compares actual records, changes penalties and thresholds, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-heuristic-benchmark');
  await expect(
    page.getByRole('heading', { name: 'Heuristic Benchmark', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.addStyleTag({ content: '.article-outline{visibility:hidden!important}' });
  await page.screenshot({ path: info.outputPath('article-viewport.png') });
  const picture = page.locator('.content-diagram img');
  await picture.scrollIntoViewIfNeeded();
  await expect
    .poll(() => picture.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await page
    .locator('.content-diagram')
    .screenshot({ path: info.outputPath('figure-and-caption.png') });
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({
      path: info.outputPath('worked-data.png'),
    });
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const outer = page.locator('.article-widget > iframe');
  await outer.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const ex = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  const initial =
    'Reference: 17/20 correct, 7 cost units. Candidate: 18/20 correct, 10 cost units.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#interpretation')).toContainText('3 more assigned units');
  await ex.locator('#mechanism').screenshot({ path: info.outputPath('default-comparison.png') });
  await ex.getByLabel('Cost per missed late delivery', { exact: true }).selectOption('2');
  await expect(ex.locator('output')).toContainText('Reference: 17/20 correct, 4 cost units.');
  await expect(ex.locator('#interpretation')).toContainText('costs tie');
  await ex.getByLabel('Candidate alert threshold', { exact: true }).selectOption('0.30');
  await expect(ex.locator('output')).toContainText('Candidate: 18/20 correct, 2 cost units.');
  await expect(ex.locator('#scores tbody tr').nth(2)).toContainText('18/20');
  await ex.locator('#data summary').click();
  await expect(ex.locator('#records tbody tr')).toHaveCount(20);
  await expect(ex.locator('#records tbody tr').nth(5).locator('td').last()).toHaveText('Alert');
  await expect(ex.locator('#records tbody tr').nth(6).locator('td').nth(3)).toHaveText('No alert');
  await ex.getByLabel('Reference policy', { exact: true }).selectOption('constant');
  await expect(ex.locator('output')).toContainText('Reference: 16/20 correct, 8 cost units.');
  await ex.getByLabel('Cost per missed late delivery', { exact: true }).selectOption('0');
  await ex.getByLabel('Candidate alert threshold', { exact: true }).selectOption('0.50');
  await expect(ex.locator('#interpretation')).toContainText('costs tie');
  await expect(ex.locator('output')).not.toContainText('NaN');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#data')).toHaveJSProperty('open', false);
  await ex.getByLabel('Candidate alert threshold', { exact: true }).selectOption('0.45');
  await expect(ex.locator('output')).toContainText('Candidate: 19/20 correct, 5 cost units.');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(
    page.getByRole('link', { name: 'Heuristic Benchmark', exact: true }).first(),
  ).toBeVisible();
});

test('Heuristic Benchmark keeps every label inside its desktop and phone drawings', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/heuristic-benchmark' + suffix + '.svg');
    const result = await page
      .locator('svg')
      .first()
      .evaluate((el) => {
        const root = el as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return {
          style: root.dataset.mlStyle,
          font: getComputedStyle(root.querySelector('text')!).fontFamily,
          weight: getComputedStyle(root.querySelector('text')!).fontWeight,
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
    expect(result.font).toContain('Helvetica Neue');
    expect(result.weight).toBe('400');
    expect(result.paper).toBe('rgb(255, 255, 255)');
  }
});
