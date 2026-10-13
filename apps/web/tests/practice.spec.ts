import { expect, test } from '@playwright/test';

test('reaches a CBT pattern through Therapy and CBT', async ({ page }) => {
  await page.goto('/verse/therapy');
  await page.getByRole('link', { name: 'Cognitive Behavioral Therapy' }).click();
  await page.getByRole('link', { name: 'Graded Task Assignment' }).click();
  await expect(page).toHaveURL(/\/pattern\/cbt-graded-task(?:\?.*)?$/);
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(page).toHaveURL(/\/pattern\/cbt-graded-task\/run$/);
  await expect(page.getByRole('button', { name: 'Yes, begin gently' })).toHaveCount(0);
  await expect(page.getByLabel('Your response')).toBeVisible();
});

test('keeps the worksheet visible on completion and discards responses when leaving', async ({
  page,
}) => {
  await page.goto('/pattern/reduce-the-first-step/practice');
  await expect(page.getByRole('heading', { name: 'Name the task' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  await page.getByLabel('What are you finding hard to start?').fill('Write an email.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Reduce the commitment' })).toBeVisible();
  await expect(page.getByText('Write an email.', { exact: true })).toBeVisible();
  await page.getByLabel('What is one very small first action?').fill('Open a draft.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await page
    .getByLabel('What did you notice, or how could you make the first action smaller?')
    .fill('Starting was manageable.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
  await expect(page.getByText('This reflection was not saved to Mira.')).toBeVisible();
  await expect(page.getByText('Write an email.', { exact: true })).toBeVisible();
  await expect(page.getByText('Open a draft.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Return to pattern' }).click();
  await page.getByRole('link', { name: 'Try this pattern', exact: true }).click();
  await expect(page.getByLabel('What are you finding hard to start?')).toHaveValue('');
});

test('validates required fields without showing a redundant exit control', async ({ page }) => {
  await page.goto('/pattern/reduce-the-first-step/practice');
  await expect(page.getByRole('button', { name: 'Exit Practice' })).toHaveCount(0);
  await page.getByLabel('What are you finding hard to start?').fill('   ');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('alert')).toContainText('Please answer');
});
