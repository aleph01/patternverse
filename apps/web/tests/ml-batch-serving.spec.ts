import { expect, test } from '@playwright/test';

test('Batch Serving computes publication, cutoff age, missing states and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-batch-serving');
  await expect(
    page.getByRole('heading', { name: 'Batch Serving', exact: true }).first(),
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

  const initial = '08:30: merchant A receives 9 items from R8; input-cutoff age 30 min.';
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
  await expect(ex.locator('#formula')).toContainText('2 × 4 orders + 1 = 9 items');
  await expect(ex.locator('#lookup')).toContainText('Since publication (min)');
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('490');
  await expect(ex.locator('output')).toHaveText(
    '08:10: merchant A receives 7 items from R7; input-cutoff age 70 min.',
  );
  await expect(ex.locator('#decision')).toContainText('has not reached its finish time');
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('500');
  await expect(ex.locator('output')).toHaveText(
    '08:20: merchant A receives 9 items from R8; input-cutoff age 20 min.',
  );
  await captureInspection('publication-boundary-inspection.png');
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('510');
  await ex.getByLabel('R8 result completeness', { exact: true }).selectOption('missing-B');
  await expect(ex.locator('output')).toHaveText(
    '08:30: merchant A receives 7 items from R7; input-cutoff age 90 min.',
  );
  await expect(ex.locator('#coverage')).toContainText('3 / 4 = 75%');
  await expect(ex.locator('#records tbody tr').nth(1)).toContainText('Missing');
  await captureInspection('incomplete-replacement-inspection.png');
  await ex.getByLabel('Merchant to look up', { exact: true }).selectOption('C');
  await expect(ex.locator('output')).toContainText('receives 1 item from R7');
  await expect(ex.locator('#formula')).toContainText('2 × 0 orders + 1 = 1 item');
  await ex.getByLabel('Merchant to look up', { exact: true }).selectOption('E');
  await expect(ex.locator('output')).toHaveText('08:30: merchant E has no prediction in R7.');
  await expect(ex.locator('#formula')).toContainText(
    'no zero-valued input or prediction is invented',
  );
  await ex.getByLabel('Merchant to look up', { exact: true }).selectOption('A');
  await ex.getByLabel('R8 result completeness', { exact: true }).selectOption('complete');
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('600');
  await expect(ex.locator('output')).toHaveText(
    '10:00: merchant A receives 9 items from R8; input-cutoff age 120 min.',
  );
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('601');
  await expect(ex.locator('output')).toContainText('stale (121 min); no usable value returned');
  await expect(ex.locator('#lookup')).toContainText('Stored predicted items');
  await captureInspection('stale-prediction-inspection.png');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('atomic in this in-memory simulation');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#inspection')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Consumer lookup time', { exact: true }).selectOption('601');
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
    page.getByRole('link', { name: 'Batch Serving', exact: true }).first(),
  ).toBeVisible();
});

test('Batch Serving keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/batch-serving' + suffix + '.svg');
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
