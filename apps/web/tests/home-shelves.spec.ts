import { expect, test } from '@playwright/test';

test('Area dividers group Verse tiles and filter the home page', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Verses', exact: true });
  const areas = section.locator('.home-verse-area');
  expect(await section.locator('article').count()).toBeGreaterThanOrEqual(17);
  await expect(areas).toHaveCount(5);
  for (const area of await areas.all()) {
    await expect(area.locator('.verse-area-divider')).toBeVisible();
    expect(await area.getByRole('link').count()).toBeGreaterThan(0);
  }
  const arts = section.getByRole('region', { name: 'Arts & Design', exact: true });
  await expect(arts.getByRole('link', { name: 'Architecture', exact: true })).toBeVisible();
  const filters = section.getByRole('navigation', { name: 'Verse Areas' });
  await expect(filters.getByRole('button', { name: 'Everyday Life' })).toHaveCount(0);
  await filters.getByRole('button', { name: 'Arts & Design' }).click();
  await expect(areas).toHaveCount(1);
  await expect(section.getByRole('link', { name: 'Learning', exact: true })).toHaveCount(0);
  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await expect(areas).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({ path: info.outputPath('verse-areas.png') });
  const learning = section.getByRole('link', { name: 'Learning', exact: true });
  await learning.focus();
  await learning.press('Enter');
  await expect(page).toHaveURL('/library?verse=commons%3Alearning');
});

test('hover and keyboard focus expand Verse tiles while the Area dividers stay fixed', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Verses', exact: true });
  for (const card of await section.locator('article').all()) {
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const original = (await card.boundingBox())!;
    const positions = await section
      .locator('.verse-area-divider')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top + scrollY));
    await expect(card.locator('.verse-details')).toBeHidden();
    await card.getByRole('link').hover();
    await expect(card.locator('.verse-details')).toBeVisible();
    await expect
      .poll(async () => (await card.boundingBox())!.width)
      .toBeGreaterThan(original.width * 1.15);
    expect((await card.boundingBox())!.height).toBeCloseTo(original.height, 0);
    const expandedPositions = await section
      .locator('.verse-area-divider')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top + scrollY));
    expect(expandedPositions).toEqual(positions);
    expect(
      await card.evaluate((node) => {
        const link = node.querySelector('a')!;
        return link.scrollHeight <= link.clientHeight && link.scrollWidth <= link.clientWidth;
      }),
    ).toBe(true);
  }
  await page.mouse.move(0, 0);
  const learning = section.getByRole('link', { name: 'Learning', exact: true });
  await learning.focus();
  const learningCard = section.locator('article').filter({
    has: page.getByRole('heading', { name: 'Learning', exact: true }),
  });
  await expect(learningCard.locator('.verse-details')).toBeVisible();
  await section.screenshot({ path: info.outputPath('verse-areas-focus.png') });
  await learning.press('Tab');
  await expect(learningCard.locator('.verse-details')).toBeHidden();
});

test('phones and tablets keep each Area scrollable with visible Verse details', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Verses', exact: true });
  const widths =
    info.project.name === 'chromium' ? [320, 390, 600, 801, 1024] : [320, 390, 801, 1280];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const track of await section.locator('.home-verse-grid').all()) {
      await expect(track).toHaveCSS('scroll-snap-type', 'x mandatory');
      const cards = track.locator('article');
      const boxes = await cards.evaluateAll((nodes) =>
        nodes.map((node) => {
          const b = node.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width };
        }),
      );
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].y).toBeCloseTo(boxes[0].y, 0);
        expect(boxes[i].x).toBeCloseTo(boxes[i - 1].x + boxes[i - 1].width, 0);
      }
      for (const card of await cards.all()) {
        await expect(card.locator('.verse-details')).toBeVisible();
        expect(
          await card.evaluate(
            (node) =>
              node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight,
          ),
        ).toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const last = section.getByRole('link').last();
  await last.focus();
  await expect(last).toBeInViewport();
  const destination = await last.getAttribute('href');
  await last.press('Enter');
  await expect(page).toHaveURL(destination!);
});

test('Meet mira introduces the single featured app and preserves entry points', async ({
  page,
}, info) => {
  await page.goto('/apps');
  await expect(page).toHaveURL('/#home-apps');
  const section = page.getByRole('region', { name: 'Meet mira', exact: true });
  await expect(section.locator('article')).toHaveCount(1);
  await expect(section.getByRole('link', { name: /Open mira/ })).toHaveAttribute(
    'href',
    '/apps/mira',
  );
  await expect(section.getByRole('heading', { name: 'Meet mira', exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: /Tender Wilds/ })).toHaveCount(0);
  await expect(section.getByRole('button')).toHaveCount(0);
  await section.screenshot({ path: info.outputPath('meet-mira.png') });
  await section.getByRole('link', { name: /Open mira/ }).click();
  await expect(page).toHaveURL('/apps/mira');
  await page.locator('.landing-top').getByRole('link', { name: 'Meet mira', exact: true }).click();
  await expect(page).toHaveURL('/#home-apps');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link')).toHaveText(['library', 'workspace']);
  await expect(navigation.getByRole('link', { name: 'mira', exact: true })).toHaveCount(0);
  await expect(section.getByRole('heading', { name: 'Meet mira', exact: true })).toBeInViewport();
});
