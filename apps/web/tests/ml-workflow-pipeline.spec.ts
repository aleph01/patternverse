import { expect, test } from '@playwright/test';

test('Workflow Pipeline schedules dependencies, retries and release gates and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-workflow-pipeline');
  await expect(
    page.getByRole('heading', { name: 'Workflow Pipeline', exact: true }).first(),
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
  const initial = 'Released at 18 min; 20 task-min of work.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Execution slots', { exact: true }).selectOption('1');
  await expect(ex.locator('output')).toHaveText('Released at 20 min; 20 task-min of work.');
  await ex.getByLabel('Training execution', { exact: true }).selectOption('retry');
  await expect(ex.locator('output')).toHaveText('Released at 28 min; 28 task-min of work.');
  await ex.getByLabel('Execution slots', { exact: true }).selectOption('2');
  await expect(ex.locator('output')).toHaveText('Released at 26 min; 28 task-min of work.');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#attempts tbody tr')).toHaveCount(7);
  await captureInspection('retry-inspection.png');
  await ex.getByLabel('Training execution', { exact: true }).selectOption('fail');
  await expect(ex.locator('output')).toHaveText(
    'Not released; run ended at 21 min. 21 task-min of work.',
  );
  await expect(ex.locator('#artifacts')).not.toContainText('candidate M1');
  await expect(ex.locator('#attempts tbody tr').last()).toContainText('Blocked');
  await ex.getByLabel('Evaluation decision', { exact: true }).selectOption('reject');
  await expect(ex.locator('output')).toContainText('21 min');
  await ex.getByLabel('Training execution', { exact: true }).selectOption('success');
  await expect(ex.locator('output')).toHaveText(
    'Not released; run ended at 17 min. 19 task-min of work.',
  );
  await expect(ex.locator('#attempts tbody tr').nth(3)).toContainText('Complete · rejects');
  await expect(ex.locator('#artifacts')).toContainText('report Q1 · reject');
  await expect(ex.locator('#artifacts')).not.toContainText('release R1');
  await expect(ex.locator('svg')).toContainText('Report: reject');
  await captureInspection('rejection-inspection.png');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Execution slots', { exact: true }).selectOption('1');
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
    page.getByRole('link', { name: 'Workflow Pipeline', exact: true }).first(),
  ).toBeVisible();
});

test('Workflow Pipeline keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/workflow-pipeline' + suffix + '.svg');
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
