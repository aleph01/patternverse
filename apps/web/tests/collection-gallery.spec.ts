import { expect, test, type Page } from '@playwright/test';
import { librarySearchInput, selectLibraryCategory } from './helpers/library';

async function collectionCard(page: Page) {
  await page.addInitScript(() => localStorage.setItem('patternverse:library-layout', 'cards'));
  await page.goto('/library?verse=commons:software-engineering');
  await selectLibraryCategory(page, 'Collections');
  return page.locator('.card-grid a.feed-row[href="/collection/gof-design-patterns"]');
}

test('desktop collection cards open the existing collection page in authored order', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop collection cards');
  const trigger = await collectionCard(page);
  await trigger.click();
  await expect(page).toHaveURL(/\/collection\/gof-design-patterns$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
  await expect(entries.locator('.feed-row h3')).toHaveText([
    'Abstract Factory',
    'Adapter',
    'Bridge',
    'Builder',
    'Chain of Responsibility',
    'Command',
    'Composite',
    'Decorator',
    'Facade',
    'Factory Method',
    'Flyweight',
    'Interpreter',
    'Iterator',
    'Mediator',
    'Memento',
    'Observer',
    'Prototype',
    'Proxy',
    'Singleton',
    'State',
  ]);
  await entries.getByRole('link', { name: /Factory Method/ }).click();
  await expect(page).toHaveURL(
    /\/pattern\/factory-method\?collection=commons%3Agof-design-patterns$/,
  );
});

test('browser Back restores library filters, card layout, and scroll after opening a collection', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop collection cards');
  const trigger = await collectionCard(page);
  await trigger.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await trigger.click();
  await expect(page).toHaveURL(/\/collection\/gof-design-patterns$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/library\?verse=commons:software-engineering$/);
  await expect(trigger).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(librarySearchInput(page)).toHaveValue('');
  await expect(
    page
      .getByRole('navigation', { name: 'Library categories' })
      .getByRole('button', { name: 'Collections', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page
      .getByRole('group', { name: 'Library view', exact: true })
      .getByRole('button', { name: 'Cards', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - scroll))
    .toBeLessThan(3);
});

test('desktop list mode retains inline collection browsing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop list');
  await collectionCard(page);
  await page
    .getByRole('group', { name: 'Library view' })
    .getByRole('button', { name: 'List' })
    .click();
  await page.getByRole('button', { name: 'Show 23 patterns in GoF Design Patterns' }).click();
  await expect(page.getByRole('region', { name: 'GoF Design Patterns contents' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('phone collection browsing stays inline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Phone layout');
  await page.goto('/library?verse=commons:software-engineering');
  const trigger = page.getByRole('button', {
    name: 'GoF Design Patterns 23 patterns',
    exact: true,
  });
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  await expect(
    page
      .getByRole('region', { name: 'GoF Design Patterns patterns' })
      .getByRole('link', { name: /Factory Method/ }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
