import { expect, test } from '@playwright/test';

test('Cascade routes conditional stages, exposes early misses and verifies work totals and resets', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/pattern/ml-cascade');
  await expect(page.getByRole('heading', { name: 'Cascade', exact: true }).first()).toBeVisible();
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

  const initial = '5/8 reach stage 2; 3/4 defects found. Later model alone: 4/4.';
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#work')).toHaveText(
    'Total work 68 ms versus 96 ms later-only. Saved work: 28 ms.',
  );
  await ex.locator('#state summary').click();
  await expect(ex.locator('#conditional')).toContainText('3/3 = 1');
  await expect(ex.locator('#paths')).toContainText('Continued path work: 13 ms');
  await ex.getByLabel('Continue if gate score is at least', { exact: true }).selectOption('0.6');
  await expect(ex.locator('output')).toHaveText(
    '3/8 reach stage 2; 2/4 defects found. Later model alone: 4/4.',
  );
  await expect(ex.locator('#work')).toContainText('Total work 44 ms');
  await captureInspection('strict-gate-inspection.png');
  await ex.getByLabel('Supplied stage 2 answers', { exact: true }).selectOption('errors');
  await expect(ex.locator('output')).toHaveText(
    '3/8 reach stage 2; 1/4 defects found. Later model alone: 3/4.',
  );
  await expect(ex.locator('#interpretation')).toContainText('Missed by stage 2 after passing: B');
  await expect(ex.locator('#interpretation')).toContainText('False alarms: E');
  await ex.getByLabel('Continue if gate score is at least', { exact: true }).selectOption('0.3');
  await ex.getByLabel('Gate work per part', { exact: true }).selectOption('3');
  await ex.getByLabel('Stage 2 work per part', { exact: true }).selectOption('4');
  await expect(ex.locator('#work')).toHaveText(
    'Total work 44 ms versus 32 ms later-only. Extra work: 12 ms.',
  );
  await captureInspection('costly-gate-inspection.png');
  await ex.getByLabel('Continue if gate score is at least', { exact: true }).selectOption('0');
  await expect(ex.locator('output')).toContainText('8/8 reach stage 2; 3/4 defects found');
  await expect(ex.locator('#work')).toContainText('Total work 56 ms');
  await captureInspection('all-pass-inspection.png');
  await ex.getByLabel('Continue if gate score is at least', { exact: true }).selectOption('0.1');
  await expect(ex.locator('output')).toContainText('7/8 reach stage 2');
  await ex.locator('#assumptions summary').click();
  await expect(ex.locator('#assumptions')).toContainText('not measured response latency');
  await ex.getByRole('button', { name: 'Reset inputs', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  await expect(ex.locator('#state')).toHaveJSProperty('open', false);
  await expect(ex.locator('#assumptions')).toHaveJSProperty('open', false);
  await ex.getByLabel('Supplied stage 2 answers', { exact: true }).selectOption('errors');
  await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  await expect(ex.locator('output')).toHaveText(initial);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await ex.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(ex.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.goto('/collection/machine-learning-training-and-deployment');
  await expect(page.getByRole('link', { name: 'Cascade', exact: true }).first()).toBeVisible();
});

test('Cascade keeps all labels inside both authored illustration layouts', async ({ page }) => {
  for (const suffix of ['', '-mobile']) {
    await page.goto('/assets/machine-learning/cascade' + suffix + '.svg');
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
