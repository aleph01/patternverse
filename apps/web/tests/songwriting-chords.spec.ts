import { expect, test } from '@playwright/test';

test.skip(!process.env.SONGWRITING_DRAFT_REVIEW, 'Local unpublished-course review only.');
const chapter = '/pattern/songwriting-chord-families-and-numbers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const contexts: AudioContext[] = [],
      voices: OscillatorNode[] = [],
      samples: AudioBufferSourceNode[] = [];
    Object.assign(window, { chordAudioTest: { contexts, voices, samples } });
    window.AudioContext = class extends Original {
      constructor() {
        super();
        contexts.push(this);
      }
      createBufferSource() {
        const source = super.createBufferSource();
        samples.push(source);
        return source;
      }
      createOscillator() {
        const voice = super.createOscillator();
        voices.push(voice);
        return voice;
      }
    };
  });
});

test('edits and transposes a persistent progression, supports undo, and plays the changed pitches', async ({
  page,
}) => {
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Key', { exact: true })).toBeEnabled();
  await expect(editor.locator('.progression .chord-card')).toHaveCount(4);
  await editor.getByRole('button', { name: 'Add vi (Am)', exact: true }).click();
  await expect(editor.locator('.progression .chord-card')).toHaveCount(5);
  await editor.getByLabel('Duration', { exact: true }).selectOption('2');
  await editor.getByLabel('Key', { exact: true }).selectOption('7');
  await expect(editor.locator('.progression .chord-card').first()).toContainText('G');
  await expect(editor.locator('.progression .chord-card').last()).toContainText('Em');
  await expect(editor.locator('.progression .chord-card').last()).toContainText('vi');
  await expect(editor.locator('.tones')).toHaveText('Chord tones: E · G · B');
  await editor.locator('.chord-card').last().focus();
  await editor.locator('.chord-card').last().press('ArrowLeft');
  await expect(editor.locator('.progression .chord-card').nth(3)).toContainText('Em');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor.locator('.progression .chord-card').last()).toContainText('Em');
  await editor.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor.locator('.progression .chord-card').nth(3)).toContainText('Em');
  await expect(editor.locator('.history [role=status]')).toHaveText('Saved on this device.');
  await page.reload();
  await expect(editor.getByLabel('Key', { exact: true })).toHaveValue('7');
  await expect(editor.locator('.progression .chord-card')).toHaveCount(5);
  await expect(editor.locator('.progression .chord-card').nth(3)).toContainText('2 beats');
  const player = editor.getByRole('region', { name: 'Chord sketch player', exact: true });
  await expect(player.getByLabel('Chords instrument', { exact: true })).toHaveValue('guitar');
  await player.getByLabel('Chords instrument', { exact: true }).selectOption('piano');
  await editor.getByRole('button', { name: 'Add ii (Am)', exact: true }).click();
  await expect(player.getByLabel('Chords instrument', { exact: true })).toHaveValue('piano');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await player.getByRole('button', { name: 'Piano roll', exact: true }).click();
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.harmony-chord.current')).toContainText('I');
  await expect(player.locator('.note.sounding')).toHaveCount(3);
  const rates = await page.evaluate(() =>
    (
      window as unknown as { chordAudioTest: { samples: AudioBufferSourceNode[] } }
    ).chordAudioTest.samples
      .slice(0, 3)
      .map((source) => source.playbackRate.value),
  );
  for (const [i, midi] of [55, 59, 62].entries()) {
    const recordedPitch = 21 + 3 * Math.round((midi - 21) / 3);
    expect(rates[i]).toBeCloseTo(2 ** ((midi - recordedPitch) / 12), 4);
  }
  await editor.getByLabel('Key', { exact: true }).selectOption('0');
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { chordAudioTest: { contexts: AudioContext[] } }
        ).chordAudioTest.contexts.every((context) => context.state === 'closed'),
      ),
    )
    .toBe(true);
  await page.goto('/collection/songwriting-example-songbook');
  const original = page.getByRole('region', { name: 'Musical example player', exact: true });
  await expect(original.locator('.setting')).toHaveText('C major · 4/4 · 84 bpm');
  await expect(original.locator('.harmony-chord strong').first()).toHaveText('I');
  await expect(original.locator('.harmony-chord small').first()).toHaveText('C');
});

