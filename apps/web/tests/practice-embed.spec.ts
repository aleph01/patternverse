import { expect, test } from '@playwright/test';

test('the public worksheet works in an independent presentation shell with the same validation', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const prefix of ['pattern', 'embed']) {
    const suffix = prefix === 'pattern' ? '/run' : '';
    await page.goto(`/${prefix}/define-the-decision-before-comparing-options${suffix}`);
    if (prefix === 'embed') {
      await expect(page.locator('.site-header')).toHaveCount(0);
      await expect(page.locator('footer')).toHaveCount(0);
      await expect(page.locator('a')).toHaveCount(0);
    }
    await page
      .getByLabel('How are you currently phrasing the decision?')
      .fill('Should we rewrite the app?');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    await expect(page.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
    await page.getByLabel('What problem are you trying to solve?').fill('Reduce maintenance');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    await expect(
      page.getByRole('heading', { name: 'Separate facts from assumptions' }),
    ).toHaveCount(0);
    await page.getByLabel('What would a good outcome give you?').fill('Simpler boundaries');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    await expect(
      page.getByRole('heading', { name: 'Separate facts from assumptions' }),
    ).toBeVisible();
    await expect(page.getByText('Should we rewrite the app?', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (prefix === 'embed')
      await page.screenshot({ path: info.outputPath('practice-embed.png'), fullPage: true });
    await page.getByLabel('Which constraints are genuinely fixed?').fill('A small budget');
    await page
      .getByLabel('Which constraints are you merely assuming?')
      .fill('A full rewrite is needed');
    await page
      .getByLabel('What alternatives disappear because of the way you phrased the question?')
      .fill('Extracting just one boundary');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    await page
      .getByLabel('What is your rewritten decision question?')
      .fill('How can we simplify maintenance within the budget?');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    await page
      .getByLabel('What are at least three options that the new question makes visible?')
      .fill('Extract a boundary, improve tests, simplify dependencies');
    await page.getByRole('button', { name: 'Continue ↓' }).click();
    if (prefix === 'embed') {
      await expect(page.getByText(/^Practice complete\./)).toBeVisible();
      expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
    } else await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
    await expect(page.getByText('Simpler boundaries', { exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
