import { expect, test } from '@playwright/test';
import { selectLibraryCategory } from './helpers/library';

test('Verse collections use the library views and remember the layout preference', async ({
  page,
  isMobile,
}) => {
  await page.goto('/verse/software-engineering');
  await expect(page).toHaveURL('/library?verse=commons%3Asoftware-engineering');
  await selectLibraryCategory(page, 'Collections');
  const entries = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(entries.getByRole('link')).toHaveCount(4);
  if (!isMobile) {
    const switcher = page.getByRole('group', { name: 'Library view' });
    await expect(entries.locator('.card-grid')).toBeVisible();
    await switcher.getByRole('button', { name: 'List', exact: true }).click();
    await expect(entries.locator('.card-grid')).toHaveCount(0);
    await page.reload();
    await selectLibraryCategory(page, 'Collections');
    await expect(switcher.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(entries.locator('.card-grid')).toHaveCount(0);
    await switcher.getByRole('button', { name: 'Cards', exact: true }).click();
    await expect(entries.locator('.card-grid')).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
