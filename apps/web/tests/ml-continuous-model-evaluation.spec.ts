import { expect, test } from '@playwright/test';

test('Continuous Model Evaluation joins delayed labels, preserves cohorts and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-continuous-model-evaluation');
  await expect(
    page.getByRole('heading', { name: 'Continuous Model Evaluation', exact: true }).first(),
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
  const initial =
    'Day 5: recent cohort has 2/6 usable labels, error 0.0%, coverage 33.3%. Too few labels.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#slices tbody tr').nth(1)).toContainText('0.0%');
  await ex.getByLabel('Audit checkpoint', { exact: true }).selectOption('4');
  await expect(ex.locator('output')).toContainText('error N/A, coverage N/A. Waiting for age');
  await ex.getByLabel('Audit checkpoint', { exact: true }).selectOption('6');
  await expect(ex.locator('output')).toContainText(
    '4/6 usable labels, error 50.0%, coverage 66.7%. Investigate',
  );
  await ex.getByLabel('Audit checkpoint', { exact: true }).selectOption('7');
  await expect(ex.locator('output')).toContainText(
    '5/6 usable labels, error 60.0%, coverage 83.3%',
  );
  await ex.locator('#state summary').click();
  await expect(ex.locator('#records tbody tr')).toHaveCount(12);
  await expect(ex.locator('#records tbody tr').last()).toContainText('Pending');
  await expect(ex.locator('#join-notes')).toContainText('records: 1');
  await ex.locator('#state').screenshot({ path: info.outputPath('inspection.png') });
  await ex.getByLabel('Label availability', { exact: true }).selectOption('complete');
  await expect(ex.locator('output')).toContainText(
    '6/6 usable labels, error 66.7%, coverage 100.0%',
  );
  await ex.getByLabel('Ticket slice', { exact: true }).selectOption('complex');
  await expect(ex.locator('output')).toContainText('4/4 usable labels, error 100.0%');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Audit checkpoint', { exact: true }).selectOption('8');
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
    page.getByRole('link', { name: 'Continuous Model Evaluation', exact: true }).first(),
  ).toBeVisible();
});

test('Continuous Model Evaluation keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/continuous-model-evaluation' + suffix + '.svg');
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
