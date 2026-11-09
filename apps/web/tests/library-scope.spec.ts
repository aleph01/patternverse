import { expect, test } from '@playwright/test';
import { expectLibraryScope, selectLibraryScope } from './helpers/library';

test('keeps Commons selected when reopening with saved items', async ({ page }, info) => {
  await page.goto('/pattern/observer');
  await page.getByRole('button', { name: 'Add to my library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'In my library', exact: true })).toBeEnabled();

  await page.goto('/library');
  await expectLibraryScope(page, 'explore');
  await selectLibraryScope(page, 'saved');
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(results.locator('a[href="/pattern/observer"]')).toBeVisible();

  await page.reload();
  // Desktop snapshots retain an explicit selection across a reload.
  await expectLibraryScope(page, info.project.name === 'chromium' ? 'saved' : 'explore');
  await selectLibraryScope(page, 'saved');
  await expect(results.locator('a[href="/pattern/observer"]')).toBeVisible();

  await selectLibraryScope(page, 'explore');
  await page.reload();
  await expectLibraryScope(page, 'explore');
});
