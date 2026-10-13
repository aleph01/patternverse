import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';

test('shows grouped decision questions and keeps prior work visible at narrow and desktop widths', async ({
  page,
}, info) => {
  await page.goto('/pattern/define-the-decision-before-comparing-options/run');
  await page
    .getByLabel('How are you currently phrasing the decision?')
    .fill('Should we build a new app?');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
  await expect(page.getByLabel('What problem are you trying to solve?')).toBeVisible();
  await expect(page.getByLabel('What would a good outcome give you?')).toBeVisible();
  await expect(page.getByText('Should we build a new app?', { exact: true })).toBeVisible();
  await page
    .getByLabel('What problem are you trying to solve?')
    .fill('People cannot find the information they need.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByRole('heading', { name: 'Separate facts from assumptions' })).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('grouped-practice.png'), fullPage: true });
  await page
    .getByLabel('What would a good outcome give you?')
    .fill('Useful information at the right moment.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByRole('heading', { name: 'Separate facts from assumptions' }),
  ).toBeVisible();
  await expect(
    page.getByText('Useful information at the right moment.', { exact: true }),
  ).toBeVisible();
});

test('the editor previews the same migrated source with required and optional fields', async ({
  page,
}, info) => {
  const article = readFileSync(
    resolve(process.cwd(), '../../content/patterns/reduce-the-first-step.md'),
    'utf8',
  );
  const source = parseLanguagePracticeFromBody(article).source!;
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Grouped source review');
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  await page.getByRole('textbox', { name: 'Practice source', exact: true }).fill(source);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  if (info.project.name === 'mobile-chromium')
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Run preview', exact: true }).click();
  await page.getByLabel('What are you finding hard to start?').fill('Write the first paragraph.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await page.getByLabel('What is one very small first action?').fill('Open the document.');
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(page.getByText('optional', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    page.getByText(
      'Practice complete. Your test answers remain visible until you restart or leave.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Open the document.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('grouped-editor-preview.png'), fullPage: true });
});

test('standalone practice records use the same runner and keep their article return route', async ({
  page,
}) => {
  await page.goto('/practice/five-alternative-frames/run');
  await expect(page.getByRole('textbox')).toHaveCount(1);
  await expect(page.locator('a.pattern-run-parent')).toHaveAttribute(
    'href',
    '/pattern/creative-reframing',
  );
});
