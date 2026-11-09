import { expect, test } from '@playwright/test';
import {
  expectLibraryScope,
  libraryVerseControl,
  searchLibrary,
  selectLibraryCategory,
} from './helpers/library';

test('Verse links survive reload, clearing, back navigation, and reading a pattern', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.locator('.verse-tile').filter({ hasText: 'Software Engineering' }).click();
  const destination = '/library?verse=commons%3Asoftware-engineering';
  await expect(page).toHaveURL(destination);
  const selected = libraryVerseControl(page, 'Software Engineering');
  await expect(page.getByRole('region', { name: 'Selected Verse' })).toHaveCount(0);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: testInfo.outputPath('filtered-library.png'), fullPage: true });
  await page.reload();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await searchLibrary(page, 'Observer');
  const observer = page
    .getByRole('region', { name: 'Library results', exact: true })
    .getByRole('link', { name: /Observer/ });
  await expect(observer).toBeVisible();
  await observer.click();
  await expect(page).toHaveURL(/\/pattern\/observer(?:\?.*)?$/);
  await page.goBack();
  await expect(page).toHaveURL(destination);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await libraryVerseControl(page, 'All verses').click();
  await expect(page).toHaveURL('/library');
  await expect(selected).toHaveAttribute('aria-pressed', 'false');
  await page.goBack();
  await expect(page).toHaveURL(destination);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(selected).toHaveAttribute('aria-pressed', 'false');
});

test('old Verse addresses and aliases open the catalog and preserve Collection pages', async ({
  page,
}) => {
  for (const [id, title, key] of [
    ['creativity', 'Creativity', 'creativity'],
    ['software-engineering', 'Software Engineering', 'software-engineering'],
    ['wellbeing', 'Therapy & Wellbeing', 'therapy'],
  ]) {
    await page.goto(`/verse/${id}`);
    await expect(page).toHaveURL(`/library?verse=commons%3A${key}`);
    await expect(libraryVerseControl(page, title)).toHaveAttribute('aria-pressed', 'true');
    await selectLibraryCategory(page, 'Collections');
    const collections = page.getByRole('region', { name: 'Library results', exact: true });
    expect(await collections.getByRole('link').count()).toBeGreaterThan(0);
  }
  await page.goto('/collection/getting-unstuck');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find New Possibilities');
  const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
  await expect(entries.getByRole('link')).toHaveCount(12);
  await expect(entries.locator('h3').first()).toHaveText('Five Alternative Frames');
});

test('a linked Verse explores the full catalog even with saved items in another Verse', async ({
  page,
}) => {
  await page.goto('/pattern/creative-reframing');
  await page.getByRole('button', { name: 'Add to my library', exact: true }).click();
  await page.goto('/library?verse=commons%3Asoftware-engineering');
  await expect(libraryVerseControl(page, 'Software Engineering')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectLibraryScope(page, 'explore');
  await searchLibrary(page, 'Observer');
  await expect(
    page
      .getByRole('region', { name: 'Library results', exact: true })
      .getByRole('link', { name: /Observer/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
