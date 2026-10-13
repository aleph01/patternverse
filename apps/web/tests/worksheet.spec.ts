import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('previews and copies a blank worksheet in both formats without starting a run', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedWorksheet: string }).copiedWorksheet = text;
        },
      },
    });
  });
  await page.goto('/practice/five-alternative-frames');
  const opener = page.getByRole('button', { name: 'Open worksheet' });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Complete workbook', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '1. Describe the situation' })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Worksheet content' })).not.toContainText(
    'step_1.situation',
  );
  expect(await dialog.locator('input, textarea').count()).toBe(0);
  const headingSize = await dialog
    .locator('.worksheet-document h2')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(headingSize).toBeLessThanOrEqual(24);
  await dialog.getByRole('button', { name: 'Copy plain text', exact: true }).click();
  await expect(dialog.getByText('Plain text copied.', { exact: true })).toBeVisible();
  const plain = await page.evaluate(
    () => (window as unknown as { copiedWorksheet: string }).copiedWorksheet,
  );
  expect(plain).toContain('Describe the situation');
  expect(plain).toContain('Your answer — required');
  expect(plain).not.toMatch(/^#|\*\*|`/m);
  await dialog.getByRole('button', { name: 'Copy Markdown', exact: true }).click();
  const markdown = await page.evaluate(
    () => (window as unknown as { copiedWorksheet: string }).copiedWorksheet,
  );
  expect(markdown).toContain('# Five Alternative Frames Practice');
  expect(markdown).toContain('**Your answer');
  expect(markdown).toContain('No saved answers are included');
  await expect(dialog.getByRole('button', { name: 'Copy plain text' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('downloads both formats and offers a manual-copy fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Denied');
        },
      },
    });
  });
  await page.goto('/practice/five-alternative-frames');
  await page.getByRole('button', { name: 'Open worksheet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Complete workbook', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Copy plain text', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Select and copy');
  await expect(dialog.locator('pre')).toContainText('Describe the situation');
  for (const format of ['txt', 'md']) {
    const pending = page.waitForEvent('download');
    await dialog.getByRole('button', { name: `Download .${format}`, exact: true }).click();
    const downloaded = await pending;
    expect(downloaded.suggestedFilename()).toBe(
      `five-alternative-frames-practice-worksheet.${format}`,
    );
    const content = await readFile((await downloaded.path())!, 'utf8');
    expect(content).toContain('No saved answers are included');
    expect(content.startsWith('#')).toBe(format === 'md');
  }
});

test('catalog workbooks preserve readiness and safety exits without route numbers', async ({
  page,
}) => {
  await page.goto('/pattern/cbt-thought-record');
  await page
    .getByRole('navigation', { name: 'Pattern shortcuts' })
    .getByRole('button', { name: 'Open worksheet' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText('Workbook with manual instructions', { exact: true }),
  ).toBeVisible();
  const document = dialog.getByRole('region', { name: 'Worksheet content' });
  await expect(document).toContainText('emergency care');
  await expect(document).toContainText('positive evidence');
  await expect(document).toContainText('Complete the matching section below');
  await expect(document).toContainText('Yes, begin gently');
  await expect(document).not.toContainText('Route ');
  await expect(document).not.toContainText('readiness.decision.value');
});

test('AI-dependent articles have no workbook shortcut or empty export card', async ({ page }) => {
  await page.goto('/pattern/reframing-frame-problem');
  await expect(page.getByRole('navigation', { name: 'Pattern shortcuts' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open worksheet' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'In your own editor' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Try this pattern yourself' })).toBeVisible();
  await page.goto('/pattern/abstract-factory');
  await expect(page.getByRole('button', { name: 'Open worksheet' })).toHaveCount(0);
});

test('the editor exports conditional tables and hides AI-dependent or ambiguous workbooks', async ({
  page,
}, info) => {
  const source = await readFile('../../docs/pattern-markdown/examples/check-in.pattern.md', 'utf8');
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Workbook review');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await editor.fill(source);
  await page.getByRole('button', { name: 'Open worksheet' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('table')).toContainText('is at least 8');
  await expect(dialog.getByRole('table')).toContainText('is at least 4');
  await expect(dialog.getByRole('table')).toContainText('Make room to rest.');
  await expect(dialog.getByRole('region', { name: 'Worksheet content' })).not.toContainText(
    'Route ',
  );
  await dialog.getByRole('button', { name: 'Plain text', exact: true }).click();
  await expect(dialog.locator('pre')).toContainText('Make room to rest.');
  await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('table').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('conditional-workbook.png') });
  await page.keyboard.press('Escape');
  await editor.fill(':language 1\n!ask answer {\n~ Ask about today.\n}\n-> end');
  await expect(
    page.getByText('Workbook unavailable: AI-dependent steps.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open worksheet' })).toHaveCount(0);
  await editor.fill(':language 1\n!choose option {\n- a: "Same"\n- b: "Same"\n}\n-> end');
  await expect(
    page.getByText('Workbook unavailable: ambiguous choice labels.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open worksheet' })).toHaveCount(0);
  await editor.fill(':language 1\n!ask answer {\nQuestion?\n}\n-> end');
  await expect(page.getByRole('button', { name: 'Open worksheet' })).toBeVisible();
});
