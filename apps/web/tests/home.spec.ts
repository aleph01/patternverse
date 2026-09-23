import { expect, test } from '@playwright/test';

test('introduces the procedural knowledge question and example library', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Find a pattern worth trying.',
  );
  await expect(page.getByRole('heading', { name: 'Verses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Creative Reframing' })).toBeVisible();
  await expect(page.getByText('Pattern · Commons').first()).toBeVisible();
  await expect(page.locator('#library')).not.toContainText('Getting Unstuck');
  await expect(page.locator('#library')).not.toContainText('Creativity');

  await page.getByLabel('Choose entity types').click();
  await page.getByRole('checkbox', { name: 'Collections', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Verses', exact: true }).check();
  await expect(page.locator('#library')).toContainText('Getting Unstuck');
  await expect(page.locator('#library')).toContainText('Creativity');
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
