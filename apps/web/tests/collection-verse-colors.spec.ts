import { expect, test } from '@playwright/test';

const verseColours = {
  therapy: 'rgb(182, 207, 138)',
  'software-engineering': 'rgb(145, 180, 237)',
  creativity: 'rgb(182, 155, 226)',
  learning: 'rgb(231, 205, 100)',
  architecture: 'rgb(201, 172, 139)',
  business: 'rgb(86, 173, 142)',
  filmmaking: 'rgb(207, 128, 109)',
  'machine-learning': 'rgb(141, 149, 217)',
  pedagogy: 'rgb(189, 197, 101)',
  photography: 'rgb(239, 192, 155)',
  writing: 'rgb(214, 200, 181)',
};

test('collection headers match their Verse colors without coloring pattern articles', async ({
  page,
}) => {
  const backgrounds = new Set<string>();
  for (const [verseId, collectionIds] of [
    ['therapy', ['neuro-linguistic-programming', 'cbt']],
    ['software-engineering', ['gof-design-patterns']],
    ['creativity', ['reframing', 'getting-unstuck']],
  ] as const) {
    await page.goto('/');
    const tile = page.locator(
      `.verse-list article:has(a[href="/library?verse=commons%3A${verseId}"])`,
    );
    const background = verseColours[verseId];
    await expect(tile).not.toHaveCSS('background-color', background);
    await tile.getByRole('link').focus();
    await expect(tile).toHaveCSS('background-color', background);
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

test('the Verse grid keeps its Commons colors distinct', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const grid = page.locator('.verse-list');
  await expect(grid).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const tiles = grid.locator('article');
  const colors = await tiles.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).backgroundColor),
  );
  expect(colors.length).toBeGreaterThanOrEqual(17);
  expect(new Set(colors).size).toBe(colors.length);
  for (const [verse, color] of Object.entries(verseColours)) {
    const tile = grid.locator(`article:has(a[href="/library?verse=commons%3A${verse}"])`);
    await expect(tile).not.toHaveCSS('background-color', color);
    await tile.getByRole('link').focus();
    await expect(tile).toHaveCSS('background-color', color);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(grid).toHaveCSS('gap', '0px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
