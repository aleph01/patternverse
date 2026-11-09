import { expect, test } from '@playwright/test';

test.skip(!process.env.SONGWRITING_DRAFT_REVIEW, 'Local draft review only.');
const region = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });

test('compares, edits and restores a drum groove, and keeps playing across all three views', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/collection/songwriting-course');
  const player = region(page);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await player.getByLabel('Musical example', { exact: true }).selectOption('syncopation');
  await expect(player.locator('.beat-grid button')).toHaveCount(48);
  const step = player.getByRole('button', { name: 'Kick, bar 1, beat 1.50', exact: true });
  await expect(step).toHaveAttribute('aria-pressed', 'false');
  await step.click();
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  await player.getByRole('button', { name: 'Restore example', exact: true }).click();
  await expect(step).toHaveAttribute('aria-pressed', 'false');
  await player.getByRole('button', { name: 'A On the beat', exact: true }).click();
  await expect(
    player.getByRole('button', { name: 'Kick, bar 1, beat 3.00', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await player.getByRole('button', { name: 'B Syncopated', exact: true }).click();
  await player.getByLabel('Loop', { exact: true }).check();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.beat-grid .now')).not.toHaveCount(0);
  await player.getByRole('button', { name: 'Notation', exact: true }).click();
  await expect(player.locator('.notation svg')).toBeVisible();
  await expect(player.locator('.score-playhead[visibility="visible"]')).toHaveCount(1);
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await expect(player.locator('.drum-hit')).toHaveCount(24);
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: 'Notation', exact: true }).click();
  await expect(player.locator('.notation svg')).toBeVisible();
  await player.screenshot({
    path: test.info().outputPath(`shared-player-${info.project.name}.png`),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('renders sequence, swing and exact polyrhythm notation and isolates a voice', async ({
  page,
}) => {
  await page.goto('/collection/songwriting-course');
  const player = region(page);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  for (const id of ['sequence', 'swing', 'polyrhythm']) {
    await player.getByLabel('Musical example', { exact: true }).selectOption(id);
    await player.getByRole('button', { name: 'Notation', exact: true }).click();
    await expect(player.locator('.notation svg')).toBeVisible();
    await expect(player.getByText(/incomplete tuplet|needs reviewed|finer written/)).toHaveCount(0);
  }
  await player.getByLabel('Musical example', { exact: true }).selectOption('sequence');
  await player.getByRole('button', { name: 'Melody on', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Melody off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('keeps MIDI authoring and drum mixer controls out of the reader', async ({ page }) => {
  await page.goto('/pattern/songwriting-syncopation-and-anticipation');
  const player = region(page);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(player.locator('input[type=file]')).toHaveCount(0);
  await expect(player.getByText('Open MIDI', { exact: true })).toHaveCount(0);
  await expect(player.getByRole('group', { name: 'Audible parts' })).toHaveCount(0);
  await expect(player.getByRole('button', { name: /Kick on|Snare on|Hi-hat on/ })).toHaveCount(0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
});

test('synthesizes distinct kick, snare and hat sounds with clean endings', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'Shared audio engine.');
  await page.goto('/collection/songwriting-course');
  const signals = await page.evaluate(async () => {
    const path = '/src/lib/music/percussion.ts';
    const { percussionVoice } = await import(path);
    const result = [];
    for (const sound of ['kick', 'snare', 'hat']) {
      const ctx = new OfflineAudioContext(1, 24000, 48000);
      const voice = percussionVoice(ctx, ctx.destination, sound, 0, 0.2);
      voice.oscillator.start(0);
      voice.oscillator.stop(voice.seconds);
      const data = (await ctx.startRendering()).getChannelData(0);
      result.push({
        sound,
        rms: Math.sqrt(data.slice(0, 4800).reduce((s, x) => s + x * x, 0) / 4800),
        tail: Math.max(...data.slice(16000).map(Math.abs)),
      });
    }
    return result;
  });
  for (const signal of signals) {
    expect(signal.rms, signal.sound).toBeGreaterThan(0.001);
    expect(signal.tail, signal.sound).toBeLessThan(0.0001);
  }
});

test('loads real piano recordings only when played and recovers from a failed sample request', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const samples: AudioBufferSourceNode[] = [],
      oscillators: OscillatorNode[] = [];
    Object.assign(window, { pianoCheck: { samples, oscillators } });
    window.AudioContext = class extends Original {
      createBufferSource() {
        const node = super.createBufferSource();
        samples.push(node);
        return node;
      }
      createOscillator() {
        const node = super.createOscillator();
        oscillators.push(node);
        return node;
      }
    };
  });
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.mp3')) requests.push(request.url());
  });
  await page.goto('/collection/songwriting-course');
  const player = region(page);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  expect(requests).toHaveLength(0);
  await page.route('**/audio/piano/salamander/*.mp3', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.getByRole('status')).toContainText('piano recordings could not load');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { pianoCheck: { oscillators: unknown[] } }).pianoCheck.oscillators
          .length,
    ),
  ).toBe(0);
  await page.unroute('**/audio/piano/salamander/*.mp3');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  const sound = await page.evaluate(() => {
    const { samples, oscillators } = (
      window as unknown as {
        pianoCheck: { samples: AudioBufferSourceNode[]; oscillators: unknown[] };
      }
    ).pianoCheck;
    return {
      duration: samples[0].buffer!.duration,
      rate: samples[0].playbackRate.value,
      oscillators: oscillators.length,
    };
  });
  expect(sound.duration).toBeGreaterThan(1);
  expect(sound.rate).toBeCloseTo(2 ** (1 / 12));
  expect(sound.oscillators).toBe(0);
  expect(requests.every((url) => new URL(url).origin === 'http://localhost:5196')).toBe(true);
});
