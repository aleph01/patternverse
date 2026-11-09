import { expect, test } from '@playwright/test';
import { libraryVerseControl, searchLibrary, selectLibraryCategory } from './helpers/library';

test('browses the NLP collection inside Therapy & Wellbeing and reads patterns with optional practices', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Therapy & Wellbeing', exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href="/verse/wellbeing"]')).toHaveCount(0);
  await page.goto('/verse/wellbeing');
  await expect(page).toHaveURL('/library?verse=commons%3Atherapy');
  await expect(libraryVerseControl(page, 'Therapy & Wellbeing')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await selectLibraryCategory(page, 'Collections');
  await page.locator('a[href="/collection/neuro-linguistic-programming"]').click();
  // Wide-library cards expand a dialog; phone cards open the collection page.
  await expect(
    page.getByRole('heading', { name: 'NLP: Sleight of Mouth', exact: true }).last(),
  ).toBeVisible();
  await page.getByRole('link', { name: /Find the Positive Intention/ }).click();
  await expect(page).toHaveURL(
    /\/pattern\/find-the-positive-intention\?collection=commons%3Aneuro-linguistic-programming$/,
  );
  const article = page.getByRole('article', { name: 'Find the Positive Intention article' });
  await expect(
    article.getByRole('heading', { name: 'What the objection is protecting' }),
  ).toBeVisible();
  await expect(article).toContainText(
    'Understanding an intention also leaves responsibility intact.',
  );
  await expect(article).toContainText('Robert Dilts');
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/find-the-positive-intention/run',
  );
  await expect(page.getByRole('link', { name: 'Open in mira', exact: true })).toHaveAttribute(
    'href',
    /source=commons&pattern=find-the-positive-intention/,
  );
  await article.getByRole('link', { name: 'Redefine the Terms', exact: true }).click();
  await expect(page).toHaveURL(/\/pattern\/redefine-the-terms$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('discovers the collection and imported patterns through library search', async ({ page }) => {
  await page.goto('/library');
  await selectLibraryCategory(page, 'All');
  await searchLibrary(page, 'NLP');
  await expect(page.locator('a[href="/collection/neuro-linguistic-programming"]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Find the Positive Intention/ })).toBeVisible();
  await searchLibrary(page, 'Reality Strategy');
  await page.getByRole('link', { name: /Inspect How You Know/ }).click();
  await expect(page).toHaveURL(/\/pattern\/inspect-how-you-know$/);
  await expect(page.getByRole('article', { name: 'Inspect How You Know article' })).toContainText(
    'printed pages 89–97',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
