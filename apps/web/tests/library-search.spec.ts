import {
  libraryScopeControl,
  librarySearchInput,
  openLibrarySearch,
  searchLibrary,
} from './helpers/library';
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import { publicBuildFile } from './helpers/public-build';

const file = (await readdir(publicBuildFile('library/search'))).find((file) =>
  file.endsWith('.json'),
)!;
const documents: LibrarySearchDocument[] = JSON.parse(
  await readFile(publicBuildFile(`library/search/${file}`), 'utf8'),
);
const target = documents.find(({ entityId }) => entityId === 'creative-reframing')!;
const metadata = documents
  .map((document) =>
    [
      document.title,
      document.summary,
      ...document.aliases,
      ...document.verseNames,
      ...document.collectionNames,
    ].join(' '),
  )
  .join(' ')
  .toLowerCase();
const bodyQuery = target.body
  .match(/[a-z]{9,}/gi)!
  .find(
    (word) =>
      !metadata.includes(word.toLowerCase()) &&
      documents.filter((document) => document.body.toLowerCase().includes(word.toLowerCase()))
        .length < 4,
  )!;
if (!bodyQuery) throw new Error('A body-only search fixture is required.');
const searchStatus = (page: import('@playwright/test').Page) =>
  page.getByRole('status').filter({ hasText: /full library search/i });
const targetLink = (page: import('@playwright/test').Page) =>
  page.locator('#library').getByText(target.title, { exact: true }).first();

test.describe('search intent and static browsing', () => {
  test.use({ serviceWorkers: 'block' });

  test('browses without fetching the corpus and deduplicates a delayed search', async ({
    page,
  }, info) => {
    let arrivals = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/library/search/*.json', async (route) => {
      arrivals++;
      await gate;
      await route.continue();
    });
    try {
      await page.goto('/library');
      await expect(libraryScopeControl(page)).toBeEnabled();
      await page.waitForLoadState('networkidle');
      if (info.project.name === 'mobile-chromium')
        await page.getByRole('button', { name: 'Filter library' }).click();
      await page.getByRole('button', { name: 'Collections', exact: true }).click();
      await expect(page.locator('#library').getByRole('link').first()).toBeVisible();
      await page.getByRole('button', { name: 'Patterns', exact: true }).click();
      expect(arrivals).toBe(0);
      const input = librarySearchInput(page);
      await searchLibrary(page, bodyQuery);
      await expect(searchStatus(page)).toContainText('Loading full library search');
      await searchLibrary(page, 'creative reframing');
      await searchLibrary(page, bodyQuery);
      await expect(page.getByRole('heading', { name: 'No matching patterns' })).toHaveCount(0);
      if (info.project.name === 'mobile-chromium')
        await expect(page.getByRole('button', { name: 'Open search', exact: true })).toBeFocused();
      else await expect(input).toBeFocused();
      expect(arrivals).toBe(1);
      await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
      release();
      await expect(searchStatus(page)).toHaveCount(0);
      await expect(input).toHaveValue('');
      await searchLibrary(page, bodyQuery);
      await expect(targetLink(page)).toBeVisible();
      expect(arrivals).toBe(1);
    } finally {
      release();
    }
  });

  test('preserves the query and usable fallback after failure, with deliberate retry', async ({
    page,
  }) => {
    let arrivals = 0;
    await page.route('**/library/search/*.json', async (route) => {
      if (++arrivals === 1) await route.abort();
      else await route.continue();
    });
    await page.goto('/library');
    const input = librarySearchInput(page);
    await searchLibrary(page, bodyQuery);
    await expect(searchStatus(page)).toContainText('Full library search is unavailable');
    await searchLibrary(page, 'creative reframing');
    await expect(targetLink(page)).toBeVisible();
    await searchLibrary(page, bodyQuery);
    await openLibrarySearch(page);
    await input.focus();
    expect(arrivals).toBe(1);
    await page.getByRole('button', { name: 'Retry full search' }).click();
    await expect(searchStatus(page)).toHaveCount(0);
    await expect(input).toHaveValue(bodyQuery);
    await expect(targetLink(page)).toBeVisible();
    expect(arrivals).toBe(2);
  });

  test('reuses search through article navigation without downloading the corpus again', async ({
    page,
  }, info) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/library/search/')) requests.push(request.url());
    });
    await page.goto('/library');
    await searchLibrary(page, bodyQuery);
    await expect(searchStatus(page)).toHaveCount(0);
    await expect(targetLink(page)).toBeVisible();
    await targetLink(page).click();
    await expect(page.getByRole('heading', { level: 1, name: target.title })).toBeVisible();
    await page.goBack();
    // Desktop snapshots restore query/filters. Mobile retains its existing fresh-list behavior.
    if (info.project.name === 'mobile-chromium') await searchLibrary(page, bodyQuery);
    else await expect(librarySearchInput(page)).toHaveValue(bodyQuery);
    await expect(targetLink(page)).toBeVisible();
    expect(requests).toHaveLength(1);
  });
});

test.describe('runtime search caching', () => {
  test('reopens full-text search offline after a successful online search', async ({
    page,
    context,
  }) => {
    await page.goto('/library');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await searchLibrary(page, bodyQuery);
    await expect(searchStatus(page)).toHaveCount(0);
    await expect(targetLink(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await searchLibrary(page, bodyQuery);
    await expect(targetLink(page)).toBeVisible();
    await expect(searchStatus(page)).toHaveCount(0);
  });

  test('keeps browsing and summary search available offline before full-text search was downloaded', async ({
    page,
    context,
  }) => {
    await page.goto('/library');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await searchLibrary(page, 'creative reframing');
    await expect(searchStatus(page)).toContainText('Full library search is unavailable');
    await expect(targetLink(page)).toBeVisible();
    await searchLibrary(page, bodyQuery);
    await expect(page.getByRole('heading', { name: 'No matching patterns' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry full search' })).toBeVisible();
  });
});
