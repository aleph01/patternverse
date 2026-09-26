import { expect, test } from '@playwright/test';

test('keeps mira chat-focused and selects a library pattern in the conversation', async ({
  page,
}) => {
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByRole('heading', { name: 'New session' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Patternverse home' })).toHaveCount(1);

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

test('keeps compact mira navigation unique and within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 696, height: 807 });
  await page.goto('/mira');

  const navigation = page.getByRole('navigation', { name: 'mira sections' });
  await expect(navigation.getByRole('button', { name: 'Conversation' })).toHaveCount(1);
  await expect(navigation.getByRole('button', { name: 'Sessions' })).toHaveCount(1);
  await expect(navigation.getByRole('link', { name: 'Pattern library' })).toHaveCount(1);
  await expect(navigation.getByRole('button', { name: 'Settings' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open settings' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open pattern library' })).toHaveCount(0);

  for (const width of [696, 430, 320]) {
    await page.setViewportSize({ width, height: 807 });
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.mira-app-header')!.getBoundingClientRect();
      const nav = document.querySelector('.mira-app-tabs')!.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        headerBottom: header.bottom,
        navTop: nav.top,
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.navTop).toBe(width < 430 ? layout.headerBottom : 0);
  }
});
