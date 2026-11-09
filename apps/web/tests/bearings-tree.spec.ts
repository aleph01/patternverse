import { fillField, clickNotebookControl } from './bearings-helpers';
import { expectFieldValue, setWritingCursor, writingCursor } from './bearings-helpers';
import { expect, test, type Page } from '@playwright/test';

async function openTree(page: Page) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  const id = await page.evaluate(async () => {
    const modulePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(modulePath);
    const workspace = await getLocalWorkspace();
    const situation = await workspace.createSituation('A little more clarity');
    const cells = [
      {
        id: 'root',
        kind: 'note',
        title: 'What comes next?',
        text: 'A direction that feels useful.',
      },
      {
        id: 'fit',
        parentId: 'root',
        kind: 'note',
        title: 'Work that fits',
        text: 'More making and mentoring.',
      },
      {
        id: 'energy',
        parentId: 'fit',
        kind: 'note',
        title: 'Follow the energy',
        text: 'Helping someone make sense of a difficult problem.',
      },
      {
        id: 'detail',
        parentId: 'energy',
        kind: 'note',
        title: 'A useful conversation',
        text: 'Invite a friend to bring a real problem.',
      },
      {
        id: 'other',
        parentId: 'fit',
        kind: 'note',
        title: 'Another angle',
        text: 'Try something smaller.',
      },
      {
        id: 'space',
        parentId: 'root',
        kind: 'note',
        title: 'Enough room to choose',
        text: 'Keep a steady base.',
      },
      {
        id: 'floor',
        parentId: 'space',
        kind: 'note',
        title: 'A practical floor',
        text: 'Decide what income and time I need.',
      },
      {
        id: 'experiment',
        parentId: 'root',
        kind: 'approach',
        title: 'Try a smaller move',
        text: 'One experiment, then review.',
      },
    ];
    await workspace.updateSituation(
      situation.id,
      {
        title: situation.title,
        context: '',
        notebook: {
          version: 1,
          chapters: [{ id: 'chapter', title: 'Beginning', collapsed: false, cells }],
          activeChapterId: 'chapter',
          draft: '',
          draftKind: 'note',
          scrollTop: 0,
          view: 'tree',
          activeCellId: 'fit',
        },
      },
      situation.revision,
    );
    return situation.id;
  });
  await page.goto(`/apps/bearings?situation=${id}&preview=1`);
  await expect(
    page.getByRole('region', { name: 'Hierarchical notebook', exact: true }),
  ).toBeVisible();
  const close = page.getByRole('button', { name: 'Collapse library', exact: true });
  if (await close.isVisible()) await close.click();
  return page.locator('.tree-view');
}
async function nameNewNote(page: Page, title: string) {
  const tree = page.locator('.tree-view');
  await fillField(tree.locator('.cell-text'), `${title} body`);
  await tree.locator('.cell-text').press('Escape');
  return tree.locator('.tree-cell.selected').getAttribute('data-cell');
}

test('keeps all families visible and aligns each parent with its own children as writing grows', async ({
  page,
}, info) => {
  const tree = await openTree(page);
  const fit = tree.locator('[data-cell="fit"]');
  const energy = tree.locator('[data-cell="energy"]');
  const other = tree.locator('[data-cell="other"]');
  await expect(tree.locator('.tree-cell')).toHaveCount(8);
  await expect(tree.locator('[data-cell="floor"]')).toBeAttached();
  await expect(tree.locator('[data-cell="detail"]')).toBeAttached();
  async function centerDifference() {
    const parent = await fit.boundingBox(),
      first = await energy.boundingBox(),
      last = await other.boundingBox();
    return Math.abs(parent!.y + parent!.height / 2 - (first!.y + last!.y + last!.height) / 2);
  }
  await expect.poll(centerDifference).toBeLessThan(1);
  await expect(fit).toHaveAttribute('data-outgoing-top', 'concave');
  await expect(energy).toHaveAttribute('data-incoming-top', 'convex');
  const parentBox = await fit.boundingBox(),
    childBox = await energy.boundingBox();
  expect(Math.abs(parentBox!.x + parentBox!.width - childBox!.x)).toBeLessThan(1);
  const originalTop = await fit.evaluate((card) => (card as HTMLElement).style.top);
  await fit.locator('.select-note').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(tree.locator('.tree-cell')).toHaveCount(8);
  // Selecting another branch changes emphasis, not the positions or visibility of other cards.
  await expect
    .poll(() => fit.evaluate((card) => (card as HTMLElement).style.top))
    .toBe(originalTop);
  await fit.locator('.select-note').click();
  await fillField(fit.locator('.cell-text'), 'A thought with enough detail to grow.\n'.repeat(12));
  await expect(fit).toHaveAttribute('data-outgoing-top', 'convex');
  await expect(energy).toHaveAttribute('data-incoming-top', 'concave');
  await expect.poll(centerDifference).toBeLessThan(1);
  await expect(fit.locator('.cell-text')).toBeFocused();
  await page.screenshot({ path: `/private/tmp/bearings-all-branches-${info.project.name}.png` });
});

