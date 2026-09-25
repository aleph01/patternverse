import { expect, test } from '@playwright/test';

test('explains Patternverse as a concise editorial page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'about', exact: true }).click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole('heading', { name: 'Knowledge you can use—and keep.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Markdown in. markdown out.' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Find something worth trying.' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /install once\. keep it close\./i }),
  ).toBeVisible();
  await expect(page.getByText(/progressive web app/i, { exact: true })).toBeVisible();
  await expect(page.getByText(/Open in Safari, tap Share/i)).toBeVisible();
});
