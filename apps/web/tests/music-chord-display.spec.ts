import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chord studies (5)', exact: true }).click();
});
const playerFor = (page: import('@playwright/test').Page) =>
  page.getByRole('region', { name: 'Musical example player', exact: true });

test('existing chord editor uses proportional widths and retains keyboard reordering and saved sketches', async ({
  page,
}) => {
  const editor = page.locator('.chord-editor');
  await editor.locator('summary').click();
  const cards = editor.locator('.chord-card');
  await expect(cards).toHaveCount(4);
  await editor.getByLabel('Duration', { exact: true }).selectOption('1');
  const widths = await cards.evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect().width),
  );
  expect(widths[1] / widths[0]).toBeCloseTo(4, 1);
  await editor.getByRole('button', { name: 'Add vi (Am)', exact: true }).click();
  await expect(cards).toHaveCount(5);
  await cards.last().press('ArrowLeft');
  await expect(cards.nth(3)).toContainText('Am');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cards.last()).toContainText('Am');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Chord studies (5)', exact: true }).click();
  await editor.locator('summary').click();
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText('1 beat');
});

test('duration controls width, expansion does not, and keyboard/touch can expose chord layers', async ({
  page,
}, info) => {
  const player = playerFor(page);
  await expect(player.getByRole('button', { name: 'Chords', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(player.locator('.note-grid')).toHaveCount(0);
  const blocks = player.locator('.harmony-chord');
  const widths = await blocks.evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect().width),
  );
  expect(widths[1] / widths[0]).toBeCloseTo(2, 1);
  expect(widths[2] / widths[0]).toBeCloseTo(4, 1);
  expect(widths[3] / widths[0]).toBeCloseTo(1, 1);
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(99);
  await player.getByLabel('Musical example', { exact: true }).selectOption('chord-layers');
  const before = await blocks.evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect().width),
  );
  const summaries = blocks.locator('summary');
  await summaries.nth(2).focus();
  await summaries.nth(2).press('Enter');
  await expect(blocks.nth(2)).toHaveAttribute('open', '');
  await expect(blocks.nth(2).locator('[data-layer=base]')).toContainText('CEG');
  await expect(blocks.nth(2).locator('[data-layer=seventh]')).toContainText('B');
  await expect(blocks.nth(2).locator('[data-layer=ninth]')).toContainText('D');
  const after = await blocks.evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect().width),
  );
  expect(after[0]).toBeCloseTo(after[1], 1);
  expect(after[1]).toBeCloseTo(after[2], 1);
  expect(after).toEqual(before);
  if (info.project.name === 'phone') await summaries.nth(2).tap();
  else await summaries.nth(2).click();
  await expect(blocks.nth(2)).not.toHaveAttribute('open');
  await player.getByLabel('Musical example', { exact: true }).selectOption('chord-ninths');
  await blocks.nth(0).locator('summary').click();
  await expect(blocks.nth(0).locator('[data-layer=seventh]')).toHaveCount(0);
  await expect(blocks.nth(0).locator('[data-layer=ninth]')).toBeVisible();
  await blocks.nth(1).locator('summary').click();
  await expect(blocks.nth(1).locator('[data-layer=seventh]')).toBeVisible();
  await blocks.nth(2).locator('summary').click();
  await expect(blocks.nth(2).locator('[data-layer=seventh]')).toContainText('B♭');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({
    path: test.info().outputPath(`chord-layers-${info.project.name}.png`),
  });
});

test('derives inversions, keeps piano-roll alignment, and synchronizes unequal-duration playback', async ({
  page,
}) => {
  const player = playerFor(page);
  await player.getByLabel('Musical example', { exact: true }).selectOption('chord-bass');
  const blocks = player.locator('.harmony-chord');
  await expect(blocks.locator('strong')).toHaveText(['V', 'V⁶', 'I⁶₄']);
  await expect(blocks.locator('small')).toHaveText(['G', 'G/B', 'C/G']);
  await expect(blocks.nth(1).locator('.bass')).toHaveText('Bass B');
  await player.getByLabel('Musical example', { exact: true }).selectOption('chord-time');
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  const chord = await blocks.nth(1).boundingBox();
  const note = await player.locator('.note').nth(3).boundingBox();
  expect(chord!.x).toBeCloseTo(note!.x, 0);
  expect(chord!.width).toBeCloseTo(note!.width, 0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.harmony-chord.current')).toHaveAttribute('data-start', '1');
  await expect(player.locator('.note.sounding')).toHaveCount(3);
  const positions = await player.evaluate((el) => {
    const head = el.querySelector('.chord-playhead')!.getBoundingClientRect();
    const noteHead = el.querySelector('.note-grid .playhead')!.getBoundingClientRect();
    return [head.x, noteHead.x];
  });
  expect(positions[0]).toBeCloseTo(positions[1], 0);
  await expect(player.locator('.harmony-chord.current')).toHaveAttribute('data-start', '3');
  await player.getByRole('button', { name: 'Chords', exact: true }).click();
  await expect(player.locator('.position')).toHaveAttribute('data-playback', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(player.locator('.harmony-chord.current')).toHaveCount(0);
});

test('short chords scroll within the player and stay legible with dark theme colors', async ({
  page,
}, info) => {
  if (info.project.name === 'phone') await page.setViewportSize({ width: 320, height: 800 });
  const player = playerFor(page);
  await player.getByLabel('Musical example', { exact: true }).selectOption('chord-short');
  await player.locator('.harmony-chord').nth(1).locator('summary').click();
  await expect(player.locator('.harmony-chord').nth(1).locator('.chord-layers')).toBeVisible();
  await page.evaluate(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper', '#11110f');
    root.style.setProperty('--ink', '#ffffff');
    root.style.setProperty('--muted', '#cac9c1');
    root.style.setProperty('--green-dark', '#05ce78');
  });
  const scroller = player.locator('.harmony-scroll');
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await scroller.focus();
  await scroller.press('ArrowRight');
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.screenshot({ path: test.info().outputPath(`chord-dark-${info.project.name}.png`) });
});
