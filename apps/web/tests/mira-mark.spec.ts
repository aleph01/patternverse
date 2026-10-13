import { expect, test } from '@playwright/test';

test('Mira uses the same scalable mark without overflowing on desktop or mobile', async ({
  page,
}) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    let silhouette: string | null = null;
    for (const route of ['/apps', '/apps/mira', '/mira']) {
      await page.goto(route);
      const mark = page.locator('svg.mira-mark');
      await expect(mark).toBeVisible();
      await expect(mark).toHaveAttribute('aria-hidden', 'true');
      const path = await mark.locator('path').getAttribute('d');
      if (silhouette) expect(path).toBe(silhouette);
      silhouette = path;
      const box = await mark.boundingBox();
      expect(box?.width).toBeGreaterThan(20);
      expect(box?.height).toBeGreaterThan(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
    await expect(page.getByRole('link', { name: 'mira home' })).toBeVisible();
  }
});
