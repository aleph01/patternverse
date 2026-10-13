import { expect, test, type Route } from '@playwright/test';

test('editing a key discards old discovery without clearing a newer loading state', async ({
  page,
}) => {
  const discoveries: Route[] = [];
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) => {
    discoveries.push(route);
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await settings.getByLabel('OpenRouter API key').fill('first-test-key');
  await settings.getByRole('button', { name: 'Check availability & prices' }).click();
  await expect.poll(() => discoveries.length).toBe(1);
  await settings.getByLabel('OpenRouter API key').fill('second-test-key');
  await settings.getByRole('button', { name: 'Check availability & prices' }).click();
  await expect.poll(() => discoveries.length).toBe(2);
  expect(discoveries[0].request().headers().authorization).toBe('Bearer first-test-key');
  expect(discoveries[1].request().headers().authorization).toBe('Bearer second-test-key');

  const firstResponse = page.waitForResponse('https://openrouter.ai/api/v1/endpoints/zdr');
  await discoveries[0].fulfill({ json: { data: [] } });
  await firstResponse;
  // Let response handlers and the resulting Svelte render settle, without a fixed delay.
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await expect(settings.getByRole('button', { name: 'Checking models…' })).toBeDisabled();
  await expect(
    settings.getByText('No zero-retention models are currently available for this key.'),
  ).toHaveCount(0);
  await discoveries[1].fulfill({
    json: {
      data: [
        {
          model_id: 'google/gemini-3.8-flash',
          model_name: 'Balanced test model',
          pricing: { prompt: '0.0000003', completion: '0.0000025' },
        },
      ],
    },
  });
  await expect(settings.getByRole('button', { name: 'Check availability & prices' })).toBeEnabled();
  await expect(settings.getByRole('radio', { name: /Balanced/ })).toBeEnabled();
});

test('a usage lookup failure does not block a reply or lose the saved connection', async ({
  page,
}) => {
  await page.route('https://openrouter.ai/api/v1/key', (route) =>
    route.fulfill({ status: 503, json: { error: 'Synthetic outage' } }),
  );
  let replies = 0;
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    const request = route.request().postDataJSON();
    expect(request.provider).toMatchObject({
      zdr: true,
      data_collection: 'deny',
      allow_fallbacks: false,
    });
    expect(route.request().headers().authorization).toBe('Bearer test-key');
    replies += 1;
    return route.fulfill({
      json: { choices: [{ message: { content: 'Reflection still works.' } }] },
    });
  });
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await settings.getByLabel('OpenRouter API key').fill('test-key');
  await settings.getByRole('button', { name: 'Save API key' }).click();
  await expect(settings.getByText(/Could not refresh OpenRouter usage:/)).toBeVisible();
  await settings.getByLabel('Monthly warning threshold (USD)').fill('10');
  await settings.getByRole('button', { name: 'Save budget' }).click();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('textbox', { name: 'Message mira' }).fill('A synthetic reflection');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Reflection still works.', { exact: true })).toBeVisible();
  expect(replies).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Advanced · enter an API key manually', { exact: true }).click();
  await expect(page.getByLabel('OpenRouter API key')).toHaveValue('test-key');
  await expect(page.getByLabel('Monthly warning threshold (USD)')).toHaveValue('10');
});
