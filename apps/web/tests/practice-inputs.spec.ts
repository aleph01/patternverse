import { expect, test } from '@playwright/test';

const source = `:language 1
!choose direction {
:option begin "Begin"
:option stop "Stop"
Where next?
}
!choose picked [multi, min=1, max=2] {
Which options?
- a: "Alpha"
- b: "Beta"
- c: "Gamma"
}
!rank ordered [from=picked] {
What order?
}
score = !rate 0..5 {
:low "Low"
:high "High"
How clear?
}
-> end`;

test('preview choice, ranking and rating controls work by keyboard at desktop and narrow widths', async ({
  page,
}, info) => {
  await page.goto('/editor?type=pattern');
  if (info.project.name === 'mobile-chromium')
    await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  if (info.project.name === 'mobile-chromium')
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).press('Enter');
  const confirm = page.getByRole('button', { name: 'Continue →', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Alpha' }).press('Space');
  await page.getByRole('checkbox', { name: 'Beta' }).press('Space');
  await expect(confirm).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Gamma' }).press('Space');
  await expect(confirm).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Gamma' }).press('Space');
  await confirm.click();
  await expect(page.getByRole('button', { name: 'Move Alpha up' })).toBeDisabled();
  await page.getByRole('button', { name: 'Move Beta up' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Move Beta up' })).toBeDisabled();
  await page.locator('.preview').screenshot({
    path: `/tmp/patternverse-input-preview-${info.project.name}.png`,
  });
  await page.getByRole('button', { name: 'Confirm order →' }).click();
  await expect(page.getByText('Beta → Alpha', { exact: true })).toBeVisible();
  const slider = page.getByRole('slider');
  await expect(slider).toHaveAttribute('min', '0');
  await expect(slider).toHaveAttribute('max', '5');
  await slider.fill('3');
  await page.locator('.preview').screenshot({
    path: `/tmp/patternverse-input-rating-${info.project.name}.png`,
  });
  await confirm.click();
  await expect(page.getByText(/^Practice complete\./)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runner selection drafts survive editing and canceling an earlier text response', async ({
  page,
}, info) => {
  await page.goto('/pattern/cbt-thinking-patterns/run');
  await page.getByLabel('Your response').fill('A friend did not reply.');
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'Mind reading', exact: true });
  await checkbox.press('Space');
  await page.getByRole('button', { name: /^Edit step 1:/ }).click();
  await page.getByLabel('Edit your response').fill('Discard this revision.');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(checkbox).toBeChecked();
  await expect(page.getByText('A friend did not reply.', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/patternverse-input-runner-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Continue ↓', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your response' })).toBeVisible();
  await expect(page.getByText('Mind reading', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
