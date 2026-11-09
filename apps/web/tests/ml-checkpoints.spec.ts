import { expect, test } from '@playwright/test';

test('Checkpoints restores training state, separates optimizer and data position, and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-checkpoints');
  await expect(
    page.getByRole('heading', { name: 'Checkpoints', exact: true }).first(),
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
  expect(
    await page
      .locator('.markdown-body table')
      .first()
      .evaluate((el) => el.getBoundingClientRect().right <= document.documentElement.clientWidth),
  ).toBe(true);
  await page
    .locator('.markdown-body table')
    .first()
    .screenshot({ path: info.outputPath('worked-table.png') });
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  await page
    .locator('.article-widget > iframe')
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const ex = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  const captureInspection = async (name: string) => {
    const outer = page.locator('.article-widget > iframe');
    await outer.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect
      .poll(async () =>
        Math.abs(
          Number(await outer.getAttribute('height')) -
            (await ex.locator('body').evaluate((el) => el.scrollHeight)),
        ),
      )
      .toBeLessThan(4);
    const viewport = page.viewportSize()!;
    await page.setViewportSize({
      width: viewport.width,
      height: Number(await outer.getAttribute('height')) + 100,
    });
    await outer.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await outer.screenshot({ path: info.outputPath(name) });
    await page.setViewportSize(viewport);
  };

  const initial = 'After 1 recovery update: w 0.6994; uninterrupted w 1.0124.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#match')).toContainText('Weight difference: -0.313');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#formula')).toContainText('g = 0.666 − 1 = -0.334');
  await ex.getByLabel('Restore contents', { exact: true }).selectOption('full');
  await expect(ex.locator('output')).toHaveText(
    'After 1 recovery update: w 1.0124; uninterrupted w 1.0124.',
  );
  await expect(ex.locator('#match')).toContainText('Complete restoration matches');
  await captureInspection('complete-restore-inspection.png');
  await ex.getByLabel('Restore contents', { exact: true }).selectOption('data');
  await expect(ex.locator('output')).toHaveText(
    'After 1 recovery update: w 0.8994; uninterrupted w 1.0124.',
  );
  await ex.getByLabel('Restore contents', { exact: true }).selectOption('optimizer');
  await expect(ex.locator('output')).toHaveText(
    'After 1 recovery update: w 0.8124; uninterrupted w 1.0124.',
  );
  await expect(ex.locator('#targets')).toContainText('Chosen next targets: 1');
  await captureInspection('reset-data-inspection.png');
  await ex.getByLabel('Save after completed updates', { exact: true }).selectOption('2');
  await expect(ex.locator('#match')).toContainText('reset value happened to be correct');
  await ex.getByLabel('Updates after restart', { exact: true }).selectOption('3');
  await expect(ex.locator('output')).toHaveText(
    'After 3 recovery updates: w 1.18436; uninterrupted w 1.18436.',
  );
  await expect(ex.locator('#trace tbody tr')).toHaveCount(3);
  await captureInspection('coincident-continuation-inspection.png');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('No disk write');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Restore contents', { exact: true }).selectOption('full');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(page.getByRole('link', { name: 'Checkpoints', exact: true }).first()).toBeVisible();
});

test('Checkpoints keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/checkpoints' + suffix + '.svg');
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
