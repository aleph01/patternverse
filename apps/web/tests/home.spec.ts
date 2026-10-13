import { expect, test } from '@playwright/test';

test('introduces Patternverse and directs pattern browsing to the library', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Ideas worth putting to work.',
  );
  await expect(page.getByRole('search')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Verses' })).toBeVisible();
  await expect(page.locator('.daily-patterns')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Patterns', exact: true })).toHaveCount(0);
  await expect(page.locator('main a[href^="/pattern/"]')).toHaveCount(0);
  await page
    .locator('.hero')
    .getByRole('link', { name: /Browse the library/ })
    .click();
  await expect(page).toHaveURL('/library');
  await expect(page.getByRole('heading', { name: 'your library.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shows the explanation after verses while keeping the hero focused on browsing', async ({
  page,
}, info) => {
  await page.goto('/');
  const hero = page.locator('.hero');
  const verses = page.getByRole('region', { name: 'Verses', exact: true });
  const about = page.getByRole('region', {
    name: 'Practical ideas, collected in one place.',
    exact: true,
  });
  await expect(hero.getByRole('link')).toHaveCount(2);
  await expect(hero.getByRole('link', { name: /What is the Patternverse/ })).toHaveAttribute(
    'href',
    '#home-about',
  );
  await expect(hero.getByRole('link', { name: /Browse the library/ })).toBeVisible();
  await expect(hero.getByRole('list', { name: 'Ways to use Patternverse' })).toHaveCount(0);
  await expect(about.getByRole('navigation', { name: 'How Patternverse works' })).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'about', exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const verseBox = (await verses.boundingBox())!;
    const aboutBox = (await about.boundingBox())!;
    expect(aboutBox.y).toBeGreaterThanOrEqual(verseBox.y + verseBox.height);
    expect(verseBox.y).toBeGreaterThanOrEqual(
      (await hero.boundingBox())!.y + (await hero.boundingBox())!.height,
    );
    await about.getByRole('heading', { level: 2 }).scrollIntoViewIfNeeded();
    await expect(about.getByRole('heading', { level: 2 })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 320)
      await page.screenshot({ path: info.outputPath(`home-about-${width}.png`) });
  }
  await hero.getByRole('link', { name: /What is the Patternverse/ }).click();
  await expect(page).toHaveURL('/#home-about');
  await expect(about.getByRole('heading', { level: 2 })).toBeInViewport();

});

test('makes the complete Verse tile navigable without implying an authored order', async ({
  page,
}) => {
  await page.goto('/');

  const tile = page.locator('.verse-list article').filter({ hasText: 'Collaboration' });
  const link = tile.getByRole('link');
  await expect(tile.locator(':scope > span')).toHaveCount(0);
  await link.click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL('/verse/collaboration');
});

test('reuses a Verse preview color on its detail page', async ({ page }) => {
  await page.goto('/');

  const tile = page.locator('.verse-list article').filter({ hasText: 'Decision Making' });
  const previewColor = await tile.evaluate((element) => getComputedStyle(element).backgroundColor);
  await tile.getByRole('link').click();
  const pageColor = await page
    .locator('.verse-page .entity-hero')
    .evaluate((element) => getComputedStyle(element).backgroundColor);

  expect(pageColor).toBe(previewColor);
});
