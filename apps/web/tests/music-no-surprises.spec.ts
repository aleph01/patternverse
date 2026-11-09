import { expect, test } from '@playwright/test';
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });
test.beforeEach(async ({ page, request }) => {
  const response = await request.get('/song-studies/no-surprises.json');
  test.skip(response.status() === 404, 'Prepare the private No Surprises MIDI study first.');
  await page.goto('/?study=radiohead-no-surprises-study');
});

test('plays the full MIDI, follows its chords and shows sixteenths correctly on desktop and phone', async ({
  page,
  request,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 850 });
  const manifest = await (await request.get('/song-studies/no-surprises.json')).json();
  expect(manifest.beats).toBe(284);
  expect(manifest.sections).toHaveLength(11);
  expect(manifest.recording).toBeUndefined();
  const errors: string[] = [],
    youtube: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (
      /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com)$/.test(new URL(r.url()).hostname)
    )
      youtube.push(r.url());
  });
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'radiohead-no-surprises-study',
  );
  await expect(player.locator('.form-section')).toHaveCount(11);
  await expect(player.getByLabel('Explore a section', { exact: true })).toHaveCount(0);
  await expect(player.getByLabel('Song playback position', { exact: true })).toHaveCount(0);
  await expect(player.locator('iframe')).toHaveCount(0);
  await player.locator('.form-section').nth(0).click();
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['I', 'iv', 'I', 'iv']);
  const widths = await player
    .locator('.ribbon-chord')
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width));
  expect(widths[0] / widths[1]).toBeCloseTo(3, 1);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.locator('.ribbon-chord[data-start="6"]').click();
  await expect(player.locator('.current-chord')).toContainText('Borrowed subdominant');
  await player.locator('.chord-notes>summary').click();
  await expect(player.locator('.chord-notes .layer strong')).toHaveText('B♭ · D♭ · F');
  await player.locator('.form-section').nth(1).click();
  await expect(
    player.getByRole('button', { name: 'Kick, bar 9, beat 2.75', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(player.locator('.counts')).toContainText('e');
  await expect(player.locator('.counts')).toContainText('a');
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await player.locator('.ribbon-chord[data-start="62"]').click();
  await player.locator('.explore>summary').click();
  await player.getByLabel('Chord names', { exact: true }).check();
  await player.locator('.explore>summary').click();
  await player.screenshot({
    path: test.info().outputPath(`no-surprises-${info.project.name}.png`),
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const collision = await player.evaluate((el) => {
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
  expect(collision).toBe(false);
  expect(errors).toEqual([]);
  expect(youtube).toEqual([]);
});

test('keeps bridge chord identity separate from bass and plays through the authored slowing outro', async ({
  page,
}) => {
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'radiohead-no-surprises-study',
  );
  await player.locator('.form-section').nth(5).click();
  await expect(player.locator('.ribbon-chord .roman')).toHaveText(['I', 'I', 'IV']);
  await expect(player.locator('.ribbon-chord').nth(1)).toContainText('Fmaj7/E');
  await expect(player.locator('.ribbon-chord').nth(2)).toContainText('B♭maj9/D');
  await player.locator('.ribbon-chord').nth(2).click();
  await player.locator('.chord-notes>summary').click();
  await expect(player.locator('.layer[data-layer="seventh"] strong')).toHaveText('A');
  await expect(player.locator('.layer[data-layer="ninth"] strong')).toHaveText('C');
  await player.getByRole('button', { name: 'Loop section', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await player.getByRole('button', { name: 'Loop song', exact: true }).click();
  await player.locator('.form-section').nth(10).click();
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.locator('.position')).toContainText('Bar 71');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toContainText('End', { timeout: 8000 });
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'paused');
});

test('uses only clickable section labels with compact scrolling navigation', async ({
  page,
}, info) => {
  const player = playerFor(page);
  await expect(player.getByLabel('Musical example', { exact: true })).toHaveValue(
    'radiohead-no-surprises-study',
  );
  for (const width of [320, 540, 680, 900, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(player.locator('.form-section')).toHaveCount(11);
    await expect(player.locator('.song-overview, .form-ruler')).toHaveCount(0);
    const geometry = await player.locator('.form-timeline').evaluate((el) => {
      const buttons = [...el.querySelectorAll('.form-section')].map((n) =>
        n.getBoundingClientRect(),
      );
      const track = el.querySelector('.section-track')!.getBoundingClientRect();
      const labels = [...el.querySelectorAll('.section-name')];
      return {
        ratio: buttons[0].width / buttons[3].width,
        height: track.height,
        width: el.getBoundingClientRect().width,
        namesFit: labels.every((label) => label.scrollWidth <= label.clientWidth + 1),
      };
    });
    expect(geometry.height).toBeLessThanOrEqual(48);
    expect(geometry.ratio).toBeCloseTo(2, 1);
    expect(geometry.namesFit).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await player.getByRole('button', { name: 'Explore Outro, bars 67–71', exact: true }).click();
    await expect(player.locator('.section-heading')).toContainText('Outro');
    await expect
      .poll(async () =>
        player.locator('.section-scroll').evaluate((el) => {
          const current = el.querySelector('[aria-current="step"]')!.getBoundingClientRect();
          const pane = el.getBoundingClientRect();
          return current.left >= pane.left - 1 && current.right <= pane.right + 1;
        }),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 900, height: 900 });
  await player
    .getByRole('button', { name: 'Explore Pre-chorus 1, bars 25–28', exact: true })
    .click();
  await expect(player.locator('.section-heading')).toContainText('Pre-chorus 1');
  await player.locator('.form-section').nth(3).locator('.section-name').click();
  await expect(player.getByLabel('Explore a section', { exact: true })).toHaveCount(0);
  await expect(player.locator('input[type="range"]')).toHaveCount(0);
  await expect(player.locator('.beat-grid .track-label')).toHaveText([
    'Kick',
    'Snare',
    'Hat / cymbal',
  ]);
  await player.getByRole('button', { name: /Minimize section/ }).click();
  await player.getByText('Instrument layers', { exact: true }).click();
  await expect(player.locator('.layer-label').filter({ hasText: /^Drums$/ })).toHaveCount(1);
  await expect(
    player.locator('.layer-label').filter({ hasText: /^(Kick|Snare|Hat \/ cymbal)$/ }),
  ).toHaveCount(0);
  await expect(player.getByRole('img', { name: /^Drums: first enters/ })).toHaveCount(1);
  await player.locator('.form-detail').screenshot({
    path: test.info().outputPath(`combined-drum-layer-${info.project.name}.png`),
  });
});