test('shows minor conventions and keeps a partial final bar aligned with its actual duration', async ({
  page,
}, info) => {
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Scale', { exact: true })).toBeEnabled();
  await editor.getByLabel('Scale', { exact: true }).selectOption('minor');
  await editor.getByLabel('Key', { exact: true }).selectOption('9');
  await expect(editor.getByRole('button', { name: 'Add ♭VI (F)', exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Add v (Em)', exact: true })).toBeVisible();
  await editor.getByLabel('Starting point', { exact: true }).selectOption('verse');
  await expect(editor.getByLabel('Key', { exact: true })).toHaveValue('0');
  await expect(editor.getByLabel('Scale', { exact: true })).toHaveValue('major');
  await expect(editor.locator('.progression .chord-card')).toHaveCount(8);
  await editor.getByLabel('Starting point', { exact: true }).selectOption('home');
  await editor.getByRole('button', { name: 'Add ii (Dm)', exact: true }).click();
  await editor.locator('.progression .chord-card').first().click();
  await editor.getByLabel('Duration', { exact: true }).selectOption('1');
  const player = editor.getByRole('region', { name: 'Chord sketch player', exact: true });
  expect(
    await player
      .locator('.harmony-chord')
      .first()
      .evaluate((element: HTMLElement) => element.style.width),
  ).toBe('6.25%');
  await player.getByRole('button', { name: 'Next four bars', exact: true }).click();
  await expect(player.getByText('Bars 5–5 of 5', { exact: true })).toBeVisible();
  await expect(player.locator('.position')).toHaveText('Bar 5 · beat 1.0');
  await expect(player.getByRole('slider')).toHaveCount(0);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.locator('.position')).toHaveText('End · 17 beats', { timeout: 5000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await player.getByRole('button', { name: 'Previous four bars', exact: true }).click();
  await editor.screenshot({
    path: test.info().outputPath(`chord-editor-${info.project.name}.png`),
  });
});

test('keeps editing usable when storage fails and stops audio when the editor is collapsed', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Key', { exact: true })).toBeEnabled();
  await editor.getByRole('button', { name: 'Add ii (Dm)', exact: true }).click();
  await expect(editor.locator('.history [role=status]')).toContainText('could not save');
  const player = editor.getByRole('region', { name: 'Chord sketch player', exact: true });
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await editor.locator('summary').click();
  await expect(player).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { chordAudioTest: { contexts: AudioContext[] } }
        ).chordAudioTest.contexts.every((context) => context.state === 'closed'),
      ),
    )
    .toBe(true);
  await editor.locator('summary').click();
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(editor.locator('.progression .chord-card')).toHaveCount(5);
});

test('drags a chord across rows, preserves the intervening order, and supports undo and saving', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'phone', 'Touch devices use the Position selector.');
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Key', { exact: true })).toBeEnabled();
  await editor.getByRole('button', { name: 'Add vi (Am)', exact: true }).click();
  const cards = editor.locator('.chord-card');
  await expect(cards.last()).toHaveAttribute('draggable', 'true');
  const player = editor.getByRole('region', { name: 'Chord sketch player', exact: true });
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await cards.last().dragTo(cards.nth(1), { targetPosition: { x: 5, y: 55 } });
  await expect(cards.locator('strong')).toHaveText(['I', 'vi', 'IV', 'V', 'I']);
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(editor.locator('.progression li.dragging')).toHaveCount(0);
  await expect(
    editor.locator('.progression li.drop-before, .progression li.drop-after'),
  ).toHaveCount(0);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'IV', 'V', 'I', 'vi']);
  await editor.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'vi', 'IV', 'V', 'I']);
  await page.reload();
  await expect(cards.locator('strong')).toHaveText(['I', 'vi', 'IV', 'V', 'I']);
  const target = await cards.nth(3).boundingBox();
  await cards.first().dragTo(cards.nth(3), { targetPosition: { x: target!.width - 4, y: 55 } });
  await expect(cards.locator('strong')).toHaveText(['vi', 'IV', 'V', 'I', 'I']);
  await expect(cards.nth(3)).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'vi', 'IV', 'V', 'I']);
});

test('reveals card icons on hover or focus, duplicates the targeted chord, and prevents removing the last chord', async ({
  page,
}, info) => {
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Key', { exact: true })).toBeEnabled();
  const cards = editor.locator('.chord-card');
  const actions = editor.locator('.card-actions');
  if (info.project.name === 'desktop') {
    await editor.getByLabel('Key', { exact: true }).focus();
    await expect(actions.nth(1)).toHaveCSS('opacity', '0');
    await cards.nth(1).hover();
    await expect(actions.nth(1)).toHaveCSS('opacity', '1');
    await editor.getByLabel('Key', { exact: true }).hover();
    await cards.nth(1).focus();
    await expect(actions.nth(1)).toHaveCSS('opacity', '1');
  } else {
    await cards.nth(1).tap();
    await expect(actions.nth(1)).toHaveCSS('opacity', '1');
    const box = await actions
      .nth(1)
      .getByRole('button', { name: 'Duplicate chord 2', exact: true })
      .boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await editor.getByRole('button', { name: 'Duplicate chord 2', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'IV', 'IV', 'V', 'I']);
  await expect(cards.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: 'Remove chord 3', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'IV', 'V', 'I']);
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cards.locator('strong')).toHaveText(['I', 'IV', 'IV', 'V', 'I']);
  for (let count = 5; count > 1; count -= 1) {
    if (info.project.name === 'desktop') await cards.nth(count - 1).hover();
    else await cards.nth(count - 1).tap();
    await editor.getByRole('button', { name: `Remove chord ${count}`, exact: true }).click();
  }
  await expect(cards).toHaveCount(1);
  await expect(editor.getByRole('button', { name: 'Remove chord 1', exact: true })).toBeDisabled();
  await expect(editor.locator('.inspector .actions')).toHaveCount(0);
});

test('reorders on touch through Position and keeps keyboard movement available', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Position is the touch fallback.');
  await page.goto(chapter);
  const editor = page.locator('details.chord-editor');
  await expect(editor.getByLabel('Key', { exact: true })).toBeEnabled();
  const cards = editor.locator('.chord-card');
  await cards.nth(2).tap();
  await expect(cards.nth(2)).toHaveAttribute('draggable', 'false');
  const position = editor.locator('.inspector').getByLabel('Position', { exact: true });
  await expect(position).toBeVisible();
  await position.selectOption('0');
  await expect(cards.locator('strong')).toHaveText(['V', 'I', 'IV', 'I']);
  await cards.first().focus();
  await cards.first().press('ArrowRight');
  await expect(cards.locator('strong')).toHaveText(['I', 'V', 'IV', 'I']);
  await expect(cards.nth(1)).toBeFocused();
  await expect(editor.locator('[aria-live=polite]')).toHaveText('Moved V to position 2 of 4.');
});
