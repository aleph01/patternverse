import { expect, test } from '@playwright/test';

test('reads the article, computes slices and denominators, filters display, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-slice-based-evaluation');
  await expect(
    page.getByRole('heading', { name: 'Slice-Based Evaluation', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('slice-based-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('slice-based-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Slice-based evaluation comparison explorer"]')
    .frameLocator('iframe');
  const initial = 'Overall accuracy: A 16/20 = 80.0%; B 17/20 = 85.0%. 3/3 slices shown; 0 hidden.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('svg')).toContainText('B: 13/16 = 81.3%');
  await expect(example.locator('svg')).toContainText('Tablet · rows 0');
  await expect(example.locator('svg')).toContainText('N/A · denominator 0');
  await example.locator('form').screenshot({
    path: info.outputPath('slice-based-controls.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('#comparison').screenshot({
    path: info.outputPath('slice-based-metrics.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('svg').screenshot({
    path: info.outputPath('slice-based-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Slice view', { exact: true }).selectOption('intersection');
  await expect(example.locator('#metrics tr')).toHaveCount(7);
  const small = example.locator('#metrics tr').filter({ hasText: 'Mobile · Spanish' });
  await expect(small).toContainText('20.7% – 100.0%');
  await example.getByLabel('Slice view', { exact: true }).selectOption('overlap');
  await expect(example.locator('#coverage')).toContainText(
    '10 memberships across 8 distinct records',
  );
  await example.getByLabel('Minimum rows shown', { exact: false }).selectOption('3');
  await expect(example.locator('#coverage')).toContainText(
    '9 memberships across 8 distinct records',
  );
  await example.getByLabel('Metric', { exact: true }).selectOption('recall');
  await expect(example.locator('output')).toContainText('A 7/10 = 70.0%; B 8/10 = 80.0%');
  await example.getByLabel('Minimum rows shown', { exact: false }).selectOption('25');
  await expect(example.locator('output')).toContainText('0/3 slices shown; 3 hidden');
  await expect(example.locator('svg')).toContainText('No slices meet this display filter');
  await expect(example.locator('#metrics tr')).toHaveCount(1);
  await example.getByLabel('Slice view', { exact: true }).selectOption('language');
  await expect(example.locator('output')).toContainText('0/2 slices shown; 2 hidden');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Slice view', { exact: true })).toHaveValue('device');
  await expect(example.getByLabel('Metric', { exact: true })).toHaveValue('accuracy');
  await expect(example.getByLabel('Minimum rows shown', { exact: false })).toHaveValue('0');
  await example.locator('#records summary').click();
  await expect(example.locator('#data tr')).toHaveCount(20);
  await expect(example.locator('#data tr').last()).toContainText('T20');
  await example.getByLabel('Metric', { exact: true }).selectOption('recall');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Slice-Based Evaluation/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/slice-based-evaluation' + suffix + '.svg');
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
