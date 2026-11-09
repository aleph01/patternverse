import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const source = readFileSync(
  resolve(process.cwd(), '../../artifacts/the-work-review/practice.pattern.md'),
  'utf8',
);

test('authors, saves and runs the accepted Work rewrite with optional blank answers', async ({
  page,
}, info) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Readable Work review');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await field.fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Paths block', exact: true })).toHaveCount(3);
  await expect(page.getByText('Paths based on truth', { exact: true })).toBeVisible();
  await expect(page.locator('form form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Readable Work review” as draft.')).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await expect(field).toHaveValue(source.trimEnd());
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  const preview = page.locator('.preview-body');
  await preview
    .getByRole('button', { name: 'I already have one stressful thought.', exact: true })
    .click();
  const current = page.getByRole('region', { name: 'Current preview step' });
  await current.getByRole('textbox').nth(0).fill('A friend cancelled dinner.');
  await current.getByRole('textbox').nth(1).fill('They do not respect my time.');
  await expect(page.locator('form form')).toHaveCount(0);
  await current.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
  await preview.getByRole('button', { name: 'No', exact: true }).click();
  await expect(current).toContainText('Question 3:');
  await expect(preview).not.toContainText('Question 2:');
  await current.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
  await expect(current).toContainText('Question 4:');
  await current.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
  await preview
    .getByRole('button', {
      name: 'Leave turnarounds for now and reflect on what I noticed.',
      exact: true,
    })
    .click();
  await current.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
  await expect(preview).toContainText('Practice complete.');
  await expect(preview).toContainText('They do not respect my time.');
  await expect(preview).toContainText('You chose to leave turnarounds for now.');
  if (info.project.name === 'mobile-chromium')
    await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
