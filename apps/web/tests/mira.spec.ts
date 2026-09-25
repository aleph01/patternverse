import { expect, test } from '@playwright/test';

test('keeps mira chat-focused and selects a library pattern in the conversation', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByRole('heading', { name: 'New session' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Patternverse home' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Choose a pattern or therapy technique' }).click();
  const picker = page.getByRole('dialog', { name: 'Patterns & therapy techniques' });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('heading', { name: 'Patterns', exact: true })).toBeVisible();
  await picker.getByRole('button', { name: /Creative Reframing/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByText('Library pattern: Creative Reframing')).toBeVisible();

  await page.keyboard.press('Shift+Space');
  await expect(picker).toBeVisible();
});
