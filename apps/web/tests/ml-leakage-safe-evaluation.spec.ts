import { expect, test } from '@playwright/test';

test('reads the article, compares actual fitted partitions, edits labels, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-leakage-safe-evaluation');
  await expect(
    page.getByRole('heading', { name: 'Leakage-Safe Evaluation', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('leakage-safe-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('leakage-safe-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Leakage-safe evaluation split explorer"]')
    .frameLocator('iframe');
  const initial =
    'Visit holdout: 8/8 correct (100.0%); customer holdout: 4/8 correct (50.0%). Both use 8 train and 8 test rows.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('svg')).toContainText('Shared customer IDs: 8');
  await expect(example.locator('svg')).toContainText('Shared customer IDs: 0');
  await expect(example.locator('tbody tr')).toHaveCount(8);
  await example.locator('form').screenshot({
    path: info.outputPath('leakage-safe-controls.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  await example.locator('svg').screenshot({
    path: info.outputPath('leakage-safe-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example
    .getByLabel('Intended prediction question', { exact: true })
    .selectOption('returning');
  await expect(example.locator('#interpretation')).toContainText('8 familiar IDs');
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Customer labels A–H', { exact: false }).fill('00001111');
  await expect(example.locator('output')).toContainText('customer holdout: 0/8 correct (0.0%)');
  await example.getByLabel('Whole customers held out', { exact: true }).selectOption('first');
  await expect(example.locator('tbody tr').first()).toContainText('Both visits test');
  await expect(example.locator('svg')).toContainText('Train IDs: E F G H');
  await example.getByLabel('Customer labels A–H', { exact: false }).fill('0101');
  await expect(example.locator('output')).toContainText('exactly eight binary labels');
  await expect(example.locator('tbody tr')).toHaveCount(0);
  await expect(example.locator('svg rect')).toHaveCount(0);
  await example.getByLabel('Customer labels A–H', { exact: false }).fill('00000000');
  await expect(example.locator('output')).toContainText('customer holdout: 8/8 correct (100.0%)');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.getByLabel('Customer labels A–H', { exact: false })).toHaveValue('01010101');
  await expect(example.getByLabel('Whole customers held out', { exact: true })).toHaveValue('last');
  await expect(example.getByLabel('Intended prediction question', { exact: true })).toHaveValue(
    'new',
  );
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Customer labels A–H', { exact: false }).fill('11111111');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(page.getByRole('link', { name: /Leakage-Safe Evaluation/ }).first()).toBeVisible();
});

test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/leakage-safe-evaluation' + suffix + '.svg');
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
