import { expect, test } from '@playwright/test';

const id = 'define-the-decision-before-comparing-options';
test.use({ actionTimeout: 20000 });
test('shares a clean link and previews both light embed formats', async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as Window & { copied?: string }).copied = text;
        },
      },
    });
  });
  await page.goto(`/pattern/${id}?collection=example#article-overview`);
  const trigger = page.getByRole('button', { name: 'Share', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share pattern' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab')).toHaveCount(3);
  await expect(dialog.getByLabel('Pattern link')).toHaveValue(
    `https://patternverse.org/pattern/${id}`,
  );
  await dialog.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(
    `https://patternverse.org/pattern/${id}`,
  );
  await dialog.getByRole('tab', { name: 'Embed card' }).click();
  const card = page.frameLocator('iframe[title="Pattern card preview"]');
  await expect(card.getByRole('heading', { level: 1 })).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  await expect(card.getByText('patternverse', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Appearance', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Embed code')).toHaveValue(
    new RegExp(`/embed/card/pattern/${id}`),
  );
  await dialog.getByRole('button', { name: 'Copy code' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Embed code copied.');
  await page.screenshot({ path: info.outputPath('share-card.png') });
  await dialog.getByRole('tab', { name: 'Embed practice' }).click();
  const practice = page.frameLocator('iframe[title="Practice embed preview"]');
  await expect(practice.getByRole('heading', { level: 1 })).toHaveText('Rewrite the Decision');
  await expect(practice.getByRole('button', { name: 'Start practice' })).toBeVisible();
  await expect
    .poll(() =>
      practice
        .locator('main')
        .evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight),
    )
    .toBe(true);
  await expect(dialog.getByLabel('Embed code')).toHaveValue(
    new RegExp(`/embed/practice/pattern/${id}`),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('share-practice.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('keeps a framed practice ephemeral with storage unavailable, including history URLs', async ({
  page,
  context,
}) => {
  // The test host is intercepted; permit its request to the loopback preview server.
  await context.grantPermissions(['local-network-access']);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'indexedDB'])
      Object.defineProperty(window, key, {
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
  });
  await page.route('http://localhost:4208/embed-host-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<iframe title="Embedded practice" src="http://127.0.0.1:4208/embed/practice/pattern/${id}?history=private-record" style="width:100%;height:800px;border:0" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`,
    }),
  );
  await page.goto('http://localhost:4208/embed-host-test');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Start practice' }).click();
  const question = frame.getByLabel('How are you currently phrasing the decision?');
  await expect(question).toBeVisible();
  await question.fill('Should we rewrite the app?');
  await frame.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }).click();
  await frame.getByLabel('What problem are you trying to solve?').fill('Reduce maintenance');
  await frame.getByLabel('What would a good outcome give you?').fill('Simpler boundaries');
  await frame.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }).click();
  await expect(
    frame.getByRole('heading', { name: 'Separate facts from assumptions' }),
  ).toBeVisible();
  await expect(frame.getByRole('button', { name: /Save to workspace/ })).toHaveCount(0);
  await expect(frame.locator('.site-header')).toHaveCount(0);
  await page.reload();
  await expect(frame.getByRole('button', { name: 'Start practice' })).toBeVisible();
  await expect(frame.getByText('Should we rewrite the app?', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('omits practice sharing when no supported exercise exists and handles clipboard denial', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
    }),
  );
  await page.goto('/pattern/adapter?share=1');
  const dialog = page.getByRole('dialog', { name: 'Share pattern' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'Embed practice' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Select and copy the text manually.');
  await expect(dialog.getByLabel('Pattern link')).toBeFocused();
  await dialog.getByRole('tab', { name: 'Copy link' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'Embed card' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('selects the exact linked practice and rejects unavailable embed routes', async ({
  page,
  request,
}) => {
  await page.goto('/pattern/inversion?share=1');
  const dialog = page.getByRole('dialog', { name: 'Share pattern' });
  await dialog.getByRole('tab', { name: 'Embed practice' }).click();
  await dialog
    .getByRole('combobox', { name: 'Practice' })
    .selectOption('practice:discover-what-to-stop-doing');
  await expect(dialog.getByLabel('Embed code')).toHaveValue(
    /\/embed\/practice\/practice\/discover-what-to-stop-doing/,
  );
  const preview = page.frameLocator('iframe[title="Practice embed preview"]');
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText(
    'Discover What to Stop Doing',
  );
  for (const path of [
    '/embed/practice/pattern/adapter',
    '/embed/card/practice/discover-what-to-stop-doing',
    '/embed/card/pattern/not-a-real-pattern',
    `/embed/unknown/pattern/${id}`,
  ])
    expect((await request.get(path)).status()).toBe(404);
});
