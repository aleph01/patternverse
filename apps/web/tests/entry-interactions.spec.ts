import { expect, test } from '@playwright/test';

test('Verse collections reuse library hover and keyboard-focus colors', async ({ page }) => {
  await page.goto('/library');
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'Collections', exact: true })
    .click();
  await page
    .getByRole('searchbox', { name: /Search (the catalog|my library)/ })
    .fill('GoF Design Patterns');
  const libraryLink = page.locator('.pattern-feed a[href="/collection/gof-design-patterns"]');
  await libraryLink.hover();
  await expect(libraryLink).toHaveCSS('background-color', 'rgb(251, 254, 252)');
  await expect(libraryLink.locator('h3')).toHaveCSS('color', 'rgb(0, 122, 77)');
  await page.getByRole('heading', { level: 1 }).hover();
  await page.keyboard.press('Tab');
  await libraryLink.focus();
  await expect(libraryLink).toHaveCSS('background-color', 'rgb(251, 254, 252)');
  await expect(libraryLink.locator('h3')).toHaveCSS('color', 'rgb(0, 122, 77)');

  await page.goto('/verse/software-engineering');
  const collections = page.locator('.verse-groups section[aria-labelledby="collection-heading"]');
  await collections.getByRole('button', { name: 'List', exact: true }).click();
  const link = collections.locator('a[href="/collection/gof-design-patterns"]');
  const row = collections.locator('li:has(a[href="/collection/gof-design-patterns"])');
  const description = row.locator('.feed-summary');
  const metadata = row.locator('.feed-meta');
  const restDescription = await description.evaluate((el) => getComputedStyle(el).color);
  const restMetadata = await metadata.evaluate((el) => getComputedStyle(el).color);
  await link.hover();
  await expect(link).toHaveCSS('background-color', 'rgb(251, 254, 252)');
  await expect(row.locator('h3')).toHaveCSS('color', 'rgb(0, 122, 77)');
  await expect(description).toHaveCSS('color', restDescription);
  await expect(metadata).toHaveCSS('color', restMetadata);
  await expect(row.locator('h3')).toHaveCSS('transform', 'none');
  await page.getByRole('heading', { level: 1 }).hover();
  await page.keyboard.press('Tab');
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('background-color', 'rgb(251, 254, 252)');
  await expect(row.locator('h3')).toHaveCSS('color', 'rgb(0, 122, 77)');
  await expect(description).toHaveCSS('color', restDescription);
  await link.press('Enter');
  await expect(page).toHaveURL('/collection/gof-design-patterns');
});
