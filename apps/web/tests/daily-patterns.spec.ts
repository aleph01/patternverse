import { expect, test } from '@playwright/test';

const selectedIds = (page: import('@playwright/test').Page) =>
  page
    .locator('.daily-patterns article')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-pattern-id')));

test('daily editorial trio is stable, uses native icons, and adapts to mobile', async ({
  page,
  isMobile,
}) => {
  // Deliberately different from the prerender/build date: the static site must update itself.
  await page.clock.install({ time: new Date('2026-12-04T12:00:00Z') });
  await page.goto('/');
  const section = page.locator('.daily-patterns');
  await expect(section).toHaveAttribute('data-day', '2026-12-04');
  await expect(section.locator('time')).toHaveText('4 December');
  await expect(section.locator('article')).toHaveCount(3);
  await expect(section.locator('article.lead')).toHaveCount(1);
  await expect(section).toContainText('Three ideas to explore. A fresh selection every day.');
  const ids = await selectedIds(page);
  expect(new Set(ids).size).toBe(3);
  const links = await section
    .locator('.pattern-link')
    .evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  expect(links.every((href) => href?.startsWith('/pattern/'))).toBe(true);
  for (const mark of await section.locator('.pattern-mark').all()) {
    if (isMobile) await expect(mark).toBeHidden();
    else await expect(mark).toBeVisible();
  }
  const boxes = await section.locator('article').evaluateAll((cards) =>
    cards.map((card) => {
      const { x, y, width } = card.getBoundingClientRect();
      return { x, y, width };
    }),
  );
  if (isMobile) {
    expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
    expect(boxes[1]!.x).toBeCloseTo(boxes[0]!.x);
  } else {
    expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);
    expect(boxes[2]!.x).toBeCloseTo(boxes[1]!.x);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const nativePaths = await section
    .locator('article')
    .first()
    .locator('svg path')
    .evaluateAll((paths) =>
      paths.map((path) => ({ d: path.getAttribute('d'), fill: path.getAttribute('fill') })),
    );
  const title = await section.locator('h3').first().innerText();
  await page.reload();
  await expect(section).toHaveAttribute('data-day', '2026-12-04');
  expect(await selectedIds(page)).toEqual(ids);

  // Each entry opens its real article; the matching library card has the exact same icon.
  for (const href of links) {
    await page.goto(href!);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto('/library');
  await page.getByRole('searchbox', { name: /Search (the catalog|my library)/ }).fill(title);
  const libraryCard = page
    .locator('.pattern-feed .feed-row')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(libraryCard).toHaveCount(1);
  expect(
    await libraryCard
      .locator('svg path')
      .evaluateAll((paths) =>
        paths.map((path) => ({ d: path.getAttribute('d'), fill: path.getAttribute('fill') })),
      ),
  ).toEqual(nativePaths);
});

test('an open page rolls over after midnight and updates when returning to the tab', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-04T21:59:50Z') });
  await page.goto('/');
  const section = page.locator('.daily-patterns');
  await expect(section).toHaveAttribute('data-day', '2026-10-04');
  const yesterday = await selectedIds(page);
  await page.clock.fastForward(40_000);
  await expect(section).toHaveAttribute('data-day', '2026-10-05');
  const today = await selectedIds(page);
  expect(today).not.toEqual(yesterday);
  expect(today.some((id) => yesterday.includes(id))).toBe(false);
  await expect(section.locator('time')).toHaveText('5 October');

  // A suspended/background tab may skip its timer, but returning still refreshes the date.
  await page.clock.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(section).toHaveAttribute('data-day', '2026-10-06');
  expect(await selectedIds(page)).not.toEqual(today);
});
