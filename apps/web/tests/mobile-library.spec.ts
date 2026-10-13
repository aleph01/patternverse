import { expect, test } from '@playwright/test';

test('swipes four collections at a time and scrolls through every pattern without pagination', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Filter library' })).toBeVisible();
  const collections = page.getByRole('region', { name: 'Collections', exact: true });
  const track = collections.locator('.collection-track');
  const firstGroup = collections.getByRole('group').first();
  await expect(firstGroup.getByRole('button')).toHaveCount(4);
  for (const button of await firstGroup.getByRole('button').all())
    await expect(button).toBeInViewport();
  const session = await context.newCDPSession(page);
  const bounds = (await track.boundingBox())!;
  const x = bounds.x + bounds.width - 30,
    y = bounds.y + 60;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 10; step++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - ((bounds.width - 60) * step) / 10, y }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(bounds.width / 2);
  await expect(collections.locator('.collection-pager span')).toHaveText(/^2 \//);
  await collections.getByRole('button', { name: 'Previous collections' }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThan(1);
  const results = page.getByRole('region', { name: 'Library results' });
  const count = await results.getByRole('link').count();
  expect(count).toBeGreaterThan(20);
  await expect(page.getByRole('button', { name: /Next page|Show more patterns/ })).toHaveCount(0);
  const last = results.getByRole('link').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await expect(results.getByRole('link')).toHaveCount(count);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('mobile-library-collections.png') });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('navigation', { name: 'Library scope' })).toBeInViewport();
  }
});

test('filters a collection, opens a contextual article and saves patterns from the mobile list', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library');
  await page.getByRole('button', { name: 'Filter library' }).waitFor();
  const collections = page.getByRole('region', { name: 'Collections', exact: true });
  await collections.getByRole('button', { name: 'Decision-Making Patterns 8 patterns' }).click();
  const results = page.getByRole('region', { name: 'Library results' });
  await expect(results.getByRole('link')).toHaveCount(8);
  const first = results.getByRole('link').first();
  await expect(first).toHaveAttribute('href', /collection=commons%3Adecision-making-patterns/);
  await page.getByRole('searchbox').fill('premortem');
  await expect.poll(() => results.getByRole('link').count()).toBeLessThan(8);
  await results.locator('a[href^="/pattern/run-a-premortem?"]').click();
  await expect(page).toHaveURL(/run-a-premortem\?collection=commons%3Adecision-making-patterns/);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Filter library' }).waitFor();
  await page.getByRole('searchbox').fill('Observer');
  const observerRow = results
    .getByRole('listitem')
    .filter({ has: page.locator('a[href="/pattern/observer"]') });
  const bookmark = observerRow.getByRole('button', { name: 'Add to my library', exact: true });
  await expect(bookmark).toBeEnabled();
  await bookmark.click();
  await page
    .getByRole('navigation', { name: 'Library scope' })
    .getByRole('button', { name: 'My library', exact: true })
    .click();
  await expect(results.getByRole('link')).toHaveCount(1);
  await expect(results.getByRole('button', { name: 'In my library', exact: true })).toBeEnabled();
  await page.reload();
  await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
  await results.getByRole('button', { name: 'In my library', exact: true }).click();
  await results.getByRole('button', { name: 'Remove from my library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
});

test('retains desktop pages and layout controls', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.goto('/library');
  await expect(page.getByRole('button', { name: /^Your rating:/ })).toBeEnabled();
  await expect(page.getByRole('group', { name: 'Library view' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Collections', exact: true })).toHaveCount(0);
  const results = page.getByRole('region', { name: 'Library results' });
  await expect(results.getByRole('link')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(results.locator('.pagination-footer')).toContainText('page 2');
  await expect(results.getByRole('button', { name: 'Add to my library' })).toHaveCount(0);
});
