import { expect, test } from '@playwright/test';
import { selectLibraryCategory } from './helpers/library';

test('opens collection pages at the top without an upward scroll animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => localStorage.setItem('patternverse:library-layout', 'cards'));
  await page.goto('/library?verse=commons:software-engineering');
  await selectLibraryCategory(page, 'Collections');
  const card = page.locator('.card-grid a.feed-row[href="/collection/gof-design-patterns"]');
  await card.scrollIntoViewIfNeeded();
  const libraryScroll = await page.evaluate(() => scrollY);
  expect(libraryScroll).toBeGreaterThan(100);

  // Sample the first painted frames after the router resets the collection's scroll.
  await page.evaluate(() => {
    const reset = window.scrollTo.bind(window);
    const samples: number[] = [];
    Object.assign(window, { collectionScrollSamples: samples });
    window.scrollTo = (...args: [options?: ScrollToOptions] | [x: number, y: number]) => {
      if (typeof args[0] === 'number') reset(args[0], args[1]!);
      else reset(args[0]);
      if (!location.pathname.startsWith('/collection/')) return;
      function sample() {
        samples.push(scrollY);
        if (samples.length < 8) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    };
  });
  await card.click();
  await expect(page).toHaveURL(/\/collection\/gof-design-patterns$/);
  const samples = () =>
    page.evaluate(
      () => (window as Window & { collectionScrollSamples: number[] }).collectionScrollSamples,
    );
  await expect.poll(async () => (await samples()).length).toBeGreaterThanOrEqual(8);
  expect((await samples()).every((position) => position <= 1)).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/\/library\?verse=commons:software-engineering$/);
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => scrollY)) - libraryScroll))
    .toBeLessThan(3);
});
