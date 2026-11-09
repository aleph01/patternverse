import { expect, test } from '@playwright/test';

test('reads the article, replays historical inputs, handles missing matches, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-point-in-time-feature-retrieval');
  await expect(
    page.getByRole('heading', { name: 'Point-in-Time Feature Retrieval', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('point-in-time-feature-retrieval-article.png') });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('point-in-time-feature-retrieval-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Point-in-time feature retrieval explorer"]')
    .frameLocator('iframe');
  const initial =
    'Known at 10:00: F03 = 50. Event cutoff only: F04 = 65. Latest in archive: F05 = 90.';
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.locator('#interpretation')).toContainText('age: 15 minutes');
  await expect(example.locator('#mechanism')).toContainText('2 eligible snapshots');
  for (const [selector, name] of [
    ['form', 'controls'],
    ['#mechanism', 'explorer'],
    ['#comparison-table', 'comparison'],
  ])
    await example.locator(selector).screenshot({
      path: info.outputPath('point-in-time-feature-retrieval-' + name + '.png'),
      style: '.article-outline{visibility:hidden!important}',
    });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.locator('#record-tables summary').click();
  await expect(example.locator('#data tr')).toHaveCount(7);
  await expect(example.locator('#data tr').nth(3)).toContainText('Available later');
  await expect(example.locator('#data tr').nth(5)).toContainText('Different entity');
  await example.locator('#record-tables').screenshot({
    path: info.outputPath('point-in-time-feature-retrieval-records.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Maximum feature age', { exact: false }).selectOption('10');
  await expect(example.locator('output')).toContainText('Known at 10:00: null · no match');
  await expect(example.locator('#interpretation')).toContainText('decision row is retained');
  await expect(example.locator('#comparison tr')).toHaveCount(3);
  await example.getByLabel('Maximum feature age', { exact: false }).selectOption('15');
  await expect(example.locator('output')).toHaveText(initial);
  await example.getByLabel('Decision time', { exact: false }).selectOption('09:40');
  await example.getByLabel('Maximum feature age', { exact: false }).selectOption('60');
  await expect(example.locator('output')).toContainText('Known at 09:40: F01 = 40');
  await expect(example.locator('output')).toContainText('Event cutoff only: F02 = 70');
  await example.getByLabel('Late F02 availability', { exact: true }).selectOption('early');
  await expect(example.locator('output')).toContainText('Known at 09:40: F02 = 70');
  await expect(example.locator('#data tr').nth(1)).toContainText('Ready 09:35');
  await example.getByLabel('Entity key', { exact: true }).selectOption('C');
  await expect(example.locator('output')).toContainText('Latest in archive: null · no match');
  await example.getByLabel('Entity key', { exact: true }).selectOption('B');
  await example.getByLabel('Decision time', { exact: false }).selectOption('10:00');
  await expect(example.locator('output')).toContainText('Known at 10:00: F06 = 999');
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await expect(example.getByLabel('Entity key', { exact: true })).toHaveValue('A');
  await expect(example.getByLabel('Decision time', { exact: false })).toHaveValue('10:00');
  await expect(example.getByLabel('Maximum feature age', { exact: false })).toHaveValue('60');
  await expect(example.getByLabel('Late F02 availability', { exact: true })).toHaveValue('late');
  await example.getByLabel('Decision time', { exact: false }).selectOption('08:00');
  await expect(example.locator('output')).toContainText('Known at 08:00: null · no match');
  await expect(example.locator('output')).toContainText('Event cutoff only: F07 = 20');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toHaveText(initial);
  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(
    page.getByRole('link', { name: /Point-in-Time Feature Retrieval/ }).first(),
  ).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/point-in-time-feature-retrieval' + suffix + '.svg');
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
