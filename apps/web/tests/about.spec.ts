import { expect, test } from '@playwright/test';

test('explains the current library with library links and install instructions', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page
    .locator('.hero')
    .getByRole('link', { name: /What is the Patternverse/ })
    .click();
  await expect(page).toHaveURL('/#home-about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const guide = page.locator('#home-about');
  await expect(
    guide.getByRole('heading', { name: 'Practical ideas, collected in one place.' }),
  ).toBeVisible();
  await expect(
    guide.getByText(/Browse by verse, open a collection, or search by title and keyword/),
  ).toBeVisible();
  await expect(guide.getByText(/Where a guided practice is available/)).toBeVisible();
  await expect(guide.getByText(/Bookmark patterns and collections/)).toBeVisible();
  await expect(guide.getByRole('heading', { name: /Start with a situation/ })).toHaveCount(0);
  await expect(
    guide.locator('.field-guide-copy').getByRole('link', { name: 'Explore', exact: true }),
  ).toHaveAttribute('href', '/library');
  await expect(
    guide.getByRole('heading', { name: /install once\. keep it close\./i }),
  ).toBeVisible();
  await expect(guide.getByText(/Open in Safari, tap Share/)).not.toBeVisible();
  await guide.getByText('How to install', { exact: true }).click();
  await expect(guide.getByText(/Open in Safari, tap Share/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('patternverse-field-guide.png'),
    fullPage: true,
  });

});

test('keeps the field guide readable at narrow widths', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/');
    await page.locator('#home-about-heading').scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('heading', { name: 'Practical ideas, collected in one place.' }),
    ).toBeInViewport();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
    await page.locator('#install-patternverse summary').click();
    await expect(page.getByText(/Open in Safari, tap Share/)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
});

test('introduces the pattern language on its own explainer page', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('link', { name: /About Pattern Language/ }).click();
  await expect(page).toHaveURL(/\/about\/pattern-language$/);
  await expect(page.getByRole('heading', { name: 'The pattern language.' })).toBeVisible();
  await expect(
    page.getByText(/Pattern Markdown is a way to write a guided experience/),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A question, then a moment to reflect.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More than one kind of step.' })).toBeVisible();
  await expect(page.getByText(':language 1', { exact: true }).first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('pattern-language-guide.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Back to Patternverse' }).click();
  await expect(page).toHaveURL('/#home-about');
  await expect(
    page.getByRole('heading', { name: 'Practical ideas, collected in one place.' }),
  ).toBeInViewport();
});

test('redirects old About links to the explanation on the home page', async ({ page }) => {
  await page.goto('/about');
  await expect(page).toHaveURL('/#home-about');
  await expect(
    page.getByRole('heading', { name: 'Practical ideas, collected in one place.' }),
  ).toBeInViewport();
  await expect(page.locator('.field-guide-row')).toHaveCount(3);
});

test('gives mira a separate editorial guide with working entry points', async ({
  page,
}, testInfo) => {
  await page.goto('/about/mira');
  await expect(
    page.getByRole('heading', { name: 'A conversation with room to move.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start with your own words.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Know where a reply comes from.' })).toBeVisible();
  await expect(page.getByText(/requests zero data retention/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mira-guide.png'), fullPage: true });
  await page
    .getByRole('navigation', { name: 'About mira chapters' })
    .getByRole('link', { name: /Know where it goes/ })
    .click();
  await expect(page).toHaveURL(/#mira-privacy$/);
  await page.getByRole('link', { name: 'Open mira', exact: true }).first().click();
  await expect(page).toHaveURL(/\/mira$/);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(
    page.getByRole('link', { name: /About mira · features and privacy/ }),
  ).toHaveAttribute('href', '/about/mira');
});

test('keeps home and guide navigation readable at narrow widths without an About tab', async ({
  page,
}) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    for (const route of ['/', '/about/pattern-language', '/about/mira']) {
      await page.goto(route);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
      const menu = page.getByRole('navigation', { name: 'Main navigation' });
      await expect(menu.getByRole('link')).toHaveCount(3);
      await expect(menu.getByRole('link', { name: 'about', exact: true })).toHaveCount(0);
      for (const name of ['library', 'apps', 'workspace']) {
        await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
      }
    }
  }
});
