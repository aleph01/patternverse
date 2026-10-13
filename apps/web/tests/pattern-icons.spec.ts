import { expect, test } from '@playwright/test';

// Server hydration markers differ from client-created nodes; compare the actual vector markup.
const vectorMarkup = (html: string) => html.replace(/<!--.*?-->/gs, '');

test('uses the same grid icon in cards, lists, search and article headers, with text-only mobile', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.goto('/library');
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'Patterns', exact: true })
    .click();
  // A pattern can now live beyond the first browsing page; search across the whole library.
  await page.getByRole('searchbox', { name: /Search (the catalog|my library)/ }).fill('Observer');
  const observer = page.locator('#library .pattern-feed').getByRole('link', { name: /Observer/ });
  await expect(observer).toHaveCount(1);
  const icon = observer.locator('.pattern-icon');
  await expect(icon).toHaveAttribute('data-icon-version', '1');
  await expect(icon).toHaveAttribute('viewBox', '0 0 72 72');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  expect(await icon.locator('circle,line,polygon,filter,[id]').count()).toBe(0);
  const shapeCount = await icon
    .locator('path')
    .evaluateAll((paths) =>
      paths.reduce((count, path) => count + (path.getAttribute('d')!.match(/M/g) ?? []).length, 0),
    );
  expect(shapeCount).toBeGreaterThanOrEqual(3);
  expect(shapeCount).toBeLessThanOrEqual(7);
  const geometry = vectorMarkup(await icon.innerHTML());
  await page.getByRole('searchbox', { name: /Search (the catalog|my library)/ }).fill('Observer');
  await expect(observer).toBeVisible();
  expect(vectorMarkup(await icon.innerHTML())).toBe(geometry);
  if (mobile) await expect(icon).toBeHidden();
  else {
    await expect(icon).toBeVisible();
    await page
      .getByRole('group', { name: 'Library view' })
      .getByRole('button', { name: 'List', exact: true })
      .click();
    await expect(icon).toBeVisible();
    expect(vectorMarkup(await icon.innerHTML())).toBe(geometry);
  }
  await observer.click();
  await expect(page).toHaveURL(/\/pattern\/observer$/);
  const headerIcon = page.locator('.entity-pattern-icon .pattern-icon');
  expect(vectorMarkup(await headerIcon.innerHTML())).toBe(geometry);
  if (mobile) await expect(headerIcon).toBeHidden();
  else await expect(headerIcon).toBeVisible();
  await page.reload();
  expect(vectorMarkup(await headerIcon.innerHTML())).toBe(geometry);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
