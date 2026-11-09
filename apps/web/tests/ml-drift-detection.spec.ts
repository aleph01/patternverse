import { expect, test } from '@playwright/test';

test('Drift Detection separates input signals, outcome changes, volume and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-drift-detection');
  await expect(
    page.getByRole('heading', { name: 'Drift Detection', exact: true }).first(),
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

  const initial =
    'Input gap 60 pp: Investigate input shift. Current accuracy 75% (0 pp from reference).';
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
  await expect(ex.locator('#sample tbody tr')).toHaveCount(8);
  await expect(ex.locator('#shares tbody tr')).toHaveCount(2);
  await ex.getByLabel('Current scenario', { exact: true }).selectOption('errors');
  await expect(ex.locator('output')).toHaveText(
    'Input gap 0 pp: No configured input alert. Current accuracy 50% (-25 pp from reference).',
  );
  await expect(ex.locator('#interpretation')).toContainText(
    'Channel shares stayed fixed while labeled accuracy fell',
  );
  await captureInspection('hidden-performance-drop-inspection.png');
  await ex.getByLabel('Current scenario', { exact: true }).selectOption('stable');
  await expect(ex.locator('output')).toHaveText(
    'Input gap 0 pp: No configured input alert. Current accuracy 75% (0 pp from reference).',
  );
  await ex.getByLabel('Current scenario', { exact: true }).selectOption('mix');
  await ex.getByLabel('Current ticket count', { exact: true }).selectOption('20');
  await expect(ex.locator('output')).toHaveText(
    'Input gap 60 pp: Insufficient current volume. Current accuracy 75% (0 pp from reference).',
  );
  await expect(ex.locator('#shares')).toContainText('4/20 (20%)');
  await captureInspection('insufficient-volume-inspection.png');
  await ex.getByLabel('Current ticket count', { exact: true }).selectOption('100');
  await ex.getByLabel('Alert gap threshold', { exact: true }).selectOption('60');
  await expect(ex.locator('output')).toHaveText(
    'Input gap 60 pp: No configured input alert. Current accuracy 75% (0 pp from reference).',
  );
  await expect(ex.locator('#calculation')).toContainText('60 pp > 60 pp is false');
  await captureInspection('threshold-boundary-inspection.png');
  await ex.getByLabel('Alert gap threshold', { exact: true }).selectOption('70');
  await expect(ex.locator('output')).toContainText('No configured input alert');
  await ex.getByLabel('Alert gap threshold', { exact: true }).selectOption('10');
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('not a hypothesis test');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#inspection')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Current scenario', { exact: true }).selectOption('errors');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-monitoring-and-robustness');
  await expect(
    page.getByRole('link', { name: 'Drift Detection', exact: true }).first(),
  ).toBeVisible();
});

test('Drift Detection keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/drift-detection' + suffix + '.svg');
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
