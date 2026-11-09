import { expect, test } from '@playwright/test';

test('Training-Serving Consistency computes feature parity, catches state mismatches and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-training-serving-consistency');
  await expect(
    page
      .getByRole('heading', { name: 'Training-Serving Consistency / Transform', exact: true })
      .first(),
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
    'Feature parity differs. Saved-path p 0.731; serving p 0.269. Model weights unchanged.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Serving transform', { exact: true }).selectOption('shared');
  await expect(ex.locator('output')).toHaveText(
    'Feature parity matches. Saved-path p 0.731; serving p 0.731. Model weights unchanged.',
  );
  await ex.getByLabel('Serving transform', { exact: true }).selectOption('double');
  await expect(ex.locator('output')).toContainText('serving p 0.289');
  await ex.getByLabel('Serving transform', { exact: true }).selectOption('vocabulary');
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.locator('#state summary').click();
  await expect(ex.locator('#features tbody tr')).toHaveCount(4);
  await expect(ex.locator('#artifacts tbody tr').nth(2)).toContainText('express, standard');
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  await ex.getByLabel('Raw request', { exact: true }).selectOption('unknown');
  await expect(ex.locator('output')).toContainText('Feature parity matches');
  await expect(ex.locator('#identity')).toContainText('Fitted state differs');
  await expect(ex.locator('#interpretation')).toContainText('happen to match');
  await ex.getByLabel('Serving transform', { exact: true }).selectOption('batch');
  await ex.getByLabel('Raw request', { exact: true }).selectOption('missing');
  await expect(ex.locator('output')).toContainText('Saved-path p 0.500; serving p 0.500');
  await expect(ex.locator('#batch')).toContainText('[missing, 40]');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Serving transform', { exact: true }).selectOption('shared');
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
    page
      .getByRole('link', { name: 'Training-Serving Consistency / Transform', exact: true })
      .first(),
  ).toBeVisible();
});

test('Training-Serving Consistency keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/training-serving-consistency' + suffix + '.svg');
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
