import { expect, test } from '@playwright/test';

test('Therapy collection leads to a responsive, immediately available needs reference browser', async ({
  page,
  isMobile,
}) => {
  await page.goto('/collection/self-understanding');
  await expect(
    page.getByRole('heading', { name: 'Self-Understanding', exact: true }),
  ).toBeVisible();
  const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
  await expect(entries.getByRole('link')).toHaveCount(3);
  await entries.getByRole('link', { name: /Identify Needs/ }).click();
  const browser = page.frameLocator('iframe[title="Needs library"]').frameLocator('iframe');
  await expect(browser.getByRole('heading', { name: 'Explore needs', exact: true })).toBeVisible();
    await browser.getByRole('button', { name: 'Rest', exact: true }).click();
  await expect(browser.getByRole('region', { name: 'Rest meaning', exact: true })).toContainText(
    'Relief from effort',
  );
  await browser.getByRole('searchbox', { name: 'Search all needs', exact: true }).fill('hydration');
    await browser.getByRole('button', { name: 'Water', exact: true }).click();
  await expect(browser.getByRole('region', { name: 'Water meaning', exact: true })).toContainText(
    'safe drinking water',
  );
  await browser.getByRole('searchbox').fill('');
  await browser.getByRole('button', { name: 'Detailed', exact: true }).click();
  await expect(browser.getByText('All 68 needs · 8 areas', { exact: true })).toBeVisible();
  const width = isMobile ? 320 : 1440;
  await page.setViewportSize({ width, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await browser
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.locator('section[aria-label="Needs library"]').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/identify-needs-article-${isMobile ? 'phone' : 'desktop'}.png`,
  });
});

test('a fresh reader can use the existing selector, retain detailed choices, and finish with their own wording', async ({
  page,
  isMobile,
}) => {
  await page.goto('/pattern/identify-needs/run');
  await page.getByRole('textbox').fill('A week of late meetings.');
  await page.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }).click();
  const selector = page.frameLocator('.widget-step>iframe').frameLocator('iframe');
  await expect(selector.getByRole('button', { name: 'Simple', exact: true })).toBeVisible();
  await selector.getByRole('button', { name: 'Detailed', exact: true }).click();
  await selector.locator('[data-need="water"]').click();
  await selector.getByRole('button', { name: 'Simple', exact: true }).click();
  await selector.locator('[data-need="rest"]').click();
  await expect(selector.getByRole('button', { name: 'Remove Water', exact: true })).toBeVisible();
  expect(
    await selector
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.locator('.widget-step').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/identify-needs-practice-${isMobile ? 'phone' : 'desktop'}.png`,
  });
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await page.getByRole('textbox').nth(0).fill('Time without another request.');
  await page.getByRole('textbox').nth(1).fill('Rest matters; I am unsure what else I need.');
  await page.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }).click();
  await expect(page.locator('.pattern-run-completion')).toBeVisible();
  await expect(
    page.getByText('Time without another request.', { exact: true }).last(),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
