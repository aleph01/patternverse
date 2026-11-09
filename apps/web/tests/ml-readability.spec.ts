import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const metadata = JSON.parse(
  readFileSync(resolve(process.cwd(), '../../docs/pattern-packages/machine-learning.json'), 'utf8'),
);

for (const pattern of metadata.patterns as { id: string; title: string }[]) {
  test(`readability: ${pattern.title}`, async ({ page, isMobile }, info) => {
    await page.goto('/pattern/' + pattern.id);
    await expect(page.locator('.markdown-body h2')).toHaveText(metadata.article_structure);
    await page.addStyleTag({ content: '.article-outline { visibility: hidden !important; }' });
    const figure = page.locator('.content-diagram');
    await figure.scrollIntoViewIfNeeded();
    await expect
      .poll(() => figure.locator('img').evaluate((im: HTMLImageElement) => im.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    await figure.screenshot({
      path: info.outputPath('figure-and-caption.png'),
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    const shell = page.locator('.article-widget');
    if (!(await shell.count())) return;
    await shell.getByRole('button', { name: 'Run example', exact: true }).click();
    // A preview remains useful before launch, but must not repeat above the running explanation.
    await expect(shell.locator(':scope > p')).toHaveCount(0);
    const outer = shell.locator('iframe');
    const example = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
    await expect(example.locator('output')).not.toBeEmpty();
    // Browsers may suspend animation frames in fully off-screen sandboxes.
    // Scroll the explorer onto the page before checking its reported height.
    await outer.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await expect
      .poll(async () => {
        const contentHeight = await example.locator('body').evaluate((body) => body.scrollHeight);
        return Math.abs(Number(await outer.getAttribute('height')) - contentHeight);
      })
      .toBeLessThan(4);
    expect(
      await example
        .locator('body')
        .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await example.locator('output').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('explorer-viewport.png') });
    // Keep the device width, but expose the complete frame for the evidence
    // capture. This avoids blank off-screen iframe regions in Chromium.
    const viewport = page.viewportSize()!;
    await page.setViewportSize({
      width: viewport.width,
      height: Number(await outer.getAttribute('height')) + 100,
    });
    await outer.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await outer.screenshot({
      path: info.outputPath('running-explorer.png'),
    });
    await page.setViewportSize(viewport);

    const details = example.locator('details').first();
    if (await details.count()) {
      const initiallyOpen = await details.evaluate((element: HTMLDetailsElement) => element.open);
      const initialHeight = Number(await outer.getAttribute('height'));
      await details.locator('summary').click();
      await expect
        .poll(async () => {
          const height = Number(await outer.getAttribute('height'));
          return initiallyOpen ? initialHeight - height : height - initialHeight;
        })
        .toBeGreaterThan(10);
      await details.locator('summary').click();
      await expect
        .poll(async () => Math.abs(Number(await outer.getAttribute('height')) - initialHeight))
        .toBeLessThan(4);
    }
  });
}

test('ML sizing ignores unrelated senders and invalid sandbox measurements', async ({ page }) => {
  await page.goto('/pattern/ml-hashed-feature');
  await page.getByRole('button', { name: 'Run example', exact: true }).click();
  const outer = page.locator('.article-widget > iframe');
  const example = page.frameLocator('.article-widget > iframe').frameLocator('iframe');
  await expect(example.locator('output')).toContainText('3 colliding pairs');
  await expect.poll(async () => Number(await outer.getAttribute('height'))).not.toBe(1100);
  const before = await outer.getAttribute('height');
  await page.evaluate(() => {
    window.postMessage({ type: 'article-widget-size', height: 19000 }, location.origin);
  });
  await example.locator('body').evaluate(() => {
    parent.postMessage({ type: 'article-widget-size', height: NaN }, '*');
    parent.postMessage({ type: 'article-widget-size', height: '19000' }, '*');
    parent.postMessage({ type: 'article-widget-ready' }, '*');
  });
  await expect(outer).toHaveAttribute('height', before!);
  expect(
    await example.locator('body').evaluate(() => {
      try {
        return parent.document.body.textContent;
      } catch {
        return 'opaque';
      }
    }),
  ).toBe('opaque');
});
