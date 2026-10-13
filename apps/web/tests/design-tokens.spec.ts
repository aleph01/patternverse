import { expect, test } from '@playwright/test';

test('keeps sync surfaces, compact breakpoints, and light backup text distinct', async ({
  page,
}) => {
  // No Dropbox account or network call is needed to exercise these presentation states.
  await page.goto('/my?pane=sync');
  const panel = page.locator('.sync-settings');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS('background-color', 'rgb(17, 17, 15)');
  await expect(panel).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(panel.locator('.sync-status-grid p').first()).toHaveCSS(
    'color',
    'rgb(202, 201, 193)',
  );
  await expect(page.locator('.workspace-heading > span')).toHaveCSS('color', 'rgb(98, 101, 95)');
  const backup = page.getByRole('heading', { name: 'backup & restore' }).locator('..');
  await expect(backup.locator('p').first()).toHaveCSS('color', 'rgb(98, 101, 95)');

  for (const width of [1440, 801, 800, 761, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const grid = panel.locator('.sync-status-grid');
    const boxes = await grid.locator('article').evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          minHeight: getComputedStyle(node).minHeight,
        };
      }),
    );
    expect(boxes).toHaveLength(2);
    if (width <= 800) {
      expect(boxes[0]!.x).toBe(boxes[1]!.x);
      expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    } else {
      expect(boxes[0]!.y).toBe(boxes[1]!.y);
      expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);
    }
    expect(boxes.every((box) => box.minHeight === '210px')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('uses shared keyboard focus and resolves tokens in independent route loads', async ({
  page,
}) => {
  await page.goto('/library');
  const link = page.locator('.site-utilities a').first();
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).toHaveCSS('outline-color', 'rgb(21, 87, 255)');
  await expect(link).toHaveCSS('outline-width', '3px');
  await expect(link).toHaveCSS('outline-offset', '3px');
  await expect(page.locator('.library-intro-copy > p:last-child')).toHaveCSS(
    'color',
    'rgb(98, 101, 95)',
  );
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      ['--ink', '--paper', '--green', '--muted', '--ink-muted', '--space-4', '--line'].map(
        (name) => [name, style.getPropertyValue(name).trim()],
      ),
    );
  });
  expect(tokens).toMatchObject({
    '--ink': '#181814',
    '--paper': '#fff',
    '--green': '#05ce78',
    '--muted': '#62655f',
    '--ink-muted': '#62655f',
    '--space-4': '1rem',
    '--line': '2px solid #181814',
  });
});
