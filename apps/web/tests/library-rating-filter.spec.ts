import { expect, test } from '@playwright/test';

test('filters personal ratings with search, verses, and saved scope', async ({
  page,
}, testInfo) => {
  for (const [id, label] of [
    ['observer', 'Very useful'],
    ['builder', 'Useful'],
    ['strategy', 'Not useful'],
  ] as const) {
    await page.goto(`/pattern/${id}`);
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    if (id === 'observer')
      await page.getByRole('button', { name: 'Add to my library', exact: true }).click();
  }
  await page.goto('/library');
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).click();
  const scope = page.getByRole('navigation', { name: 'Library scope' });
  await scope.getByRole('button', { name: /^(Explore|Commons)$/ }).click();
  const trigger = page.getByRole('button', { name: /^Your rating:/ });
  async function choose(label: string) {
    await trigger.click();
    await page
      .getByRole('group', { name: 'Your rating', exact: true })
      .getByRole('button', { name: label, exact: true })
      .click();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole('group', { name: 'Your rating', exact: true })).toHaveCount(0);
  }
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const options = page.getByRole('group', { name: 'Your rating', exact: true });
  await expect(options.getByRole('button', { name: 'Any rating', exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('rating-options.png') });
  expect(
    await options.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    }),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await choose('Useful or better');
  const results = page.getByRole('region', { name: 'Library results' });
  await expect(results.getByRole('link')).toHaveCount(2);
  await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
  await expect(results.getByRole('link', { name: /Builder/ })).toBeVisible();
  await expect(trigger).toContainText('Useful +');
  await expect(trigger).toHaveCSS('background-color', 'rgb(223, 248, 234)');
  await choose('Very useful only');
  await expect(results.getByRole('link')).toHaveCount(1);
  await choose('Useful or better');
  if (testInfo.project.name === 'mobile-chromium') {
    await page
      .getByRole('combobox', { name: 'Verse', exact: true })
      .selectOption({ label: 'Software Engineering' });
  } else {
    await page
      .getByRole('complementary', { name: 'Browse verses' })
      .getByRole('button', { name: 'Software Engineering', exact: true })
      .click();
  }
  await page.getByRole('searchbox').fill('Builder');
  await expect(results.getByRole('link')).toHaveCount(1);
  await scope.getByRole('button', { name: /^My library/ }).click();
  await expect(results).toHaveCount(0);
  await scope.getByRole('button', { name: /^(Explore|Commons)$/ }).click();
  await expect(results.getByRole('link', { name: /Builder/ })).toBeVisible();
  await choose('Any rating');
  await expect(page.getByRole('searchbox')).toHaveValue('Builder');
  await expect(trigger).toContainText('Your rating');
  await page.getByRole('searchbox').fill('');
  await choose('Useful or better');
  if (testInfo.project.name === 'chromium')
    await page
      .getByRole('group', { name: 'Library view', exact: true })
      .getByRole('button', { name: 'List', exact: true })
      .click();
  await expect(results.getByRole('link')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('useful-library.png') });
  await choose('Any rating');
  await page.reload();
  if (testInfo.project.name === 'mobile-chromium')
    await page.getByRole('button', { name: 'Filter library' }).click();
  await expect(trigger).toContainText('Your rating');
  await scope.getByRole('button', { name: /^(Explore|Commons)$/ }).click();
  await choose('Very useful only');
  await expect(results.getByRole('link', { name: /Observer/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
