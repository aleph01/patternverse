import { expect, test, type Page } from '@playwright/test';
import { addTextCell } from './bearings-helpers';

const pageErrors = new WeakMap<Page, string[]>();

async function leavePreview(page: Page) {
  // Use an ordinary internal link so the app can save pending edits before navigation.
  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('preview', '0');
    const link = document.createElement('a');
    link.href = url.href;
    document.body.append(link);
    link.click();
    link.remove();
  });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => {
    // The development server does not provide a production service worker.
    if (!error.message.includes('Failed to register a ServiceWorker')) errors.push(error.message);
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('ordinary visitors do not see Bearings links and a direct visit does not mount the app', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Open Bearings/ })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Preview mode' })).toHaveCount(0);
  await page.goto('/apps/bearings');
  await expect(page.getByRole('heading', { name: 'This page is in preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New situation', exact: true })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('.bearings')).toHaveCount(0);
});

test('one flag enables Bearings across links and reloads, and leaving preserves workspace data', async ({
  page,
}) => {
  await page.goto('/?preview=1');
  await expect(page.getByRole('link', { name: /Open Bearings/ })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Preview mode' })).toHaveCount(0);
  await expect(page.getByText('Preview enabled', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Leave preview', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Open Bearings/ }).click();
  await expect(page).toHaveURL(/\/apps\/bearings$/);
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await page.getByLabel('What would you like to work through?').fill('Keep this preview notebook');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await page.reload();
  await expect(page.locator('.bearings')).toBeVisible();
  await leavePreview(page);
  await expect(page.getByRole('heading', { name: 'This page is in preview' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Preview mode' })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.bearings')).toHaveCount(0);
  await page.goto('/my?pane=situations');
  await expect(
    page.getByRole('button', { name: 'Open notebook: Keep this preview notebook', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /^Open Bearings notebook:/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Open notebook: Keep this preview notebook', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Open in Bearings', exact: true })).toHaveCount(0);
});

test('direct opt-in and URL opt-out work without losing other query parameters', async ({
  page,
}) => {
  await page.goto('/apps/bearings?preview=1');
  await expect(page.locator('.bearings')).toBeVisible();
  await page.goto('/my?pane=situations&preview=1#workspace');
  await leavePreview(page);
  await expect(page).toHaveURL(/\/my\?pane=situations#workspace$/);
  await page.goto('/apps/bearings?preview=1');
  await expect(page.locator('.bearings')).toBeVisible();
  await page.goto('/apps/bearings?preview=0');
  await expect(page.getByRole('heading', { name: 'This page is in preview' })).toBeVisible();
});

test('static page markup does not render the preview app even when requested with the flag', async ({
  request,
}) => {
  const response = await request.get('/apps/bearings?preview=1');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('noindex, nofollow');
  expect(html).not.toContain('class="bearings"');
  expect(html).not.toContain('What would you like to work through?');
});

test('leaving preview saves unfinished notebook text before unmounting the app', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await page.getByLabel('What would you like to work through?').fill('An unfinished thought');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await addTextCell(page, 'Keep my unfinished text.');
  const notebookUrl = new URL(page.url());
  notebookUrl.searchParams.delete('preview');
  await leavePreview(page);
  await expect(page.getByRole('heading', { name: 'This page is in preview' })).toBeVisible();
  await expect(page).toHaveURL(notebookUrl.href);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: /^An unfinished thought/ }).click();
  const note = page.getByRole('textbox', { name: 'Note text', exact: true });
  await expect(note).toHaveValue('Keep my unfinished text.');
  await expect(note).toBeInViewport();
  await page.screenshot({ path: `/private/tmp/patternverse-preview-${info.project.name}.png` });
});
