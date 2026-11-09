import { expect, test } from '@playwright/test';

test('reads the illustration and runs, changes, and resets the actual sandbox', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-hashed-feature');
  await expect(
    page.getByRole('heading', { name: 'Hashed Feature', exact: true }).first(),
  ).toBeVisible();
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('hashed-feature-illustration.png'),
    style: '.article-outline { visibility: hidden !important; }',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const host = page.frameLocator('iframe[title="Hashed feature bucket explorer"]');
  const example = host.frameLocator('iframe');
  await expect(example.locator('output')).toHaveText(
    '6 categories · 4 buckets · 4 occupied · 3 colliding pairs.',
  );
  await expect(example.locator('[data-bucket="2"]')).toContainText('referral');
  await expect(example.locator('[data-bucket="2"]')).toContainText('direct');
  await expect(example.locator('[data-bucket="2"]')).toContainText('affiliate');
  await example.getByLabel('Number of buckets').selectOption('8');
  await expect(example.locator('output')).toHaveText(
    '6 categories · 8 buckets · 5 occupied · 1 colliding pair.',
  );
  await expect(example.locator('[data-bucket="2"]')).toContainText('direct');
  await expect(example.locator('[data-bucket="6"]')).toContainText('referral');
  await expect(example.locator('[data-bucket="6"]')).toContainText('affiliate');
  expect(
    await example
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.locator('iframe[title="Hashed feature bucket explorer"]').screenshot({
    path: info.outputPath('hashed-feature-explorer.png'),
    style: '.article-outline { visibility: hidden !important; }',
  });

  await example.getByLabel('Channel names').fill('W'.repeat(48));
  const textFits = await example.locator('svg').evaluate((svg) => {
    return [...svg.querySelectorAll('g')].every((group) => {
      const box = group.querySelector('rect')!.getBBox();
      return [...group.querySelectorAll('text')].every((label) => {
        const bounds = label.getBBox();
        return bounds.x >= box.x && bounds.x + bounds.width <= box.x + box.width;
      });
    });
  });
  expect(textFits).toBe(true);
  await example.getByLabel('Channel names').fill('');
  await expect(example.locator('output')).toContainText('0 occupied · 0 colliding pairs');
  await example.getByRole('button', { name: 'Reset inputs' }).click();
  await expect(example.locator('output')).toContainText(
    '6 categories · 4 buckets · 4 occupied · 3 colliding pairs',
  );
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(example.locator('output')).toContainText(
    '6 categories · 4 buckets · 4 occupied · 3 colliding pairs',
  );

  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(page.getByRole('link', { name: /Hashed Feature/ }).first()).toBeVisible();
});

test('keeps every label within both authored SVG layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/hashed-feature-buckets' + suffix + '.svg');
    const outside = await page
      .locator('svg')
      .first()
      .evaluate((svg) => {
        const graphic = svg as SVGSVGElement;
        const root = graphic.viewBox.baseVal;
        return [...graphic.querySelectorAll('text')].flatMap((label) => {
          const bounds = label.getBBox();
          const matrix = label.getCTM()!;
          const corners = [
            [bounds.x, bounds.y],
            [bounds.x + bounds.width, bounds.y + bounds.height],
          ];
          const invalid = corners.some(([x, y]) => {
            const point = graphic.createSVGPoint();
            point.x = x;
            point.y = y;
            const actual = point.matrixTransform(matrix);
            return (
              actual.x < -1 ||
              actual.y < -1 ||
              actual.x > root.width + 1 ||
              actual.y > root.height + 1
            );
          });
          return invalid ? [label.textContent] : [];
        });
      });
    expect(outside).toEqual([]);
  }
});
