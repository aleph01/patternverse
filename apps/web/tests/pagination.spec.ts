import { expect, test } from '@playwright/test';

test('paginates collections in their authored order and short collections have no pager', async ({
  page,
}) => {
  await page.goto('/collection/gof-design-patterns');
  await expect(page.getByRole('button', { name: 'Add to my library', exact: true })).toBeEnabled();
  const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
  await expect(entries.getByRole('link')).toHaveCount(20);
  await expect(entries.getByRole('link', { name: /Factory Method/ })).toBeVisible();
  await entries.getByRole('button', { name: 'Go to page 2' }).click();
  await expect(entries.getByRole('link')).toHaveCount(3);
  await expect(entries.getByRole('status')).toContainText('21–23 of 23 entries');
  await expect(entries.getByRole('link', { name: /Strategy/ })).toBeVisible();
  await expect(entries.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/collection/neuro-linguistic-programming');
  await expect(
    page.getByRole('region', { name: 'Collection entries', exact: true }).getByRole('link'),
  ).toHaveCount(15);
  await expect(page.getByRole('navigation', { name: 'Collection entries pagination' })).toHaveCount(
    0,
  );
});

test('paginates Verse patterns in the unified library', async ({ page }) => {
  // The wide library uses pagination; the mobile library groups patterns by Collection.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/verse/software-engineering');
  await expect(page.getByRole('button', { name: /^My library/ })).toBeEnabled();
  const patterns = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(patterns.getByRole('link')).toHaveCount(20);
  const firstPage = await patterns.getByRole('link').allTextContents();
  await patterns.getByRole('button', { name: 'Next page' }).click();
  await expect(patterns.getByRole('link')).toHaveCount(3);
  const secondPage = await patterns.getByRole('link').allTextContents();
  expect(firstPage.some((entry) => secondPage.includes(entry))).toBe(false);
  await expect(patterns.getByRole('status')).toContainText('page 2 of 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('library paging retains filters and layout but resets when those filters change', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/library');
  await expect(page.getByRole('button', { name: /^My library/ })).toBeEnabled();
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(results.getByRole('link')).toHaveCount(20);
  await results.getByRole('button', { name: 'Go to page 2' }).click();
  await expect(results.getByRole('status')).toContainText('page 2');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(results.getByRole('status')).toContainText('page 2');
  const search = page.getByRole('searchbox', { name: /Search/ });
  await search.fill('GoF Design Patterns');
  await expect(results.getByRole('status')).toContainText('page 1');
  // Fuzzy search can include neighboring articles. Constrain the Verse to verify its 23 entries.
  await page
    .getByRole('complementary', { name: 'Browse verses' })
    .getByRole('button', { name: 'Software Engineering', exact: true })
    .click();
  await expect(results.getByRole('status')).toContainText('page 1 of 2');
  await results.getByRole('button', { name: 'Next page' }).click();
  await expect(search).toHaveValue('GoF Design Patterns');
  await expect(results.getByRole('link')).toHaveCount(3);
  await page
    .getByRole('complementary', { name: 'Browse verses' })
    .getByRole('button', { name: 'All verses', exact: true })
    .click();
  await expect(results.getByRole('status')).toContainText('page 1');
  await search.fill('NLP');
  // Search covers article text and fuzzy neighbors, not just collection membership.
  // Verify the fifteen NLP patterns without rejecting another legitimate match.
  await expect(results.getByRole('link').filter({ hasText: 'NLP' })).toHaveCount(15);
  await expect(results.getByRole('navigation')).toHaveCount(0);
  await search.fill('');
  await expect(results.getByRole('status')).toContainText('page 1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
