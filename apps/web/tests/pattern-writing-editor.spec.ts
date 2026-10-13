import { expect, test } from '@playwright/test';

test('centered article editor retains rich text and undo across full-screen mode', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('Focused writing');
  await page.getByLabel('In one sentence', { exact: true }).fill('Keep the writing space clear.');
  const editor = page.locator('.novel-prose');
  await editor.fill('Keep this thought.');
  const geometry = await page.locator('.editor-centered').evaluate((shell) => {
    const article = shell.querySelector('.body-editor')!.getBoundingClientRect();
    const extras = shell.querySelector('.editor-optional-fields')!.getBoundingClientRect();
    return {
      ratio: article.width / shell.getBoundingClientRect().width,
      below: extras.top >= article.bottom,
    };
  });
  expect(geometry.ratio).toBeGreaterThan(0.8);
  expect(geometry.below).toBe(true);
  await expect(page.getByLabel('Topics', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Writing space — Focused writing' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('In one sentence', { exact: true })).not.toBeVisible();
  await expect(page.getByRole('region', { name: 'Verses' })).not.toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Back to details', exact: true })).toBeFocused();
  await editor.click();
  await expect(editor).toContainText('Keep this thought.');
  // Undo a change made before entering focus mode, then restore it.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toContainText('Keep this thought.');
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(' Saved in focus mode.');
  await dialog.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(dialog.getByText('Saved “Focused writing” as draft.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to details', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeFocused();
  await expect(editor).toContainText('Saved in focus mode.');
  await page.reload();
  await expect(editor).toContainText('Saved in focus mode.');
  await expect(page.getByLabel('In one sentence', { exact: true })).toHaveValue(
    'Keep the writing space clear.',
  );
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Add or edit link', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back to details', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0);
});

test('topics, alternative names, attribution, IDs, and multiple verse homes round-trip unchanged', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('Metadata round trip');
  await page.locator('summary').filter({ hasText: 'Topics & other names' }).click();
  const topics = page.getByRole('textbox', { name: 'Topics', exact: true });
  await topics.fill('testing, decisions');
  await topics.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove topics: testing' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove topics: testing' }).click();
  await page.getByRole('textbox', { name: 'Also known as', exact: true }).fill('small test');
  // Saving must keep a final keyword even without pressing Enter first.
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Metadata round trip” as draft.')).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Credits & technical details' }).click();
  await expect(page.getByLabel('Pattern ID', { exact: true })).toHaveValue('metadata-round-trip');
  await expect(page.getByLabel('Pattern ID', { exact: true })).toBeDisabled();
  await page.getByLabel('Source or inspiration', { exact: true }).fill('Inspired by a book.');
  const verses = page.getByRole('region', { name: 'Verses', exact: true });
  await verses.getByText('Add or change verses', { exact: true }).click();
  await verses.getByRole('searchbox').fill('Learning');
  await verses.getByRole('button', { name: 'Add Learning', exact: true }).click();
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await page.reload();
  await page.locator('summary').filter({ hasText: 'Topics & other names' }).click();
  await expect(page.getByRole('button', { name: 'Remove topics: decisions' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove topics: testing' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Remove also known as: small test' }),
  ).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Credits & technical details' }).click();
  await expect(page.getByLabel('Source or inspiration', { exact: true })).toHaveValue(
    'Inspired by a book.',
  );
  await expect(
    verses.getByRole('button', { name: 'Remove Creativity', exact: true }),
  ).toBeVisible();
  await expect(verses.getByRole('button', { name: 'Remove Learning', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('writing controls remain usable at small widths and failed saves expose required fields', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Unsaved focused draft');
  const editor = page.locator('.novel-prose');
  await editor.fill('No verse yet.');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('verse');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(editor).toContainText('No verse yet.');
  const verses = page.getByRole('region', { name: 'Verses', exact: true });
  await verses.getByRole('searchbox').fill('Creativity');
  await verses.getByRole('button', { name: 'Add Creativity', exact: true }).click();
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Unsaved focused draft” as draft.')).toBeVisible();
});
