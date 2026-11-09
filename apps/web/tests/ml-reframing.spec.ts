import { expect, test } from '@playwright/test';

test('Reframing fits targets, exposes within-band ambiguity and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-reframing');
  await expect(page.getByRole('heading', { name: 'Reframing', exact: true }).first()).toBeVisible();
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

  const initial = 'Mean 20 min; band masses 0.5, 0, 0.5.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#tail')).toContainText('fitted mass 0.5');
  await ex.getByLabel('Target bands', { exact: true }).selectOption('coarse');
  await expect(ex.locator('#tail')).toContainText('bounds 0 to 0.5');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#uniform')).toContainText('0.375');
  await expect(ex.locator('#observed-tail')).toContainText('0.5');
  await captureInspection('coarse-inspection.png');
  await ex.getByLabel('Observed deliveries', { exact: true }).selectOption('slower');
  await expect(ex.locator('output')).toHaveText('Mean 23 min; band masses 0.375, 0.625.');
  await expect(ex.locator('#loss')).toContainText('104 minute²');
  await ex.getByLabel('Target bands', { exact: true }).selectOption('fine');
  await ex.getByLabel('Deadline · minutes', { exact: true }).selectOption('30');
  await expect(ex.locator('#tail')).toContainText('fitted mass 0.5');
  await captureInspection('fine-boundary-inspection.png');
  await ex.getByLabel('Deadline · minutes', { exact: true }).selectOption('15');
  await expect(ex.locator('#tail')).toContainText('bounds 0.625 to 0.875');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('not confidence intervals');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Target bands', { exact: true }).selectOption('coarse');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(page.getByRole('link', { name: 'Reframing', exact: true }).first()).toBeVisible();
});

test('Reframing keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/reframing' + suffix + '.svg');
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
