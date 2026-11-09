import { fillField } from './bearings-helpers';
import { expectFieldValue, fieldValue, writingCursor, setWritingCursor } from './bearings-helpers';
import { expect, test, type Page, type Locator } from '@playwright/test';
import { addTextCell } from './bearings-helpers';

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Notebook actions', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  return page.getByRole('dialog', { name: 'Settings', exact: true });
}
async function setup(page: Page) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Vim writing');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const cell = await addTextCell(page, 'one two\nlast');
  const dialog = await settings(page);
  const toggle = dialog.getByRole('switch', { name: 'Basic Vim mode', exact: true });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(dialog.getByRole('region', { name: 'Vim commands' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  return cell.locator('.cell-text');
}

test('cursor settings preview, persist and apply across Notebook, Tree and fullscreen', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  let field = await setup(page);
  let dialog = await settings(page);
  await dialog.getByRole('button', { name: 'Vertical', exact: true }).click();
  const thickness = dialog.getByRole('slider', { name: 'Cursor thickness', exact: true });
  await fillField(thickness, '5');
  await dialog.getByRole('button', { name: 'Blue cursor', exact: true }).click();
  await expect(dialog.locator('.preview-mark')).toHaveCSS('width', '5px');
  await expect(dialog.locator('.preview-mark')).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  await page.screenshot({ path: `/private/tmp/bearings-cursor-settings-${info.project.name}.png` });
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await field.focus();
  await expect(page.locator('.writing-caret.block')).toHaveCount(1);
  await field.press('i');
  if (info.project.name === 'desktop') {
    const caret = page.locator('.notebook-cell.active .writing-caret');
    await expect(caret).not.toHaveClass(/block/);
    await expect(caret).toHaveCSS('width', '5px');
    await expect.poll(async () => (await caret.boundingBox())?.height ?? 0).toBeGreaterThan(10);
    await expect(caret).toHaveCSS('background-color', 'rgb(37, 99, 235)');
    await field.press('ControlOrMeta+A');
    await expect(caret).toHaveCount(0);
    await expect(field).toHaveCSS('caret-color', 'rgb(37, 99, 235)');
    await field.press('ArrowRight');
    await expect(caret).toHaveCount(1);
  } else {
    await expect(page.locator('.writing-caret')).toHaveCount(0);
    await expect(field).toHaveCSS('caret-color', 'rgb(37, 99, 235)');
  }
  await page.reload();
  dialog = await settings(page);
  await expect(dialog.getByRole('button', { name: 'Vertical', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectFieldValue(
    dialog.getByRole('slider', { name: 'Cursor thickness', exact: true }),
    '5',
  );
  await expect(dialog.getByRole('button', { name: 'Blue cursor', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  field = page.locator('.tree-cell.selected .cell-text');
  await field.press('i');
  if (info.project.name === 'desktop')
    await expect(page.locator('.tree-cell.selected .writing-caret')).toHaveCSS('width', '5px');
  await field.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor' });
  const fullscreenField = focus.locator('.cell-text');
  if (info.project.name === 'desktop')
    await expect(focus.locator('.writing-caret')).toHaveCSS('width', '5px');
  else await expect(fullscreenField).toHaveCSS('caret-color', 'rgb(37, 99, 235)');
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  dialog = await settings(page);
  await dialog.getByRole('button', { name: 'Horizontal', exact: true }).click();
  await fillField(dialog.getByRole('slider', { name: 'Cursor thickness', exact: true }), '6');
  await fillField(dialog.getByLabel('Custom cursor color', { exact: true }), '#aa3366');
  await expect(dialog.locator('.preview-mark')).toHaveCSS('height', '6px');
  await dialog.getByRole('switch', { name: 'Basic Vim mode' }).click();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  field = page.locator('.notebook-cell .cell-text');
  await field.focus();
  if (info.project.name === 'desktop') {
    await expect(page.locator('.writing-caret')).toHaveCSS('height', '6px');
    await expect(page.locator('.writing-caret')).toHaveCSS('background-color', 'rgb(170, 51, 102)');
  }
  dialog = await settings(page);
  await dialog.getByRole('button', { name: 'Reset cursor', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Vertical', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectFieldValue(
    dialog.getByRole('slider', { name: 'Cursor thickness', exact: true }),
    '1',
  );
  await expect(dialog.getByRole('button', { name: 'Automatic', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await field.focus();
  if (info.project.name === 'desktop')
    await expect(page.locator('.writing-caret')).toHaveCSS('width', '1px');
});

test('optional Vim editing persists its setting and supports editing, motions, undo and cell splitting', async ({
  page,
}, info) => {
  const field = await setup(page);
  await field.focus();
  await expect(field).toHaveAttribute('data-vim-mode', 'normal');
  await field.pressSequentially('gg');
  const block = page.locator('.notebook-cell.active .writing-caret.block');
  await expect(block).toHaveCount(1);
  await expect.poll(async () => (await block.boundingBox())?.height ?? 0).toBeGreaterThan(10);
  await page.screenshot({ path: `/private/tmp/bearings-vim-block-${info.project.name}.png` });
  await field.pressSequentially('dw');
  await expectFieldValue(field, 'two\nlast');
  await field.press('u');
  await expectFieldValue(field, 'one two\nlast');
  await field.press('Control+r');
  await expectFieldValue(field, 'two\nlast');
  await field.pressSequentially('ggA');
  await expect(field).toHaveAttribute('data-vim-mode', 'insert');
  await expect(block).toHaveCount(0);
  const insertCaret = page.locator('.notebook-cell.active .writing-caret');
  if (info.project.name === 'desktop') await expect(insertCaret).toHaveCSS('width', '1px');
  else await expect(insertCaret).toHaveCount(0);
  await field.pressSequentially(' more');
  await field.press('Escape');
  await expect(block).toHaveCount(1);
  await expect(page.locator('.notebook-vim .vim-status')).toHaveAttribute(
    'aria-label',
    'Vim normal mode',
  );
  await expect(page.locator('.app-header .vim-status')).toHaveCount(0);
  const statusBox = (await page.locator('.notebook-vim .vim-status').boundingBox())!;
  const notebookBox = (await page.locator('.notebook').boundingBox())!;
  expect(statusBox.x - notebookBox.x).toBeLessThan(24);
  expect(notebookBox.y + notebookBox.height - statusBox.y - statusBox.height).toBeLessThan(24);

  await field.press('u');
  await expectFieldValue(field, 'two\nlast');
  await field.pressSequentially('ggyyGp');
  await expectFieldValue(field, 'two\nlast\ntwo');
  await field.pressSequentially('Gdd');
  await expectFieldValue(field, 'two\nlast');
  await field.pressSequentially('Go');
  await field.pressSequentially('---');
  await field.press('Enter');
  const next = page.locator('.notebook-cell.active .cell-text');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await expect(next).toHaveAttribute('data-vim-mode', 'insert');
  await next.pressSequentially('New thought');
  await next.press('Escape');
  await expectFieldValue(next, 'New thought');
  await next.press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await fillField(
    page.getByRole('textbox', { name: 'Situation title', exact: true }),
    'Native title editing',
  );
  await page.reload();
  await expect(page.locator('.notebook-vim .vim-status')).toHaveAttribute(
    'aria-label',
    'Vim normal mode',
  );
  await expectFieldValue(page.locator('.cell-text').last(), 'New thought');
  const dialog = await settings(page);
  await expect(dialog.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('switch').click();
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  const last = page.locator('.cell-text').last();
  await expect(last).not.toHaveAttribute('data-vim-mode');
  await expect(page.locator('.writing-caret.block')).toHaveCount(0);
  await last.focus();
  await setWritingCursor(last, Number.MAX_SAFE_INTEGER);
  await last.pressSequentially(' normal typing');
  await expectFieldValue(last, 'New thought normal typing');
  await page.reload();
  await expect(page.locator('.vim-status')).toHaveCount(0);
  await page.screenshot({ path: `/private/tmp/bearings-vim-disabled-${info.project.name}.png` });
});

test('Vim mode works in Tree and fullscreen while retaining card commands', async ({
  page,
}, info) => {
  await setup(page);
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  const inline = page.locator('.tree-cell.selected .cell-text');
  await expect(inline).toBeFocused();
  await inline.pressSequentially('ggi');
  await inline.pressSequentially('A thought: ');
  await inline.press('Escape');
  await expect(inline).toBeVisible(); // First Escape changes mode, keeping the editor open.
  await expectFieldValue(inline, 'A thought: one two\nlast');
  await inline.press('Shift+Enter');
  const fullscreen = page.getByRole('dialog', { name: 'Focus editor' });
  const editor = fullscreen.locator('.cell-text');
  await expect(editor).toBeFocused();
  await editor.pressSequentially('GA');
  await editor.pressSequentially(' line');
  await editor.press('Escape');
  await expect(fullscreen).toBeVisible();
  await expect(fullscreen.locator('.vim-status')).toHaveAttribute('aria-label', 'Vim normal mode');
  await expect(fullscreen.locator('.writing-caret.block')).toHaveCount(1);
  await page.screenshot({ path: `/private/tmp/bearings-vim-fullscreen-${info.project.name}.png` });
  await editor.press('Escape');
  await expect(fullscreen).not.toBeVisible();
  await page.locator('.tree-cell.selected').press('Enter');
  await inline.press('Meta+ArrowRight');
  await expect(page.locator('.tree-cell')).toHaveCount(2);
  const child = page.locator('.tree-cell.selected .cell-text');
  await expect(child).toBeFocused();
  await child.press('i');
  await child.pressSequentially('Child thought');
  await expectFieldValue(child, 'Child thought');
  await child.press('Escape');
  await child.press('Meta+Backspace');
  await expect(page.locator('.tree-cell')).toHaveCount(1);
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expectFieldValue(page.locator('.cell-text'), 'A thought: one two\nlast line');
});

test('slash toggles the library from Vim Normal mode and types normally in Insert mode', async ({
  page,
}) => {
  const field = await setup(page);
  const toggle = page.locator('.library-toggle');
  if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click();
  await field.focus();
  await field.press('d');
  await page.keyboard.down('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.down('/'); // Holding the key must not toggle a second time.
  await page.keyboard.up('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expectFieldValue(field, 'one two\nlast');
  await expect(page.locator('.notebook-vim .vim-status')).toHaveAttribute(
    'aria-label',
    'Vim normal mode',
  );
  await field.press('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(field).toBeFocused();
  await field.pressSequentially('ggA');
  await field.press('/');
  await expectFieldValue(field, 'one two/\nlast');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await field.press('Escape');
  await field.press('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, '/');
  await expectFieldValue(search, '/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await fillField(search, '');
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  const inline = page.locator('.tree-cell.selected .cell-text');
  await inline.press('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await inline.press('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expectFieldValue(inline, 'one two/\nlast');
  await inline.press('Shift+Enter');
  const fullscreen = page.getByRole('dialog', { name: 'Focus editor' });
  await fullscreen.locator('.cell-text').press('/');
  await expect(fullscreen).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expectFieldValue(fullscreen.locator('.cell-text'), 'one two/\nlast');
});

test('Shift Tab cycles text cell types in Vim Normal mode while preserving native navigation elsewhere', async ({
  page,
}) => {
  const field = await setup(page);
  const cell = page.locator('.notebook-cell.active');
  await field.pressSequentially('ggll');
  for (const kind of ['note', 'approach', 'answer']) {
    await page.keyboard.press('Shift+Tab');
    await expect(cell).toHaveAttribute('data-kind', kind);
    await expect(field).toBeFocused();
    await expectFieldValue(field, 'one two\nlast');
    expect(await writingCursor(field)).toBe(2);
  }
  await page.keyboard.down('Shift');
  await page.keyboard.down('Tab');
  await expect(cell).toHaveAttribute('data-kind', 'note');
  await page.keyboard.down('Tab');
  await page.keyboard.up('Shift');
  await page.keyboard.down('Tab'); // Releasing Shift during key repeat must not let focus escape.
  await page.keyboard.up('Tab');
  await expect(cell).toHaveAttribute('data-kind', 'note');
  await expect(field).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(field).not.toBeFocused();
  await expect(cell).toHaveAttribute('data-kind', 'note');
  await page.keyboard.press('Shift+Tab'); // Outside the editor, backward navigation remains native.
  await expect(field).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); // The previous shortcut no longer cycles types.
  await expect(field).not.toBeFocused();
  await expect(cell).toHaveAttribute('data-kind', 'note');
  await field.focus();
  await field.press('i');
  await field.press('Space');
  await field.press('Shift+Tab');
  await expect(field).not.toBeFocused();
  await expectFieldValue(field, 'on e two\nlast');
  await expect(cell).toHaveAttribute('data-kind', 'note');
  await field.press('Escape');
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  const inline = page.locator('.tree-cell.selected .cell-text');
  await inline.press('Shift+Tab');
  await expect(page.locator('.tree-cell.selected')).toHaveAttribute('data-kind', 'approach');
  await expect(inline).toBeFocused();
  await inline.press('Shift+Enter');
  const fullscreen = page.getByRole('dialog', { name: 'Focus editor' });
  const editor = fullscreen.locator('.cell-text');
  await editor.press('Shift+Tab');
  await expect(fullscreen.locator('.focus-content')).toHaveAttribute('data-kind', 'answer');
  await expect(editor).toBeFocused();
  await expectFieldValue(editor, 'on e two\nlast');
  await editor.press('Escape');
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved on this device');
  await page.reload();
  await expect(page.locator('.notebook-cell')).toHaveAttribute('data-kind', 'answer');
  await expectFieldValue(page.locator('.cell-text'), 'on e two\nlast');
});

test('holding Shift while tapping Tab repeatedly cycles types without moving focus to other controls', async ({
  page,
}) => {
  const field = await setup(page);
  async function cycle(editor: Locator, card: Locator) {
    await editor.pressSequentially('ggll');
    const text = await fieldValue(editor);
    const kinds = ['answer', 'note', 'approach'];
    const start = kinds.indexOf((await card.getAttribute('data-kind'))!);
    await page.keyboard.down('Shift');
    for (let index = 1; index <= 3; index++) {
      // Use the actual focused element: locator.press() would hide a focus escape by refocusing it.
      await page.keyboard.press('Tab');
      await expect(editor).toBeFocused();
      await expect(card).toHaveAttribute('data-kind', kinds[(start + index) % kinds.length]!);
      await expectFieldValue(editor, text);
      expect(await writingCursor(editor)).toBe(2);
    }
    await page.keyboard.up('Shift');
  }
  await cycle(field, page.locator('.notebook-cell.active'));
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  await cycle(page.locator('.tree-cell.selected .cell-text'), page.locator('.tree-cell.selected'));
  await page.keyboard.press('Shift+Enter');
  const fullscreen = page.getByRole('dialog', { name: 'Focus editor' });
  await cycle(fullscreen.locator('.cell-text'), fullscreen.locator('.focus-content'));
  await page.keyboard.press('Tab');
  await expect(fullscreen.locator('.cell-text')).not.toBeFocused();
});
