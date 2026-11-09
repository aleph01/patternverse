import { expect, test } from '@playwright/test';

test('the visual lesson loads automatically, reorders the same bars, and fits the screen', async ({
  page,
  context,
}, info) => {
  await page.goto('/pattern/dataviz-sort-to-reveal-order');
  await expect(
    page.getByRole('heading', { name: 'Sort to Reveal Order', exact: true }).first(),
  ).toBeVisible();
  const host = page.frameLocator('iframe[title="Same tickets, different order"]');
  const example = host.frameLocator('iframe');
  const svg = example.locator('#chart svg');
  await expect(svg).toHaveAttribute('data-order', 'alphabetical');
  await expect(example.getByRole('radio', { name: 'Alphabetical', exact: true })).toBeChecked();
  const geometry = () =>
    example.locator('g[aria-label="bar"] rect').evaluateAll((rects) =>
      Object.fromEntries(
        rects.map((rect) => [
          rect.getAttribute('aria-label'),
          {
            x: rect.getAttribute('x'),
            width: rect.getAttribute('width'),
            fill: getComputedStyle(rect).fill,
          },
        ]),
      ),
    );
  const before = await geometry();
  expect(Object.keys(before)).toHaveLength(8);
  await page.screenshot({ path: info.outputPath('article.png'), fullPage: true });
  await example.getByRole('radio', { name: 'Highest first', exact: true }).check();
  await expect(svg).toHaveAttribute('data-order', 'descending');
  expect(await geometry()).toEqual(before);
  const visualOrder = await example
    .locator('g[aria-label="bar"] rect')
    .evaluateAll((rects) =>
      rects
        .sort((a, b) => Number(a.getAttribute('y')) - Number(b.getAttribute('y')))
        .map((rect) => rect.getAttribute('aria-label')),
    );
  expect(visualOrder[0]).toBe('Billing: 124 tickets');
  expect(visualOrder.at(-1)).toBe('Feedback: 28 tickets');
  await expect(example.getByRole('status')).toContainText('Billing leads with 124');
  await example.locator('summary').click();
  await expect(example.getByRole('table')).toBeVisible();
  await expect(example.locator('#counts tbody tr').first()).toContainText('Billing');
  const outer = page.locator('iframe[title="Same tickets, different order"]');
  await expect.poll(async () => Number(await outer.getAttribute('height'))).toBeGreaterThan(700);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  const clippedText = await svg.locator('text').evaluateAll((nodes) => {
    const svg = nodes[0]?.closest('svg');
    if (!svg) return ['Missing SVG'];
    const bounds = svg.getBoundingClientRect();
    return nodes
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return (
          box.left < bounds.left - 1 ||
          box.right > bounds.right + 1 ||
          box.top < bounds.top - 1 ||
          box.bottom > bounds.bottom + 1
        );
      })
      .map((node) => node.textContent);
  });
  expect(clippedText).toEqual([]);
  await outer.screenshot({ path: info.outputPath('ranked-with-data.png') });
  await example.getByRole('radio', { name: 'Highest first', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(svg).toHaveAttribute('data-order', 'alphabetical');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(svg).toHaveAttribute('data-order', 'alphabetical');
  await expect(example.locator('details')).not.toHaveAttribute('open', '');
  // Let the replacement frame finish sizing before a touch click after reset.
  await expect
    .poll(async () =>
      Math.abs(
        Number(await outer.getAttribute('height')) -
          (await example.locator('body').evaluate((body) => body.scrollHeight)),
      ),
    )
    .toBeLessThan(4);
  await outer.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await context.setOffline(true);
  await example.getByText('Highest first', { exact: true }).click();
  await expect(svg).toHaveAttribute('data-order', 'descending');
  await context.setOffline(false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(example.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/data-visualization-patterns');
  await expect(
    page.getByRole('link', { name: 'Sort to Reveal Order', exact: true }).first(),
  ).toBeVisible();
});

test('retains a readable article when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/pattern/dataviz-sort-to-reveal-order');
    await expect(
      page.getByText('In a fictional week of 525 support tickets', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Watch out for', exact: true })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
