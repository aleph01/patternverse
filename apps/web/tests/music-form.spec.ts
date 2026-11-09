import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pattern comparisons (5)', exact: true }).click();
  await playerFor(page)
    .getByLabel('Musical example', { exact: true })
    .selectOption('form-layered-entry');
});
test('reveals a section from the whole map, follows its notes and keeps instrument layers optional', async ({
  page,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const player = playerFor(page);
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await expect(player.locator('.form-detail')).not.toHaveAttribute('open');
  await expect(player.locator('.form-section')).toHaveCount(4);
  await expect(player.locator('.description')).toContainText(
    'Form is how a piece unfolds through time.',
  );
  const stage = player.locator('.form-section').nth(2);
  await stage.focus();
  await stage.press('Enter');
  await expect(player.locator('.position')).toHaveText('Bar 5 · beat 1.0');
  await expect(stage).toHaveAttribute('aria-current', 'step');
  await expect(player.locator('.bar-labels span').first()).toHaveText('Bar 5');
  await player.getByText('Instrument layers', { exact: true }).click();
  await expect(player.locator('.form-lane')).toHaveCount(4);
  await expect(player.locator('.form-lane').nth(1)).toHaveAttribute(
    'aria-label',
    'Bass: first enters at beat 9',
  );
  await expect(player.getByRole('img', { name: /Note onsets/ })).toHaveCount(0);
  await player.getByText('What changes in A/B?', { exact: true }).click();
  await expect(player.locator('.comparison-notes')).toContainText('What stayed the same?');
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await expect(player.locator('.position')).toHaveText('Bar 5 · beat 1.0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('preserves the whole-piece clock across A/B and section looping', async ({ page }) => {
  const player = playerFor(page);
  await player.locator('.form-section').last().click();
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'A Constant texture', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.form-section').first()).toContainText('Full');
  await player.getByRole('button', { name: 'B Layered entry', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.form-section').last()).toHaveAttribute('aria-current', 'step');
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.getByRole('button', { name: 'Loop song', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.form-playhead')).toBeVisible();
});
