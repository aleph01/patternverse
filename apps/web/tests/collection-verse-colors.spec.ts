import { expect, test } from '@playwright/test';

test('collection headers match their Verse colors without coloring pattern articles', async ({
  page,
}) => {
  const backgrounds = new Set<string>();
  for (const [verseId, collectionIds] of [
    ['therapy', ['neuro-linguistic-programming', 'cbt']],
    ['software-engineering', ['gof-design-patterns', 'gof-creational']],
    ['creativity', ['reframing', 'getting-unstuck']],
  ] as const) {
    await page.goto(`/verse/${verseId}`);
    const background = await page
      .locator('.entity-hero')
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    backgrounds.add(background);
    for (const collectionId of collectionIds) {
      await page.goto(`/collection/${collectionId}`);
      await expect(page.locator('.entity-hero')).toHaveCSS('background-color', background);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  expect(backgrounds.size).toBeGreaterThan(1);
  await page.goto('/pattern/find-the-positive-intention');
  await expect(page.locator('main')).not.toHaveClass(/verse-accent-/);
  await expect(page.locator('.entity-hero')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('the odd tile grid leaves the unused slot clear and Commons colors are distinct', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const grid = page.locator('.verse-list');
  await expect(grid).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const tiles = grid.locator('article');
  expect((await tiles.count()) % 2).toBe(1);
  const colors = await tiles.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundColor),
  );
  expect(new Set(colors).size).toBe(colors.length);
  const expected = {
    therapy: 'rgb(240, 235, 247)',
    creativity: 'rgb(246, 234, 250)',
    learning: 'rgb(250, 244, 220)',
  };
  for (const [verse, color] of Object.entries(expected)) {
    await expect(grid.locator(`article:has(a[href="/verse/${verse}"])`)).toHaveCSS(
      'background-color',
      color,
    );
  }
  const unusedSlot = await grid.evaluate((element) => {
    element.lastElementChild!.scrollIntoView({ block: 'center', behavior: 'instant' });
    const last = element.lastElementChild!.getBoundingClientRect();
    const gridBox = element.getBoundingClientRect();
    const x = gridBox.left + gridBox.width * 0.75;
    const y = last.top + last.height / 2;
    return document.elementFromPoint(x, y)?.classList.contains('verse-list');
  });
  expect(unusedSlot).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(grid).toHaveCSS('grid-template-columns', /^(\d|\.)+px$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
