import { expect, test } from '@playwright/test';
import { decodeWorkspaceBackup, encodeWorkspaceBackup } from '@patternverse/workspace/backup';

test('saves only with consent, searches answers, reopens a checkpoint and keeps runs separate', async ({
  page,
}, info) => {
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  await page
    .getByLabel('How are you currently phrasing the decision?')
    .fill('Should we launch our small version?');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
  await page.goto('/my?pane=history');
  await expect(page.getByText('Your first run belongs here.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import responses' })).toHaveCount(0);
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  await page.getByRole('button', { name: 'Save to workspace', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page
    .getByLabel('How are you currently phrasing the decision?')
    .fill('Should we launch before the conference?');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practice history →', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Import responses' })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search practice history' }).fill('conference');
  await expect(page.getByRole('status').filter({ hasText: '1 run' })).toBeVisible();
  await page.locator('.run').click();
  await expect(
    page.getByRole('heading', { name: 'Define the Decision Before Comparing Options' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByRole('textbox', { name: 'Run title' }).fill('Conference launch');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'Conference launch' })).toBeVisible();
  await page.reload();
  // Open the saved row on mobile; desktop already shows the response panel.
  await page.locator('.run').click();
  await page.getByRole('link', { name: 'Continue practice →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
  await expect(
    page.getByText('Should we launch before the conference?', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('What problem are you trying to solve?')
    .fill('Make the product ready for the conference.');
  await page
    .getByLabel('What would a good outcome give you?')
    .fill('Useful feedback without new hosting costs.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByRole('heading', { name: 'Separate facts from assumptions' }),
  ).toBeVisible();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practice history →', exact: true }).click();
  await page.locator('.run').click();
  await expect(page.getByRole('heading', { name: 'Conference launch' })).toBeVisible();
  await expect(
    page.getByText('Useful feedback without new hosting costs.', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('practice-history.png'), fullPage: true });
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  await page.getByRole('button', { name: 'Save to workspace', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practice history →', exact: true }).click();
  await expect(page.locator('.run')).toHaveCount(2);
});

test('restored history preserves pagination, filters, export and deliberate deletion', async ({
  page,
}, info) => {
  // Use the real backup boundary, confined to this test's isolated browser workspace.
  await page.goto('/my?pane=sync');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download workspace backup', exact: true }).click(),
  ]);
  const chunks: Buffer[] = [];
  for await (const chunk of (await download.createReadStream())!) chunks.push(Buffer.from(chunk));
  const backup = decodeWorkspaceBackup(Buffer.concat(chunks));
  const date = new Date().toISOString();
  const practiceRuns = Array.from({ length: 23 }, (_, index) => ({
    id: `fixture-${String(index).padStart(2, '0')}`,
    workspaceId: backup.workspace.id,
    patternRef: { sourceId: 'commons', entityId: 'define-the-decision-before-comparing-options' },
    patternType: 'pattern' as const,
    patternTitle: 'Define the Decision Before Comparing Options',
    title: `Saved decision ${String(index).padStart(2, '0')}`,
    verseIds: [index < 3 ? 'learning' : 'decision-making'],
    origin: 'patternverse' as const,
    status: index < 3 ? ('in-progress' as const) : ('completed' as const),
    revision: 1,
    responses: [
      {
        id: 'question',
        prompt: 'What matters?',
        answer: 'A synthetic answer with <img> literal text.',
      },
    ],
    createdAt: date,
    updatedAt: date,
  }));
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click();
  await page.getByLabel('Choose a workspace backup').setInputFiles({
    name: 'history-fixture.cbor',
    mimeType: 'application/cbor',
    buffer: Buffer.from(encodeWorkspaceBackup({ ...backup, practiceRuns })),
  });
  await page
    .getByRole('checkbox', { name: 'I understand this replaces my current workspace.' })
    .check();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Workspace restored');
  await page.goto('/my?pane=history');
  await expect(page.locator('.run')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next →', exact: true }).click();
  await expect(page.locator('.run')).toHaveCount(3);
  await page.getByLabel('Filter practice history by status').selectOption('in-progress');
  await expect(page.locator('.run')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Practice history pagination' })).toHaveCount(
    0,
  );
  await page.getByLabel('Filter practice history by verse').selectOption('learning');
  await page.getByRole('searchbox', { name: 'Search practice history' }).fill('<img>');
  await page.locator('.run').first().click();
  await expect(page.locator('.response mark')).toHaveText('<img>');
  await expect(page.locator('.response img')).toHaveCount(0);
  const [exported] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  expect(exported.suggestedFilename()).toBe('patternverse-practice-responses.json');
  const exportChunks: Buffer[] = [];
  for await (const chunk of (await exported.createReadStream())!)
    exportChunks.push(Buffer.from(chunk));
  const archive = JSON.parse(Buffer.concat(exportChunks).toString('utf8'));
  expect(archive.run.title).toBe('Saved decision 00');
  expect(archive.run.workspaceId).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('practice-history-filtered.png'), fullPage: true });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved decision 00', exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Saved run deleted.', { exact: true })).toBeVisible();
  // The compact list returns on mobile after deleting the open detail.
  await expect(page.locator('.run')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.run')).toHaveCount(20);
  await expect(page.getByRole('status').filter({ hasText: '22 runs' })).toBeVisible();
});
