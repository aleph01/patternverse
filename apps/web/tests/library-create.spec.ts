import { expect, test } from '@playwright/test';

test('moves creation to workspace and finds the private pattern in the library', async ({
  page,
  request,
}) => {
  await page.goto('/library');
  await expect(
    page.getByRole('link', { name: 'Create your own pattern', exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  // Creation stays accessible when a new user's personal library has no results.
  await page.getByRole('button', { name: /^My library/ }).click();
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'workspace', exact: true })
    .click();
  const create = page.getByRole('link', { name: 'New pattern', exact: true });
  await expect(create).toBeVisible();
  await create.click();
  await expect(page).toHaveURL(/\/editor\?type=pattern$/);
  await expect(page.getByRole('heading', { name: 'New pattern' })).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Workspace ownership and privacy' }),
  ).toContainText('not added to public Patternverse');
  await page.getByLabel('Title', { exact: true }).fill('My library starting point');
  await page.getByLabel('Summary').fill('A private pattern created from the browsing view.');
  await page.locator('.novel-prose').fill('Start with one useful idea of your own.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Choose an existing verse');
  const verses = page.getByRole('region', { name: 'Verses' });
  await verses.getByRole('searchbox', { name: 'Find Verses' }).fill('creativity');
  await verses.getByRole('button', { name: 'Add Creativity', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “My library starting point” as draft.')).toBeVisible();

  await page.goto('/library');
  await page.getByRole('button', { name: /^My library/ }).click();
  const saved = page.getByRole('link', { name: /My library starting point/ });
  await expect(saved).toBeVisible();
  await expect(saved).toHaveAttribute('href', '/editor?id=my-library-starting-point');
  await page.reload();
  await expect(saved).toBeVisible();
  expect(await (await request.get('/library')).text()).not.toContain('My library starting point');
  await saved.click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My library starting point');
  await expect(page.locator('.novel-prose')).toContainText(
    'Start with one useful idea of your own.',
  );
});
