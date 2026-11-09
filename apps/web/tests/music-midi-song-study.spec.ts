import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });

test('Get Lucky starts with MIDI and never loads YouTube', async ({ page, request }) => {
  const catalog = await (await request.get('/repertoire/catalog.json')).json();
  test.skip(
    !catalog.some((e: { id: string }) => e.id === 'daft-get-lucky'),
    'Requires the private provider-demo MIDI.',
  );
  const youtube: string[] = [];
  page.on('request', (r) => {
    if (
      /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com)$/.test(new URL(r.url()).hostname)
    )
      youtube.push(r.url());
  });
  await page.goto('/?study=daft-get-lucky-opening-study');
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'daft-get-lucky-opening-study',
  );
  await expect(player.getByRole('button', { name: 'Recording', exact: true })).toHaveCount(0);
  await player.getByRole('button', { name: 'Explore Opening loop, bars 1–4', exact: true }).click();
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['i', 'III', 'v', 'IV']);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(youtube).toEqual([]);
  await expect(player.locator('iframe')).toHaveCount(0);
});

test('plays a complete MIDI song and zooms from structure into its harmony, drums and solo', async ({
  page,
  request,
}, info) => {
  const response = await request.get('/song-studies/seven-nation-army.json');
  test.skip(response.status() === 404, 'Prepare the private full-song MIDI study first.');
  const manifest = await response.json();
  expect(manifest.recording).toBeUndefined();
  expect(manifest.defaultPlayback).toBe('midi');
  expect(manifest.beats).toBe(452);
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const youtube: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (
      /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com)$/.test(new URL(r.url()).hostname)
    )
      youtube.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?study=white-stripes-seven-nation-army-study');
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'white-stripes-seven-nation-army-study',
  );
  await expect(player.locator('.form-section')).toHaveCount(8);
  await expect(player.locator('.section-detail')).toHaveCount(0);
  await player.locator('.form-section').nth(0).click();
  await expect(player.locator('.ribbon-chord')).toContainText('Tonal centre');
  await expect(player.locator('.chord-notes')).toHaveCount(0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.locator('.form-section').nth(2).click();
  await expect(player.locator('.position')).toContainText('Bar 25');
  await expect(player.locator('.ribbon-chord').first()).toContainText('III');
  await expect(player.locator('.beat-grid button.hit')).not.toHaveCount(0);
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Minimize section', exact: false }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.getByRole('button', { name: 'Loop song', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.locator('.form-section').nth(5).click();
  await expect(player.locator('.section-heading')).toContainText('Guitar solo');
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.locator('.explore>summary').click();
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await expect(player.getByRole('region', { name: /^Piano roll:/ })).toBeVisible();
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await player.locator('.form-section').nth(7).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.ribbon-chord').last().locator('.roman')).toHaveText('I');
  await player.locator('.ribbon-chord').last().click();
  await expect(player.locator('.current-chord')).toContainText('I · Tonic');
  expect(
    await player.locator('.ribbon-scroll').evaluate((el) => {
      const chord = el.querySelector('[aria-pressed="true"]')!.getBoundingClientRect();
      const pane = el.getBoundingClientRect(),
        centre = (chord.left + chord.right) / 2;
      return el.scrollLeft > 0 && centre >= pane.left && centre <= pane.right;
    }),
  ).toBe(true);
  await player.getByRole('button', { name: 'Restart example', exact: true }).click();
  await expect(player.locator('.position')).toContainText('Bar 103');
  await player.locator('.form-section').nth(0).click();
  await player.locator('.form-section').nth(2).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.getByLabel('Chord names', { exact: true }).check();
  await player.locator('.explore>summary').click();
  await player.screenshot({
    path: test.info().outputPath(`midi-full-song-${info.project.name}.png`),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const collisions = await player.evaluate((el) => {
    const words = [...el.querySelectorAll('.section-name span')].map((n) => ({
      parent: n.parentElement,
      box: n.getBoundingClientRect(),
    }));
    return words.some((a, i) =>
      words
        .slice(i + 1)
        .some(
          (b) =>
            a.parent !== b.parent &&
            a.box.left < b.box.right &&
            a.box.right > b.box.left &&
            a.box.top < b.box.bottom &&
            a.box.bottom > b.box.top,
        ),
    );
  });
  expect(collisions).toBe(false);
  expect(youtube).toEqual([]);
  expect(errors).toEqual([]);
});