test('drags complete branches between parents, reorders siblings and restores moves with Undo', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Native mouse drag; touch gestures have separate coverage',
  );
  const tree = await openTree(page);
  const card = (id: string) => tree.locator(`[data-cell="${id}"]`);
  await expect(tree.locator('.move-card')).toHaveCount(0);
  async function drag(id: string, targetId: string, where: 'above' | 'below' | 'child') {
    const source = card(id),
      target = card(targetId);
    await target.scrollIntoViewIfNeeded();
    await source.scrollIntoViewIfNeeded();
    await source.hover();
    const handle = source.locator('.select-note');
    const box = (await target.boundingBox())!;
    await handle.dragTo(target, {
      targetPosition: {
        x: box.width / 2,
        y: where === 'above' ? 6 : where === 'below' ? box.height - 6 : box.height / 2,
      },
    });
  }
  await drag('energy', 'floor', 'above');
  await expect(card('energy')).toHaveAttribute('data-parent', 'space');
  await expect(card('detail')).toHaveAttribute('data-parent', 'energy');
  await expect(tree.locator('.tree-cell')).toHaveCount(8);
  await drag('energy', 'floor', 'below');
  await expect
    .poll(() =>
      tree
        .locator('.tree-column')
        .nth(2)
        .locator('.tree-cell')
        .evaluateAll((cards) => cards.map((card) => (card as HTMLElement).dataset.cell)),
    )
    .toEqual(['other', 'floor', 'energy']);
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() =>
      tree
        .locator('.tree-column')
        .nth(2)
        .locator('.tree-cell')
        .evaluateAll((cards) => cards.map((card) => (card as HTMLElement).dataset.cell)),
    )
    .toEqual(['other', 'energy', 'floor']);
  await drag('energy', 'experiment', 'child');
  await expect(card('energy')).toHaveAttribute('data-parent', 'experiment');
  await expect(card('detail')).toHaveAttribute('data-parent', 'energy');
  // A parent cannot be dropped into its descendant.
  await drag('experiment', 'energy', 'child');
  await expect(card('experiment')).toHaveAttribute('data-parent', 'root');
  await expect(card('energy')).toHaveAttribute('data-parent', 'experiment');
  await page.reload();
  await expect(card('energy')).toHaveAttribute('data-parent', 'experiment');
  await expect(card('detail')).toContainText('Invite a friend');
  await expect(tree.locator('.tree-cell')).toHaveCount(8);
  await card('energy').hover();
  await card('energy')
    .locator('.select-note')
    .dragTo(tree.locator('.tree-viewport'), { targetPosition: { x: 12, y: 12 } });
  await expect(card('energy')).toHaveAttribute('data-parent', '');
  await expect(card('detail')).toHaveAttribute('data-parent', 'energy');
});

test('moves a branch by dragging its card with a touch gesture', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Touch-specific interaction');
  const tree = await openTree(page);
  const source = tree.locator('[data-cell="fit"]');
  const target = tree.locator('[data-cell="space"]');
  await source.locator('.select-note').tap();
  await expect(source.locator('.cell-text')).toBeFocused();
  await source.locator('.cell-text').press('Escape');
  await source.scrollIntoViewIfNeeded();
  const handle = (await source.locator('.select-note').boundingBox())!;
  const box = (await target.boundingBox())!;
  const x = handle.x + handle.width / 2,
    y = handle.y + handle.height / 2;
  const endX = box.x + box.width / 2,
    endY = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step++)
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + ((endX - x) * step) / 12, y: y + ((endY - y) * step) / 12 }],
      });
    await expect(target).toHaveClass(/drop-child/);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(source).toHaveAttribute('data-parent', 'space');
    await expect(tree.locator('[data-cell="detail"]')).toHaveAttribute('data-parent', 'energy');
    await tree.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(source).toHaveAttribute('data-parent', 'root');
    await expect(tree.locator('.tree-cell')).toHaveCount(8);
  } finally {
    await client.detach();
  }
});

