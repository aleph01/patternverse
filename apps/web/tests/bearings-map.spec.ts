import { expect, test, type Page } from '@playwright/test';
import { addTextCell, expectFieldValue } from './bearings-helpers';

test('sets and sorts priorities, renames from the list and map, and preserves the notebook', async ({
  page,
}) => {
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'Lower priority');
  await back(page);
  await page.getByLabel('Priority for Lower priority', { exact: true }).selectOption('1');
  await create(page, 'Career uncertainty');
  await addEntry(page, 'Keep this thought when renaming.');
  await back(page);
  await page.getByLabel('Priority for Career uncertainty', { exact: true }).selectOption('5');
  await create(page, 'Unassigned situation');
  await back(page);
  await page.getByLabel('Priority for Lower priority', { exact: true }).selectOption('3');
  await expect(page.getByLabel('Priority for Lower priority', { exact: true })).toBeEnabled();
  await page.getByLabel('Sort situations', { exact: true }).selectOption('priority');
  await expect(page.locator('.situation-row h2')).toHaveText([
    'Career uncertainty',
    'Lower priority',
    'Unassigned situation',
  ]);
  await page.getByRole('button', { name: 'Actions for Career uncertainty', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Rename situation', exact: true }).click();
  await page.getByLabel('Situation name', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Save name', exact: true })).toBeDisabled();
  await page.getByLabel('Situation name', { exact: true }).fill('Career direction');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Sort situations', { exact: true })).toHaveValue('priority');
  await expect(page.locator('.situation-row h2')).toHaveText([
    'Career direction',
    'Lower priority',
    'Unassigned situation',
  ]);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Career direction', exact: true }).click();
  await expect(page.locator('.map-node[aria-pressed=true] .node-priority')).toHaveText('5 / 5');
  await page.getByRole('button', { name: 'Rename situation', exact: true }).click();
  await page.getByLabel('Problem name', { exact: true }).fill('A new career direction');
  await page.getByRole('button', { name: 'Save problem name', exact: true }).click();
  await expect(page.locator('.map-inspector h2')).toHaveText('A new career direction');
  await page.getByLabel('Priority', { exact: true }).selectOption('4');
  await expect(page.locator('.map-node[aria-pressed=true] .node-priority')).toHaveText('4 / 5');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expect(page.getByLabel('Priority', { exact: true })).toHaveCount(0);
  await expectFieldValue(
    page.getByRole('textbox', { name: 'Note text', exact: true }),
    'Keep this thought when renaming.',
  );
  await back(page);
  await page.getByLabel('Priority', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.situation-row h2').first()).toHaveText('Lower priority');
  await page.reload();
  await expect(page.getByLabel('Priority for A new career direction', { exact: true })).toHaveValue(
    '',
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('adds a subproblem with the stem by click or keyboard and cancels drafts without saving', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'Career uncertainty');
  await back(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const stem = page.getByRole('button', { name: 'Add a subproblem', exact: true });
  await stem.click();
  await expect(page.locator('.map-child-composer')).toBeVisible();
  await page.getByLabel('New subproblem', { exact: true }).fill('Cancel this draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.map-node')).toHaveCount(1);
  await expect(page.locator('.connections path')).toHaveCount(0);
  await expect(page.locator('.map-child-composer')).toHaveCount(0);
  await stem.press('Enter');
  await page.getByLabel('New subproblem', { exact: true }).fill('Cancel with Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.map-child-composer')).toHaveCount(0);
  await expect(page.locator('.map-node')).toHaveCount(1);
  await stem.press('Space');
  await expect(page.getByLabel('New subproblem', { exact: true })).toBeFocused();
  await page.getByLabel('New subproblem', { exact: true }).fill('Choosing a next step');
  if (info.project.name === 'mobile')
    await page.screenshot({ path: '/private/tmp/bearings-stem-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Create subproblem', exact: true }).click();
  await expect(page.locator('.map-node')).toHaveCount(2);
  await expect(page.locator('.connections path')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Choosing a next step', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.connections path')).toHaveCount(1);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.getByRole('button', { name: 'Fit map', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('pulls the stem into empty space at the current zoom, saves its placement, and rejects occupied drops', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Desktop pointer gesture; mobile click is tested separately',
  );
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'Career uncertainty');
  await back(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  const stem = page.getByRole('button', { name: 'Add a subproblem', exact: true });
  const parent = await page
    .getByRole('button', { name: 'Career uncertainty', exact: true })
    .boundingBox();
  let handle = await stem.boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(parent!.x + parent!.width / 2, parent!.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.map-child-composer')).toHaveCount(0);
  await expect(page.locator('.map-node')).toHaveCount(1);
  const canvas = await page.locator('.map-canvas').boundingBox();
  const drop = { x: canvas!.x + canvas!.width - 125, y: canvas!.y + canvas!.height - 135 };
  const transform = await page.locator('.map-world').evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { zoom: matrix.a, x: matrix.e, y: matrix.f };
  });
  const expected = {
    x: (drop.x - canvas!.x - transform.x) / transform.zoom - 104,
    y: (drop.y - canvas!.y - transform.y) / transform.zoom,
  };
  handle = await stem.boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 8 });
  await expect(page.locator('.subproblem-placeholder')).toBeVisible();
  await page.mouse.up();
  await page.getByLabel('New subproblem', { exact: true }).fill('Choosing a next step');
  await page.screenshot({ path: '/private/tmp/bearings-stem-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Create subproblem', exact: true }).click();
  const child = page.getByRole('button', { name: 'Choosing a next step', exact: true });
  await expect(child).toBeVisible();
  expect(await child.evaluate((element) => parseFloat(element.style.left))).toBeCloseTo(
    expected.x,
    1,
  );
  expect(await child.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(
    expected.y,
    1,
  );
  await page.reload();
  await expect(page.locator('.connections path')).toHaveCount(1);
  expect(await child.evaluate((element) => parseFloat(element.style.left))).toBeCloseTo(
    expected.x,
    1,
  );
  expect(await child.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(
    expected.y,
    1,
  );
});

async function create(page: Page, title: string) {
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await page.getByLabel('What would you like to work through?').fill(title);
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
}
async function back(page: Page) {
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]situation=/);
}
async function addEntry(page: Page, text: string) {
  await addTextCell(page, text);
}

test('edits real connections, renames problems, moves nodes, restores links, and preserves each notebook', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'Conversation');
  await addEntry(page, 'Keep this parent entry.');
  await back(page);
  await create(page, 'At work');
  await back(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.locator('.map-node').getByText('Conversation', { exact: true }).click();
  await page.getByRole('button', { name: 'Break out a subproblem', exact: true }).click();
  await page.getByLabel('New subproblem', { exact: true }).fill('Fear of reaction');
  await page.getByRole('button', { name: 'Create subproblem', exact: true }).click();
  await expect(page.locator('.map-node')).toHaveCount(3);
  await expect(page.locator('.map-inspector h2')).toHaveText('Fear of reaction');
  await page.getByRole('button', { name: 'Edit map', exact: true }).click();
  await page.getByRole('button', { name: 'Connect another problem', exact: true }).click();
  await page.getByLabel('Other problem', { exact: true }).selectOption({ label: 'At work' });
  await page.getByLabel('Relationship', { exact: true }).selectOption('part-of');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.locator('.connections path')).toHaveCount(2);
  await page.getByRole('button', { name: 'Edit connection with At work', exact: true }).click();
  await page.getByLabel('Relationship', { exact: true }).selectOption('related');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.locator('.connections path.related')).toHaveCount(1);
  await page.getByLabel('Problem name', { exact: true }).fill('Fear of a reaction');
  await page.getByRole('button', { name: 'Save problem name', exact: true }).click();
  const node = page.getByRole('button', { name: 'Fear of a reaction', exact: true });
  await expect(node).toBeEnabled();
  await node.focus();
  const before = await node.evaluate((el) => parseFloat(el.style.left));
  await node.press('ArrowRight');
  await expect.poll(() => node.evaluate((el) => parseFloat(el.style.left))).toBe(before + 20);
  await expect(node).toBeEnabled();
  await page.getByRole('button', { name: 'Edit connection with At work', exact: true }).click();
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await expect(page.locator('.connections path')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo graph change', exact: true }).click();
  await expect(page.locator('.connections path.related')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await addEntry(page, 'A separate thought for the subproblem.');
  await back(page);
  await page.getByRole('button', { name: 'Conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue(
    'Keep this parent entry.',
  );
  await back(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.map-node')).toHaveCount(3);
  await expect(page.locator('.connections path')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Fear of a reaction', exact: true })).toHaveCSS(
    'left',
    `${before + 20}px`,
  );
  await page.getByRole('button', { name: 'Fear of a reaction', exact: true }).click();
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text', exact: true })).toHaveValue(
    'A separate thought for the subproblem.',
  );
  await back(page);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  if (info.project.name === 'desktop')
    await page.screenshot({ path: '/private/tmp/bearings-live-map.png', fullPage: true });
});

test('opens the graph from a notebook to create a subproblem and saves unfinished writing', async ({
  page,
}) => {
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'A parent problem');
  await addTextCell(page, 'An unfinished parent thought.');
  if (!(await page.getByRole('button', { name: 'Show situation map', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Notebook actions', exact: true }).click();
  await page.getByRole('button', { name: 'Show situation map', exact: true }).click();
  await expect(page.getByLabel('New subproblem', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Break out a subproblem', exact: true }).click();
  await expect(page.getByLabel('New subproblem', { exact: true })).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Search situations', exact: true })
    .fill('A parent problem');
  await page.getByLabel('New subproblem', { exact: true }).fill('A smaller problem');
  await page.getByRole('button', { name: 'Create subproblem', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search situations', exact: true })).toHaveValue(
    '',
  );
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(0);
  await back(page);
  await expect(page.getByLabel('New subproblem', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'A parent problem', exact: true }).click();
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expectFieldValue(page.locator('.cell-text').last(), 'An unfinished parent thought.');
});

test('persists pointer movement and rejects a stale connection edit from another window', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Desktop pointer drag and multi-window scenario');
  await page.goto('/apps/bearings?preview=1');
  await create(page, 'First');
  await back(page);
  await create(page, 'Second');
  await back(page);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: 'First', exact: true }).click();
  await page.getByRole('button', { name: 'Edit map', exact: true }).click();
  const node = page.getByRole('button', { name: 'First', exact: true });
  const old = await node.evaluate((el) => parseFloat(el.style.left));
  const box = await node.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 65, box!.y + box!.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await expect(node).toBeEnabled();
  await expect
    .poll(() => node.evaluate((el) => parseFloat(el.style.left)))
    .toBeGreaterThan(old + 20);
  const saved = await node.evaluate((el) => parseFloat(el.style.left));
  await page.reload();
  await expect(page.getByRole('button', { name: 'First', exact: true })).toHaveCSS(
    'left',
    `${saved}px`,
  );
  await page.getByRole('button', { name: 'First', exact: true }).click();
  await page.getByRole('button', { name: 'Edit map', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/apps/bearings?preview=1');
  await other.getByRole('button', { name: 'First', exact: true }).click();
  await other.getByRole('button', { name: 'Edit map', exact: true }).click();
  await other.getByRole('button', { name: 'Connect another problem', exact: true }).click();
  await page.getByRole('button', { name: 'Connect another problem', exact: true }).click();
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.locator('.connections path')).toHaveCount(1);
  await other.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('another window');
  await expect(other.getByLabel('Other problem', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Refresh map', exact: true }).click();
  await expect(other.getByLabel('Relationship', { exact: true })).toHaveValue('related');
  await expect(other.locator('.connections path')).toHaveCount(1);
  await other.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(other.getByLabel('Other problem', { exact: true })).toHaveCount(0);
  await expect(other.locator('.connections path')).toHaveCount(1);
  await other.close();
});
