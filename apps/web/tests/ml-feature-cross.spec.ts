import { expect, test } from '@playwright/test';

test('Feature Cross fits interactions, keeps withheld targets out of training and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-feature-cross');
  await expect(
    page.getByRole('heading', { name: 'Feature Cross', exact: true }).first(),
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

  const initial = 'Car + wet: target 35 min; separate 38.75 min; cross 35 min.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#metrics')).toContainText('separate 3.75 min; cross 0 min');
  await ex.getByLabel('Training pairs', { exact: true }).selectOption('withheld');
  await expect(ex.locator('output')).toHaveText(
    'Car + wet: target 35 min; separate 50 min; cross 50 min.',
  );
  await expect(ex.locator('#metrics')).toContainText('cross 15 min');
  await ex.locator('#state summary').click();
  await expect(ex.locator('#identified')).toContainText('not estimated');
  await captureInspection('withheld-inspection.png');
  await ex.getByLabel('Car + wet target', { exact: true }).selectOption('10');
  await expect(ex.locator('output')).toHaveText(
    'Car + wet: target 60 min; separate 50 min; cross 50 min.',
  );
  await ex.getByLabel('Training pairs', { exact: true }).selectOption('all');
  await expect(ex.locator('output')).toHaveText(
    'Car + wet: target 60 min; separate 57.5 min; cross 60 min.',
  );
  await captureInspection('positive-interaction.png');
  await ex.getByLabel('Car + wet target', { exact: true }).selectOption('0');
  await expect(ex.locator('output')).toHaveText(
    'Car + wet: target 50 min; separate 50 min; cross 50 min.',
  );
  await expect(ex.locator('#interpretation')).toContainText('coefficient is zero');
  for (const [id, target] of [
    ['bike-dry', '20'],
    ['bike-wet', '40'],
    ['car-dry', '30'],
  ]) {
    await ex.getByLabel('Inspect pair', { exact: true }).selectOption(id);
    await expect(ex.locator('output')).toContainText('target ' + target + ' min');
  }
  await expect(ex.locator('#encoding')).toContainText('[1, 1, 0, 0]');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await ex.getByLabel('Training pairs', { exact: true }).selectOption('withheld');
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
    page.getByRole('link', { name: 'Feature Cross', exact: true }).first(),
  ).toBeVisible();
});

test('Feature Cross keeps all labels inside both authored illustration layouts', async ({
  page,
}) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/feature-cross' + suffix + '.svg');
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
