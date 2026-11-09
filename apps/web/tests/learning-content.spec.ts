import { expect, test } from '@playwright/test';
import { libraryVerseControl, searchLibrary, selectLibraryCategory } from './helpers/library';

test('Learning exposes the collection, complete articles, related links, and search aliases', async ({
  page,
}) => {
  await page.goto('/verse/learning');
  await expect(libraryVerseControl(page, 'Learning')).toHaveAttribute('aria-pressed', 'true');
  await selectLibraryCategory(page, 'Collections');
  await page
    .getByRole('region', { name: 'Library results', exact: true })
    .getByRole('link', { name: /Learning How to Learn/ })
    .click();
  await expect(page).toHaveURL('/collection/learning-how-to-learn');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learning How to Learn');
  await expect(page.locator('.primary-relationship .pattern-feed > li')).toHaveCount(15);
  await expect(page.locator('.primary-relationship h3').first()).toHaveText('Active Recall');
  await expect(page.locator('.primary-relationship h3').last()).toHaveText(
    'Run Learning Experiments',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('link', { name: /Active Recall/ }).click();
  await expect(page).toHaveURL('/pattern/active-recall?collection=commons%3Alearning-how-to-learn');
  const article = page.getByRole('article', { name: 'Active Recall article' });
  await expect(article).toContainText('Rereading can create a strong feeling of familiarity');
  await expect(article).toContainText('hundreds of tiny fact cards');
  await expect(article).toContainText(
    'The moment the source disappears is often the moment when knowledge becomes visible.',
  );
  await expect(page.locator('a[href="/practice/active-recall/run"]')).toHaveCount(0);
  await article.getByRole('link', { name: 'Spaced Practice', exact: true }).click();
  await expect(page).toHaveURL('/pattern/spaced-practice');
  await expect(page.getByRole('article')).toContainText(
    'There is no universally correct interval.',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto('/library');
  await searchLibrary(page, 'Retrieval Practice');
  await expect(
    page.locator('.pattern-feed h3').filter({ hasText: /^Active Recall$/ }),
  ).toBeVisible();
  await searchLibrary(page, 'Learning How to Learn');
  await selectLibraryCategory(page, 'Collections');
  await expect(
    page.locator('.pattern-feed h3').filter({ hasText: /^Learning How to Learn$/ }),
  ).toBeVisible();
});
