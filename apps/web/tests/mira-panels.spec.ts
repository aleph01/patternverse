import { expect, test } from '@playwright/test';

test('settings retain drafts, save preferences, and share keyboard focus behavior', async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Settings', exact: true });
  await trigger.click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(settings).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(settings.getByRole('button', { name: 'Close settings' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(settings.getByRole('link', { name: 'safety & use' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(settings.getByRole('button', { name: 'Close settings' })).toBeFocused();

  await settings.getByLabel('Current session modality').selectOption('cbt');
  await settings.getByLabel('Prompt to edit').selectOption('cbt');
  await settings.getByLabel('Guidance').fill('A synthetic, private CBT guidance prompt.');
  await settings.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await expect(settings.getByText('Modality prompt saved.', { exact: true })).toBeVisible();
  await settings.getByLabel('Monthly warning threshold (USD)').fill('12.50');
  await settings.getByRole('button', { name: 'Save budget' }).click();
  await expect(settings.getByText('Monthly Mira budget saved.', { exact: true })).toBeVisible();
  await settings.getByLabel('Read new replies aloud automatically').check();
  await settings.getByLabel('Guidance').fill('Unsaved draft survives closing the panel.');
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(settings.getByLabel('Guidance')).toHaveValue(
    'Unsaved draft survives closing the panel.',
  );
  await page.reload();
  await trigger.click();
  await settings.getByLabel('Prompt to edit').selectOption('cbt');
  await expect(settings.getByLabel('Guidance')).toHaveValue(
    'A synthetic, private CBT guidance prompt.',
  );
  await expect(settings.getByLabel('Monthly warning threshold (USD)')).toHaveValue('12.5');
  await expect(settings.getByLabel('Read new replies aloud automatically')).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('mira-settings.png') });
  await settings.getByRole('button', { name: 'Restore default' }).click();
  await expect(
    settings.getByText('Default modality prompt restored.', { exact: true }),
  ).toBeVisible();
  await expect(settings.getByLabel('Guidance')).not.toHaveValue(
    'A synthetic, private CBT guidance prompt.',
  );
  expect(failures).toEqual([]);
});

test('history explicitly exports and imports an encrypted archive without replacing a session', async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/mira');
  await page.getByRole('button', { name: 'New session', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Previous sessions' });
  await trigger.click();
  const history = page.getByRole('dialog', { name: 'Sessions', exact: true });
  await expect(history).toBeFocused();
  await history.getByRole('button', { name: 'Rename', exact: true }).click();
  await history.getByLabel('Session name').fill('Synthetic archive reflection');
  await history.getByRole('button', { name: 'Save', exact: true }).click();
  await history.getByLabel('Archive passphrase').fill('synthetic archive passphrase');
  const downloadPromise = page.waitForEvent('download');
  await history.getByRole('button', { name: 'Export encrypted archive' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^patternverse-mira-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(history.getByLabel('Archive passphrase')).toHaveValue('');
  await history
    .getByLabel('Choose archive', { exact: true })
    .setInputFiles((await download.path())!);
  await history.getByLabel('Archive passphrase').fill('wrong archive passphrase');
  await history.getByRole('button', { name: 'Import selected archive' }).click();
  await expect(history.getByRole('alert')).toContainText(
    'The passphrase is incorrect or the archive is damaged.',
  );
  await expect(history.locator('.mira-session-card')).toHaveCount(1);
  await expect(history.getByLabel('Archive passphrase')).toHaveValue('wrong archive passphrase');
  await history.getByLabel('Archive passphrase').fill('synthetic archive passphrase');
  await history.getByRole('button', { name: 'Import selected archive' }).click();
  await expect(
    history.getByText('Imported 1 session without replacing existing sessions.', { exact: true }),
  ).toBeVisible();
  await expect(history.locator('.mira-session-card')).toHaveCount(2);
  await expect(
    history.getByRole('heading', { name: 'Synthetic archive reflection', exact: true }),
  ).toHaveCount(2);
  await expect(history.getByLabel('Archive passphrase')).toHaveValue('');
  await expect(history.getByRole('button', { name: 'Import selected archive' })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('mira-history.png') });
  // Completing import disables the clicked button; focus the dialog before testing its key handler.
  await history.focus();
  await page.keyboard.press('Escape');
  await expect(history).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(failures).toEqual([]);
});
