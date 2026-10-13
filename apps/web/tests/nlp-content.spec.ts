import { expect, test } from '@playwright/test';

test('browses the NLP collection inside Therapy and reads patterns with optional practices', async ({
  page,
}) => {
  await page.goto('/verse/therapy');
  await page.getByRole('heading', { level: 2, name: 'Collections', exact: true }).click();
  await page.getByRole('link', { name: 'Neuro-Linguistic Programming', exact: true }).click();
  await expect(page).toHaveURL(/\/collection\/neuro-linguistic-programming$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Neuro-Linguistic Programming' }),
  ).toBeVisible();
  await expect(page.getByText('14 entries · Author-defined order')).toBeVisible();
  await page.getByRole('link', { name: /Find the Positive Intention/ }).click();
  await expect(page).toHaveURL(/\/pattern\/find-the-positive-intention$/);
  const article = page.getByRole('article', { name: 'Find the Positive Intention article' });
  await expect(
    article.getByRole('heading', { name: 'What the objection is protecting' }),
  ).toBeVisible();
  await expect(article).toContainText(
    'Understanding a motive is being used to excuse harm or override a boundary.',
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
  const all = page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'All', exact: true });
  // A slow development build can paint server controls before hydration attaches their events.
  await expect(async () => {
    await all.click();
    await expect(all).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
  }).toPass();
  const search = page.getByRole('searchbox', { name: /Search/ }).first();
  await search.fill('NLP');
  await expect(page.getByRole('link', { name: /Neuro-Linguistic Programming/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Find the Positive Intention/ })).toBeVisible();
  await search.fill('Reality Strategy');
  await page.getByRole('link', { name: /Inspect How You Know/ }).click();
  await expect(page).toHaveURL(/\/pattern\/inspect-how-you-know$/);
  await expect(page.getByRole('article', { name: 'Inspect How You Know article' })).toContainText(
    'printed pages 89–97',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
