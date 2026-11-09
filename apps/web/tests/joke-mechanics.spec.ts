import { expect, test } from '@playwright/test';

test('reads Joke Mechanics in Arts & Design with quotations and inline video on desktop and phone', async ({
  page,
}, info) => {
  // Check the real player mounting and lifecycle without depending on provider availability.
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.YT={Player:class{constructor(frame,options){setTimeout(()=>{frame.dataset.sdkReady='true';options.events.onReady();},0)}getDuration(){return 10000}getCurrentTime(){return 97}playVideo(){}pauseVideo(){}seekTo(){}mute(){}destroy(){}}};`,
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body>Recording frame</body></html>',
    }),
  );
  await page.goto('/verse/standup-comedy');
  await expect(page.getByRole('heading', { name: 'Joke Mechanics', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Arts & Design');
  await page.goto('/collection/joke-mechanics');
  await expect(page.getByRole('heading', { name: 'Joke Structures', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Patterns and structures in stand-up comedy.');
  await expect(page.locator('main')).toContainText('128 examples');
  await page.goto('/pattern/joke-reversal');
  const frame = page.locator('.pattern-video iframe').first();
  await expect(frame).toHaveAttribute('data-sdk-ready', 'true');
  await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/ax0MGlIVjiY.*start=97/);
  await expect(page.locator('.markdown-body blockquote').first()).toContainText(
    'I still do, but I used to, too.',
  );
  await page.goto('/pattern/joke-same-word-changed-meaning');
  await expect(page.locator('.pattern-video')).toHaveCount(1);
  await expect(page.locator('.pattern-video iframe')).toHaveAttribute('src', /SK3H4MzPJ_Q/);
  await page.locator('.markdown-body a[href="/pattern/joke-mirrored-phrase"]').click();
  await expect(page.getByRole('heading', { name: 'Mirrored Phrase', exact: true })).toBeVisible();
  await expect(page.locator('.pattern-video iframe')).toHaveCount(0);
  await expect(page.locator('.markdown-body blockquote').last()).toContainText(
    'unwanted walls from fingerprints',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('joke-mechanics-article.png'), fullPage: true });
  await page.goto('/library');
  const picker = page.locator('.mobile-verse-mosaic');
  await picker
    .getByRole('navigation', { name: 'Verse Areas' })
    .getByRole('button', { name: 'Arts & Design', exact: true })
    .click();
  await expect(picker.getByRole('button', { name: 'Joke Mechanics', exact: true })).toBeVisible();
});
