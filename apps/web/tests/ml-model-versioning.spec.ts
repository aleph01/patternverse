import { expect, test } from '@playwright/test';

test('Model Versioning computes restoration scope, separates identity and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-model-versioning');
  await expect(
    page.getByRole('heading', { name: 'Model Versioning', exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.markdown-body h2')).toHaveCount(10);
  await page.addStyleTag({ content: '.article-outline{visibility:hidden!important}' });
  await page.screenshot({ path: info.outputPath('article-viewport.png') });
  const figure = page.locator('.content-diagram');
  await figure.scrollIntoViewIfNeeded();
  await expect
    .poll(() => figure.locator('img').evaluate((im: HTMLImageElement) => im.naturalWidth))
    .toBe(isMobile ? 360 : 720);
  await figure.screenshot({ path: info.outputPath('figure-and-caption.png') });
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  await page
    .locator('.article-widget > iframe')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const ex = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  const initial =
    'Assembled: 25 min, no review. Requested R1: 30 min, review. Component IDs differ.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Restore scope', { exact: true }).selectOption('transform');
  await expect(ex.locator('output')).toContainText(
    'Assembled: 30 min, no review. Requested R1: 30 min, review.',
  );
  await expect(ex.locator('#interpretation')).toContainText('estimate matches, but');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#components tbody tr').last()).toContainText('P2 · differs');
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  await ex.getByLabel('Request distance', { exact: true }).selectOption('10');
  await expect(ex.locator('#interpretation')).toContainText('component IDs still differ');
  await ex.getByLabel('Request distance', { exact: true }).selectOption('30');
  await ex.getByLabel('Restore scope', { exact: true }).selectOption('complete');
  await expect(ex.locator('output')).toHaveText(
    'Assembled: 30 min, review. Requested R1: 30 min, review. All component IDs match.',
  );
  await ex.getByLabel('Requested release', { exact: true }).selectOption('R2');
  await ex.getByLabel('Request distance', { exact: true }).selectOption('40');
  await expect(ex.locator('output')).toContainText(
    'Assembled: 32 min, review. Requested R2: 32 min, review.',
  );
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Restore scope', { exact: true }).selectOption('complete');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(
    page.getByRole('link', { name: 'Model Versioning', exact: true }).first(),
  ).toBeVisible();
});

test('Model Versioning keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/model-versioning' + suffix + '.svg');
    const result = await page
      .locator('svg')
      .first()
      .evaluate((el) => {
        const root = el as SVGSVGElement,
          limit = root.viewBox.baseVal;
        return {
          style: root.dataset.mlStyle,
          weight: getComputedStyle(root.querySelector('text')!).fontWeight,
          font: getComputedStyle(root.querySelector('text')!).fontFamily,
          paper: getComputedStyle(root).backgroundColor,
          outside: [...root.querySelectorAll('text')].flatMap((label) => {
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
          }),
        };
      });
    expect(result.outside).toEqual([]);
    expect(result.style).toBe('light-editorial');
    expect(result.weight).toBe('400');
    expect(result.font).toContain('Helvetica Neue');
    expect(result.paper).toBe('rgb(255, 255, 255)');
  }
});
