import { expect, test, type Page } from '@playwright/test';
import { decodeWorkspaceBackup } from '@patternverse/workspace/backup';

async function createVerse(page: Page, title: string) {
  await page.goto('/editor?type=verse');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Saved “${title}” as draft.`)).toBeVisible();
}
async function openBackup(page: Page) {
  await page.goto('/my');
  await expect(page.getByText('Loading your workspace…', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
}
async function downloadBackup(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download workspace backup', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('patternverse-workspace-backup.cbor');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('binary backup previews, cancels, replaces and recovers the previous workspace', async ({
  page,
}, info) => {
  await createVerse(page, 'Saved Verse');
  await openBackup(page);
  const bytes = await downloadBackup(page);
  expect(decodeWorkspaceBackup(bytes).entities).toHaveLength(1);
  await createVerse(page, 'Newer Verse');
  await openBackup(page);
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  await page
    .getByLabel('Choose a workspace backup')
    .setInputFiles({ name: 'workspace.cbor', mimeType: 'application/cbor', buffer: bytes });
  await expect(page.getByRole('button', { name: 'Replace workspace', exact: true })).toBeDisabled();
  await expect(page.getByText(/does\s+not\s+merge\s+them/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `/tmp/patternverse-backup-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  await page
    .getByLabel('Choose a workspace backup')
    .setInputFiles({ name: 'workspace.cbor', mimeType: 'application/cbor', buffer: bytes });
  await page
    .getByRole('checkbox', { name: 'I understand this replaces my current workspace.' })
    .check();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workspace restored on this device');
  await page.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(1);
  await expect(page.locator('.content-card')).toContainText('Saved Verse');
  // Recovery remains available after page reload; it has its own fresh confirmation.
  await openBackup(page);
  const [recoveryDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download recovery copy', exact: true }).click(),
  ]);
  expect(recoveryDownload.suggestedFilename()).toBe('patternverse-workspace-recovery.cbor');
  const recoveryChunks: Buffer[] = [];
  for await (const chunk of (await recoveryDownload.createReadStream())!)
    recoveryChunks.push(Buffer.from(chunk));
  const recoveryBackup = decodeWorkspaceBackup(Buffer.concat(recoveryChunks));
  expect(recoveryBackup.entities.map((entity) => entity.title).sort()).toEqual([
    'Newer Verse',
    'Saved Verse',
  ]);
  await page.getByRole('button', { name: 'Review recovery copy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Replace workspace', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workspace restored');
  await page.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(page.locator('.content-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Newer Verse', exact: true })).toBeVisible();
});

test('corrupt files do not replace anything, and legacy JSON remains restorable', async ({
  page,
}) => {
  await createVerse(page, 'Legacy Verse');
  await openBackup(page);
  const backup = decodeWorkspaceBackup(await downloadBackup(page));
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  await page.getByLabel('Choose a workspace backup').setInputFiles({
    name: 'broken.cbor',
    mimeType: 'application/cbor',
    buffer: Buffer.from([0xff]),
  });
  await expect(page.getByRole('alert')).toContainText('unreadable or damaged');
  await expect(page.getByRole('button', { name: 'Replace workspace', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Legacy Verse', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  const oldExport = Object.fromEntries(
    Object.entries(backup).filter(([key]) => key !== 'practiceRuns'),
  );
  await page.getByLabel('Choose a workspace backup').setInputFiles({
    name: 'old-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(oldExport, null, 2)),
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workspace restored');
});
