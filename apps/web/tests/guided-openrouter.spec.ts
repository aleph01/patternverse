import { expect, test, type BrowserContext, type Page } from '@playwright/test';

async function mockSignIn(context: BrowserContext) {
  await context.route('https://openrouter.ai/auth?**', async (route) => {
    const authorization = new URL(route.request().url());
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    const callback = new URL(authorization.searchParams.get('callback_url')!);
    callback.searchParams.set('code', 'synthetic-practice-code');
    await route.fulfill({
      contentType: 'text/html',
      body: `<a href="${callback.href.replaceAll('&', '&amp;')}">Approve test connection</a>`,
    });
  });
  await context.route('https://openrouter.ai/api/v1/auth/keys', (route) =>
    route.fulfill({ json: { key: 'synthetic-practice-key' } }),
  );
}

async function connect(page: Page, context: BrowserContext) {
  const newTab = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Connect with OpenRouter ↗' }).click();
  const auth = await newTab;
  await auth.getByRole('link', { name: 'Approve test connection' }).click();
  await expect(
    auth.getByRole('heading', { name: 'OpenRouter connected', exact: true }),
  ).toBeVisible();
  await expect(auth).toHaveURL(/\/auth\/openrouter\/connect\?connected=1$/);
  await auth.getByRole('button', { name: 'Close this tab' }).click();
  await page.bringToFront();
  // Explicitly checking works on mobile too, where focus events can be inconsistent.
  const check = page.getByRole('button', { name: 'Check connection', exact: true });
  if (await check.isVisible()) await check.click();
}

test('guided practice connects without a pasted key and keeps the original tab', async ({
  page,
  context,
}) => {
  await mockSignIn(context);
  await page.goto('/pattern/reframing-rapid-reframe/run');
  await expect(
    page.getByRole('heading', { name: 'Connect with OpenRouter', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('OpenRouter API key')).toHaveCount(0);
  const before = page.url();
  await connect(page, context);
  await expect(page).toHaveURL(before);
  await expect(page.getByRole('textbox', { name: 'Your response' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a credit limit pauses the AI step, retains answers, and retries only on request', async ({
  page,
  context,
}) => {
  await mockSignIn(context);
  let requests = 0;
  await context.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    requests += 1;
    if (requests === 1)
      return route.fulfill({ status: 402, json: { error: { code: 402, message: 'No credits' } } });
    return route.fulfill({
      json: { choices: [{ message: { content: '{"variant":"solution"}' } }] },
    });
  });
  await page.goto('/pattern/reframing-rapid-reframe/run');
  await connect(page, context);
  await page.getByLabel('Your response').fill('We need an app to reach more people.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your OpenRouter limit has been reached.' }),
  ).toBeVisible();
  await expect(
    page.getByText('We need an app to reach more people.', { exact: true }),
  ).toBeVisible();
  expect(requests).toBe(1);
  await connect(page, context);
  expect(requests).toBe(1);
  await expect(
    page.getByText('We need an app to reach more people.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try this step →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your OpenRouter limit has been reached.' }),
  ).toHaveCount(0);
  await expect(page.getByText(/A possible starting frame is/)).toBeVisible();
  expect(requests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
