import { expect, test, type Page } from '@playwright/test';

async function add(page: Page, title: string) {
  await expect(page.getByRole('textbox', { name: 'New situation' })).toBeEnabled();
  await page.getByRole('textbox', { name: 'New situation' }).fill(title);
  await page.locator('.situations').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: `Open notebook: ${title}` })).toBeEnabled();
}
const titles = (page: Page) => page.locator('.situations .open > span');
async function startDrag(page: Page, title: string, destination: string) {
  const source = page.getByRole('button', { name: `Reorder: ${title}` });
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await page.getByRole('button', { name: `Reorder: ${destination}` }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2 + 24, { steps: 8 });
  await expect(page.locator('.situations li.dragging')).toHaveCount(1);
}
test.beforeEach(async ({ page }) => {
  await page.goto('/my?pane=situations');
});

test('adds notebooks, autosaves normalized titles and context, restores focus and survives reload', async ({
  page,
}, testInfo) => {
  await expect(page.getByText('Leave a situation here to return to later.')).toBeVisible();
  await add(page, 'Creative work');
  const trigger = page.getByRole('button', { name: 'Open notebook: Creative work' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Situation notebook' });
  const context = dialog.getByLabel('Context · optional');
  await expect(context).toBeFocused();
  await dialog.getByLabel('Situation', { exact: true }).fill('  A gentler start  ');
  await context.fill('Start with a sketch.\nThen return tomorrow.');
  await expect(dialog.getByRole('status')).toHaveText('Saved on this device');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/patternverse-situations-notebook-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open notebook: A gentler start' })).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Open notebook: A gentler start' }).click();
  await expect(page.getByLabel('Context · optional')).toHaveValue(
    'Start with a sketch.\nThen return tomorrow.',
  );
});

test('Escape flushes unsaved notes and returns focus to the notebook trigger', async ({ page }) => {
  await add(page, 'Creative work');
  const trigger = page.getByRole('button', { name: 'Open notebook: Creative work' });
  await trigger.click();
  await page.getByLabel('Context · optional').fill('Keep this on Escape.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByLabel('Context · optional')).toHaveValue('Keep this on Escape.');
});

test('empty titles keep drafts open, and correction can be saved without losing context', async ({
  page,
}) => {
  await add(page, 'Creative work');
  await page.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  await page.getByLabel('Situation', { exact: true }).fill('');
  await page.getByLabel('Context · optional').fill('Keep my context.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('between 1 and 180');
  await expect(page.getByLabel('Context · optional')).toHaveValue('Keep my context.');
  await page.getByLabel('Situation', { exact: true }).fill('Ready to begin');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open notebook: Ready to begin' }).click();
  await expect(page.getByLabel('Context · optional')).toHaveValue('Keep my context.');
});

test('navigation flushes a draft before the debounce and revisiting loads it', async ({ page }) => {
  await page.goto('/library');
  await page
    .locator('.site-utilities')
    .getByRole('link', { name: 'workspace', exact: true })
    .click();
  await page.getByRole('button', { name: 'situations', exact: true }).click();
  await add(page, 'Creative work');
  await page.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  await page.getByLabel('Context · optional').fill('Notes before changing the page.');
  // In-app history navigation unmounts the notebook without a close action.
  // Hard document unload cannot reliably await IndexedDB; its existing warning
  // remains separate from this route-cleanup behavior.
  await page.goBack();
  await expect(page).toHaveURL(/\/library$/);
  await page
    .locator('.site-utilities')
    .getByRole('link', { name: 'workspace', exact: true })
    .click();
  await page.getByRole('button', { name: 'situations', exact: true }).click();
  await page.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  await expect(page.getByLabel('Context · optional')).toHaveValue(
    'Notes before changing the page.',
  );
});

test('keyboard ordering works both ways and persists across reload with focus preserved', async ({
  page,
}) => {
  await add(page, 'Creative work');
  await add(page, 'Conversations');
  await add(page, 'A small decision');
  const handle = page.getByRole('button', { name: 'Reorder: Creative work' });
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await expect(titles(page)).toHaveText(['Conversations', 'Creative work', 'A small decision']);
  await expect(handle).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(titles(page)).toHaveText(['Creative work', 'Conversations', 'A small decision']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Creative work', 'Conversations', 'A small decision']);
});

test('pointer drop persists the preview, and cancelled capture restores the queue', async ({
  page,
}) => {
  await add(page, 'Creative work');
  await add(page, 'Conversations');
  await add(page, 'A small decision');
  await startDrag(page, 'Creative work', 'A small decision');
  await page.mouse.up();
  await expect(titles(page)).toHaveText(['Conversations', 'A small decision', 'Creative work']);
  await page.reload();
  await expect(titles(page)).toHaveText(['Conversations', 'A small decision', 'Creative work']);
  await page.locator('.situations ol').evaluate((list) => {
    list.addEventListener('pointerdown', (event) => {
      (list as HTMLElement).dataset.pointer = String((event as PointerEvent).pointerId);
    });
  });
  await startDrag(page, 'Conversations', 'Creative work');
  await page.locator('.situations ol').evaluate((list) => {
    list.dispatchEvent(
      new PointerEvent('pointercancel', {
        pointerId: Number((list as HTMLElement).dataset.pointer),
        bubbles: true,
      }),
    );
  });
  await page.mouse.up();
  await expect(titles(page)).toHaveText(['Conversations', 'A small decision', 'Creative work']);
  await expect(page.locator('.situations li.dragging')).toHaveCount(0);
  await page.reload();
  await expect(titles(page)).toHaveText(['Conversations', 'A small decision', 'Creative work']);
});

test('Escape cancels the drag, restores order, and leaves no active scroll/transform', async ({
  page,
}) => {
  await add(page, 'Creative work');
  await add(page, 'Conversations');
  await add(page, 'A small decision');
  await startDrag(page, 'Creative work', 'A small decision');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(titles(page)).toHaveText(['Creative work', 'Conversations', 'A small decision']);
  await expect(page.locator('.situations li.dragging')).toHaveCount(0);
  expect(
    await page
      .locator('.situations li')
      .evaluateAll((rows) => rows.every((row) => !(row as HTMLElement).style.transform)),
  ).toBe(true);
  await page.reload();
  await expect(titles(page)).toHaveText(['Creative work', 'Conversations', 'A small decision']);
});

test('another tab cannot overwrite newer context, and the stale draft remains readable', async ({
  page,
  context,
}) => {
  await add(page, 'Creative work');
  await page.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  const other = await context.newPage();
  await other.goto('/my?pane=situations');
  await other.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  await other.getByLabel('Context · optional').fill('Saved in another tab.');
  await other.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Context · optional').fill('My unsaved draft.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed in another window');
  await expect(page.getByLabel('Context · optional')).toHaveValue('My unsaved draft.');
  await other.reload();
  await other.getByRole('button', { name: 'Open notebook: Creative work' }).click();
  await expect(other.getByLabel('Context · optional')).toHaveValue('Saved in another tab.');
});
