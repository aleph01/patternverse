import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

async function openRepertoire(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Song excerpts \(/ }).click();
}

const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });

test('selects real excerpts, preserves meter, renders notation and fits on a phone', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openRepertoire(page);
  const player = playerFor(page);
  const selector = player.getByLabel('Musical example', { exact: true });
  await expect(selector).toBeEnabled();
  const ids = await selector
    .locator('option')
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(ids.length).toBeGreaterThanOrEqual(6);
  if (process.env.MUSIC_DEMO_FULL_LIBRARY) expect(ids).toHaveLength(31);
  for (const id of ids) {
    await selector.selectOption(id);
    await expect(player.locator('.note')).not.toHaveCount(0);
    const labels = await player.locator('.pitch-labels').boundingBox();
    const grid = await player.locator('.note-grid').boundingBox();
    expect(labels?.height).toBeCloseTo(grid!.height, 0);
    if (await player.getByRole('button', { name: 'Beat grid', exact: true }).count()) {
      await expect(player.locator('.drum-lane')).not.toHaveCount(0);
      await player.getByRole('button', { name: 'Beat grid', exact: true }).click();
      await expect(player.locator('.beat-grid')).toBeVisible();
      await expect(player.getByRole('button', { name: /Kick on|Snare on|Hi-hat on/ })).toHaveCount(
        0,
      );
    } else {
      await player.getByRole('button', { name: 'Notation', exact: true }).click();
      if (
        [
          'sinatra-fly-me-to-the-moon',
          'fleetwood-landslide-arrangement',
          'radiohead-true-love-waits-studio',
        ].includes(id)
      ) {
        await expect(player.locator('.notation + .notice')).toContainText(
          id === 'sinatra-fly-me-to-the-moon'
            ? 'This rhythm needs a finer written subdivision.'
            : 'This part needs more than four written voices.',
        );
        await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
        await expect(player.locator('.note')).not.toHaveCount(0);
      } else {
        await expect(player.locator('.notation svg'), id).toBeVisible();
        await expect(player.locator('.notation + .notice'), id).toHaveCount(0);
      }
    }
    if (id === 'joplin-entertainer')
      await expect(player.locator('.setting')).toContainText('2/4 · 72 bpm');
    if (id === 'debussy-clair-de-lune')
      await expect(player.locator('.setting')).toContainText('9/8');
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position'), id).toHaveAttribute('data-playback', 'playing');
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  await selector.selectOption('bach-invention-1');
  await expect(player.getByRole('group', { name: 'Audible parts' })).toHaveCount(0);
  await expect(player.locator('input[type=file]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await selector.selectOption('sinatra-fly-me-to-the-moon');
  await page.screenshot({
    path: test.info().outputPath(`repertoire-${info.project.name}.png`),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('plays sampled piano, loops, and stops the old excerpt when selection changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const samples: AudioBufferSourceNode[] = [];
    Object.assign(window, { repertoireAudio: samples });
    window.AudioContext = class extends Original {
      createBufferSource() {
        const node = super.createBufferSource();
        samples.push(node);
        return node;
      }
    };
  });
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.mp3')) requests.push(request.url());
  });
  await openRepertoire(page);
  const player = playerFor(page);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await player.getByLabel('Musical example', { exact: true }).selectOption('joplin-entertainer');
  expect(requests).toHaveLength(0);
  await player.getByLabel('Loop', { exact: true }).check();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  expect(
    await page.evaluate(() =>
      (window as unknown as { repertoireAudio: AudioBufferSourceNode[] }).repertoireAudio.some(
        (node) => (node.buffer?.duration ?? 0) > 1,
      ),
    ),
  ).toBe(true);
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.position')).toContainText('Bar 5');
  await player.getByLabel('Musical example', { exact: true }).selectOption('bach-prelude-c');
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
  await expect(player.locator('.position')).toHaveText('Bar 1 · beat 1.0');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
  if (await player.locator('option[value="wonder-superstition-demo"]').count()) {
    await player
      .getByLabel('Musical example', { exact: true })
      .selectOption('wonder-superstition-demo');
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await expect(player.locator('.drum-hit.sounding')).not.toHaveCount(0);
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
  }
});

test('serves each source file separately and exposes the lesson coverage', async ({
  page,
  request,
}) => {
  const response = await request.get('/repertoire/catalog.json');
  const catalog = await response.json();
  const audit = JSON.parse(
    readFileSync(
      new URL('../../../docs/musical-composition/repertoire-library.json', import.meta.url),
      'utf8',
    ),
  );
  if (process.env.MUSIC_DEMO_FULL_LIBRARY) expect(catalog).toHaveLength(31);
  for (const entry of catalog) {
    const response = await request.get(`/repertoire/${entry.id}.mid`);
    expect(response.ok(), entry.id).toBe(true);
    expect(
      createHash('sha256')
        .update(await response.body())
        .digest('hex'),
      entry.id,
    ).toBe(audit.examples.find((item: { id: string }) => item.id === entry.id).sha256);
  }
  await openRepertoire(page);
  await expect(playerFor(page).getByLabel('Musical example', { exact: true })).toBeEnabled();
  await page.getByText('Which lessons do these examples cover?', { exact: true }).click();
  await expect(page.locator('.coverage tbody tr')).toHaveCount(catalog.length);
  await expect(page.locator('.coverage')).toContainText('Pull an Entrance Across the Beat');
});

test('switches from repertoire to original comparisons and stops the old player', async ({
  page,
}) => {
  await openRepertoire(page);
  let player = playerFor(page);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await page.getByRole('button', { name: 'Pattern comparisons (5)', exact: true }).click();
  player = playerFor(page);
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
  await expect(player.getByLabel('Musical example', { exact: true }).locator('option')).toHaveCount(
    5,
  );
  await player.getByRole('button', { name: 'A On the beat', exact: true }).click();
  await player.getByRole('button', { name: 'B Syncopated', exact: true }).click();
  await expect(player.getByRole('button', { name: 'B Syncopated', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await page.getByRole('button', { name: /^Song excerpts \(/ }).click();
  await expect(playerFor(page).locator('.position')).toHaveAttribute('data-playback', 'paused');
});

test('keeps the other examples usable when one MIDI fails, and retries', async ({ page }) => {
  await page.route('**/repertoire/joplin-entertainer.mid', (route) =>
    route.fulfill({ status: 503 }),
  );
  await openRepertoire(page);
  await expect(
    page.getByText('Scott Joplin — The Entertainer could not load. Try again.', { exact: true }),
  ).toBeVisible();
  await expect(playerFor(page).getByLabel('Musical example', { exact: true })).toBeEnabled();
  await page.unroute('**/repertoire/joplin-entertainer.mid');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    playerFor(page)
      .getByLabel('Musical example', { exact: true })
      .locator('option[value="joplin-entertainer"]'),
  ).toHaveCount(1);
  await expect(
    page.getByText('Scott Joplin — The Entertainer could not load. Try again.', { exact: true }),
  ).toHaveCount(0);
});

test('navigates to the actual key change and later string entrance with presets intact', async ({
  page,
}, info) => {
  test.skip(
    !process.env.MUSIC_DEMO_FULL_LIBRARY,
    'Requires the private second-batch source files.',
  );
  await openRepertoire(page);
  const player = playerFor(page);
  const selector = player.getByLabel('Musical example', { exact: true });
  await expect(selector).toBeEnabled();
  await selector.selectOption('jackson-man-in-the-mirror');
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.pages')).toContainText('Bars 9–12 of 16');
  await expect(player.locator('.position')).toContainText('Bar 9');
  await player.getByRole('button', { name: 'Notation', exact: true }).click();
  await expect(player.locator('.notation svg')).toBeVisible();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await selector.selectOption('abba-dancing-queen');
  for (let i = 0; i < 3; i++)
    await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.pages')).toContainText('Bars 13–16 of 16');
  await expect(player.locator('.note[title*="String line on piano"]')).not.toHaveCount(0);
  await expect(player.getByRole('group', { name: 'Audible parts' })).toHaveCount(0);
  await player.screenshot({
    path: test.info().outputPath(`new-passages-${info.project.name}.png`),
  });
});

test('plays the third batch and shows the later layer and section entrances', async ({
  page,
}, info) => {
  test.skip(!process.env.MUSIC_DEMO_FULL_LIBRARY, 'Requires the private third-batch source files.');
  await openRepertoire(page);
  const player = playerFor(page);
  const selector = player.getByLabel('Musical example', { exact: true });
  await expect(selector).toBeEnabled();
  for (const id of [
    'wonder-isnt-she-lovely',
    'daft-punk-around-the-world',
    'queen-bohemian-rhapsody',
  ]) {
    await selector.selectOption(id);
    await player.getByRole('button', { name: 'Notation', exact: true }).click();
    await expect(player.locator('.notation svg'), id).toBeVisible();
    await expect(player.locator('.notation + .notice'), id).toHaveCount(0);
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  await selector.selectOption('queen-bohemian-rhapsody');
  for (let i = 0; i < 2; i++)
    await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.pages')).toContainText('Bars 9–12 of 16');
  await expect(player.locator('.note[title*="Guitar chords on piano"]')).not.toHaveCount(0);
  await player.getByRole('button', { name: 'Notation', exact: true }).click();
  await expect(player.locator('.notation svg')).toBeVisible();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await selector.selectOption('daft-punk-around-the-world');
  for (let i = 0; i < 5; i++)
    await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.pages')).toContainText('Bars 21–24 of 24');
  await expect(player.locator('.note[title*="Vocal line on piano"]')).not.toHaveCount(0);
  await expect(player.getByRole('group', { name: 'Audible parts' })).toHaveCount(0);
  await player.screenshot({ path: test.info().outputPath(`third-batch-${info.project.name}.png`) });
});