test('deselects on empty canvas clicks without losing writing or collapsing the visible branch', async ({
  page,
}) => {
  const tree = await openTree(page);
  const card = tree.locator('[data-cell="fit"]');
  await card.locator('.select-note').click();
  await fillField(card.locator('.cell-text'), 'Keep this thought when I click away.');
  const cellCount = await tree.locator('.tree-cell').count();
  const columnCount = await tree.locator('.tree-column').count();
  await tree.locator('.tree-viewport').click({ position: { x: 12, y: 12 } });
  await expect(tree.locator('.tree-cell.selected')).toHaveCount(0);
  await expect(tree.locator('.cell-text')).toHaveCount(0);
  await expect(tree.locator('.tree-column')).toHaveCount(columnCount);
  await expect(card).toContainText('Keep this thought when I click away.');
  await page.keyboard.press('Meta+Backspace');
  await expect(tree.locator('.tree-cell')).toHaveCount(cellCount);
  await page.keyboard.press('ArrowDown');
  await expect(card).toHaveClass(/selected/);
  await expect(card.locator('.select-note')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectFieldValue(card.locator('.cell-text'), 'Keep this thought when I click away.');
  await tree.locator('.tree-viewport').click({ position: { x: 12, y: 12 } });
  await expect(tree.locator('.tree-cell.selected')).toHaveCount(0);
  await page.reload();
  await expect(tree.locator('.tree-column').first()).toBeVisible();
  await expect(tree.locator('.tree-cell.selected')).toHaveCount(0);
  await card.locator('.select-note').click();
  await expect(card).toHaveClass(/selected/);
  await expectFieldValue(card.locator('.cell-text'), 'Keep this thought when I click away.');
});

test('navigates with arrows from card selection and writing edges while retaining text editing keys', async ({
  page,
}) => {
  const tree = await openTree(page);
  const editor = tree.locator('.cell-text');
  async function selected(id: string) {
    const card = tree.locator('.tree-cell.selected');
    await expect(card).toHaveAttribute('data-cell', id);
    await expect(card.locator('.select-note')).toBeFocused();
  }
  await tree.locator('[data-cell="space"] .select-note').click();
  const text = 'First paragraph.\nMiddle paragraph.\nLast paragraph.';
  await fillField(editor, text);
  await setWritingCursor(editor, 5);
  await editor.press('ArrowLeft');
  await expect.poll(() => writingCursor(editor)).toBe(4);
  await setWritingCursor(editor, 0);
  await editor.press('ArrowDown');
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', 'space');
  await expect.poll(() => writingCursor(editor)).toBeGreaterThan(0);
  await setWritingCursor(editor, 0);
  await editor.press('Shift+ArrowLeft');
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', 'space');
  await editor.press('ArrowUp');
  await selected('fit');
  await page.keyboard.press('ArrowDown');
  await selected('space');
  await page.keyboard.press('ArrowLeft');
  await selected('root');
  await page.keyboard.press('ArrowRight');
  await selected('fit');
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await setWritingCursor(editor, 0);
  await editor.press('ArrowLeft');
  await selected('root');
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await setWritingCursor(editor, (await editor.innerText()).length);
  await editor.press('ArrowRight');
  await selected('fit');
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await setWritingCursor(editor, (await editor.innerText()).length);
  await editor.press('ArrowDown');
  await selected('space');
  await expect(tree.locator('[data-cell="space"]')).toContainText('Middle paragraph.');
});

test('uses arrows for Tree navigation in Vim Normal mode without taking Insert or fullscreen arrows', async ({
  page,
}) => {
  const tree = await openTree(page);
  await page.evaluate(() => localStorage.setItem('bearings-vim-mode', 'true'));
  await page.reload();
  const card = tree.locator('.tree-cell.selected');
  const editor = tree.locator('.cell-text');
  await tree.locator('[data-cell="fit"] .select-note').click();
  await expect(editor).toHaveAttribute('data-vim-mode', 'normal');
  await setWritingCursor(editor, 5);
  await editor.press('ArrowDown');
  await expect(card).toHaveAttribute('data-cell', 'space');
  await expect(card.locator('.select-note')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(card).toHaveAttribute('data-cell', 'fit');
  await expect(card.locator('.select-note')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await editor.press('i');
  await setWritingCursor(editor, 5);
  await editor.press('ArrowRight');
  await expect.poll(() => writingCursor(editor)).toBe(6);
  await expect(card).toHaveAttribute('data-cell', 'fit');
  await editor.press('Escape');
  await expect(editor).toHaveAttribute('data-vim-mode', 'normal');
  await editor.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus).toBeVisible();
  await focus.locator('.cell-text').press('ArrowRight');
  await expect(card).toHaveAttribute('data-cell', 'fit');
  await expect(focus).toBeVisible();
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(card.locator('.select-note')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();
  await editor.press('ArrowRight');
  await expect(card).toHaveAttribute('data-cell', 'energy');
  await expect(card.locator('.select-note')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(card).toHaveAttribute('data-cell', 'fit');
});

test('shares edited hierarchical notes between adjoining tree columns and the notebook, including reload', async ({
  page,
}, info) => {
  const tree = await openTree(page);
  await expect(tree.locator('.tree-column')).toHaveCount(4);
  const boxes = await tree
    .locator('.tree-column')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  expect(Math.abs(boxes[0]!.right - boxes[1]!.left)).toBeLessThan(1);
  const colors = await tree.locator('.tree-cell').evaluateAll((es) =>
    es.map((e) => ({
      selected: e.classList.contains('selected'),
      color: getComputedStyle(e).color,
    })),
  );
  expect(colors.find((c) => c.selected)!.color).not.toBe(colors.find((c) => !c.selected)!.color);
  await tree.locator('[data-cell="fit"] .select-note').click();
  await expect(tree.getByRole('textbox', { name: 'Note title', exact: true })).toHaveCount(0);
  await expect(tree.locator('.cell-text')).toBeFocused();
  await expectFieldValue(
    tree.locator('.cell-text'),
    'Work that fits\n\nMore making and mentoring.',
  );
  const textarea = tree.locator('.cell-text');
  await fillField(textarea, 'A thought in place.');
  await textarea.press('Control+End');
  await textarea.press('Enter');
  await expectFieldValue(textarea, 'A thought in place.\n');
  await textarea.press('Escape');
  await page.keyboard.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus).toBeVisible();
  await expect(focus.locator('.cell-text')).toBeFocused();
  const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const bounds = await focus.boundingBox();
  expect(Math.abs(bounds!.x)).toBeLessThan(1);
  expect(Math.abs(bounds!.y)).toBeLessThan(1);
  expect(Math.abs(bounds!.width - screen.width)).toBeLessThan(1);
  expect(Math.abs(bounds!.height - screen.height)).toBeLessThan(1);
  await expect(focus.getByRole('textbox', { name: 'Note title', exact: true })).toHaveCount(0);
  await fillField(focus.locator('.cell-text'), 'Written in fullscreen.');
  await page.screenshot({ path: `/private/tmp/bearings-tree-focus-${info.project.name}.png` });
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', 'detail');
  await expect
    .poll(() => tree.locator('.tree-viewport').evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
  await page.keyboard.press('Meta+ArrowRight');
  const newId = await nameNewNote(page, 'A new child');
  await expect(tree.locator('.note-path')).toContainText('A useful conversation');
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  const cell = page.locator(`.viewport [data-cell="${newId}"]`);
  await expect(cell.locator('.cell-title')).toHaveCount(0);
  await expectFieldValue(cell.locator('.cell-text'), 'A new child body');
  await fillField(cell.locator('.cell-text'), 'Edited in the notebook.');
  await expectFieldValue(
    page.locator('.viewport [data-cell="fit"] .cell-text'),
    'Written in fullscreen.',
  );
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', newId!);
  await expect(tree.locator('.tree-cell.selected')).toContainText('Edited in the notebook.');
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'A little more clarity' }).click();
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', newId!);
  await page.reload();
  await expect(tree.locator('.tree-cell.selected')).toHaveAttribute('data-cell', newId!);
  await expect(tree.locator('.tree-cell.selected')).toContainText('Edited in the notebook.');
  await page.screenshot({ path: `/private/tmp/bearings-tree-${info.project.name}.png` });
});

test('supports card navigation, add, move, delete and merge shortcuts with undo', async ({
  page,
}) => {
  const tree = await openTree(page);
  await tree.locator('[data-cell="fit"] .select-note').click();
  await clickNotebookControl(page, 'Keyboard shortcuts');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
  await expect(help).toContainText('Merge into next');
  await expect(help).not.toContainText('Other Shortcuts');
  await help.getByRole('button', { name: 'Close keyboard shortcuts', exact: true }).click();
  await page.keyboard.press('ArrowDown');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', 'space');
  await page.keyboard.press('Alt+ArrowUp');
  await expect(tree.locator('.tree-column').nth(1).locator('.tree-cell').first()).toHaveAttribute(
    'data-cell',
    'space',
  );
  await page.keyboard.press('Alt+ArrowDown');
  await page.keyboard.press('Alt+ArrowRight');
  await expect(tree.locator('.note-path')).toContainText('Work that fits');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(tree.locator('.note-path')).not.toContainText('Work that fits');
  await page.keyboard.press('Control+ArrowUp');
  const above = await nameNewNote(page, 'Above');
  await page.keyboard.press('Meta+ArrowDown');
  const below = await nameNewNote(page, 'Below');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', below!);
  await page.keyboard.press('Meta+Shift+ArrowUp');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', above!);
  await expect(tree.locator('.selected')).toContainText('Below body');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.keyboard.press('Meta+Shift+ArrowDown');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', 'space');
  await expect(tree.locator('.selected')).toContainText('Enough room to choose');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.keyboard.press('Meta+Backspace');
  await expect(tree.locator('.tree-status')).toContainText('deleted');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', below!);
  await page.keyboard.press('Alt+ArrowDown');
  await expect(tree.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  const text = tree.locator('.cell-text');
  await text.press('Control+End');
  await text.press('/');
  await expectFieldValue(text, 'Below body/');
  await expect(tree.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  await text.press('Meta+ArrowRight');
  await expect(tree.locator('.note-path')).toContainText('Below body/');
  await expectFieldValue(tree.locator('.cell-text'), '');
});

test('runs card shortcuts while writing and in fullscreen without losing the text', async ({
  page,
}) => {
  test.setTimeout(45000);
  const tree = await openTree(page);
  await tree.locator('[data-cell="fit"] .select-note').click();
  const editor = tree.locator('.cell-text');
  await fillField(editor, 'Keep this thought.');
  await editor.press('Control+End');
  await editor.press('Enter');
  await editor.press('ArrowLeft');
  await expectFieldValue(editor, 'Keep this thought.\n');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', 'fit');
  await editor.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus.locator('.cell-text')).toBeFocused();
  await expectFieldValue(focus.locator('.cell-text'), 'Keep this thought.\n');
  await focus.locator('.cell-text').press('Meta+ArrowRight');
  await expect(focus).not.toBeVisible();
  await expect(editor).toBeFocused();
  await fillField(editor, 'Child body');
  const child = await tree.locator('.selected').getAttribute('data-cell');
  await editor.press('Control+ArrowUp');
  await expect(editor).toBeFocused();
  await fillField(editor, 'Above body');
  const above = await tree.locator('.selected').getAttribute('data-cell');
  await editor.press('Meta+ArrowDown');
  await fillField(editor, 'Between body');
  const between = await tree.locator('.selected').getAttribute('data-cell');
  await editor.press('Meta+Shift+ArrowDown');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', child!);
  await expect(tree.locator('.selected')).toContainText('Between body');
  await expect(tree.locator('.selected')).toContainText('Child body');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.keyboard.press('Enter');
  await editor.press('Meta+Shift+ArrowUp');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', above!);
  await expect(tree.locator('.selected')).toContainText('Above body');
  await expect(tree.locator('.selected')).toContainText('Between body');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press('Enter');
    await expect(editor).toBeFocused();
    await editor.press(`Alt+${key}`);
    await expect(tree.locator('.tree-status')).toContainText('moved');
    await expect(tree.locator('.selected')).toHaveAttribute('data-cell', between!);
  }
  await page.keyboard.press('Enter');
  await editor.press('Shift+Enter');
  await focus.locator('.cell-text').press('Meta+Backspace');
  await expect(focus).not.toBeVisible();
  await expect(tree.locator(`[data-cell="${between}"]`)).toHaveCount(0);
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', between!);
  await expect(tree.locator('.selected')).toContainText('Between body');
  await page.keyboard.press('Shift+Enter');
  await focus.locator('.cell-text').press('Escape');
  await expect(focus).not.toBeVisible();
  await expect(tree.locator('.selected .select-note')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', 'fit');
  await expect(tree.locator('.selected')).toContainText('Keep this thought.');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Confidence');
  await search.press('Meta+ArrowRight');
  await search.press('Shift+Enter');
  await expect(focus).not.toBeVisible();
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', 'fit');
});

test('keeps library patterns, ratings, and the inline reader available in tree view', async ({
  page,
}, info) => {
  test.setTimeout(45000);
  const tree = await openTree(page);
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await fillField(
    page.getByRole('searchbox', { name: 'Search patterns and ratings' }),
    'Define the Decision',
  );
  await page
    .getByRole('button', {
      name: 'Add pattern: Define the Decision Before Comparing Options',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(tree.locator('.selected')).toContainText(
    'Define the Decision Before Comparing Options',
  );
  await tree.getByRole('button', { name: 'Read pattern', exact: true }).click();
  const reader = page.locator('.pattern-reader');
  await expect(reader).toBeVisible();
  await expect(reader.locator('.markdown-body')).toBeVisible({ timeout: 15000 });
  await reader.getByRole('button', { name: 'Close pattern reader', exact: true }).click();
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await fillField(
    page.getByRole('searchbox', { name: 'Search patterns and ratings' }),
    'Confidence',
  );
  await page.getByRole('button', { name: 'Add Confidence rating', exact: true }).click();
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  const slider = tree.getByRole('slider', { name: 'Confidence', exact: true });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(tree.locator('.selected output')).toHaveText('1 / 10');
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(page.locator('.viewport .rating output')).toHaveText('1 / 10');
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(tree.locator('.tree-cell.selected')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tree.locator('.selected')).toContainText(
    'Define the Decision Before Comparing Options',
  );
  await page.keyboard.press('ArrowRight');
  await expect(tree.locator('.selected')).toHaveAttribute('aria-label', 'Card: Confidence');
  await page.keyboard.press('Enter');
  await expect(tree.getByRole('textbox', { name: 'Rating name', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tree.locator('.tree-cell.selected')).toBeFocused();
  if (info.project.name === 'desktop')
    await page.screenshot({ path: '/private/tmp/bearings-tree-library.png' });
});

test('starts a tree from an empty notebook and folds branches in reading view without losing them', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'A new outline');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const library = page.getByRole('button', { name: 'Collapse library', exact: true });
  if (await library.isVisible()) await library.click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const tree = page.locator('.tree-view');
  await tree.getByRole('button', { name: 'Start writing', exact: true }).click();
  const parent = await nameNewNote(page, 'A first thought');
  await tree
    .locator(`[data-cell="${parent}"]`)
    .getByRole('button', { name: 'Add child note', exact: true })
    .click();
  const child = await nameNewNote(page, 'A useful detail');
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  const disclosure = page
    .locator(`.viewport [data-cell="${parent}"]`)
    .getByRole('button', { name: 'Collapse note branch', exact: true });
  await disclosure.click();
  await expect(page.locator(`.viewport [data-cell="${child}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(tree.locator(`[data-cell="${child}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(page.locator(`.viewport [data-cell="${child}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand note branch', exact: true }).click();
  await expectFieldValue(
    page.locator(`.viewport [data-cell="${child}"] .cell-text`),
    'A useful detail body',
  );
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 760 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `/private/tmp/bearings-tree-empty-${info.project.name}.png` });
  expect(
    await tree.locator('footer').evaluate((e) => e.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(52);
});

test('uses compact hover buttons to add above, below and beside the hovered card', async ({
  page,
}, info) => {
  const tree = await openTree(page);
  const space = tree.locator('[data-cell="space"]');
  if (info.project.name === 'desktop') {
    await space.hover();
    await expect(space.getByRole('button', { name: 'Edit in fullscreen', exact: true })).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(tree.locator('[data-cell="fit"] .fullscreen-control')).toHaveCSS('opacity', '0');
  }
  await space.locator('.select-note').click();
  await expect(space.locator('.cell-text')).toBeFocused();
  await expect(space.locator('.add-above, .add-below, .add-child')).toHaveCount(0);
  await expect(
    space.getByRole('button', { name: 'Edit in fullscreen', exact: true }),
  ).toBeVisible();
  await expect(tree.locator('[data-cell="fit"] .add-child')).toHaveCount(1);
  await space.locator('.cell-text').press('Escape');
  await expect(space.locator('.select-note')).toBeFocused();
  await expect(space.locator('.add-above, .add-below, .add-child')).toHaveCount(3);
  await space.getByRole('button', { name: 'Add note above', exact: true }).click();
  const above = await nameNewNote(page, 'Inserted above');
  await expect(tree.locator('.tree-column').nth(1).locator('.tree-cell').nth(1)).toHaveAttribute(
    'data-cell',
    above!,
  );
  const aboveCard = tree.locator(`[data-cell="${above}"]`);
  if (info.project.name === 'desktop') await aboveCard.hover();
  await aboveCard.getByRole('button', { name: 'Add note below', exact: true }).click();
  const below = await nameNewNote(page, 'Inserted below');
  const belowCard = tree.locator(`[data-cell="${below}"]`);
  if (info.project.name === 'desktop') await belowCard.hover();
  await belowCard.getByRole('button', { name: 'Add child note', exact: true }).click();
  const child = await nameNewNote(page, 'A detail');
  await expect(tree.locator('.note-path')).toContainText('Inserted below body');
  const childCard = tree.locator(`[data-cell="${child}"]`);
  if (info.project.name === 'desktop') await childCard.hover();
  await childCard.getByRole('button', { name: 'Edit in fullscreen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expectFieldValue(dialog.locator('.cell-text'), 'A detail body');
  await expect(dialog.locator('.cell-title')).toHaveCount(0);
  await expect(dialog.getByRole('group', { name: 'Cell type', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await childCard.locator('.select-note').click();
  const writing = childCard.locator('.cell-text');
  await fillField(writing, 'Room to write.\n'.repeat(15));
  await expect(childCard.locator('.add-above, .add-below, .add-child')).toHaveCount(0);
  expect(await writing.evaluate((e) => e.clientHeight >= e.scrollHeight - 2)).toBe(true);
  await expect(
    childCard.locator('.card-tools, .card-actions, .editor-actions, .cell-title, h3'),
  ).toHaveCount(0);
  await page.screenshot({ path: `/private/tmp/bearings-card-writing-${info.project.name}.png` });
});

test('copies full library cards into the tree as children and siblings with independent saved identities', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Native mouse drag-and-drop; touch retains the add control',
  );
  test.setTimeout(45000);
  const tree = await openTree(page);
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Define the Decision');
  const pattern = page
    .locator('.library-item[data-library-kind="pattern"]')
    .filter({ hasText: 'Define the Decision Before Comparing Options' });
  await expect(pattern).toHaveAttribute('draggable', 'true');
  const add = pattern.getByRole('button', {
    name: 'Add pattern: Define the Decision Before Comparing Options',
    exact: true,
  });
  await page.mouse.move(1000, 80);
  await expect(add).toHaveCSS('opacity', '0');
  await pattern.hover();
  await expect(add).toHaveCSS('opacity', '1');
  await add.focus();
  await page.mouse.move(1000, 80);
  await expect(add).toHaveCSS('opacity', '1');
  await search.focus();
  const parent = tree.locator('[data-cell="fit"]');
  const sourceBox = (await pattern.boundingBox())!,
    targetBox = (await parent.boundingBox())!;
  await page.mouse.move(sourceBox.x + 30, sourceBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 40, sourceBox.y + 25, { steps: 3 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 8,
  });
  await expect(parent).toHaveClass(/drop-child/);
  await page.screenshot({ path: '/private/tmp/bearings-library-drop-guide.png' });
  await page.mouse.up();
  await expect(page.locator('.pattern-reader')).toHaveCount(0);
  await expect(tree.locator('.selected')).toContainText(
    'Define the Decision Before Comparing Options',
  );
  const firstId = await tree.locator('.selected').getAttribute('data-cell');
  await expect(tree.locator('.note-path')).toContainText('Work that fits');
  await fillField(search, 'Confidence');
  const rating = page
    .locator('.library-item[data-library-kind="rating"]')
    .filter({ hasText: 'Confidence' });
  await expect(rating).toHaveAttribute('draggable', 'true');
  const size = await parent.boundingBox();
  await rating.dragTo(parent, { targetPosition: { x: size!.width / 2, y: 5 } });
  await expect(tree.getByRole('slider', { name: 'Confidence', exact: true })).toBeVisible();
  await expect(tree.locator('.selected output')).toHaveText('Unanswered');
  const ratingId = await tree.locator('.selected').getAttribute('data-cell');
  await fillField(search, 'Define the Decision');
  await pattern.dragTo(parent);
  const secondId = await tree.locator('.selected').getAttribute('data-cell');
  expect(secondId).not.toBe(firstId);
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  const cells = await page.evaluate(async () => {
    const path = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(path);
    return (await (await getLocalWorkspace()).listSituations())[0].notebook.chapters[0].cells;
  });
  expect(cells.find((c: { id: string }) => c.id === firstId)?.parentId).toBe('fit');
  expect(cells.find((c: { id: string }) => c.id === secondId)?.parentId).toBe('fit');
  expect(cells.find((c: { id: string }) => c.id === ratingId)?.parentId).toBe('root');
  expect(cells.findIndex((c: { id: string }) => c.id === ratingId)).toBeLessThan(
    cells.findIndex((c: { id: string }) => c.id === 'fit'),
  );
  await page.reload();
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', secondId!);
});

test('replaces a blank tree card in place and preserves its children, undo and saved identity', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Native mouse drag-and-drop');
  test.setTimeout(45000);
  const tree = await openTree(page);
  await tree.locator('[data-cell="fit"] .select-note').click();
  await tree.locator('.cell-text').press('Meta+ArrowRight');
  const blankId = await tree.locator('.selected').getAttribute('data-cell');
  await tree.locator('.cell-text').press('Meta+ArrowRight');
  const childId = await nameNewNote(page, 'Keep attached child');
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Define the Decision');
  const pattern = page.locator('.library-item[data-library-kind="pattern"]');
  const blank = tree.locator(`[data-cell="${blankId}"]`);
  const before = await tree.locator('.tree-cell').count();
  const sourceBox = (await pattern.boundingBox())!;
  const targetBox = (await blank.boundingBox())!;
  await page.mouse.move(sourceBox.x + 30, sourceBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + 40, sourceBox.y + 25, { steps: 3 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 8,
  });
  // Deliver dragover after Chromium has started its native drag session.
  await page.mouse.move(targetBox.x + targetBox.width / 2 + 1, targetBox.y + targetBox.height / 2);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await expect(blank).toHaveClass(/drop-replace/);
  await expect(blank.locator('.drop-hint')).toHaveText('Replace empty cell');
  await page.mouse.up();
  await expect(tree.locator('.tree-cell')).toHaveCount(before);
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', blankId!);
  await expect(blank.getByRole('button', { name: 'Read pattern', exact: true })).toBeVisible();
  await expect(tree.locator(`[data-cell="${childId}"]`)).toContainText('Keep attached child');
  await expect(tree.locator('.note-path')).toContainText('Work that fits');
  await tree.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(blank.locator('.select-note')).toContainText('Start with a thought');
  await expect(tree.locator(`[data-cell="${childId}"]`)).toBeVisible();
  // Even the top edge of an empty card replaces it instead of adding above.
  await pattern.dragTo(blank, { targetPosition: { x: targetBox.width / 2, y: 5 } });
  await expect(blank.getByRole('button', { name: 'Read pattern', exact: true })).toBeVisible();
  await expect(tree.locator('.tree-cell')).toHaveCount(before);
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expect(tree.locator('.selected')).toHaveAttribute('data-cell', blankId!);
  await expect(blank.getByRole('button', { name: 'Read pattern', exact: true })).toBeVisible();
  await expect(tree.locator(`[data-cell="${childId}"]`)).toContainText('Keep attached child');
});

test('Command Delete in Notebook removes a focused parent branch and Undo restores its descendants', async ({
  page,
}) => {
  await openTree(page);
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  const cells = page.locator('.viewport .notebook-cell');
  const parent = page.locator('.viewport [data-cell="fit"]');
  await expect(cells).toHaveCount(8);
  await parent.locator('.cell-text').press('Meta+Backspace');
  await expect(cells).toHaveCount(4);
  for (const id of ['fit', 'energy', 'detail', 'other'])
    await expect(page.locator(`.viewport [data-cell="${id}"]`)).toHaveCount(0);
  await expect(page.locator('.viewport [data-cell="space"] .cell-text')).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cells).toHaveCount(8);
  await expectFieldValue(parent.locator('.cell-text'), 'More making and mentoring.');
  await expectFieldValue(
    page.locator('.viewport [data-cell="detail"] .cell-text'),
    'Invite a friend to bring a real problem.',
  );
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-view [data-cell="fit"] .select-note').click();
  await page.locator('.tree-view .cell-text').press('Escape');
  await expect(page.locator('.tree-cell.selected .select-note')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tree-cell.selected')).toHaveAttribute('data-cell', 'detail');
});

test('splits Tree writing into siblings with a divider, including fullscreen, keeping children attached', async ({
  page,
}) => {
  const tree = await openTree(page);
  await tree.locator('[data-cell="fit"] .select-note').click();
  const editor = tree.locator('.cell-text');
  await fillField(editor, 'Thought before.\n---\nThought after.');
  await setWritingCursor(editor, '---');
  await editor.press('Enter');
  await expectFieldValue(editor, 'Thought after.');
  await expect(editor).toBeFocused();
  await expect(tree.locator('[data-cell="fit"]')).toContainText('Thought before.');
  await expect(tree.locator('.note-path')).not.toContainText('Thought before.');
  await editor.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  const fullscreen = focus.locator('.cell-text');
  await fillField(fullscreen, 'Fullscreen before.\n---\nFullscreen after.');
  await setWritingCursor(fullscreen, '---');
  await fullscreen.press('Enter');
  await expect(focus).toBeVisible();
  await expect(fullscreen).toBeFocused();
  await expectFieldValue(fullscreen, 'Fullscreen after.');
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(page.locator('.viewport .notebook-cell')).toHaveCount(10);
  await expectFieldValue(
    page.locator('.viewport [data-cell="energy"] .cell-text'),
    'Helping someone make sense of a difficult problem.',
  );
  await expectFieldValue(
    page.locator('.viewport [data-cell="detail"] .cell-text'),
    'Invite a friend to bring a real problem.',
  );
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.viewport .notebook-cell')).toHaveCount(10);
  const savedWriting = await page
    .locator('.viewport .cell-text')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).innerText.replace(/\n{2,}/g, '\n')),
    );
  expect(savedWriting).toContain('Thought before.');
  expect(savedWriting).toContain('Fullscreen before.');
  expect(savedWriting).toContain('Fullscreen after.');
});
