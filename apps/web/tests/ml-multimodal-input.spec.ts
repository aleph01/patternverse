import { expect, test } from '@playwright/test';

test('Multimodal Input computes fusion, handles missing inputs, blocks invalid associations and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-multimodal-input');
  await expect(
    page.getByRole('heading', { name: 'Multimodal Input', exact: true }).first(),
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

  const initial = 'Standard review: score 0.44 (both inputs).';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Report weight with both inputs', { exact: true }).selectOption('0.7');
  await expect(ex.locator('output')).toHaveText('Priority review: score 0.62 (both inputs).');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#formula')).toContainText('0.70 × 0.80 + 0.30 × 0.20 = 0.62');
  await captureInspection('weighted-inspection.png');
  await ex.getByLabel('Photo evidence', { exact: true }).selectOption('missing');
  await expect(ex.locator('output')).toHaveText(
    'Priority review: score 0.80 (report-only fallback).',
  );
  await ex.getByLabel('Photo belongs to', { exact: true }).selectOption('other');
  await expect(ex.locator('output')).toContainText('report-only fallback');
  await expect(ex.locator('#pairing')).toContainText('Photo ID: absent');
  await captureInspection('missing-inspection.png');
  await ex.getByLabel('Photo evidence', { exact: true }).selectOption('0.8');
  await expect(ex.locator('output')).toHaveText(
    'Scoring blocked: photo C42 does not belong to claim C17.',
  );
  await expect(ex.locator('#formula')).toContainText('Fusion is not evaluated');
  await captureInspection('blocked-inspection.png');
  await ex.getByLabel('Photo belongs to', { exact: true }).selectOption('same');
  await ex.getByLabel('Report signal', { exact: true }).selectOption('0.2');
  await expect(ex.locator('output')).toHaveText('Standard review: score 0.38 (both inputs).');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('no outcome labels');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Photo evidence', { exact: true }).selectOption('missing');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(
    page.getByRole('link', { name: 'Multimodal Input', exact: true }).first(),
  ).toBeVisible();
});

test('Multimodal Input keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/multimodal-input' + suffix + '.svg');
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
