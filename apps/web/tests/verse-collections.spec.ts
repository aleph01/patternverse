import { expect, test } from '@playwright/test';

test('collections start expanded, switch views, and remember the library preference', async ({
  page,
  isMobile,
}) => {
  await page.goto('/verse/software-engineering');
  const section = page.locator('section[aria-labelledby="collection-heading"]');
  await expect(section.locator('details')).toHaveAttribute('open', '');
  const entries = section.getByRole('region', { name: 'Collections', exact: true });
  await expect(entries.getByRole('link')).toHaveCount(4);
  await expect(entries.locator('.card-grid')).toBeVisible();
  const switcher = section.getByRole('group', { name: 'Collections view' });
  await expect(switcher.getByRole('button', { name: 'Cards', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  if (isMobile)
    await expect(entries.locator('.card-grid')).toHaveCSS('grid-template-columns', /^(\d|\.)+px$/);
  await switcher.getByRole('button', { name: 'List', exact: true }).click();
  await expect(entries.locator('.card-grid')).toHaveCount(0);
  await expect(entries.getByRole('link')).toHaveCount(4);
  await section.locator('summary').click();
  await expect(entries).toBeHidden();
  await section.locator('summary').click();
  await expect(entries).toBeVisible();
  await page.reload();
  await expect(switcher.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(entries.locator('.card-grid')).toHaveCount(0);
  await page.goto('/library');
  await expect(page.locator('.pattern-feed.card-grid')).toHaveCount(0);
  await page.goto('/verse/software-engineering');
  await switcher.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(entries.locator('.card-grid')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
