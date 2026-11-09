import { expect, test } from '@playwright/test';

test.skip(!process.env.SONGWRITING_DRAFT_REVIEW, 'Local unpublished-course review only.');

test('plays real audio, follows the notes, and pauses without extra sliders', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const contexts: AudioContext[] = [];
    const gains: GainNode[] = [];
    Object.assign(window, { musicTest: { contexts, gains } });
    window.AudioContext = class extends Original {
      constructor() {
        super();
        contexts.push(this);
      }
      createGain() {
        const gain = super.createGain();
        gains.push(gain);
        return gain;
      }
    };
  });
  await page.goto('/collection/songwriting-course');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  expect(
    await player
      .locator('.roll-scroll')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => (window as unknown as { musicTest: { contexts: unknown[] } }).musicTest.contexts.length,
    ),
  ).toBe(0);
  await player.getByLabel('Loop', { exact: true }).check();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await expect(player.locator('.note.sounding')).not.toHaveCount(0);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const { contexts, gains } = (
            window as unknown as { musicTest: { contexts: AudioContext[]; gains: GainNode[] } }
          ).musicTest;
          const analyser = contexts[0].createAnalyser();
          gains[0].connect(analyser);
          await new Promise((resolve) => setTimeout(resolve, 100));
          const samples = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(samples);
          gains[0].disconnect(analyser);
          analyser.disconnect();
          return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        }),
      { timeout: 3000 },
    )
    .toBeGreaterThan(0.001);
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.note.sounding')).toHaveCount(0);
  const paused = await player.locator('.position').textContent();
  await page.waitForTimeout(150);
  await expect(player.locator('.position')).toHaveText(paused!);
  await expect(player.getByRole('slider')).toHaveCount(0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await page.screenshot({
    path: test.info().outputPath(`songwriting-player-${info.project.name}.png`),
    fullPage: false,
  });
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('switches examples, isolates parts, pages through bars, and disposes audio on navigation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const contexts: AudioContext[] = [];
    Object.assign(window, { musicContexts: contexts });
    window.AudioContext = class extends Original {
      constructor() {
        super();
        contexts.push(this);
      }
    };
  });
  await page.goto('/collection/songwriting-course');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await player.getByLabel('Musical example', { exact: true }).selectOption('verse');
  await expect(player.getByText('Bars 1–4 of 8', { exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Chords on', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Chords off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(player.locator('.note.chord.muted')).not.toHaveCount(0);
  await player.getByRole('button', { name: 'Next four bars' }).click();
  await expect(player.getByText('Bars 5–8 of 8', { exact: true })).toBeVisible();
  await expect(player.locator('.position')).toHaveText('Bar 5 · beat 1.0');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await player.getByLabel('Musical example', { exact: true }).selectOption('bass');
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(player.locator('.note')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { musicContexts: AudioContext[] }).musicContexts[0].state,
      ),
    )
    .toBe('closed');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .locator('.entity-article')
    .getByRole('link', { name: "Protect the Song's Identity", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pattern\/songwriting-what-makes-a-song$/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { musicContexts: AudioContext[] }).musicContexts.every(
          (context) => context.state === 'closed',
        ),
      ),
    )
    .toBe(true);
});

test('keeps the written course usable when browser audio is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'AudioContext');
  });
  await page.goto('/pattern/songwriting-start-with-a-motif');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await expect(player.getByText(/Playback needs JavaScript/)).toBeVisible();
  await expect(page.locator('.entity-article .markdown-body')).toContainText('E4');
});

test('assigns instruments by part, retains choices between examples, and switches during playback', async ({
  page,
}) => {
  await page.goto('/collection/songwriting-course');
  const player = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(player.getByLabel('Melody instrument', { exact: true })).toHaveValue('piano');
  await player.getByLabel('Musical example', { exact: true }).selectOption('verse');
  await expect(player.getByLabel('Chords instrument', { exact: true })).toHaveValue('guitar');
  await player.getByLabel('Chords instrument', { exact: true }).selectOption('piano');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  for (const instrument of ['guitar', 'bass-guitar', 'piano']) {
    await player.getByLabel('Melody instrument', { exact: true }).selectOption(instrument);
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await expect(player.locator('.note.sounding')).not.toHaveCount(0);
  }
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByLabel('Musical example', { exact: true }).selectOption('bass');
  await expect(player.getByLabel('Bass instrument', { exact: true })).toHaveValue('bass-guitar');
  await player.getByLabel('Musical example', { exact: true }).selectOption('chorus');
  await expect(player.getByLabel('Chords instrument', { exact: true })).toHaveValue('piano');
  await expect(player.getByRole('slider')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('renders three distinct audible instrument tones with clean note endings', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'The shared sound engine is identical on phone.');
  await page.goto('/collection/songwriting-course');
  const tones = await page.evaluate(async () => {
    const modulePath = '/src/lib/music/instruments.ts';
    const { instrumentVoice } = await import(modulePath);
    const pianoPath = '/src/lib/music/piano.ts';
    const { preparePiano } = await import(pianoPath);
    const results: {
      instrument: string;
      rms: number;
      peak: number;
      tail: number;
      samples: number[];
    }[] = [];
    for (const instrument of ['piano', 'guitar', 'bass-guitar']) {
      const context = new OfflineAudioContext(1, 52800, 48000);
      if (instrument === 'piano') await preparePiano(context, [57]);
      const voice = instrumentVoice(context, context.destination, instrument, 220, 0, 1, 0.22);
      voice.oscillator.start(0);
      voice.oscillator.stop(1);
      const buffer = await context.startRendering();
      const data = buffer.getChannelData(0);
      const rms = (start: number, end: number) =>
        Math.sqrt(
          data.slice(start, end).reduce((sum, sample) => sum + sample * sample, 0) / (end - start),
        );
      results.push({
        instrument,
        rms: rms(480, 38400),
        peak: data.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
        tail: rms(49000, 52800),
        samples: Array.from(data.slice(4800, 5800)),
      });
    }
    return results;
  });
  for (const tone of tones) {
    expect(tone.rms, tone.instrument).toBeGreaterThan(0.01);
    expect(tone.peak, tone.instrument).toBeLessThan(1);
    expect(tone.tail, tone.instrument).toBeLessThan(0.00001);
  }
  for (let a = 0; a < tones.length; a++) {
    for (let b = a + 1; b < tones.length; b++) {
      const difference = Math.sqrt(
        tones[a].samples.reduce((sum, sample, i) => sum + (sample - tones[b].samples[i]) ** 2, 0) /
          tones[a].samples.length,
      );
      expect(difference, `${tones[a].instrument} / ${tones[b].instrument}`).toBeGreaterThan(0.005);
    }
  }
});
