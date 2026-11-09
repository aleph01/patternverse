import { expect, test } from '@playwright/test';
import { searchLibrary, selectLibraryCategory } from './helpers/library';

test('desktop cards use green Verse tags and keep the original pictograph below the copy', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop card layout');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/library');
  await selectLibraryCategory(page, 'Patterns');
  await searchLibrary(page, 'Observer');
  const card = page.locator('.card-grid .feed-row[href="/pattern/observer"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.feed-verse')).toHaveText(['Software Engineering']);
  await expect(card.locator('.feed-verse')).toHaveCSS('background-color', 'rgb(223, 248, 234)');
  await expect(card.locator('.feed-verse')).toHaveCSS('color', 'rgb(0, 122, 77)');
  await expect(card.locator('.feed-meta')).toBeHidden();
  await expect(card).toHaveCSS('border-top-width', '1px');
  const mark = card.locator('.feed-mark');
  await expect(mark).toBeVisible();
  const geometry = await mark
    .locator('path')
    .evaluateAll((paths) =>
      paths.map((path) => ({ d: path.getAttribute('d'), fill: path.getAttribute('fill') })),
    );
  const copyBox = await card.locator('.feed-copy').boundingBox();
  const markBox = await mark.boundingBox();
  const cardBox = await card.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(markBox!.y).toBeGreaterThanOrEqual(copyBox!.y + copyBox!.height);
  expect(markBox!.width).toBe(60);
  expect(cardBox!.x + cardBox!.width - markBox!.x - markBox!.width).toBeCloseTo(21, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page
    .getByRole('group', { name: 'Library view' })
    .getByRole('button', { name: 'List' })
    .click();
  await expect(card).toHaveCount(0);
  const row = page.locator('.pattern-feed .feed-row[href="/pattern/observer"]');
  await expect(row.locator('.feed-meta')).toBeVisible();
  await expect(row.locator('.feed-card-meta')).toBeHidden();
  await expect(row.locator('.feed-mark')).toHaveCSS('width', '64px');
  expect(
    await row
      .locator('.feed-mark path')
      .evaluateAll((paths) =>
        paths.map((path) => ({ d: path.getAttribute('d'), fill: path.getAttribute('fill') })),
      ),
  ).toEqual(geometry);
  await row.click();
  await expect(page).toHaveURL(/\/pattern\/observer$/);
  await expect(page.locator('.entity-pattern-icon .pattern-icon')).toBeVisible();
  expect(
    await page
      .locator('.entity-pattern-icon path')
      .evaluateAll((paths) =>
        paths.map((path) => ({ d: path.getAttribute('d'), fill: path.getAttribute('fill') })),
      ),
  ).toEqual(geometry);
});

test('collection cards keep their stack and count and open the collection page', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop collection layout');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/library?verse=commons:software-engineering');
  await selectLibraryCategory(page, 'Collections');
  const collection = page
    .locator('.card-grid .collection-card')
    .filter({ has: page.getByRole('heading', { name: 'GoF Design Patterns', exact: true }) });
  await expect(collection.locator('.feed-verse')).toHaveText(['Software Engineering']);
  await expect(collection).not.toHaveCSS('box-shadow', 'none');
  await expect(collection.locator('.feed-mark')).toHaveCount(0);
  const count = collection.getByRole('link', { name: 'Open GoF Design Patterns collection' });
  await expect(count).toBeVisible();
  await expect(count).toHaveText('23 patterns');
  await count.click();
  await expect(page).toHaveURL(/\/collection\/gof-design-patterns$/);
  const contents = page.getByRole('region', { name: 'Collection entries', exact: true });
  await expect(contents).toBeVisible();
  await expect(contents.getByRole('link', { name: /Factory Method/ })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(count).toBeVisible();
  await page.screenshot({
    path: '/private/tmp/patternverse-desktop-collection-cards.png',
    fullPage: true,
  });
});

test('collection contents use desktop cards and retain the original mobile presentation', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.goto('/collection/gof-design-patterns');
  const view = page.getByRole('group', { name: 'Collection view' });
  await view.getByRole('button', { name: 'Cards' }).click();
  const card = page.locator('.card-grid .feed-row').first();
  if (mobile) {
    await expect(card.locator('.feed-meta')).toBeVisible();
    await expect(card.locator('.feed-card-meta')).toBeHidden();
    await expect(card.locator('.feed-mark')).toBeHidden();
    await expect(card).toHaveCSS('min-height', '0px');
  } else {
    await expect(card.locator('.feed-verse')).toHaveText(['Software Engineering']);
    await expect(card.locator('.feed-meta')).toBeHidden();
    await expect(card.locator('.feed-mark')).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/Users/jeger-benninger/.codex/visualizations/2026/10/21/01a15e64-551b-7000-b5ed-20d14b06483c/desktop-cards-implemented.png',
    });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
