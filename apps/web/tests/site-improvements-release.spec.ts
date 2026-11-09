import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { publicBuildDirectory } from './helpers/public-build';

test('retains exactly the live inventory and serves no held-back article or asset', async ({
  request,
}) => {
  const report = JSON.parse(
    await readFile(resolve(publicBuildDirectory, '../../../release-report.json'), 'utf8'),
  ) as {
    retained: string[];
    excluded: { key: string }[];
  };
  expect(report.retained).toHaveLength(157);
  expect(report.excluded.length).toBeGreaterThan(200);
  for (const { key } of report.excluded) {
    const [type, id] = key.split(':');
    expect((await request.get(`/${type}/${id}`)).status(), key).toBe(404);
  }
  for (const asset of [
    '/assets/photography/choose-your-subject.webp',
    '/diagrams/songwriting/song-forms.svg',
  ])
    expect((await request.get(asset)).status()).toBe(404);
  const library = await (await request.get('/library')).text();
  expect(library).not.toContain('photography-for-beginners');
  expect(library).not.toContain('statistics-field-guide');
  expect(library).not.toContain('enact-a-possibility-before-committing');
});

test('shows the site improvements with the existing nine verses', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('.home-verse-grid article')).toHaveCount(9);
  await expect(page.getByRole('heading', { name: 'Use Patternverse in ChatGPT.' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('release-home.png'), fullPage: true });
  await page.getByRole('link', { name: 'contribute', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bring what you know.' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'contact@patternverse.org', exact: true }).first(),
  ).toHaveAttribute('href', /^mailto:/);
});
