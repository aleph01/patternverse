import { expect, test, type Page } from '@playwright/test';
import { decodeWorkspaceBackup } from '@patternverse/workspace/backup';

async function createVerse(page: Page, title: string) {
  await page.goto('/editor?type=verse');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Saved “${title}” as draft.`)).toBeVisible();
}

test('workspace creation actions share a neutral default appearance', async ({ page }) => {
  await page.goto('/my');
  const actions = page.locator('.creation-actions');
  const newVerse = actions.getByRole('link', { name: 'New verse', exact: true });
  await expect(newVerse).toBeVisible();
  await expect(newVerse).toHaveAttribute('href', '/editor?type=verse');
  await expect(actions.getByRole('link')).toHaveCount(3);
  const styles = await actions.getByRole('link').evaluateAll((links) =>
    links.map((link) => {
      const style = getComputedStyle(link);
      return {
        background: style.backgroundColor,
        color: style.color,
        border: style.borderColor,
      };
    }),
  );
  expect(styles[0].background).toBe('rgb(255, 255, 255)');
  expect(styles[0]).toEqual(styles[1]);
  expect(styles[0]).toEqual(styles[2]);
});

test('archived status is only offered when editing existing content', async ({ page }) => {
  await page.goto('/editor?type=collection&verse=creativity');
  const status = page.getByRole('combobox', { name: 'Status', exact: true });
  await expect(status).toBeEnabled();
  await expect(status.locator('option')).toHaveText(['Draft', 'Ready · still private']);
  await expect(status).toHaveValue('draft');

  await page.goto('/editor?type=pattern&verse=creativity');
  await expect(status).toBeEnabled();
  await expect(status.locator('option')).toHaveText(['Draft', 'Ready · still private']);
  await expect(status).toHaveValue('draft');
  await page.getByLabel('Title', { exact: true }).fill('Status Lifecycle Test');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Status Lifecycle Test” as draft.')).toBeVisible();
  await expect(status.locator('option')).toHaveText([
    'Draft',
    'Ready · still private',
    'Archived · still private',
  ]);
  await status.selectOption('deprecated');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Status Lifecycle Test” as archived.')).toBeVisible();
  await page.reload();
  await expect(status).toBeEnabled();
  await expect(status).toHaveValue('deprecated');
  await status.selectOption('published');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Status Lifecycle Test” as ready.')).toBeVisible();
});

test('manages private verses, requires a home, and moves contents before deletion', async ({
  page,
}) => {
  await createVerse(page, 'My Thinking');
  await createVerse(page, 'My Projects');
  await page.goto('/editor?type=pattern&verse=my-thinking');
  await page.getByLabel('Title', { exact: true }).fill('My Private Pattern');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “My Private Pattern” as draft.')).toBeVisible();
  await page.goto('/my');
  const card = page
    .locator('.content-card')
    .filter({ has: page.getByRole('heading', { name: 'My Thinking', exact: true }) });
  await card.getByRole('button', { name: 'Manage verse' }).click();
  const panel = page.locator('.manage-panel');
  await panel.getByLabel('Name', { exact: true }).fill('My Decisions');
  await panel.getByLabel('Description').fill('My own lens on choosing well.');
  await panel.getByRole('button', { name: 'Save details' }).click();
  await expect(panel).toContainText('My Decisions');
  await expect(panel.getByRole('button', { name: 'Delete verse' })).toBeDisabled();
  await panel.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Move this item to another verse');
  await panel.getByLabel('Destination verse').selectOption('my-projects');
  page.once('dialog', (dialog) => dialog.accept());
  await panel.getByRole('button', { name: 'Delete verse' }).click();
  await expect(page.locator('.content-card').filter({ hasText: 'My Decisions' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Patterns/ }).click();
  await expect(page.locator('.content-card')).toContainText('My Private Pattern');
  await expect(page.locator('.content-card')).toContainText('Verse home set');
  await page.goto('/editor?id=my-private-pattern');
  const homes = page.getByRole('region', { name: 'Verses' });
  await expect(homes).toContainText('My Projects');
  await expect(homes).not.toContainText('my-thinking');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('deleting a private collection preserves patterns and cannot alter Commons', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('Keep This Pattern');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Keep This Pattern” as draft.')).toBeVisible();
  await page.goto('/editor?type=collection&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('My Collection');
  const items = page.getByRole('region', { name: 'Collection items' });
  await items.getByRole('searchbox').fill('Keep This Pattern');
  await items.getByRole('button', { name: 'Add Keep This Pattern', exact: true }).click();
  await items.getByRole('searchbox').fill('Creative Reframing');
  await items.getByRole('button', { name: 'Add Creative Reframing', exact: true }).click();
  await expect(items.getByRole('button', { name: /^Move / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “My Collection” as draft.')).toBeVisible();
  await page.goto('/my');
  await expect(page.getByText('Loading your workspace…', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Collections/ }).click();
  await page.getByRole('button', { name: 'Manage collection' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete collection' }).click();
  await page.getByRole('button', { name: /^Patterns/ }).click();
  await expect(page.locator('.content-card')).toContainText('Keep This Pattern');
  await page.getByRole('button', { name: /^Verses/ }).click();
  await page.locator('.commons-readonly summary').click();
  await expect(page.locator('.commons-readonly')).toContainText('commons · read-only');
  await expect(page.locator('.commons-readonly').getByRole('button')).toHaveCount(0);
  await page.goto('/pattern/creative-reframing');
  await expect(
    page.getByRole('heading', { name: 'Creative Reframing', exact: true }).first(),
  ).toBeVisible();
});

test('settings persist and control library layout and pagination', async ({ page }) => {
  await page.goto('/my');
  await expect(page.getByText('Loading your workspace…', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Workspace name').fill('Julian’s ideas');
  await page.getByLabel('Default library view').selectOption('list');
  await page.getByLabel('Items per page').selectOption('50');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status')).toContainText('Settings saved');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Workspace name')).toHaveValue('Julian’s ideas');
  await expect(page.getByLabel('Default library view')).toHaveValue('list');
  await expect(page.getByLabel('Items per page')).toHaveValue('50');
  await page.goto('/library');
  await expect(
    page.getByRole('button', { name: 'List', exact: true, includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.paginated-entries .pattern-feed > li')).toHaveCount(50);
});

test('backup download is explicitly private and excludes device ownership and secrets', async ({
  page,
}) => {
  await createVerse(page, 'Backup Test');
  await page.goto('/my');
  await expect(page.getByText('Loading your workspace…', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download workspace backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('patternverse-workspace-backup.cbor');
  await expect(page.getByRole('status').filter({ hasText: 'Backup downloaded' })).toBeVisible();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const data = decodeWorkspaceBackup(Buffer.concat(chunks));
  expect(data.entities).toEqual([expect.objectContaining({ title: 'Backup Test', type: 'verse' })]);
  expect(data.workspace).not.toHaveProperty('owner');
  expect(data.practiceRuns).toEqual([]);
  expect(data.situations).toEqual([]);
  expect(Object.keys(data).sort()).toEqual([
    'entities',
    'exportedAt',
    'favorites',
    'format',
    'practiceRuns',
    'situations',
    'usefulness',
    'version',
    'workspace',
  ]);
});
