import { expect, test } from '@playwright/test';
const path = '/owner/contributions';
const id = '11111111-1111-4111-8111-111111111111';
test.beforeEach(async ({ request }) => {
  expect((await request.post('http://127.0.0.1:8793/__review-preview/reset')).ok()).toBe(true);
});
test('filters the inbox by verse, collection, label and search', async ({ page }, testInfo) => {
  await page.goto(path);
  const queue = page.getByRole('complementary', { name: 'Contribution inbox' });
  await expect(page.getByRole('heading', { name: 'Contributions', exact: true })).toBeVisible();
  await expect(page.locator('[data-review-tab=edits] ins').first()).toHaveText('complex');
  await expect(page.locator('[data-review-tab=edits] del').first()).toHaveText('difficult');
  await page.screenshot({ path: testInfo.outputPath('review-inbox.png'), fullPage: true });
  await page.getByLabel('Filter by verse').selectOption('commons:software-engineering');
  await expect(page.getByRole('heading', { name: 'Singleton', exact: true }).last()).toBeVisible();
  await expect(queue.locator('.pv-submission')).toHaveCount(1);
  await expect(
    page.getByLabel('Filter by collection').locator('option[value="commons:gof-design-patterns"]'),
  ).toHaveCount(1);
  await expect(
    page
      .getByLabel('Filter by collection')
      .locator('option[value="commons:decision-making-patterns"]'),
  ).toHaveCount(0);
  await page.getByLabel('Filter by collection').selectOption('commons:gof-design-patterns');
  await page.getByLabel('Search contributions').fill('global');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(queue.locator('.pv-submission')).toHaveCount(1);
  await page.getByLabel('Filter by label').selectOption('Examples');
  await expect(queue.locator('.pv-submission')).toHaveCount(1);
  await page.getByLabel('Filter by verse').selectOption('commons:statistics');
  await expect(page.getByLabel('Filter by collection')).toHaveValue('');
  await expect(queue.locator('.pv-submission')).toHaveCount(0);
  await page.getByRole('link', { name: 'Clear filters', exact: true }).click();
  await expect(queue.locator('.pv-submission')).toHaveCount(5);
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).resolves.toBe(true);
});
test('saves notes, approves and undoes without losing the review', async ({ page }, testInfo) => {
  await page.goto(path);
  const organize = page.locator('.pv-organize');
  await organize.locator('summary').click();
  await organize
    .getByLabel('Private review note', { exact: true })
    .fill('Check the worked example before publication.');
  await organize.getByLabel('Label', { exact: true }).fill('Sources');
  await organize.getByRole('button', { name: 'Save review', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Private notes and review saved.');
  await page.getByRole('link', { name: 'Comments (2)', exact: true }).click();
  await expect(page.locator('[data-review-tab=comments] .pv-comment')).toHaveCount(2);
  await expect(page.locator('[data-review-tab=comments] .pv-quote')).toHaveCount(2);
  await expect(page.locator('[data-review-tab=comments]')).toContainText('2 passages');
  await page.screenshot({ path: testInfo.outputPath('review-comments.png'), fullPage: true });
  await page.getByRole('button', { name: 'Approve contribution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Contribution approved.');
  await expect(page.getByRole('heading', { name: 'Singleton', exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Review decision undone.');
  await expect(page.locator('.pv-detail h2')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  await organize.locator('summary').click();
  await expect(organize.getByLabel('Private review note', { exact: true })).toHaveValue(
    'Check the worked example before publication.',
  );
  await expect(organize.getByLabel('Label', { exact: true })).toHaveValue('Sources');
  await page.getByRole('link', { name: 'Activity', exact: true }).click();
  await expect(page.locator('[data-review-tab=activity]')).toContainText('Approved');
});
test('rejects with a private note and protects a conflicting note from another tab', async ({
  page,
  request,
}) => {
  await page.goto(path);
  await page.locator('details.pv-reject > summary').click();
  await page
    .locator('details.pv-reject')
    .getByLabel('Private review note · optional')
    .fill('The existing example already addresses this.');
  await page.getByRole('button', { name: 'Reject contribution', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Contribution rejected.');
  await page.getByRole('link', { name: /^Rejected/ }).click();
  await expect(page.locator('.pv-detail h2')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  await page.locator('.pv-organize > summary').click();
  await expect(
    page.locator('.pv-organize').getByLabel('Private review note', { exact: true }),
  ).toHaveValue('The existing example already addresses this.');
  const changes = await request.post(`${path}/${id}`, {
    form: { version: '2', status: 'reviewing', action: 'decision', returnTo: path },
    headers: { Origin: 'http://127.0.0.1:4199' },
  });
  expect(changes.ok()).toBe(true);
  await page
    .locator('.pv-organize')
    .getByLabel('Private review note', { exact: true })
    .fill('Keep my unsaved note.');
  await page.getByRole('button', { name: 'Save review', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'This review changed', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Your unsaved note')).toHaveValue('Keep my unsaved note.');
});
