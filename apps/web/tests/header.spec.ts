import { expect, test } from '@playwright/test';

test('keeps navigation typography and alignment consistent at desktop and phone widths', async ({
  page,
}) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    const links = navigation.getByRole('link');
    await expect(links).toHaveText(['library', 'apps', 'about']);
    const styles = await links.evaluateAll((elements) =>
      elements.map((element) => {
        const css = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          fontSize: css.fontSize,
          weight: css.fontWeight,
          lineHeight: css.lineHeight,
          color: css.color,
          center: box.y + box.height / 2,
          height: box.height,
        };
      }),
    );
    for (const style of styles) {
      expect(style).toEqual(styles[0]);
      expect(style.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('retains the active-page indicator without changing label size', async ({ page }) => {
  await page.goto('/library');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'library', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const sizes = await nav
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => getComputedStyle(link).fontSize));
  expect(new Set(sizes).size).toBe(1);
});

test('keeps the same header layout when navigating between Apps and other pages', async ({
  page,
}) => {
  for (const width of [1440, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const header = page.locator('.site-header');
    const geometry = () =>
      header.evaluate((element) => {
        const rect = (node: Element) => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          header: rect(element),
          logo: rect(element.querySelector('.wordmark')!),
          links: Array.from(element.querySelectorAll('.site-utilities > a')).map(rect),
        };
      });
    const baseline = await geometry();
    for (const destination of ['apps', 'library', 'about', 'apps']) {
      const navigation = page.getByRole('navigation', { name: 'Main navigation' });
      await navigation.getByRole('link', { name: destination, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${destination}$`));
      await expect(navigation).toBeVisible();
      for (const label of ['library', 'apps', 'about']) {
        await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      expect(await geometry()).toEqual(baseline);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto('/apps/mira');
    await expect(header).toBeVisible();
    expect(await geometry()).toEqual(baseline);
  }
});
