import { expect, test } from '@playwright/test';
import { selectLibraryCategory } from './helpers/library';

test('expands all patterns with a green left bar from the desktop list chevron', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('patternverse:library-layout', 'cards'));
  await page.goto('/library?verse=commons:software-engineering');
  await selectLibraryCategory(page, 'Collections');
  const view = page.getByRole('group', { name: 'Library view', exact: true });
  await view.getByRole('button', { name: 'List', exact: true }).click();
  await expect(view.getByRole('button', { name: 'List', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const toggle = page.getByRole('button', {
    name: /^(Show|Hide) 23 patterns in GoF Design Patterns$/,
  });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Enter');
  const contents = page.getByRole('region', { name: 'GoF Design Patterns contents' });
  await expect(contents.getByRole('link')).toHaveCount(23);
  await expect(contents.getByRole('button', { name: /Show all/ })).toHaveCount(0);
  await expect(contents).toHaveCSS('border-left-width', '2px');
  await expect(contents).toHaveCSS('border-left-color', 'rgb(0, 122, 77)');
  await expect(contents.getByRole('link').first()).toContainText('Abstract Factory');
  await expect(contents.getByRole('link').last()).toContainText('Visitor');
  await expect(contents.getByRole('link', { name: /Factory Method/ })).toHaveAttribute(
    'href',
    '/pattern/factory-method?collection=commons%3Agof-design-patterns',
  );
  const row = toggle.locator('xpath=../..');
  const title = row.getByRole('heading', { name: 'GoF Design Patterns', exact: true });
  const titleBox = await title.boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
  expect(Math.abs(toggleBox!.y - titleBox!.y)).toBeLessThan(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await title.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('expanded-desktop-list.png') });
  await page.getByRole('button', { name: 'Hide 23 patterns in GoF Design Patterns' }).click();
  await expect(contents).toBeHidden();
});
