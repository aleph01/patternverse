import { libraryVerseControl, searchLibrary, selectLibraryScope } from './helpers/library';
import { expect, test } from '@playwright/test';

test('empty My library keeps the introduction, Verse navigation and scope switch stable', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.goto('/library');

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await selectLibraryScope(page, 'explore');
    const scope = page.getByRole('navigation', { name: 'Library scope', exact: true });
    await expect(scope).toHaveCSS('border-radius', '999px');
    await expect(scope.getByRole('button').first()).toHaveText('Commons');
    const verse = libraryVerseControl(page, 'Software Engineering');
    await verse.click();
    const before = await verse.boundingBox();
    const beforeScrollY = await page.evaluate(() => scrollY);
    const heading = page.getByRole('heading', { level: 1, includeHidden: true });
    const intro = await heading.textContent();
    const tileCount = await page
      .locator('.verse-sidebar:visible button, .mobile-verse-mosaic button.verse-square')
      .count();

    await selectLibraryScope(page, 'saved');
    await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
    await expect(verse).toBeVisible();
    await expect(verse).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL('/library?verse=commons%3Asoftware-engineering');
    expect(await heading.textContent()).toBe(intro);
    const after = (await verse.boundingBox())!;
    expect(after.x).toBeCloseTo(before!.x, 0);
    expect(after.y + (await page.evaluate(() => scrollY))).toBeCloseTo(
      before!.y + beforeScrollY,
      0,
    );
    await expect(
      page.locator('.verse-sidebar:visible button, .mobile-verse-mosaic button.verse-square'),
    ).toHaveCount(tileCount);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`empty-library-${width}.png`) });

    await page.getByRole('button', { name: 'Browse Commons', exact: true }).click();
    await expect(scope.getByRole('button', { name: 'Commons', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(verse).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Library results', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`commons-library-${width}.png`) });
  }
});

test('desktop Verse tiles filter the catalog and preserve the selection on reload', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/library');
  await expect(page.getByRole('button', { name: /^My library/ })).toBeEnabled();

  const sidebar = page.getByRole('complementary', { name: 'Browse verses' });
  const tiles = sidebar.getByRole('button');
  const all = sidebar.getByRole('button', { name: 'All verses', exact: true });
  const software = sidebar.getByRole('button', { name: 'Software Engineering', exact: true });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(sidebar.locator('[aria-pressed="true"]')).toHaveCount(1);

  const first = (await tiles.nth(0).boundingBox())!;
  const second = (await tiles.nth(1).boundingBox())!;
  const third = (await tiles.nth(2).boundingBox())!;
  expect(first.width).toBeCloseTo(first.height, 0);
  expect(second.y).toBeCloseTo(first.y, 0);
  expect(second.x).toBeGreaterThan(first.x);
  expect(third.x).toBeCloseTo(first.x, 0);
  expect(third.y).toBeGreaterThan(first.y);

  await software.click();
  await expect(page).toHaveURL('/library?verse=commons%3Asoftware-engineering');
  await expect(software).toHaveAttribute('aria-pressed', 'true');
  await expect(software).toHaveCSS('background-color', 'rgb(145, 180, 237)');
  await expect(software).toHaveCSS('color', 'rgb(24, 24, 20)');
  await expect(sidebar.locator('[aria-pressed="true"]')).toHaveCount(1);
  await searchLibrary(page, 'Observer');
  await expect(
    page.getByRole('region', { name: 'Library results', exact: true }).getByRole('link', {
      name: /Observer/,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(software).toHaveAttribute('aria-pressed', 'true');
  await all.click();
  await expect(page).toHaveURL('/library');
  await expect(all).toHaveAttribute('aria-pressed', 'true');
});

test('keeps the phone and tablet mosaic at the existing desktop cutoff', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.goto('/library?verse=commons%3Alearning');
  const sidebar = page.getByRole('complementary', { name: 'Browse verses' });
  const mosaic = page.locator('.mobile-verse-mosaic');

  for (const width of [320, 390, 768, 800]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(sidebar).toBeHidden();
    await expect(mosaic).toBeVisible();
    await expect(mosaic.getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(mosaic.locator('.verse-track')).toHaveCSS('grid-template-rows', '126px 126px');
    await expect(mosaic.locator('.verse-square').first()).toHaveCSS('width', '126px');
    await expect(page.getByRole('navigation', { name: 'Library scope' })).toHaveCSS(
      'position',
      'relative',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }

  for (const width of [801, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(sidebar).toBeVisible();
    await expect(mosaic).toHaveCount(0);
    await expect(sidebar.getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const clipped = await sidebar
      .getByRole('button')
      .evaluateAll((buttons) => buttons.some((button) => button.scrollWidth > button.clientWidth));
    expect(clipped).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
