import { expect, test } from '@playwright/test';

test('reads the new article, refits both learners, changes settings, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-active-learning');
  await expect(
    page.getByRole('heading', { name: 'Active Learning', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('active-learning-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Active learning label-budget explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText('Round 0/6 · 2 training labels');
  await example.getByRole('button', { name: 'Query next label', exact: true }).click();
  await example.getByRole('button', { name: 'Query next label', exact: true }).click();
  await expect(example.locator('output')).toContainText('uncertainty 199/200; random 180/200');
  await expect(example.locator('tbody tr')).toHaveCount(2);
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.locator('iframe[title="Active learning label-budget explorer"]').screenshot({
    path: info.outputPath('active-learning-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.getByRole('button', { name: 'Query next label', exact: true }).click();
  await expect(example.locator('output')).toContainText('uncertainty 189/200');
  await example.getByRole('button', { name: 'Run six rounds', exact: true }).click();
  await expect(
    example.getByRole('button', { name: 'Query next label', exact: true }),
  ).toBeDisabled();
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toContainText('Round 0/6');
  await example.getByLabel('True cutoff (simulator only)').selectOption('35');
  await expect(example.locator('output')).toContainText('uncertainty 170/200; random 170/200');
  await example.getByLabel('Random-selection seed').fill('-1');
  await expect(example.locator('output')).toContainText('Enter an integer seed');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toContainText('uncertainty 174/200; random 174/200');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(page.getByRole('link', { name: /Active Learning/ }).first()).toBeVisible();
});

test('contains all text in the desktop and compact illustrations', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/active-learning-label-budget' + suffix + '.svg');
    const outside = await page
      .locator('svg')
      .first()
      .evaluate((svg) => {
        const root = svg as SVGSVGElement;
        const limit = root.viewBox.baseVal;
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
