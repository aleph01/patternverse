import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  await page.getByLabel('How are you currently phrasing the decision?').fill('Should we rebuild?');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await page.getByLabel('What problem are you trying to solve?').fill('Slow discovery');
  await page.getByLabel('What would a good outcome give you?').fill('Faster useful feedback');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await page.getByLabel('Which constraints are genuinely fixed?').fill('An unfinished constraint');
});

test('editing a confirmed answer preserves later answers and the unfinished current step', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit step 1: Capture the current question' }).click();
  const first = page.locator('.worksheet-step').first();
  await expect(first.getByLabel('How are you currently phrasing the decision?')).toHaveValue(
    'Should we rebuild?',
  );
  await first
    .getByLabel('How are you currently phrasing the decision?')
    .fill('How can we improve discovery?');
  await first.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(first.getByText('How can we improve discovery?', { exact: true })).toBeVisible();
  await expect(page.getByText('Slow discovery', { exact: true })).toBeVisible();
  await expect(page.getByText('Faster useful feedback', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Which constraints are genuinely fixed?')).toHaveValue(
    'An unfinished constraint',
  );
  await page.getByRole('button', { name: 'Keep this response ✓' }).click();
  await expect(page.getByRole('button', { name: 'Keep this response ✓' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save to workspace', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('canceling an edit restores the accepted answer without losing current writing', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit step 1: Capture the current question' }).click();
  const first = page.locator('.worksheet-step').first();
  await first.getByLabel('How are you currently phrasing the decision?').fill('Discard this edit');
  await first.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(first.getByText('Should we rebuild?', { exact: true })).toBeVisible();
  await expect(first.getByText('Discard this edit', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Which constraints are genuinely fixed?')).toHaveValue(
    'An unfinished constraint',
  );
  await page.getByRole('button', { name: 'Edit step 1: Capture the current question' }).click();
  await expect(first.getByLabel('How are you currently phrasing the decision?')).toHaveValue(
    'Should we rebuild?',
  );
});
