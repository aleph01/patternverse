import { expect, test } from '@playwright/test';

test('offers priced ZDR choices and preserves the selected model', async ({ page }) => {
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ json: { data: { usage_monthly: 0 } } }),
  );
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            model_id: 'google/gemini-3.5-flash-lite',
            model_name: 'Gemini Lite',
            pricing: { prompt: '0.0000003', completion: '0.0000025' },
          },
          {
            model_id: 'google/gemini-3.8-flash',
            model_name: 'Gemini Flash',
            pricing: { prompt: '0.00000075', completion: '0.00000375' },
          },
        ],
      },
    }),
  );
  await page.goto('/mira');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Balanced/ })).toBeChecked();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await page.getByLabel('OpenRouter API key').fill('test-key');
  await page.getByRole('button', { name: 'Save API key' }).click();
  await page.getByRole('button', { name: 'Check availability & prices' }).click();
  await expect(page.getByText('About $0.19 / 100 short replies')).toBeVisible();
  await expect(page.getByRole('radio', { name: /More capable/ })).toBeDisabled();
  await page.getByRole('radio', { name: /Quick & economical/ }).check();
  await page.getByRole('button', { name: 'Save model choice' }).click();
  await expect(page.getByText('Provider settings saved encrypted on this device.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Quick & economical/ })).toBeChecked();
});
