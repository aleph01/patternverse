import { expect, test } from '@playwright/test';

test('reaches Worry Exposure through Therapy and CBT', async ({ page }) => {
  await page.goto('/verse/therapy');
  await page.getByRole('heading', { level: 2, name: 'Collections' }).click();
  await page.getByRole('link', { name: 'Cognitive Behavioral Therapy' }).click();
  await expect(page).toHaveURL(/\/collection\/cbt$/);
  await page.getByRole('link', { name: 'Worry Exposure' }).click();
  await expect(page).toHaveURL(/\/pattern\/worry-exposure$/);
  await page.getByRole('link', { name: 'Begin Practice' }).click();
  await expect(page).toHaveURL(/\/pattern\/worry-exposure\/practice$/);
  await expect(page.getByRole('heading', { name: 'Worry Exposure Practice' })).toBeVisible();
});

test('completes the Worry Exposure Practice and discards responses', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto('/pattern/worry-exposure/practice');

  await expect(page.getByLabel('Step 1 of 4')).toBeVisible();
  await expect(page.getByLabel('Exposure duration in minutes')).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Next' }).locator('.practice-navigation-chevron--right'),
  ).toBeVisible();
  await page.getByLabel('What are you worried might happen?').fill('A feared outcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByLabel('Step 2 of 4')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Back' }).locator('.practice-navigation-chevron--left'),
  ).toBeVisible();
  await page.getByLabel('Write your worry scenario.').fill('The situation is happening now.');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByLabel('Exposure duration in minutes')).toHaveValue('10');
  await page.getByRole('button', { name: 'Increase Exposure duration by one minute' }).click();
  await expect(page.getByLabel('Exposure duration in minutes')).toHaveValue('11');
  await page.getByRole('button', { name: 'Decrease Exposure duration by one minute' }).click();
  await expect(page.getByLabel('Exposure duration in minutes')).toHaveValue('10');
  await page.getByLabel('Exposure duration in minutes').fill('1');
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward(60_000);
  await expect(page.getByText('Timer complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('What did you notice?').fill('I noticed an urge to check.');
  await expect(page.getByRole('region', { name: 'Exposure duration' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible();
  await expect(page.getByText('Your responses were not saved.')).toBeVisible();
  await page.getByRole('link', { name: 'Return to Worry Exposure' }).click();
  await page.getByRole('link', { name: 'Begin Practice' }).click();
  await expect(page.getByLabel('What are you worried might happen?')).toHaveValue('');
});

test('validates required fields without showing a redundant exit control', async ({ page }) => {
  await page.goto('/pattern/worry-exposure/practice');
  await expect(page.getByRole('button', { name: 'Exit Practice' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('This field is required.')).toBeVisible();
});

test('supports timer pause, resume, and reset without advancing the step', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto('/pattern/worry-exposure/practice');
  await page.getByLabel('What are you worried might happen?').fill('Outcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Write your worry scenario.').fill('Scenario');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward(10_000);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(page.getByRole('button', { name: 'Resume timer' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume timer' }).click();
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(page.getByLabel('Exposure duration in minutes')).toHaveValue('10');
  await expect(page.getByRole('heading', { name: 'Stay with the scenario' })).toBeVisible();
});
