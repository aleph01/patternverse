import { expect, test } from '@playwright/test';

test('Multilabel computes label sets, compares metrics, allows empty sets and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-multilabel');
  await expect(
    page.getByRole('heading', { name: 'Multilabel', exact: true }).first(),
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

  const initial = 'Ticket C: Billing + Delivery. Reviewed: Billing + Delivery.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#metrics')).toHaveText(
    'All four tickets: Hamming loss 0.167 (2/12); exact sets 2/4; micro F1 0.8.',
  );
  await ex.getByLabel('Inspect ticket', { exact: true }).selectOption('A');
  await expect(ex.locator('output')).toHaveText('Ticket A: Billing. Reviewed: Billing + Access.');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#loss')).toContainText('0.415 nats');
  await ex.getByLabel('Access threshold', { exact: true }).selectOption('0.3');
  await expect(ex.locator('output')).toHaveText(
    'Ticket A: Billing + Access. Reviewed: Billing + Access.',
  );
  await expect(ex.locator('#metrics')).toContainText('micro F1 0.833');
  await expect(ex.locator('#loss')).toContainText('0.415 nats');
  await captureInspection('label-threshold-inspection.png');
  await ex.getByLabel('Inspect ticket', { exact: true }).selectOption('D');
  await expect(ex.locator('output')).toHaveText('Ticket D: Access. Reviewed: None.');
  await ex.getByLabel('Access threshold', { exact: true }).selectOption('shared');
  await expect(ex.locator('output')).toHaveText('Ticket D: None. Reviewed: None.');
  await ex.getByLabel('Selection rule', { exact: true }).selectOption('one');
  await expect(ex.getByLabel('Shared threshold', { exact: true })).toBeDisabled();
  await expect(ex.getByLabel('Access threshold', { exact: true })).toBeDisabled();
  await expect(ex.locator('output')).toHaveText('Ticket D: Delivery. Reviewed: None.');
  await expect(ex.locator('#metrics')).toContainText('exact sets 1/4; micro F1 0.667');
  await captureInspection('forced-one-inspection.png');
  await ex.getByLabel('Selection rule', { exact: true }).selectOption('threshold');
  await expect(ex.getByLabel('Shared threshold', { exact: true })).toBeEnabled();
  await ex.getByLabel('Shared threshold', { exact: true }).selectOption('0.7');
  await ex.getByLabel('Inspect ticket', { exact: true }).selectOption('C');
  await expect(ex.locator('output')).toHaveText('Ticket C: Billing. Reviewed: Billing + Delivery.');
  await ex.getByLabel('Shared threshold', { exact: true }).selectOption('0.3');
  await expect(ex.locator('#metrics')).toContainText('Hamming loss 0.25 (3/12)');
  await ex.getByLabel('Inspect ticket', { exact: true }).selectOption('B');
  await expect(ex.locator('output')).toHaveText('Ticket B: Billing + Access. Reviewed: Access.');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('not calibrated model probabilities');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Selection rule', { exact: true }).selectOption('one');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.getByLabel('Shared threshold', { exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-inputs-and-features');
  await expect(page.getByRole('link', { name: 'Multilabel', exact: true }).first()).toBeVisible();
});

test('Multilabel keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/multilabel' + suffix + '.svg');
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
