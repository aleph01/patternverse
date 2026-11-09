import {
  expectLibraryScope,
  librarySearchInput,
  openLibrarySearch,
  searchLibrary,
  selectLibraryScope,
} from './helpers/library';
import { expect, test } from '@playwright/test';

test('expands mobile search to a growing multiline field and keeps the toolbar compact', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library');
  const scope = page.locator('.mobile-search').getByRole('navigation', { name: 'Library scope' });
  const toggle = page.getByRole('button', { name: 'Open search', exact: true });
  const search = librarySearchInput(page);
  const filter = page.getByRole('button', { name: 'Filter library' });
  await expectLibraryScope(page, 'explore');
  await expect(search).not.toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const controls = await Promise.all([
      scope.boundingBox(),
      toggle.boundingBox(),
      filter.boundingBox(),
    ]);
    expect(controls.every((box) => box && box.width > 0 && box.height >= 44)).toBe(true);
    expect(controls[0]!.x + controls[0]!.width).toBeLessThanOrEqual(controls[1]!.x);
    expect(controls[1]!.x + controls[1]!.width).toBeLessThanOrEqual(controls[2]!.x);
    await page.screenshot({ path: info.outputPath(`mobile-library-collapsed-${width}.png`) });
    await openLibrarySearch(page);
    await expect(search).toBeFocused();
    const initial = (await search.boundingBox())!;
    await search.fill('Observer');
    await search.press('Enter');
    await expect(search).toHaveValue('Observer\n');
    await expect(page.getByRole('button', { name: 'Close search' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await search.fill('Observer\nObserver\nObserver\nObserver\nObserver\nObserver');
    await expect
      .poll(async () => (await search.boundingBox())!.height)
      .toBeGreaterThan(initial.height);
    const expanded = (await search.boundingBox())!;
    expect(expanded.x).toBeCloseTo(controls[0]!.x);
    expect(expanded.x + expanded.width).toBeCloseTo(controls[2]!.x + controls[2]!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await search.fill('Observer');
    await page.screenshot({ path: info.outputPath(`mobile-library-expanded-${width}.png`) });
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(search).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit search: Observer' })).toBeVisible();
    await expect(toggle).toBeFocused();
    await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  }
  await openLibrarySearch(page);
  await search.fill('Observer');
  await search.press('Escape');
  await expect(toggle).toBeFocused();
  await openLibrarySearch(page);
  await expect(search).toHaveValue('Observer');
  await search.press('Control+Enter');
  await expect(page.getByRole('button', { name: 'Edit search: Observer' })).toBeVisible();
  await selectLibraryScope(page, 'saved');
  await expect(search).toHaveValue('Observer');
  await openLibrarySearch(page);
  await expect(search).toHaveAccessibleName('Search my library');
  await filter.click();
  await expect(search).not.toBeVisible();
  await expect(filter).toHaveAttribute('aria-expanded', 'true');
  await filter.click();
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  await selectLibraryScope(page, 'explore');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(scope).not.toBeInViewport();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(scope).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /^My library/ })).toBeEnabled();
});

test('swipes the Verse color wall and changes Verse from deep in a collection', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Filter library' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Explore the Commons|Find your next/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Library view' })).toHaveCount(0);
  const scope = page.locator('.mobile-search').getByRole('navigation', { name: 'Library scope' });
  await expectLibraryScope(page, 'explore');
  const mosaic = page.getByRole('region', { name: 'Choose a Verse', exact: true });
  const track = mosaic.locator('.verse-track').first();
  const session = await context.newCDPSession(page);
  const bounds = (await track.boundingBox())!;
  const x = bounds.x + bounds.width - 35,
    y = bounds.y + 60;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 10; step++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - ((bounds.width - 70) * step) / 10, y }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(80);
  await mosaic.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(mosaic.locator('.verse-square[aria-pressed="true"]')).toHaveCount(1);
  await expect(mosaic.getByRole('button', { name: 'Learning', exact: true })).toHaveCSS(
    'background-color',
    'rgb(231, 205, 100)',
  );
  const collection = page.getByRole('button', {
    name: 'Learning How to Learn 15 patterns',
    exact: true,
  });
  if ((await collection.getAttribute('aria-expanded')) !== 'true') await collection.click();
  await expect(collection).toHaveAttribute('aria-expanded', 'true');
  const patterns = page.getByRole('region', {
    name: 'Learning How to Learn patterns',
    exact: true,
  });
  await expect(patterns.getByRole('link')).toHaveCount(15);
  await expect(patterns.locator('.feed-summary').first()).toHaveText(/\S.+/);
  await page.screenshot({ path: info.outputPath('mobile-library-color-wall.png') });
  await patterns.getByRole('link').last().scrollIntoViewIfNeeded();
  const change = page.getByRole('button', { name: 'Change Verse', exact: true });
  await expect(change).toBeInViewport();
  await expect(scope).not.toBeInViewport();
  await page.screenshot({ path: info.outputPath('mobile-library-sticky-verse.png') });
  const scroll = await page.evaluate(() => scrollY);
  await change.click();
  const picker = page.getByRole('dialog', { name: 'Choose a Verse', exact: true });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: 'Learning', exact: true })).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.screenshot({ path: info.outputPath('mobile-library-verse-picker.png') });
  await page.keyboard.press('Escape');
  await expect(picker).not.toBeVisible();
  await expect(change).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  await change.click();
  await picker.getByRole('button', { name: 'Decision Making', exact: true }).click();
  await expect(picker).not.toBeVisible();
  await expect(change).toContainText('Decision Making');
  await expect(
    page.getByRole('button', { name: 'Decision-Making Patterns 8 patterns', exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole('region', { name: 'Decision-Making Patterns patterns' }).getByRole('link'),
  ).toHaveCount(8);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await change.click();
    await expect(picker).toBeInViewport();
    const inside = await picker.locator('.picker-grid button').evaluateAll((buttons) =>
      buttons.every((button) => {
        const r = button.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      }),
    );
    expect(inside).toBe(true);
    await page.getByRole('button', { name: 'Close Verse picker', exact: true }).click();
  }
  await change.click();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(picker).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.getByRole('group', { name: 'Library view' })).toBeVisible();
});

test('searches, opens contextual articles, and keeps saved patterns grouped in My library', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chromium');
  await page.goto('/library');
  await page.getByRole('button', { name: 'Filter library' }).waitFor();
  await searchLibrary(page, 'premortem');
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  const premortem = results.locator('a[href^="/pattern/run-a-premortem?"]');
  await expect(premortem).toBeVisible();
  await premortem.click();
  await expect(page).toHaveURL(/run-a-premortem\?collection=/);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Filter library' }).waitFor();
  await searchLibrary(page, 'Observer');
  const row = results
    .getByRole('listitem')
    .filter({ has: page.locator('a[href^="/pattern/observer"]') });
  const bookmark = row.getByRole('button', { name: 'Add to my library', exact: true });
  await expect(bookmark).toBeEnabled();
  await bookmark.click();
  await selectLibraryScope(page, 'saved');
  await expect(results.getByRole('link')).toHaveCount(1);
  await expect(results.getByRole('button', { name: 'In my library', exact: true })).toBeEnabled();
  await page.reload();
  await expectLibraryScope(page, 'explore');
  await selectLibraryScope(page, 'saved');
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
  await expect(page.locator('.mobile-verse-mosaic')).toHaveCount(0);
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(results.getByRole('link')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(results.locator('.pagination-footer')).toContainText('page 2');
  await expect(results.getByRole('button', { name: 'Add to my library' })).toHaveCount(0);
});
