import { expect, test } from '@playwright/test';

test('manages private sessions in history and retains the active choice after reload', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /CBT/ })
    .click();
  await page.getByRole('button', { name: 'Previous sessions' }).click();
  const history = page.getByRole('dialog', { name: 'Sessions', exact: true });
  const cards = history.locator('.mira-session-card');
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole('button', { name: 'Rename', exact: true }).click();
  await history.getByRole('textbox', { name: 'Session name' }).fill('First private reflection');
  await history.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(cards.first().getByRole('heading')).toHaveText('First private reflection');
  await history.getByRole('button', { name: 'New session', exact: true }).click();
  await expect(history).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose therapy approach' }).click();
  await page
    .getByRole('dialog', { name: 'Therapy approach' })
    .getByRole('button', { name: /DBT/ })
    .click();
  await page.getByRole('button', { name: 'Previous sessions' }).click();
  await expect(cards).toHaveCount(2);
  const first = cards.filter({
    has: page.getByRole('heading', { name: 'First private reflection' }),
  });
  await first.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(history).toHaveCount(0);
  await page.reload();
  // Approach identifies the active session even when the mobile toolbar hides its title.
  await expect(page.getByRole('button', { name: 'Choose therapy approach' })).toHaveText('CBT');
  await page.getByRole('button', { name: 'Previous sessions' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await first.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(cards).toHaveCount(2);
  page.once('dialog', (dialog) => dialog.accept());
  await first.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(history.getByText('Session deleted from this device.')).toBeVisible();
  await history.getByRole('button', { name: 'Close sessions' }).click();
  await expect(page.getByRole('textbox', { name: 'Message mira' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose therapy approach' })).toHaveText('DBT');
  await page.reload();
  await page.getByRole('button', { name: 'Previous sessions' }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.first().getByRole('heading')).toHaveText('New session');
  expect(failures).toEqual([]);
});
