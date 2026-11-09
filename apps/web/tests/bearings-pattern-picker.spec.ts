import { fillField } from './bearings-helpers';
import { expectFieldValue } from './bearings-helpers';
import { expect, test, type Page } from '@playwright/test';
import { addTextCell } from './bearings-helpers';

const title = 'Define the Decision Before Comparing Options';
async function setup(page: Page) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(
    page.getByLabel('What would you like to work through?'),
    'Quick pattern selection',
  );
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  return addTextCell(page, '');
}
async function choose(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Find a pattern' });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('combobox', { name: 'Find a pattern' });
  await fillField(search, 'Define the Decision');
  await expect(dialog.getByRole('option').first().locator('strong')).toHaveText(title);
  await search.press('Enter');
  await expect(dialog).not.toBeVisible();
}

test('quick selects patterns with @, replacing an empty cell and preserving existing writing', async ({
  page,
}) => {
  const cell = await setup(page);
  const id = await cell.getAttribute('data-cell');
  const field = cell.locator('.cell-text');
  await field.press('@');
  await expectFieldValue(field, '');
  await choose(page);
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await expect(page.locator('.notebook-cell')).toHaveAttribute('data-cell', id!);
  await expect(cell).toHaveAttribute('data-kind', 'pattern');
  await expect(cell.getByRole('heading')).toHaveText(title);
  await expect(cell.getByRole('button', { name: 'Read pattern', exact: true })).toBeFocused();
  const note = await addTextCell(page, 'name');
  const writing = note.locator('.cell-text');
  await writing.press('Control+End');
  await writing.press('@');
  await expectFieldValue(writing, 'name@');
  await expect(page.getByRole('dialog', { name: 'Find a pattern' })).not.toBeVisible();
  await fillField(writing, 'Keep my thought. ');
  await writing.press('Control+End');
  await writing.press('@');
  const dialog = page.getByRole('dialog', { name: 'Find a pattern' });
  await expect(dialog).toBeVisible();
  await fillField(dialog.getByRole('combobox'), 'no pattern could match this phrase');
  await expect(dialog.getByRole('status')).toContainText('No matching patterns');
  await dialog.press('Escape');
  await expect(writing).toBeFocused();
  await expectFieldValue(writing, 'Keep my thought. ');
  await writing.press('@');
  await choose(page);
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await expectFieldValue(writing, 'Keep my thought. ');
  await expect(page.locator('.pattern-reader')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Saved on this device');
  await page.reload();
  await expect(page.locator('.notebook-cell.pattern')).toHaveCount(2);
  await expectFieldValue(page.locator('.cell-text'), 'Keep my thought. ');
});

test('the picker follows sidebar filters and supports keyboard browsing and click selection', async ({
  page,
}, info) => {
  await setup(page);
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const sidebar = page.getByRole('complementary', { name: 'Patterns and ratings' });
  await sidebar.getByRole('switch', { name: 'With practice' }).click();
  await expect(sidebar.getByRole('button', { name: 'Quick select a pattern' })).toHaveCount(0);
  await sidebar.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.locator('.cell-text').press('@');
  const dialog = page.getByRole('dialog', { name: 'Find a pattern' });
  await expect(dialog.locator('.scope')).toContainText('With practice');
  const search = dialog.getByRole('combobox');
  await fillField(search, 'Abstract Factory');
  await expect(dialog.getByRole('option')).toHaveCount(0);
  await fillField(search, '');
  const first = dialog.getByRole('option').nth(0),
    second = dialog.getByRole('option').nth(1);
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await search.press('ArrowDown');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await search.press('ArrowUp');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await fillField(search, 'Define the Decision');
  await expect(dialog.getByRole('option').first().locator('strong')).toHaveText(title);
  await page.screenshot({ path: `/private/tmp/bearings-pattern-picker-${info.project.name}.png` });
  await dialog.getByRole('option').first().click();
  await expect(page.locator('.notebook-cell')).toHaveAttribute('data-kind', 'pattern');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(sidebar.getByRole('switch', { name: 'With practice' })).toBeChecked();
});

test('Vim @ replaces a blank tree parent without losing children and works from fullscreen', async ({
  page,
}) => {
  const note = await setup(page);
  const parentId = await note.getAttribute('data-cell');
  await page.getByRole('button', { name: 'Notebook actions' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('switch', { name: 'Basic Vim mode' }).click();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.locator('.tree-cell.selected .select-note').click();
  await page.locator('.tree-cell.selected .cell-text').press('Meta+ArrowRight');
  const childId = await page.locator('.tree-cell.selected').getAttribute('data-cell');
  const child = page.locator(`.tree-cell[data-cell="${childId}"]`);
  await child.locator('.cell-text').press('i');
  await child.locator('.cell-text').pressSequentially('Keep this child');
  await child.locator('.cell-text').press('Escape');
  await child.locator('.cell-text').press('Escape');
  await child.press('ArrowLeft');
  const parent = page.locator(`.tree-cell[data-cell="${parentId}"]`);
  await parent.press('Enter');
  await parent.locator('.cell-text').press('@');
  await choose(page);
  await expect(parent).toHaveAttribute('data-kind', 'pattern');
  await expect(child).toBeVisible();
  await expect(child).toContainText('Keep this child');
  await child.locator('.select-note').click();
  const field = child.locator('.cell-text');
  await field.press('Shift+Enter');
  const fullscreen = page.getByRole('dialog', { name: 'Focus editor' });
  await fullscreen.locator('.cell-text').press('@');
  await choose(page);
  await expect(fullscreen).not.toBeVisible();
  await expect(child).toContainText('Keep this child');
  await expect(page.locator('.tree-cell[data-kind="pattern"]')).toHaveCount(2);
});

test('the @ menu follows the text cursor without a modal, dismisses on outside click, and fits a small viewport', async ({
  page,
}, info) => {
  const first = await setup(page);
  await addTextCell(page, 'Another thought');
  const field = first.locator('.cell-text');
  await fillField(field, 'What matters here? ');
  await field.press('Control+End');
  let cursor: { x: number; y: number; height: number } | null = null;
  if (info.project.name === 'desktop') {
    await expect(first.locator('.writing-caret')).toHaveCount(1);
    cursor = await first.locator('.writing-caret').evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, height: box.height };
    });
  }
  await field.press('@');
  const menu = page.getByRole('dialog', { name: 'Find a pattern' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-modal', 'false');
  await expect(menu).toHaveAttribute('data-anchor', 'caret');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await fillField(menu.getByRole('combobox'), 'Define the Decision');
  if (cursor) {
    await expect
      .poll(async () => Math.abs((await menu.boundingBox())!.x - cursor!.x))
      .toBeLessThan(3);
    const box = (await menu.boundingBox())!;
    expect(box.y).toBeGreaterThan(cursor.y + cursor.height);
    expect(box.y).toBeLessThan(cursor.y + cursor.height + 12);
  }
  await page.screenshot({ path: `/private/tmp/bearings-inline-picker-${info.project.name}.png` });
  const situationTitle = page.getByRole('textbox', { name: 'Situation title', exact: true });
  await situationTitle.click();
  await expect(menu).not.toBeVisible();
  await expect(situationTitle).toBeFocused();
  await expectFieldValue(field, 'What matters here? ');
  await fillField(
    field,
    'A longer thought that wraps and scrolls. '.repeat(80) + '\nLast thought ',
  );
  await field.press('Control+End');
  await field.press('ArrowRight');
  await field.press('@');
  await expect(menu).toBeVisible();
  await page.setViewportSize({ width: 360, height: 480 });
  await expect
    .poll(async () => {
      const box = await menu.boundingBox();
      return (
        !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 361 && box.y + box.height <= 481
      );
    })
    .toBe(true);
  await menu.getByRole('combobox').press('Escape');
  await expect(field).toBeFocused();
  await expectFieldValue(
    field,
    'A longer thought that wraps and scrolls. '.repeat(80) + '\nLast thought ',
  );
});
