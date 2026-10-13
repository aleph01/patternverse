import { expect, test } from '@playwright/test';

test('retries an unanswered message after reload without duplicating it or losing a draft', async ({
  page,
}) => {
  let requests = 0;
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    requests += 1;
    const body = route.request().postDataJSON();
    expect(
      body.messages.filter((message: { role: string }) => message.role === 'user'),
    ).toHaveLength(1);
    if (requests === 1)
      await route.fulfill({
        json: { choices: [{ message: { content: '' }, finish_reason: 'length' }] },
      });
    else
      await route.fulfill({
        json: { choices: [{ message: { content: 'I am here.' }, finish_reason: 'stop' }] },
      });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('test-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await expect(page.getByText('Provider settings saved encrypted on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('textbox', { name: 'Message mira' }).fill('Hello');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('button', { name: 'Retry reply' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry reply' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Message mira' }).fill('Keep this draft');
  await page.getByRole('button', { name: 'Retry reply' }).click();
  await expect(page.getByText('I am here.', { exact: true })).toBeVisible();
  await expect(page.locator('.mira-messages .from-user')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toHaveValue('Keep this draft');
  await expect(page.getByRole('button', { name: 'Retry reply' })).toHaveCount(0);
  expect(requests).toBe(2);
});
