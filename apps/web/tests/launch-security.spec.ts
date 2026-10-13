import { expect, test } from '@playwright/test';

test('clears OAuth credentials from the URL and never caches callback pages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.goto('/auth/dropbox/callback?code=test-sensitive-code&state=test-state');
  await expect(
    page.getByRole('heading', { name: 'The Dropbox authorization response is incomplete.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
  const cachedUrls = await page.evaluate(async () => {
    const entries = await Promise.all(
      (await caches.keys()).map(async (name) =>
        (await (await caches.open(name)).keys()).map((request) => request.url),
      ),
    );
    return entries.flat();
  });
  expect(
    cachedUrls.some((url) => url.includes('/auth/') || url.includes('test-sensitive-code')),
  ).toBe(false);
});

test('production CSP permits the app bootstrap but blocks injected inline scripts', async ({
  page,
}) => {
  await page.goto('/my');
  await expect(page.getByRole('button', { name: /connect dropbox/i })).toBeVisible();
  const policy = await page
    .locator('meta[http-equiv="content-security-policy" i]')
    .getAttribute('content');
  expect(policy).toContain('script-src');
  expect(policy).toContain('sha256-');
  const executed = await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__untrustedScriptRan = true';
    document.body.append(script);
    return '__untrustedScriptRan' in window;
  });
  expect(executed).toBe(false);
});
