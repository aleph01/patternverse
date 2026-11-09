import { expect, test } from '@playwright/test';
import { librarySearchInput, searchLibrary, selectLibraryCategory } from '../tests/helpers/library';

test('a sparse conversational learning query offers labelled broader matches', async ({
  page,
}, info) => {
  await page.goto('/library?verse=commons:learning');
  const query = 'how can I remember what I learn on Tuesdays';
  await searchLibrary(page, query);
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(page.getByText(/^Loading full library search/)).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Retry full search' })).toHaveCount(0);
  await expect(
    results.getByRole('heading', { name: 'Broader matches', exact: true }),
  ).toBeVisible();
  await expect(results.locator('a.feed-row[href^="/pattern/"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /No matching/ })).toHaveCount(0);
  await expect(librarySearchInput(page)).toHaveValue(query);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('broader-search-results.png') });
});

test('search finds ranked patterns from collection browsing, then restores browsing', async ({
  page,
}, info) => {
  await page.goto('/library?verse=commons:software-engineering');
  const categories = page.getByRole('navigation', {
    name: 'Library categories',
    includeHidden: true,
  });
  await expect(
    categories.getByRole('button', { name: 'Collections', exact: true, includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await searchLibrary(page, 'Observer');
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(results.locator('a.feed-row').first()).toHaveAttribute('href', '/pattern/observer');
  await expect(
    categories.getByRole('button', { name: 'All', exact: true, includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    results.locator('.card-grid, .collection-toggle, .collection-expansion'),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('search-results.png') });
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(
    categories.getByRole('button', { name: 'Collections', exact: true, includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  if (info.project.name === 'phone')
    await expect(
      page.getByRole('button', { name: 'GoF Design Patterns 23 patterns' }),
    ).toBeVisible();
  else await expect(results.locator('.card-grid')).toBeVisible();
});

test('matching collections open directly as search results', async ({ page }) => {
  await page.goto('/library?verse=commons:software-engineering');
  await searchLibrary(page, 'GoF Design Patterns');
  await selectLibraryCategory(page, 'Collections');
  const result = page
    .getByRole('region', { name: 'Library results', exact: true })
    .locator('a.feed-row[href="/collection/gof-design-patterns"]');
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/collection\/gof-design-patterns$/, { timeout: 20_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Back restores the search category independently from the browse category', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop navigation snapshots');
  await page.goto('/library?verse=commons:software-engineering');
  await searchLibrary(page, 'Observer');
  await selectLibraryCategory(page, 'Patterns');
  await page.locator('a.feed-row[href="/pattern/observer"]').click();
  await expect(page.getByRole('heading', { name: 'Observer', exact: true, level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await page.goBack();
  await expect(librarySearchInput(page)).toHaveValue('Observer');
  const categories = page.getByRole('navigation', { name: 'Library categories' });
  await expect(categories.getByRole('button', { name: 'Patterns', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(
    categories.getByRole('button', { name: 'Collections', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
