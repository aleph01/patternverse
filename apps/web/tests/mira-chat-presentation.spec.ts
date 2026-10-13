import { expect, test } from '@playwright/test';

test('composer preserves multiline drafts through selectors and retries without duplicating messages', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let replies = 0;
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    replies += 1;
    return replies === 1
      ? route.fulfill({
          status: 503,
          json: { error: { message: 'Synthetic unavailable provider' } },
        })
      : route.fulfill({
          json: { choices: [{ message: { content: 'Synthetic completed reply' } }] },
        });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('synthetic-test-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await expect(page.getByText('Provider settings saved encrypted on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();

  const composer = page.getByRole('textbox', { name: 'Message mira' });
  await composer.fill('First line');
  await composer.press('Shift+Enter');
  await composer.pressSequentially('Second line');
  await expect(composer).toHaveValue('First line\nSecond line');
  expect(replies).toBe(0);
  await page.getByRole('button', { name: 'Choose a pattern or practice' }).click();
  await page.keyboard.press('Escape');
  await expect(composer).toHaveValue('First line\nSecond line');
  // Keyboard-triggered selector closure must also retain the page's textarea focus adapter.
  await composer.focus();
  await composer.press('Shift+Space');
  await expect(page.getByRole('dialog', { name: 'Patterns & practices' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(composer).toBeFocused();

  await composer.press('Enter');
  const retry = page.getByRole('button', { name: 'Retry reply' });
  await expect(retry).toBeVisible();
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(1);
  await expect(composer).toHaveValue('');
  await expect(composer).toBeFocused();
  await retry.click();
  await expect(page.getByText('Synthetic completed reply', { exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(1);
  await expect(composer).toBeFocused();
  expect(replies).toBe(2);
  await page.reload();
  await expect(page.getByText('Synthetic completed reply', { exact: true })).toBeVisible();
  await expect(page.locator('.mira-messages article.from-user')).toHaveCount(1);
  expect(errors).toEqual([]);
});
