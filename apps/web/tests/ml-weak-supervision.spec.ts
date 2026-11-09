import { expect, test } from '@playwright/test';

test('reads the article and computes edits, source changes, duplicate votes, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-weak-supervision');
  await expect(
    page.getByRole('heading', { name: 'Weak Supervision', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('weak-supervision-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const example = page
    .frameLocator('iframe[title="Weak supervision vote explorer"]')
    .frameLocator('iframe');
  await expect(example.locator('output')).toContainText('40.0% Refund share → Other');
  await example.getByLabel('Add exact copy of R', { exact: false }).check();
  await expect(example.locator('output')).toContainText(
    'Every column: 57.1% Refund share → Refund. Copy once: 40.0% Refund share → Other.',
  );
  await expect(example.locator('#metrics')).toContainText(
    'coverage 3/4; overlap 2/4; conflict 1/4',
  );
  await example.locator('svg').screenshot({
    path: info.outputPath('weak-supervision-explorer.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await example.getByLabel('Ticket text', { exact: true }).fill('Where is my parcel?');
  await expect(example.locator('output')).toContainText('no weak label');
  await example.getByLabel('Ticket text', { exact: true }).fill('Refund charged twice delivered');
  await example.getByLabel('Add exact copy of R', { exact: false }).uncheck();
  await expect(example.locator('output')).toContainText('50.0% Refund share → Unresolved tie');
  await example.getByLabel('D: “delivered”', { exact: false }).uncheck();
  await expect(example.locator('output')).toContainText('100.0% Refund share → Refund');
  await expect(example.locator('#metrics')).toContainText(
    'coverage 2/4; overlap 1/4; conflict 0/4',
  );
  await example.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(example.getByLabel('Ticket text', { exact: true })).toHaveValue(
    'Refund please; tracking says delivered.',
  );
  await expect(example.locator('output')).toContainText('40.0% Refund share → Other');
  await example.getByLabel('Add exact copy of R', { exact: false }).check();
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.getByLabel('Add exact copy of R', { exact: false })).not.toBeChecked();
  await expect(example.locator('output')).toContainText('Every column: 40.0%');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(page.getByRole('link', { name: /Weak Supervision/ }).first()).toBeVisible();
});

test('keeps all text inside both original SVG layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/weak-supervision-votes' + suffix + '.svg');
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
