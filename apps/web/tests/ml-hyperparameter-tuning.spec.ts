import { expect, test } from '@playwright/test';

test('Hyperparameter Tuning computes fits, budget eligibility, panel selection and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-hyperparameter-tuning');
  await expect(
    page.getByRole('heading', { name: 'Hyperparameter Tuning', exact: true }).first(),
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

  const initial = '2 completed trials: selected λ 2, fitted w 1.5, validation MSE 0.625.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#interpretation')).toContainText('Untried settings: 8, 26');
  await ex.locator('#calculation summary').click();
  await expect(ex.locator('#formula')).toContainText('18 / (10 + 2) = 1.5');
  await expect(ex.locator('#mse')).toContainText('(1 + 0.25 + 0.25 + 1) / 4 = 0.625');
  await ex.getByLabel('Completed trial budget', { exact: true }).selectOption('4');
  await expect(ex.locator('output')).toHaveText(
    '4 completed trials: selected λ 8, fitted w 1, validation MSE 0.',
  );
  await expect(ex.locator('#trials tbody tr')).toHaveCount(4);
  await captureInspection('full-search-inspection.png');
  await ex.getByLabel('Validation outcomes', { exact: true }).selectOption('B');
  await expect(ex.locator('output')).toHaveText(
    '4 completed trials: selected λ 2, fitted w 1.5, validation MSE 0.',
  );
  await expect(ex.locator('#records tbody tr').first()).toContainText('-3');
  await captureInspection('alternate-panel-inspection.png');
  await ex.getByLabel('Completed trial budget', { exact: true }).selectOption('2');
  await ex.getByLabel('Trial order', { exact: true }).selectOption('strong');
  await expect(ex.locator('output')).toHaveText(
    '2 completed trials: selected λ 8, fitted w 1, validation MSE 0.625.',
  );
  await expect(ex.locator('#interpretation')).toContainText('Untried settings: 0, 2');
  await expect(ex.locator('#trials tbody tr').first()).toContainText('26');
  await captureInspection('limited-strong-search-inspection.png');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('not random or adaptive search');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#calculation')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Completed trial budget', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-learning-and-adaptation');
  await expect(
    page.getByRole('link', { name: 'Hyperparameter Tuning', exact: true }).first(),
  ).toBeVisible();
});

test('Hyperparameter Tuning keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/hyperparameter-tuning' + suffix + '.svg');
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
