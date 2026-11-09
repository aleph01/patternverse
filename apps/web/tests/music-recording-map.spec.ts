import { expect, test, type Page } from '@playwright/test';

// Controlled provider fixture: tests the real UI/transport bridge, not live YouTube availability.
const sdk = `window.YT = { Player: class {
  constructor(frame, options) {
    this.frame = frame; this.events = options.events; this.time = 0;
    window.__recordingTest = this;
    setTimeout(() => this.events.onReady(), 0);
  }
  playVideo() { this.events.onStateChange({ data: 1 }); }
  pauseVideo() { this.events.onStateChange({ data: 2 }); }
  seekTo(time) { this.time = time; }
  getCurrentTime() { return this.time; }
  getDuration() { return 302; }
  mute() {}
  destroy() { this.frame.remove(); }
  report(time, state) { this.time = time; this.events.onStateChange({ data: state }); }
}};`;
const playerFor = (page: Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });
const report = (page: Page, time: number, state = 1) =>
  page.evaluate(
    ({ time, state }) => {
      (
        window as unknown as { __recordingTest: { report(time: number, state: number): void } }
      ).__recordingTest.report(time, state);
    },
    { time, state },
  );

test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: sdk }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Controlled YouTube playback fixture</p>' }),
  );
  await page.goto('/?study=nirvana-smells-like-teen-spirit-study');
  await expect(playerFor(page).getByLabel('Musical example', { exact: true })).toHaveValue(
    'nirvana-smells-like-teen-spirit-study',
  );
});

test('follows recording time through sections, native controls, loops and MIDI source changes', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const player = playerFor(page);
  await player.locator('.form-section').nth(3).click();
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await expect(player.locator('.official-recording')).toBeVisible();
  await expect(player.locator('iframe')).toHaveCount(0);
  await expect(player.locator('.alignment-note')).toContainText('approximate');
  const video = (await player.locator('.official-recording').boundingBox())!;
  const outline = (await player.locator('.section-scroll').boundingBox())!;
  const detail = (await player.locator('.section-detail').boundingBox())!;
  expect(video.y).toBeGreaterThan(outline.y + outline.height);
  expect(video.y + video.height).toBeLessThan(detail.y);
  await player.screenshot({
    path: test.info().outputPath(`recording-map-${info.project.name}.png`),
  });
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('iframe')).toHaveAttribute('src', /7TDeBi34OtE/);
  await expect(player.locator('.position')).toContainText('1:06 · Bar 33');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await report(page, 140);
  await expect(player.locator('.form-section[aria-current="step"]')).toContainText('Chorus 2');
  await expect(player.locator('.position')).toContainText('2:20 · Bar 69');
  await report(page, 140, 3);
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
  await report(page, 140, 1);
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.locator('.form-section').nth(5).click();
  await expect(player.locator('.position')).toContainText('1:39 · Bar 49');
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await report(page, 99);
  await report(page, 124.1);
  await expect(player.locator('.position')).toContainText('1:39 · Bar 49');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __recordingTest: { time: number } }).__recordingTest.time,
      ),
    )
    .toBe(99);
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await expect(player.locator('iframe')).toHaveCount(0);
  await expect(player.locator('.position')).toContainText('Bar 49');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await expect(player.locator('iframe')).toBeVisible();
  await expect(player.locator('.position')).toContainText('1:39 · Bar 49');
  await expect(player.getByRole('button', { name: 'Loop section', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
  await player.getByText('Instrument layers', { exact: true }).click();
  await expect(player.locator('.mute-button').first()).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('retains the passage and offers MIDI playback after a recording embed error', async ({
  page,
}) => {
  const player = playerFor(page);
  await player.locator('.form-section').nth(3).click();
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await page.evaluate(() =>
    (
      window as unknown as {
        __recordingTest: { events: { onError(value: { data: number }): void } };
      }
    ).__recordingTest.events.onError({ data: 150 }),
  );
  await expect(player.locator('.error')).toContainText('MIDI study');
  await expect(player.locator('iframe')).toHaveCount(0);
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.position')).toContainText('Bar 33');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
});
