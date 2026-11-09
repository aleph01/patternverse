import { expect, test } from '@playwright/test';
import { searchLibrary, selectLibraryCategory } from './helpers/library';

// Server hydration markers differ from client-created nodes; compare the actual vector markup.
const vectorMarkup = (html: string) => html.replace(/<!--.*?-->/gs, '');

test('uses the same concept graphic in cards, lists, search and article headers, with text-only mobile', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.goto('/library');
  await selectLibraryCategory(page, 'Patterns');
  // A pattern can now live beyond the first browsing page; search across the whole library.
  await searchLibrary(page, 'Observer');
  const observer = page
    .getByRole('region', { name: 'Library results', exact: true })
    .getByRole('link', { name: /Observer/ });
  await expect(observer).toHaveCount(1);
  const icon = observer.locator('.pattern-icon');
  let geometry: string | undefined;
  if (mobile) await expect(icon).toHaveCount(0);
  else {
    await expect(icon).toHaveAttribute('data-icon-version', '2');
    await expect(icon).toHaveAttribute('data-pattern-graphic', 'observer');
    await expect(icon).toHaveAttribute('viewBox', '0 0 96 96');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(await icon.locator('circle,line,polygon,filter,[id]').count()).toBe(0);
    const shapeCount = await icon.locator('path').count();
    expect(shapeCount).toBeGreaterThanOrEqual(3);
    expect(shapeCount).toBeLessThanOrEqual(32);
    geometry = vectorMarkup(await icon.innerHTML());
    await searchLibrary(page, 'Observer');
    await expect(observer).toBeVisible();
    expect(vectorMarkup(await icon.innerHTML())).toBe(geometry);
    await expect(icon).toBeVisible();
    await page
      .getByRole('group', { name: 'Library view' })
      .getByRole('button', { name: 'List', exact: true })
      .click();
    await expect(icon).toBeVisible();
    expect(vectorMarkup(await icon.innerHTML())).toBe(geometry);
  }
  await observer.click();
  await expect(page).toHaveURL((url) => url.pathname === '/pattern/observer');
  const headerIcon = page.locator('.entity-pattern-icon .pattern-icon');
  await expect(headerIcon).toHaveAttribute('data-icon-version', '2');
  await expect(headerIcon).toHaveAttribute('data-pattern-graphic', 'observer');
  geometry ??= vectorMarkup(await headerIcon.innerHTML());
  expect(vectorMarkup(await headerIcon.innerHTML())).toBe(geometry);
  if (mobile) await expect(headerIcon).toBeHidden();
  else await expect(headerIcon).toBeVisible();
  await page.reload();
  expect(vectorMarkup(await headerIcon.innerHTML())).toBe(geometry);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
