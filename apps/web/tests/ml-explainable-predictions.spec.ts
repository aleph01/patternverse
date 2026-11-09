import { expect, test } from '@playwright/test';

test('Explainable Predictions computes reference allocations, negative contributions and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-explainable-predictions');
  await expect(
    page.getByRole('heading', { name: 'Explainable Predictions', exact: true }).first(),
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

  const initial = 'Prediction 24 min; reference 14 min, distance +6 min, rush +4 min.';
  await expect(ex.locator('output')).toHaveText(initial);
  // Native selects do not wrap their option labels; keep every offered label readable.
  expect(
    await ex.locator('select').evaluateAll((elements) => {
      const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d')!;
      return elements.flatMap((element) => {
        const select = element as HTMLSelectElement,
          style = getComputedStyle(select);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const available =
          select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24;
        return [...select.options]
          .filter((option) => context.measureText(option.text).width > available)
          .map((option) => option.text);
      });
    }),
  ).toEqual([]);

  await ex.locator('#inspection summary').click();
  await expect(ex.locator('#subsets tbody tr')).toHaveCount(4);
  await expect(ex.locator('#orders tbody tr')).toHaveCount(2);
  await expect(ex.locator('#reconstruction')).toContainText('14 + 6 + 4 = 24 min');
  await ex.getByLabel('Reference trips', { exact: true }).selectOption('M');
  await expect(ex.locator('output')).toHaveText(
    'Prediction 24 min; reference 20 min, distance +2 min, rush +2 min.',
  );
  await expect(ex.locator('#means')).toContainText('mean rush indicator 0.5');
  await captureInspection('changed-reference-inspection.png');
  await ex.getByLabel('Trip distance', { exact: true }).selectOption('1');
  await ex.getByLabel('Traffic period', { exact: true }).selectOption('0');
  await expect(ex.locator('output')).toHaveText(
    'Prediction 12 min; reference 20 min, distance -6 min, rush -2 min.',
  );
  await expect(ex.locator('#reconstruction')).toContainText('20 − 6 − 2 = 12 min');
  await captureInspection('negative-contributions-inspection.png');
  await ex.getByLabel('Reference trips', { exact: true }).selectOption('S');
  await expect(ex.locator('output')).toHaveText(
    'Prediction 12 min; reference 14 min, distance -2 min, rush 0 min.',
  );
  await captureInspection('zero-contribution-inspection.png');
  await ex.getByLabel('Trip distance', { exact: true }).selectOption('8');
  await ex.getByLabel('Traffic period', { exact: true }).selectOption('1');
  await expect(ex.locator('output')).toHaveText(
    'Prediction 30 min; reference 14 min, distance +12 min, rush +4 min.',
  );
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('No SHAP package');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#inspection')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Reference trips', { exact: true }).selectOption('M');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-evaluation-and-uncertainty');
  await expect(
    page.getByRole('link', { name: 'Explainable Predictions', exact: true }).first(),
  ).toBeVisible();
});

test('Explainable Predictions keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/explainable-predictions' + suffix + '.svg');
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
