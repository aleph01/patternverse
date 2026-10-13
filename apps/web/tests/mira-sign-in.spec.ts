import { expect, test } from '@playwright/test';

test('connects through OpenRouter, returns to settings, and can disconnect without removing sessions', async ({
  page,
}) => {
  // Exercise the actual redirect and callback UI with a synthetic provider, not a real account.
  await page.route('https://openrouter.ai/auth?**', async (route) => {
    const authorization = new URL(route.request().url());
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    const callback = new URL(authorization.searchParams.get('callback_url')!);
    callback.searchParams.set('code', 'synthetic-code');
    await route.fulfill({
      contentType: 'text/html',
      body: `<a href="${callback.href.replaceAll('&', '&amp;')}">Approve synthetic connection</a>`,
    });
  });
  await page.route('https://openrouter.ai/api/v1/auth/keys', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      code: 'synthetic-code',
      code_challenge_method: 'S256',
    });
    await route.fulfill({ json: { key: 'synthetic-oauth-key' } });
  });
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('OpenRouter API key')).toBeHidden();
  await page.getByRole('button', { name: 'Connect with OpenRouter', exact: true }).click();
  await page.getByRole('link', { name: 'Approve synthetic connection' }).click();
  await expect(page).toHaveURL(/\/mira\?panel=settings$/);
  await expect(
    page.getByText('OpenRouter connected on this device.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('OpenRouter connected on this device.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Connect with OpenRouter', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/You can revoke its key/)).toBeVisible();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
});

test('rejects unsolicited callbacks and removes the authorization query from history', async ({
  page,
}) => {
  await page.goto('/auth/openrouter/callback?code=unsolicited&state=wrong');
  await expect(page.getByRole('status')).toContainText('No pending OpenRouter connection');
  await expect(page).toHaveURL(/\/auth\/openrouter\/callback$/);
  await expect(page.getByRole('link', { name: 'Return to Mira settings' })).toBeVisible();
});
