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

test('keeps only history and settings in the header at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 696, height: 807 });
  await page.goto('/mira');

  const header = page.locator('.mira-app-header');
  await expect(header.getByRole('button')).toHaveCount(2);
  await expect(header.getByRole('button', { name: 'Previous sessions' })).toBeEnabled();
  await expect(header.getByRole('button', { name: 'Settings' })).toBeEnabled();
  await expect(page.getByRole('navigation', { name: 'mira sections' })).toHaveCount(0);
  await expect(page.locator('.mira-chat-disclaimer')).toHaveCount(0);

  for (const width of [696, 430, 320]) {
    await page.setViewportSize({ width, height: 807 });
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.mira-app-header')!.getBoundingClientRect();
      const brand = document.querySelector('.mira-brand')!.getBoundingClientRect();
      const tools = document.querySelector('.mira-header-tools')!.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        headerBottom: header.bottom,
        brandRight: brand.right,
        toolsLeft: tools.left,
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.brandRight).toBeLessThan(layout.toolsLeft);
    expect(layout.headerBottom).toBe(58);
  }

  await header.getByRole('button', { name: 'Previous sessions' }).click();
  const history = page.getByRole('dialog', { name: 'Sessions' });
  await expect(history).toBeVisible();
  await history.getByRole('button', { name: 'Close sessions' }).click();
  await expect(history).toHaveCount(0);

  await header.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await expect(settings.getByLabel('Model')).toHaveValue('openrouter/auto');
  await settings.press('Escape');
  await expect(settings).toHaveCount(0);
});

test('shows reported monthly spending and warns without blocking replies', async ({ page }) => {
  let replies = 0;
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: { usage_monthly: 2.5, limit: 10, limit_remaining: 7.5, limit_reset: 'monthly' },
      }),
    }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    replies += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: 'I am here.' } }] }),
    });
  });

  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByLabel('OpenRouter API key').fill('test-key');
  await settings.getByRole('button', { name: 'Save connection' }).click();
  await expect(settings.getByText('$2.50 this month')).toBeVisible();
  await settings.getByLabel('Monthly warning threshold (USD)').fill('1');
  await settings.getByRole('button', { name: 'Save budget' }).click();
  await expect(settings.getByText('Monthly budget reached.', { exact: false })).toBeVisible();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByText('You can still send messages.', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Message mira' }).fill('Hello');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('I am here.')).toBeVisible();
  expect(replies).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Monthly warning threshold (USD)')).toHaveValue('1');
});
