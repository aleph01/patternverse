import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const response = await request.get('/song-studies/songbook.json');
  test.skip(response.status() === 404, 'Prepare the private songbook first.');
});

test('serves the complete approved private songbook with bounded section maps', async ({
  request,
}) => {
  const index = await (await request.get('/song-studies/songbook.json')).json();
  expect(index.failures).toEqual([]);
  expect(index.entries).toHaveLength(34);
  expect(
    index.entries.some((entry: { id: string }) => entry.id === 'swans-screen-shot-study'),
  ).toBe(true);
  expect(
    index.entries.some((entry: { id: string }) => /get-lucky|creep|dua-lipa/.test(entry.id)),
  ).toBe(false);
  for (const entry of index.entries) {
    const response = await request.get(entry.url);
    expect(response.ok(), entry.title).toBe(true);
    const study = await response.json();
    expect(study.id).toBe(entry.id);
    expect(study.defaultPlayback).toBe('midi');
    if (study.id === 'nirvana-smells-like-teen-spirit-study') {
      expect(study.recording.youtubeId).toBe('7TDeBi34OtE');
      expect(study.recording.alignmentStatus).toBe('draft');
    } else expect(study.recording).toBeUndefined();
    expect(study.sections[0].start).toBe(0);
    expect(study.sections.at(-1).end).toBe(study.beats);
  }
  const head = await request.head(index.entries[0].url);
  expect(head.headers()['content-type']).toBe('application/json');
  const mutation = await request.post(index.entries[0].url);
  expect(mutation.status()).toBe(405);
  const provenance = await request.get('/song-studies/songbook/withers-lean-on-me.provenance.json');
  expect(provenance.headers()['content-type']).not.toBe('application/json');
});

test('opens new songs, plays MIDI, and zooms into notes and drums on desktop and phone', async ({
  page,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const errors: string[] = [],
    videoRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/youtube|googlevideo/.test(new URL(request.url()).hostname))
      videoRequests.push(request.url());
  });
  await page.goto('/?study=nirvana-smells-like-teen-spirit-study');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  const picker = player.getByLabel('Musical example', { exact: true });
  await expect(picker).toHaveValue('nirvana-smells-like-teen-spirit-study');
  await expect(player.locator('.form-section')).toHaveCount(14);
  await expect(player.locator('iframe, input[type="range"]')).toHaveCount(0);
  expect(await picker.locator('option').allTextContents()).not.toContain(
    'Daft Punk — Get Lucky · opening study',
  );
  await player.locator('.form-section').nth(3).click();
  await expect(player.locator('.section-heading')).toContainText('Chorus 1');
  await expect(player.locator('.section-detail svg').first()).toBeVisible();
  await expect(player.locator('.beat-grid')).toBeVisible();
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Loop section', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await picker.selectOption('coldplay-the-scientist-study');
  await expect(player.locator('.form-section')).toHaveCount(7);
  await player.locator('.form-section').nth(4).click();
  await expect(player.locator('.section-heading')).toContainText('Verse 2');
  await expect(player.locator('.roll-scroll')).toBeVisible();
  await expect(player.locator('.beat-grid')).toBeVisible();
  expect((await player.locator('.roll-scroll').boundingBox())!.height).toBeLessThan(550);
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await expect(player.locator('.roll-scroll')).toHaveCount(0);
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({ path: test.info().outputPath(`songbook-${info.project.name}.png`) });
  await picker.selectOption('fleetwood-landslide-study');
  await player.locator('.form-section').first().click();
  await expect(player.locator('.roll-scroll')).toBeVisible();
  await expect(player.locator('.beat-grid')).toHaveCount(0);
  await picker.selectOption('radiohead-paranoid-android-study');
  await player.locator('.form-section').last().click();
  await expect(player.locator('.section-heading')).toContainText('Final riff');
  await expect(player.locator('.position')).toContainText('Bar');
  expect(errors).toEqual([]);
  expect(videoRequests).toEqual([]);
});

test('plays Screen Shot and explores the layer-based structure through its ending', async ({
  page,
  request,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const response = await request.get('/song-studies/songbook/swans-screen-shot.json');
  expect(response.ok()).toBe(true);
  const study = await response.json();
  expect(study.beats).toBe(777.5);
  expect(study.notes).toHaveLength(12039);
  await page.goto('/?study=swans-screen-shot-study');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'swans-screen-shot-study',
  );
  await expect(player.locator('.form-section')).toHaveCount(9);
  await expect(player).toContainText('5:29 fan MIDI arrangement');
  await player.locator('.form-section').nth(6).click();
  await expect(player.locator('.section-heading')).toContainText('Breakdown');
  await expect(player.locator('.section-description')).toContainText('slap bass enters');
  await expect(player.locator('.position')).toContainText('Bar 193');
  await expect(player.locator('.roll-scroll')).toBeVisible();
  await expect(player.locator('.beat-grid')).toBeVisible();
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await player.getByText('Instrument layers', { exact: true }).click();
  await expect(player.locator('.layer-label').filter({ hasText: /^Drums$/ })).toHaveCount(1);
  await player.locator('.form-section').nth(8).click();
  await expect(player.locator('.section-heading')).toContainText('Full layers return');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({ path: test.info().outputPath(`screen-shot-${info.project.name}.png`) });
  for (let i = 0; i < 8; i++)
    await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.section-heading')).toContainText('Full layers return');
  await expect(player.locator('.position')).toContainText('Bar 257');
});

test('shows continuous instrument blocks with visible breaks in the arrangement', async ({
  page,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/?study=swans-screen-shot-study');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'swans-screen-shot-study',
  );
  await player.getByText('Instrument layers', { exact: true }).click();
  const synth = player.getByRole('img', { name: /^Synthesizer: first enters/ });
  const bass = player.getByRole('img', { name: /^Bass Guitar: first enters/ });
  const mallets = player.getByRole('img', { name: /^Vibraphone: first enters/ });
  await expect(synth.locator('.layer-span')).toHaveCount(1);
  await expect(bass.locator('.layer-span')).toHaveCount(2);
  await expect(mallets.locator('.layer-span')).toHaveCount(3);
  await expect(player.getByRole('img', { name: /^Drums: first enters/ })).toHaveCount(1);
  const blocks = await bass
    .locator('.layer-span')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
  expect(blocks[0].right).toBeLessThan(blocks[1].left);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player
    .locator('.form-timeline')
    .screenshot({ path: test.info().outputPath(`continuous-layers-${info.project.name}.png`) });
});
