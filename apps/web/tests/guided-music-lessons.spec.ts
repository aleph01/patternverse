import { expect, test } from '@playwright/test';
const cases = [
  {
    id: 'songwriting-pitch-and-intervals',
    title: 'Lean on Me · preserve the melodic distances',
    notice: 'E4 and F4',
    versions: 3,
    concept: 'An interval is the space between two notes',
    comparison: 'Move it higher',
  },
  {
    id: 'songwriting-borrow-a-chord',
    title: 'No Surprises · hear the borrowed third',
    notice: 'B♭–D–F',
    versions: 2,
    concept: 'Borrow a chord to change the colour',
    comparison: 'B♭ minor · borrowed',
  },
  {
    id: 'songwriting-syncopation-and-anticipation',
    title: 'Superstition · hear an entrance against the beat',
    notice: 'beat continues',
    versions: 2,
    concept: 'Place an entrance against a steady beat',
    comparison: 'Kick between beats',
  },
];
for (const lesson of cases)
  test(`${lesson.id}: plays, isolates, compares and stops audio between steps`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const Original = window.AudioContext,
        contexts: AudioContext[] = [];
      Object.assign(window, { lessonContexts: contexts });
      window.AudioContext = class extends Original {
        constructor() {
          super();
          contexts.push(this);
        }
      };
    });
    const samples: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.mp3')) samples.push(request.url());
    });
    await page.goto(`/pattern/${lesson.id}`);
    const study = page.getByRole('region', { name: lesson.title, exact: true });
    await expect(study).toBeVisible();
    await expect(study.getByRole('heading', { name: lesson.concept })).toBeVisible();
    await expect(
      study.getByRole('region', { name: 'Musical example player', exact: true }),
    ).toHaveCount(0);
    const sketch = study.getByRole('button', { name: 'Hear this sketch', exact: true });
    await expect(sketch).toBeEnabled();
    expect(samples).toHaveLength(0);
    await sketch.click();
    await expect(study.getByRole('button', { name: 'Pause', exact: true })).toHaveAttribute(
      'data-playback',
      'playing',
    );
    await study.getByRole('button', { name: lesson.comparison, exact: true }).click();
    await expect(sketch).toHaveAttribute('data-playback', 'paused');
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { lessonContexts: AudioContext[] }).lessonContexts.every(
            (context) => context.state === 'closed',
          ),
        ),
      )
      .toBe(true);
    await expect(study.locator('svg[role=img]')).toBeVisible();
    await study.screenshot({
      path: test.info().outputPath(`${lesson.id}-concept-${info.project.name}.png`),
    });
    await study.getByRole('button', { name: 'Explore a song example →', exact: true }).click();
    let player = study.getByRole('region', { name: 'Musical example player', exact: true });
    await expect(player.getByRole('group', { name: 'Audible parts' })).toHaveCount(0);
    await expect(player.getByRole('combobox')).toHaveCount(0);
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    await expect(player.getByLabel('Musical example', { exact: true })).toHaveCount(0);
    await expect(player.locator('input[type=file]')).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveCount(0);
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await study.getByRole('button', { name: '2 Isolate', exact: true }).click();
    player = study.getByRole('region', { name: 'Musical example player', exact: true });
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { lessonContexts: AudioContext[] }).lessonContexts.every(
            (context) => context.state === 'closed',
          ),
        ),
      )
      .toBe(true);
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await study.getByRole('button', { name: '3 Notice', exact: true }).click();
    await expect(study.locator('.guidance')).toContainText(lesson.notice);
    player = study.getByRole('region', { name: 'Musical example player', exact: true });
    await player.getByRole('button', { name: 'Notation', exact: true }).click();
    await expect(player.locator('.notation svg')).toBeVisible();
    await study.getByRole('button', { name: '4 Try', exact: true }).click();
    player = study.getByRole('region', { name: 'Musical example player', exact: true });
    await expect(
      player.getByRole('group', { name: 'Compare versions' }).getByRole('button'),
    ).toHaveCount(lesson.versions);
    await player.getByRole('button', { name: /^A / }).click();
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await player.getByRole('button', { name: /^B / }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(study.getByText('Use it in your music:', { exact: true })).toBeVisible();
    await study.getByText('Source & comparison notes', { exact: true }).click();
    await expect(study.locator('.sources a')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await study.screenshot({
      path: test.info().outputPath(`${lesson.id}-${info.project.name}.png`),
    });
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
    await study.getByRole('button', { name: 'Close the song example', exact: true }).click();
    await expect(
      study.getByRole('region', { name: 'Musical example player', exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { lessonContexts: AudioContext[] }).lessonContexts.every(
            (context) => context.state === 'closed',
          ),
        ),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  });

test('other course articles keep their existing player', async ({ page }) => {
  await page.goto('/pattern/songwriting-build-a-scale');
  await expect(page.locator('.guided-music')).toHaveCount(0);
  await expect(page.getByLabel('Musical example', { exact: true })).toBeEnabled();
});
