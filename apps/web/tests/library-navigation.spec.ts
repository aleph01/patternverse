import { expect, test } from '@playwright/test';

test('keeps verse selection separate from the ordered content tabs', async ({ page }, testInfo) => {
  await page.goto('/library');
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).click();
  // Wait for hydration and local library initialization before changing a filter.
  await expect(page.getByRole('button', { name: /^Your rating:/ })).toBeEnabled();
  const categories = page.getByRole('navigation', { name: 'Library categories' });
  await expect(categories.getByRole('button')).toHaveText(['All', 'Collections', 'Patterns']);
  await expect(categories.getByRole('button', { name: 'Verses', exact: true })).toHaveCount(0);

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('combobox', { name: 'Verse', exact: true }).selectOption({
      label: 'Software Engineering',
    });
  } else {
    await page
      .getByRole('complementary', { name: 'Browse verses' })
      .getByRole('button', { name: 'Software Engineering', exact: true })
      .click();
  }
  await expect(categories.getByRole('button')).toHaveText(['All', 'Collections', 'Patterns']);
  const results = page.locator('#library .pattern-feed');
  await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
  await expect(results.getByRole('link', { name: /Creative Reframing/ })).toHaveCount(0);
  await categories.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(results.locator('a[href="/collection/gof-design-patterns"]')).toBeVisible();
  await expect(results.getByRole('link', { name: /Observer/ })).toHaveCount(0);
  await categories.getByRole('button', { name: 'All', exact: true }).click();
  await expect(results.locator('a[href="/collection/gof-design-patterns"]')).toBeVisible();
  // The All tab spans more than one page, while search still considers every entry.
  await page.getByRole('searchbox', { name: /Search (the catalog|my library)/ }).fill('Observer');
  await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('labels the home page as a procedural knowledge library', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero .eyebrow')).toHaveText(
    'Patternverse / procedural knowledge library',
  );
});
