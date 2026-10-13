import { expect, test } from '@playwright/test';

test('free guided AI requires opt-in and keeps Mira on its own provider route', async ({
  page,
  context,
}) => {
  let guidedCalls = 0;
  let paidCalls = 0;
  await context.route('**/api/guided-ai/status', (route) =>
    route.fulfill({ json: { available: true, patternIds: ['reframing-frame-problem'] } }),
  );
  await context.route('**/api/guided-ai/step', (route) => {
    guidedCalls += 1;
    const request = route.request().postDataJSON();
    expect(request.consent).toBe('cloudflare-guided-ai-v1');
    expect(request.patternId).toBe('reframing-frame-problem');
    expect(request.messages).toBeUndefined();
    expect(request.prompt).toBeUndefined();
    return route.fulfill({
      json: {
        effectId: request.effectId,
        revision: request.saved.revision,
        result: {
          kind: 'generated',
          value: { type: 'text', value: 'The project is not reaching the people it could help.' },
        },
        provider: 'cloudflare',
      },
    });
  });
  await context.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    paidCalls += 1;
    return route.abort();
  });
  await page.goto('/pattern/reframing-frame-problem/run');
  await expect(page.getByRole('heading', { name: 'Choose AI for this practice' })).toBeVisible();
  await page.screenshot({
    path: `/tmp/patternverse-free-ai-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(guidedCalls).toBe(0);
  expect(paidCalls).toBe(0);
  await page.getByRole('button', { name: 'Use free AI →' }).click();
  await page.getByLabel('What feels stuck?').fill('The project is not reaching enough people.');
  expect(guidedCalls).toBe(0);
  await page.getByRole('button', { name: 'Begin →' }).click();
  await expect(
    page.getByText(/A possible starting frame is: The project is not reaching/),
  ).toBeVisible();
  expect(guidedCalls).toBe(1);
  expect(paidCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/mira');
  await expect(page.getByRole('button', { name: 'Use free AI →' })).toHaveCount(0);
  expect(guidedCalls).toBe(1);
});

test('free quota exhaustion retains context and offers explicit OpenRouter instead of paid fallback', async ({
  page,
  context,
}) => {
  let guidedCalls = 0;
  let paidCalls = 0;
  await context.route('**/api/guided-ai/status', (route) =>
    route.fulfill({ json: { available: true, patternIds: ['reframing-frame-problem'] } }),
  );
  await context.route('**/api/guided-ai/step', (route) => {
    guidedCalls += 1;
    return route.fulfill({ status: 429, json: { code: 'FREE_LIMIT' } });
  });
  await context.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    paidCalls += 1;
    return route.abort();
  });
  await page.goto('/pattern/reframing-frame-problem/run');
  await page.getByRole('button', { name: 'Use free AI →' }).click();
  await page.getByLabel('What feels stuck?').fill('A starting point worth keeping.');
  await page.getByRole('button', { name: 'Begin →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Free AI limit reached for today.' }),
  ).toBeVisible();
  await expect(page.getByText('A starting point worth keeping.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Connect with OpenRouter ↗' })).toBeVisible();
  expect(guidedCalls).toBe(1);
  expect(paidCalls).toBe(0);
  await page.getByRole('button', { name: 'Use OpenRouter for this practice' }).click();
  await expect(
    page.getByRole('heading', { name: 'Connect with OpenRouter', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('A starting point worth keeping.', { exact: true })).toBeVisible();
  expect(guidedCalls).toBe(1);
  expect(paidCalls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('provider failure preserves the current step without retries', async ({ page, context }) => {
  let guidedCalls = 0;
  await context.route('**/api/guided-ai/status', (route) =>
    route.fulfill({ json: { available: true, patternIds: ['reframing-frame-problem'] } }),
  );
  await context.route('**/api/guided-ai/step', (route) => {
    guidedCalls += 1;
    return route.fulfill({ status: 503, json: { code: 'PROVIDER_UNAVAILABLE' } });
  });
  await page.goto('/pattern/reframing-frame-problem/run');
  await page.getByRole('button', { name: 'Use free AI →' }).click();
  await page.getByLabel('What feels stuck?').fill('Keep this answer after an outage.');
  await page.getByRole('button', { name: 'Begin →' }).click();
  await expect(page.getByRole('alert')).toContainText('Free AI is unavailable');
  await expect(page.getByText('Keep this answer after an outage.', { exact: true })).toBeVisible();
  expect(guidedCalls).toBe(1);
  await page.getByRole('button', { name: 'Try this step →' }).click();
  expect(guidedCalls).toBe(2);
});
