import { expect, test } from '@playwright/test';

test('Feature Store computes both retrieval paths, guards freshness and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-feature-store');
  await expect(
    page.getByRole('heading', { name: 'Feature Store', exact: true }).first(),
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

  const initial = 'Historical 09:40: 7 orders. Online 10:00: 12 orders, age 5 min. Ready for M1.';
  await expect(ex.locator('output')).toHaveText(initial);
  await ex.getByLabel('Online refresh', { exact: true }).selectOption('5');
  await expect(ex.locator('output')).toHaveText(
    'Historical 09:40: 7 orders. Online 10:05: 20 orders, age 0 min. Ready for M1.',
  );
  await ex.getByLabel('Serving time · UTC', { exact: true }).selectOption('610');
  await expect(ex.locator('output')).toContainText('Online 10:10: 16 orders, age 0 min');
  await ex.getByLabel('Online refresh', { exact: true }).selectOption('15');
  await expect(ex.locator('output')).toContainText('Online 10:00: 12 orders, age 10 min. Ready');
  await ex.getByLabel('Serving time · UTC', { exact: true }).selectOption('615');
  await expect(ex.locator('output')).toContainText('Online 10:15: 16 orders, age 0 min');
  await ex.getByLabel('Serving time · UTC', { exact: true }).selectOption('600');
  await expect(ex.locator('output')).toContainText('Online 10:00: 12 orders, age 0 min');
  await ex.getByLabel('Serving time · UTC', { exact: true }).selectOption('605');
  await ex.getByLabel('Online refresh', { exact: true }).selectOption('paused');
  await expect(ex.locator('output')).toContainText(
    'Online 09:45: 7 orders, age 20 min. Stale; defer M1.',
  );
  await ex.locator('#state summary').click();
  await expect(ex.locator('#checks')).toContainText('Usable M1 feature: not supplied');
  await captureInspection('stale-inspection.png');
  await ex.getByLabel('Online refresh', { exact: true }).selectOption('15');
  await ex.getByLabel('Requested definition', { exact: true }).selectOption('v2');
  await expect(ex.locator('output')).toHaveText(
    'Historical 09:40: 3 orders. Online 10:00: 8 orders, age 5 min. Definition mismatch; do not serve M1.',
  );
  await expect(ex.locator('#checks')).toContainText('observed empty C: 0');
  await captureInspection('version-inspection.png');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Requested definition', { exact: true }).selectOption('v2');
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
    page.getByRole('link', { name: 'Feature Store', exact: true }).first(),
  ).toBeVisible();
});

test('Feature Store keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/feature-store' + suffix + '.svg');
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
