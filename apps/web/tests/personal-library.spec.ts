import { expect, test } from '@playwright/test';

test('saves from the article, retaining saved scope, verse, search, and desktop layout', async ({
  page,
}, testInfo) => {
  await page.goto('/library');
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).waitFor();
  const results = page.getByRole('region', { name: 'Library results' });
  await expect(results).toBeVisible();
  if (testInfo.project.name === 'chromium')
    await expect(results.getByRole('button', { name: /my library/i })).toHaveCount(0);
  await page.getByRole('searchbox').fill('Observer');
  await results.getByRole('link', { name: /Observer/ }).click();
  const header = page.locator('.entity-hero');
  const bookmark = header.getByRole('button', { name: 'Add to my library', exact: true });
  await expect(bookmark).toBeEnabled();
  await expect(bookmark).toHaveCSS('width', '44px');
  await expect(bookmark).toHaveCSS('height', '44px');
  if (testInfo.project.name === 'chromium') {
    await bookmark.hover();
    await expect(header.locator('.save-tooltip')).toBeVisible();
    await expect(bookmark).toHaveCSS('background-color', 'rgb(24, 24, 20)');
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await bookmark.focus();
    await expect(header.locator('.save-tooltip')).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath('article-bookmark.png') });
  await bookmark.click();
  const saved = header.getByRole('button', { name: 'In my library', exact: true });
  await expect(saved).toHaveAttribute('aria-pressed', 'true');
  await expect(saved).toHaveCSS('color', 'rgb(0, 122, 77)');
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(header.locator('.save-tooltip')).not.toBeVisible();
  }
  await saved.click();
  const remove = header.getByRole('button', { name: 'Remove from my library', exact: true });
  await expect(remove).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('saved-options.png') });
  await page.keyboard.press('Escape');
  await expect(remove).toHaveCount(0);
  await expect(saved).toBeFocused();
  await page.reload();
  await expect(saved).toBeEnabled();
  await page.goto('/library');
  const scope = page.getByRole('navigation', { name: 'Library scope' });
  await expect(scope.getByRole('button', { name: /^My library/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Filter library' }).click();
    await page
      .getByRole('combobox', { name: 'Verse', exact: true })
      .selectOption({ label: 'Software Engineering' });
  } else {
    await page
      .getByRole('complementary', { name: 'Browse verses' })
      .getByRole('button', { name: 'Software Engineering', exact: true })
      .click();
  }
  await page.getByRole('searchbox').fill('Observer');
  await expect(results.getByRole('link')).toHaveCount(1);
  await scope.getByRole('button', { name: /^(Explore|Commons)$/ }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('Observer');
  await scope.getByRole('button', { name: /^My library/ }).click();
  if (testInfo.project.name === 'chromium') {
    for (const mode of ['List', 'Cards']) {
      await page
        .getByRole('group', { name: 'Library view' })
        .getByRole('button', { name: mode, exact: true })
        .click();
      await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
      await expect(results.getByRole('button')).toHaveCount(0);
    }
  } else {
    await expect(results.getByRole('button', { name: 'In my library', exact: true })).toBeEnabled();
  }
  await page.screenshot({ path: testInfo.outputPath('library-without-save-actions.png') });
  await results.getByRole('link', { name: /Observer/ }).click();
  await saved.click();
  await remove.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await page.goto('/library');
  await scope.getByRole('button', { name: /^My library/ }).click();
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: /favorite/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('opens a collection before saving, without saving every member', async ({
  page,
}, testInfo) => {
  await page.goto('/library');
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).click();
  // The category controls render on the server; wait for the private read to finish
  // before interacting so a click cannot be lost during hydration.
  await expect(page.getByRole('button', { name: /^Your rating:/ })).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'Collections', exact: true })
    .click();
  await page.getByRole('searchbox').fill('GoF Design Patterns');
  const results = page.getByRole('region', { name: 'Library results' });
  await expect(results.getByRole('button', { name: /my library/i })).toHaveCount(0);
  await results.getByRole('link', { name: /GoF Design Patterns/ }).click();
  const header = page.locator('.entity-hero');
  await header.getByRole('button', { name: 'Add to my library', exact: true }).click();
  const saved = header.getByRole('button', { name: 'In my library', exact: true });
  await expect(saved).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('collection-bookmark.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/library');
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).click();
  await expect(page.getByRole('button', { name: /^My library/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'Collections', exact: true })
    .click();
  await expect(results.getByRole('link')).toHaveCount(1);
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'Patterns', exact: true })
    .click();
  await expect(results).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Library categories' })
    .getByRole('button', { name: 'All', exact: true })
    .click();
  await results.getByRole('link', { name: /GoF Design Patterns/ }).click();
  await saved.click();
  await page.getByRole('heading', { name: 'GoF Design Patterns', exact: true }).click();
  await expect(header.getByRole('button', { name: 'Remove from my library' })).toHaveCount(0);
  await saved.click();
  await header.getByRole('button', { name: 'Remove from my library' }).click();
  await expect(header.getByRole('button', { name: 'Add to my library' })).toBeEnabled();
});
