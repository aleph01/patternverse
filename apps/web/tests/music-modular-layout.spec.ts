import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });

test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/');
});

test('places transport above the outline, view icons on the left and Roman numerals directly below', async ({
  page,
}, info) => {
  const player = playerFor(page);
  await expect(player.locator('.ribbon-chord')).not.toHaveCount(0);
  await expect(player.locator('.section-detail')).toHaveCount(0);
  const transport = (await player.locator('.structure-transport').boundingBox())!;
  const outline = (await player.locator('.section-scroll').boundingBox())!;
  const rail = (await player
    .getByRole('group', { name: 'Musical views', exact: true })
    .boundingBox())!;
  const harmony = (await player.locator('.ribbon-scroll').boundingBox())!;
  const layers = (await player.locator('.form-detail').boundingBox())!;
  expect(transport.y + transport.height).toBeLessThanOrEqual(outline.y);
  expect(rail.x + rail.width).toBeLessThan(outline.x);
  expect(harmony.y).toBeGreaterThan(outline.y + outline.height);
  expect(harmony.y + harmony.height).toBeLessThan(layers.y);
  for (const button of await player.locator('.module-rail button').all()) {
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await player.getByRole('button', { name: 'Explore Chorus 1, bars 17–24', exact: true }).click();
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['I', 'V', 'vi', 'IV']);
  await player.screenshot({
    path: test.info().outputPath(`modular-player-${info.project.name}.png`),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('toggles modules by keyboard and touch without interrupting playback or duplicating controls', async ({
  page,
}) => {
  const player = playerFor(page);
  const piano = player.getByRole('button', { name: 'Piano roll', exact: true });
  const drums = player.getByRole('button', { name: 'Drums', exact: true });
  const chords = player.getByRole('button', { name: 'Roman numeral chords', exact: true });
  await expect(piano).toHaveAttribute('aria-pressed', 'false');
  await piano.press('Enter');
  await expect(piano).toHaveAttribute('aria-pressed', 'true');
  await expect(player.locator('.roll-scroll')).toBeVisible();
  await expect(player.locator('.beat-grid')).toHaveCount(0);
  await drums.click();
  await expect(drums).toHaveAttribute('aria-pressed', 'true');
  await expect(player.locator('.beat-grid')).toBeVisible();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await chords.press('Space');
  await expect(player.locator('.ribbon-scroll')).toHaveCount(0);
  await expect(chords).toHaveAttribute('aria-pressed', 'false');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await chords.press('Space');
  await expect(player.locator('.ribbon-scroll')).toBeVisible();
  await piano.click();
  await expect(player.locator('.roll-scroll')).toHaveCount(0);
  await expect(player.locator('.beat-grid')).toBeVisible();
  await expect(player.getByRole('checkbox', { name: 'Piano roll', exact: true })).toHaveCount(0);
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await expect(player.locator('.ribbon-scroll')).toBeVisible();
  await expect(drums).toHaveAttribute('aria-pressed', 'false');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: 'Restart example', exact: true }).click();
  await expect(player.locator('.position')).toContainText('Bar 1');
});

test('keeps unavailable views disabled and fits the same layout in dark mode', async ({
  page,
}, info) => {
  const player = playerFor(page);
  await player
    .getByLabel('Musical example', { exact: true })
    .selectOption('song-structure-recording');
  for (const name of ['Roman numeral chords', 'Piano roll', 'Drums', 'Notation'])
    await expect(player.getByRole('button', { name, exact: true })).toBeDisabled();
  await expect(player.locator('.ribbon-scroll')).toHaveCount(0);
  await player.getByLabel('Musical example', { exact: true }).selectOption('song-structure-study');
  await expect(
    player.getByRole('button', { name: 'Roman numeral chords', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    for (const [name, value] of Object.entries({
      '--paper': '#202224',
      '--ink': '#eeeef0',
      '--muted': '#b9bdc5',
      '--green-dark': '#05ce78',
      '--mint': '#163b2b',
    }))
      document.documentElement.style.setProperty(name, value);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({
    path: test.info().outputPath(`modular-player-dark-${info.project.name}.png`),
  });
});

test('mutes instruments independently with grouped drums and preserves mute state across views and seeking', async ({
  page,
}, info) => {
  const player = playerFor(page);
  await player.getByText('Instrument layers', { exact: true }).click();
  const piano = player.getByRole('button', { name: 'Mute Piano', exact: true });
  const bass = player.getByRole('button', { name: 'Mute Bass', exact: true });
  const drums = player.getByRole('button', { name: 'Mute Drums', exact: true });
  await expect(player.locator('.mute-button')).toHaveCount(3);
  await expect(piano).toHaveAttribute('aria-pressed', 'false');
  const box = (await drums.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await player.getByRole('button', { name: 'Explore Chorus 1, bars 17–24', exact: true }).click();
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await piano.press('Space');
  await expect(piano).toHaveAttribute('aria-pressed', 'true');
  await expect(bass).toHaveAttribute('aria-pressed', 'false');
  await expect(player.locator('.note.chord.muted')).not.toHaveCount(0);
  await expect(player.locator('.note:not(.chord).muted')).toHaveCount(0);
  await drums.click();
  await expect(drums).toHaveAttribute('aria-pressed', 'true');
  await expect(player.locator('.beat-grid .grid-row.muted')).toHaveCount(3);
  await expect(player.locator('.drum-lane.muted')).toHaveCount(3);
  await expect(player.locator('.form-lane.muted')).toHaveCount(2);
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await bass.press('Enter');
  await expect(player.getByRole('status')).toContainText('All instruments are muted');
  await bass.press('Enter');
  await expect(player.getByRole('status')).toHaveCount(0);
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await player.getByRole('button', { name: 'Explore Verse 1, bars 5–16', exact: true }).click();
  await expect(piano).toHaveAttribute('aria-pressed', 'true');
  await expect(drums).toHaveAttribute('aria-pressed', 'true');
  await drums.click();
  await expect(player.locator('.beat-grid .grid-row.muted')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player
    .locator('.form-timeline')
    .screenshot({ path: test.info().outputPath(`instrument-mutes-${info.project.name}.png`) });
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await expect(piano).toBeDisabled();
  await expect(player.locator('.mute-help')).toContainText('Switch to MIDI study');
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await expect(piano).toBeEnabled();
  await expect(piano).toHaveAttribute('aria-pressed', 'true');
});

test('offers mute controls for the individual instruments of a real MIDI song', async ({
  page,
}) => {
  await page.goto('/?study=nirvana-smells-like-teen-spirit-study');
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'nirvana-smells-like-teen-spirit-study',
  );
  await player.getByText('Instrument layers', { exact: true }).click();
  const controls = player.locator('.mute-button');
  expect(await controls.count()).toBeGreaterThan(2);
  const drums = player.getByRole('button', { name: 'Mute Drums', exact: true });
  await expect(drums).toHaveCount(1);
  await controls.first().click();
  await expect(controls.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(drums).toHaveAttribute('aria-pressed', 'false');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await drums.click();
  await expect(drums).toHaveAttribute('aria-pressed', 'true');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
