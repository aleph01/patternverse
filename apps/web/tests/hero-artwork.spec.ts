import { expect, test } from '@playwright/test';

test('tile-and-bird background adapts across desktop, tablet and phone layouts', async ({
  page,
}) => {
  await page.goto('/');
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 900, height: 900 },
    { width: 768, height: 1024 },
    { width: 760, height: 740 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    const art = page.locator('.hero-art');
    const svg = art.locator('svg:visible');
    await expect(svg).toHaveCount(1);
    await expect(svg).toHaveAttribute(
      'viewBox',
      viewport.width <= 760 ? '0 0 480 880' : '0 0 960 640',
    );
    const dimensions = await svg.evaluate((element) => {
      const view = element as SVGSVGElement;
      const box = view.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
      };
    });
    expect(dimensions.width).toBeGreaterThan(200);
    await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMaxYMax meet');
    await expect(svg.locator('[data-letter],image,text')).toHaveCount(0);
    await expect(svg.locator('[data-bird]')).toHaveCount(viewport.width <= 760 ? 6 : 10);
    expect(await svg.locator('path.green').count()).toBeGreaterThan(0);
    expect(await svg.locator('path.purple').count()).toBeGreaterThan(0);
    const artBox = (await art.boundingBox())!;
    const copyBox = (await page.locator('.hero-copy').boundingBox())!;
    expect(artBox.x).toBeLessThanOrEqual(copyBox.x);
    expect(artBox.y).toBeLessThanOrEqual(copyBox.y);
    expect(artBox.width).toBeGreaterThanOrEqual(copyBox.width);
    expect(artBox.y + artBox.height).toBeLessThanOrEqual(
      (await page.locator('.hero-stage').boundingBox())!.y +
        (await page.locator('.hero-stage').boundingBox())!.height,
    );
    expect(await art.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Ideas worth putting to work.',
    );
    await page.locator('.hero-actions').getByRole('link', { name: 'Browse the library' }).click();
    await expect(page).toHaveURL(/\/library$/);
    await page.goto('/');
  }
});
