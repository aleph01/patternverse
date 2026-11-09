import { expect, type Page } from '@playwright/test';

export function librarySearchInput(page: Page) {
  return page.locator('#library input[type="search"], #library textarea');
}

export async function openLibrarySearch(page: Page) {
  await expect(libraryScopeControl(page)).toBeEnabled();
  const toggle = page.getByRole('button', { name: 'Open search', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  const input = librarySearchInput(page);
  await expect(input).toBeVisible();
  return input;
}

export async function searchLibrary(page: Page, query: string) {
  const input = await openLibrarySearch(page);
  await input.fill(query);
  const apply = page.getByRole('button', { name: 'Search', exact: true });
  if (await apply.isVisible()) await apply.click();
}

export async function selectLibraryCategory(page: Page, name: 'All' | 'Collections' | 'Patterns') {
  await expect(libraryScopeControl(page)).toBeEnabled();
  const categories = page.getByRole('navigation', { name: 'Library categories' });
  const toggle = page.getByRole('button', { name: 'Filter library', exact: true });
  const openFilters = !(await categories.isVisible());
  if (openFilters) await toggle.click();
  await categories.getByRole('button', { name, exact: true }).click();
  if (openFilters) await toggle.click();
}

export function libraryScopeControl(page: Page) {
  const scope = page.getByRole('navigation', { name: 'Library scope' });
  return scope.getByRole('button', { name: /^My library/ });
}

export async function selectLibraryScope(page: Page, value: 'saved' | 'explore') {
  await expect(libraryScopeControl(page)).toBeEnabled();
  const scope = page.getByRole('navigation', { name: 'Library scope' });
  await scope
    .getByRole('button', { name: value === 'saved' ? /^My library/ : /^(Commons|Explore)$/ })
    .click();
}

export async function expectLibraryScope(page: Page, value: 'saved' | 'explore') {
  await expect(libraryScopeControl(page)).toBeEnabled();
  const scope = page.getByRole('navigation', { name: 'Library scope' });
  await expect(
    scope.getByRole('button', { name: value === 'saved' ? /^My library/ : /^(Commons|Explore)$/ }),
  ).toHaveAttribute('aria-pressed', 'true');
}

export function libraryVerseControl(page: Page, title: string) {
  return page
    .locator('.verse-sidebar:visible, .mobile-verse-mosaic:visible')
    .getByRole('button', { name: title, exact: true });
}
