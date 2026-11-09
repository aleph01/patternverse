import { expect, test } from '@playwright/test';

test('the optional step map revisits collapsed work without losing the current draft', async ({
  page,
}, info) => {
  if (info.project.name === 'mobile-chromium')
    await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  const map = page.getByRole('complementary', { name: 'Step map', exact: true });
  await expect(map).toBeHidden();
  await page.getByRole('button', { name: 'Show step map', exact: true }).click();
  await expect(map.getByRole('button', { name: /^Go to step/ })).toHaveCount(1);
  await expect(map.getByRole('button', { name: /^Go to step 1:/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  // Unreached branches must not appear as if they were known future steps.
  await expect(map.getByText('Separate facts from assumptions', { exact: true })).toHaveCount(0);
  await page.getByLabel('How are you currently phrasing the decision?').fill('Should we rebuild?');
  await page.getByRole('button', { name: 'Next step ↓', exact: true }).click();
  await page.getByLabel('What problem are you trying to solve?').fill('Slow discovery');
  await page.getByLabel('What would a good outcome give you?').fill('Faster useful feedback');
  await page.getByRole('button', { name: 'Next step ↓', exact: true }).click();
  const draft = page.getByLabel('Which constraints are genuinely fixed?');
  await draft.fill('Keep this unfinished constraint');
  const first = page.getByRole('region', { name: 'Capture the current question', exact: true });
  await page.getByRole('button', { name: 'Collapse step 1: Capture the current question' }).click();
  await expect(first.locator('.worksheet-step-content')).toBeHidden();
  await expect(first.locator('.worksheet-step-summary')).toHaveText('Should we rebuild?');
  await expect(map.getByRole('button', { name: /^Go to step/ })).toHaveCount(3);
  await map.getByRole('button', { name: 'Go to step 1: Capture the current question' }).click();
  await expect(first.locator('.worksheet-step-content')).toBeVisible();
  await expect(first.getByRole('heading')).toBeFocused();
  await expect(draft).toHaveValue('Keep this unfinished constraint');
  await expect(first.getByRole('textbox')).toHaveCount(0);
  if (info.project.name === 'mobile-chromium') {
    await expect(map).toBeHidden();
    await page.getByRole('button', { name: 'Show step map', exact: true }).click();
  }
  await expect(map.getByRole('button', { name: /^Go to step 3:/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await page.getByRole('button', { name: 'Close step map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show step map', exact: true })).toBeFocused();
  await expect(draft).toHaveValue('Keep this unfinished constraint');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('living-notebook.png'), fullPage: true });
});

test('completion and restart rebuild the map from the new run', async ({ page }) => {
  await page.goto('/pattern/reduce-the-first-step/practice');
  await page.getByLabel('What are you finding hard to start?').fill('Write an email.');
  await page.getByRole('button', { name: 'Next step ↓', exact: true }).click();
  await page.getByLabel('What is one very small first action?').fill('Open a draft.');
  await page.getByRole('button', { name: 'Next step ↓', exact: true }).click();
  await page.getByRole('button', { name: 'Next step ↓', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show step map', exact: true }).click();
  const map = page.getByRole('complementary', { name: 'Step map', exact: true });
  await expect(map.getByRole('button', { name: /^Go to step/ })).toHaveCount(3);
  await expect(map.locator('[aria-current]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run again →', exact: true }).click();
  await expect(page.getByLabel('What are you finding hard to start?')).toHaveValue('');
  await expect(map.getByRole('button', { name: /^Go to step/ })).toHaveCount(1);
  await expect(map.getByRole('button', { name: /^Go to step 1:/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
});
