import { expect, test } from '@playwright/test';
test('renders the evidence, boundaries, release context, and guide navigation', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-model-cards');
  await expect(
    page.getByRole('heading', { name: 'Model Cards', exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath('model-cards-article.png') });
  const table = page.getByRole('table').filter({ hasText: 'Observed accuracy' });
  await expect(table.getByRole('row')).toHaveCount(4);
  for (const value of ['855 / 900', '65 / 100', '920 / 1,000'])
    await expect(table).toContainText(value);
  await table.screenshot({
    path: info.outputPath('model-cards-evidence.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  const preview = page.locator('.content-diagram img').first();
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(() => preview.evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await preview.screenshot({
    path: info.outputPath('model-cards-illustration.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Run example', exact: true })).toHaveCount(0);
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page
    .getByRole('heading', { name: 'Common mistakes and limitations', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByText('“Not evaluated” describes a knowledge gap;', { exact: false }),
  ).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await table.scrollIntoViewIfNeeded();
  await table.screenshot({
    path: info.outputPath('model-cards-dark.png'),
    style: '.article-outline{visibility:hidden!important}',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/collection/machine-learning-privacy-and-governance');
  await expect(page.getByRole('link', { name: /Model Cards/ }).first()).toBeVisible();
  await page.goto('/verse/machine-learning');
  if (!isMobile) await page.getByRole('button', { name: 'Patterns', exact: true }).click();
  await expect(page.getByRole('link', { name: /Model Cards/ }).first()).toBeVisible();
});
test('keeps all explanatory text inside the original desktop and phone diagrams', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/model-cards' + suffix + '.svg');
    const outside = await page
      .locator('svg')
      .first()
      .evaluate((svg) => {
        const root = svg as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return [...root.querySelectorAll('text')].flatMap((label) => {
          const b = label.getBBox(),
            m = label.getCTM()!;
          return [
            [b.x, b.y],
            [b.x + b.width, b.y + b.height],
          ].some(([x, y]) => {
            const p = root.createSVGPoint();
            p.x = x;
            p.y = y;
            const q = p.matrixTransform(m);
            return q.x < -1 || q.y < -1 || q.x > limit.width + 1 || q.y > limit.height + 1;
          })
            ? [label.textContent]
            : [];
        });
      });
    expect(outside).toEqual([]);
  }
});
