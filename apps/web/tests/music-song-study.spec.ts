import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('starts with named structure, expands on click, minimizes with a chevron and keeps modules optional', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const player = playerFor(page);
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await expect(player.locator('.note-grid')).toHaveCount(0);
  await expect(player.locator('.form-section')).toHaveCount(8);
  const widths = await player
    .locator('.form-section')
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
  expect(widths[1] / widths[0]).toBeCloseTo(3, 1);
  await player
    .getByRole('button', { name: 'Explore Chorus 1, bars 17–24', exact: true })
    .press('Enter');
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['I', 'V', 'vi', 'IV']);
  await expect(player.locator('.position')).toHaveText('Bar 17 · beat 1.0');
  await expect(player.locator('.beat-grid.compact .grid-row')).toHaveCount(4);
  await player.screenshot({
    path: test.info().outputPath(`song-study-light-${info.project.name}.png`),
  });
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await expect(player.locator('.note-grid')).toBeVisible();
  await player.getByRole('button', { name: 'Drums', exact: true }).click();
  await expect(player.locator('.beat-grid')).toHaveCount(0);
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.window-navigation')).toContainText('Bars 21–24');
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await expect(player.locator('.position')).toHaveText('Bar 21 · beat 1.0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('keeps sampled MIDI playing when minimized, changes sections while looping and derives the inverted bass', async ({
  page,
}) => {
  const player = playerFor(page);
  await player.getByRole('button', { name: 'Explore Chorus 1, bars 17–24', exact: true }).click();
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.locator('.ribbon-chord').last().click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toContainText('Bar 17', { timeout: 6000 });
  await player
    .getByRole('button', { name: 'Explore Final chorus, bars 53–60', exact: true })
    .click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.position')).toContainText('Bar 53');
  await expect(player.locator('.ribbon-chord').nth(1)).toContainText('G/B');
  await expect(player.locator('.ribbon-chord').nth(1).locator('.roman')).toHaveText('V');
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.getByRole('button', { name: 'Loop song', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('plays the recording below its structure, follows the media clock, and switches sources without two players sounding', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.Audio;
    const media: HTMLAudioElement[] = [];
    Object.assign(window, {
      studyRecordings: media,
      Audio: function (src: string) {
        const audio = new Original(src);
        media.push(audio);
        return audio;
      },
    });
  });
  await page.reload();
  const player = playerFor(page);
  await player.getByRole('button', { name: 'Explore Chorus 1, bars 17–24', exact: true }).click();
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  const recordingTime = await page.evaluate(
    () =>
      (window as unknown as { studyRecordings: HTMLAudioElement[] }).studyRecordings.at(-1)!
        .currentTime,
  );
  expect(recordingTime).toBeGreaterThanOrEqual(40);
  expect(recordingTime).toBeLessThan(43);
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  expect(
    await page.evaluate(() =>
      (window as unknown as { studyRecordings: HTMLAudioElement[] }).studyRecordings.every(
        (m) => m.paused,
      ),
    ),
  ).toBe(true);
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.error')).toHaveCount(0);
});

test('supports a recording-only study without inventing chords or percussion annotations', async ({
  page,
}) => {
  const player = playerFor(page);
  await player
    .getByLabel('Musical example', { exact: true })
    .selectOption('song-structure-recording');
  await expect(player.getByRole('button', { name: 'Recording', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(player.getByRole('button', { name: 'MIDI study', exact: true })).toHaveCount(0);
  await player.getByRole('button', { name: 'Explore Verse 1, bars 5–16', exact: true }).click();
  await expect(player.locator('.ribbon-chord')).toHaveCount(0);
  await expect(player.locator('.beat-grid')).toHaveCount(0);
  await expect(player.locator('.no-harmony')).toContainText(
    'Chord and drum annotations can be added',
  );
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('recovers from a missing recording and fits its detail views in dark and narrow layouts', async ({
  page,
}, info) => {
  await page.route('**/audio/music/song-study.mp3', (route) => route.fulfill({ status: 503 }));
  const player = playerFor(page);
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.error')).toBeVisible();
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await player
    .getByRole('button', { name: 'Explore Final chorus, bars 53–60', exact: true })
    .click();
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  await player.locator('.explore>summary').click();
  await player.getByLabel('Chord names', { exact: true }).check();
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--paper', '#202224');
    document.documentElement.style.setProperty('--ink', '#eeeef0');
    document.documentElement.style.setProperty('--muted', '#b9bdc5');
    document.documentElement.style.setProperty('--green-dark', '#05ce78');
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({ path: test.info().outputPath(`song-study-${info.project.name}.png`) });
});
