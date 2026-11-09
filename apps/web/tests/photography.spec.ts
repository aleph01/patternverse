import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { selectLibraryCategory } from './helpers/library';

const metadata = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../docs/pattern-packages/photography.json'), 'utf8'),
) as {
  patterns: { id: string; title: string; visuals: { file: string }[] }[];
  groups: { id: string; title: string; items: string[] }[];
};

for (const article of metadata.patterns) {
  test(`photography: ${article.title}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`/pattern/${article.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText(article.title);
    await expect(page.getByRole('button', { name: 'Very useful', exact: true })).toBeEnabled();
    const images = page.locator('.entity-article figure img');
    await expect(images).toHaveCount(article.visuals.length);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(async (node) => {
        await (node as HTMLImageElement).decode();
      });
      expect(
        await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      ).toBeGreaterThan(0);
    }
    expect(await page.locator('.entity-article').innerText()).not.toContain('[[');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });
}

test('photography navigation, foundations, readable overlays and full-size assets', async ({
  page,
  isMobile,
}) => {
  await page.goto('/verse/photography');
  await expect(page).toHaveURL('/library?verse=commons%3Aphotography');
  await selectLibraryCategory(page, 'Collections');
  for (const group of metadata.groups) {
    if (isMobile)
      await expect(
        page.getByRole('button', {
          name: `${group.title} ${group.items.length} patterns`,
          exact: true,
        }),
      ).toBeVisible();
    else await expect(page.locator(`a[href="/collection/${group.id}"]`).first()).toBeVisible();
  }
  await page.goto('/collection/photography-noticing-and-intention');
  await expect(page.locator('a[href="/pattern/choose-your-subject"]').first()).toBeVisible();
  await page.goto('/concept/photography-foundations');
  await expect(page.getByRole('heading', { name: 'ISO', exact: true })).toBeVisible();
  const references = page.locator('.entity-article figure');
  await expect(references).toHaveCount(3);
  for (const reference of await references.all()) {
    await reference.scrollIntoViewIfNeeded();
    await reference.locator('img').evaluate((node) => (node as HTMLImageElement).decode());
    await expect(reference.locator('figcaption')).not.toBeEmpty();
    if (page.viewportSize()!.width <= 600)
      expect(
        await reference.locator('img').evaluate((node) => (node as HTMLImageElement).currentSrc),
      ).toContain('-mobile.svg');
  }
  await page.goto('/pattern/change-your-position');
  const visual = page.locator('figure.content-diagram');
  await visual.scrollIntoViewIfNeeded();
  await expect(visual.locator('[role="region"]')).toHaveAttribute('tabindex', '0');
  const full = visual.locator('a');
  await expect(full).toHaveAttribute('href', '/assets/photography/camera-position.svg');
  const imageResponse = await page.request.get('/assets/photography/camera-position.svg');
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toContain('image/svg+xml');
  const license = await page.request.get('/assets/photography/licenses/gfdl-1-2.txt');
  expect(license.status()).toBe(200);
  expect(await license.text()).toContain('GNU Free Documentation License');
});
