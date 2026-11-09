import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });
test.beforeEach(async ({ page, request }) => {
  const response = await request.get('/song-studies/code-monkey.json');
  test.skip(response.status() === 404, 'Prepare the artist-permitted local song fixture first.');
  await page.goto('/?study=coulton-code-monkey-study');
});

test('plays the released song underneath its map and follows the matching MIDI chords and drums', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'coulton-code-monkey-study',
  );
  await expect(player.getByRole('button', { name: 'Recording', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(player.locator('.form-section')).toHaveCount(12);
  await player.locator('.form-section').nth(2).click();
  await expect(player.locator('.section-heading')).toContainText('Chorus 1');
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['I', 'I', 'I', 'I']);
  await expect(player.locator('.ribbon-chord').nth(1)).toContainText('Emaj7/D♯');
  await expect(player.locator('.ribbon-chord').nth(2)).toContainText('E6/C♯');
  await expect(player.locator('.beat-grid button.hit')).not.toHaveCount(0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.position')).toContainText('Bar 25');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: 'MIDI study', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: 'Recording', exact: true }).click();
  await player.locator('.explore>summary').click();
  await player.getByLabel('Chord names', { exact: true }).check();
  const collisions = await player.evaluate((el) => {
    const words = [...el.querySelectorAll('.section-name span')].map((n) => ({
      parent: n.parentElement,
      box: n.getBoundingClientRect(),
    }));
    const result: string[] = [];
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i],
          b = words[j];
        if (a.parent === b.parent) continue;
        if (
          a.box.left < b.box.right &&
          a.box.right > b.box.left &&
          a.box.top < b.box.bottom &&
          a.box.bottom > b.box.top
        )
          result.push('section labels overlap');
      }
    for (const chord of el.querySelectorAll('.ribbon-chord')) {
      const name = chord.querySelector('.name')?.getBoundingClientRect(),
        tag = chord.querySelector('.inversion')?.getBoundingClientRect();
      if (name && tag && name.bottom > tag.top) result.push('bass tag overlaps chord name');
    }
    return result;
  });
  expect(collisions).toEqual([]);
  await player.screenshot({ path: test.info().outputPath(`code-monkey-${info.project.name}.png`) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('serves only the local recording and MIDI, supports audio seeking, and stays quiet on missing assets', async ({
  request,
}) => {
  const manifest = await request.get('/song-studies/code-monkey.json');
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.defaultPlayback).toBe('recording');
  expect(
    data.notes.filter((n: { drum?: string; start: number }) => n.drum && n.start < 30),
  ).toHaveLength(0);
  const response = await request.get(data.recording.src, { headers: { Range: 'bytes=100-199' } });
  expect(response.status()).toBe(206);
  expect((await response.body()).length).toBe(100);
  expect(response.headers()['content-range']).toMatch(/^bytes 100-199\/\d+$/);
  const head = await request.head(data.recording.src);
  expect(head.headers()['content-type']).toBe('audio/mpeg');
  const midi = await request.get('/song-studies/code-monkey.mid');
  expect((await midi.body()).subarray(0, 4).toString()).toBe('MThd');
  const invalid = await request.get(data.recording.src, { headers: { Range: 'bytes=999999999-' } });
  expect(invalid.status()).toBe(416);
  const method = await request.post('/song-studies/code-monkey.json');
  expect(method.status()).toBe(405);
});
