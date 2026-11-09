import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { libraryVerseControl, searchLibrary, selectLibraryCategory } from './helpers/library';
const metadata = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../docs/pattern-packages/architecture.json'), 'utf8'),
) as {
  article_outline: string[];
  patterns: { id: string; title: string; photographs?: unknown[] }[];
  groups: { id: string; collections: { id: string; title: string }[] }[];
};

test('discovers the verse and all ten topic collections', async ({ page }, info) => {
  await page.goto('/verse/architecture');
  await expect(page).toHaveURL('/library?verse=commons%3Aarchitecture');
  await expect(libraryVerseControl(page, 'Architecture')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/collection/architecture-field-guide');
  await expect(
    page.getByRole('heading', { name: 'Architecture Field Guide', exact: true }).first(),
  ).toBeVisible();
  for (const g of metadata.groups) {
    await expect(page.locator(`article a[href="/collection/${g.id}"]`).first()).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('architecture-guide.png'), fullPage: true });
  for (const g of metadata.groups) {
    await page.goto('/collection/' + g.id);
    for (const c of g.collections)
      await expect(page.locator(`article a[href="/collection/${c.id}"]`).first()).toBeVisible();
  }
});

test('loads every guide and every diagram or photograph at occupied reading widths', async ({
  page,
}, info) => {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/assets/architecture/') && r.status() !== 200) failed.push(r.url());
  });
  for (const p of metadata.patterns) {
    await page.goto('/pattern/' + p.id);
    await expect(page.getByRole('heading', { level: 1, name: p.title, exact: true })).toBeVisible();
    await expect(page.locator('.markdown-body h2')).toHaveText(metadata.article_outline);
    await expect(page.locator('a[href*="/practice/"]')).toHaveCount(0);
    const figures = page.locator('.markdown-body figure');
    await expect(figures).toHaveCount(3 + (p.photographs?.length ?? 0));
    for (const img of await figures.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((n: HTMLImageElement) => n.naturalWidth))
        .toBeGreaterThan(0);
      expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(30);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      p.id,
    ).toBe(true);
    if (p.id === 'arch-courtyards-which-live') {
      await figures.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('architecture-courtyard.png') });
    }
  }
  expect(failed).toEqual([]);
});

test('navigates the shared outline through desktop and phone contents', async ({ page }, info) => {
  await page.goto('/pattern/arch-site-repair');
  for (const title of metadata.article_outline) {
    const menu = page.locator('.outline-menu summary');
    if (await menu.isVisible()) await menu.click();
    const link = page.locator('nav[aria-label="Article contents"]:visible').getByRole('link', {
      name: title,
      exact: true,
    });
    const href = await link.getAttribute('href');
    await link.click();
    expect(new URL(page.url()).hash).toBe(href);
    await expect(page.locator('.markdown-body h2', { hasText: title })).toBeInViewport();
    if (await menu.isVisible())
      await expect(page.locator('.outline-menu')).not.toHaveAttribute('open');
  }
  await page
    .getByRole('heading', { name: 'Architectural examples', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('architecture-shared-outline.png') });
});

test('finds a guide from the indexed situation language', async ({ page }) => {
  await page.goto('/library?verse=commons%3Aarchitecture');
  await selectLibraryCategory(page, 'Patterns');
  await searchLibrary(page, 'overheats');
  await expect(
    page
      .locator('#library')
      .getByRole('link', { name: /External Solar Shading/ })
      .first(),
  ).toBeVisible();
});

test('does not publish the removed Architecture guided practice routes', async ({ request }) => {
  for (const id of [
    'architecture-place-observation',
    'architecture-daylight-observation',
    'architecture-reuse-options-review',
  ]) {
    for (const suffix of ['', '/run'])
      expect((await request.get(`/practice/${id}${suffix}`)).status()).toBe(404);
  }
});
