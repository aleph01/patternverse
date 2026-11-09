import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const imported = JSON.parse(
  await readFile(resolve(process.cwd(), '../../docs/pattern-packages/bowen-import.json'), 'utf8'),
) as { patterns: { id: string; title: string; widget: { title: string } | null }[] };

test('the Bowen collection and verse expose all six articles', async ({ page }) => {
  await page.goto('/collection/bowen-family-systems');
  await expect(
    page.getByRole('heading', { name: 'Bowen Family Systems Theory', exact: true }),
  ).toBeVisible();
  for (const pattern of imported.patterns) {
    await expect(page.locator(`a[href="/pattern/${pattern.id}"]`).first()).toBeVisible();
  }
  await page.goto('/verse/communication-and-relationships');
  if ((page.viewportSize()?.width ?? 0) <= 800) {
    await expect(
      page.getByRole('button', { name: 'Bowen Family Systems Theory 6 patterns' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Games People Play 36 patterns' })).toBeVisible();
    for (const pattern of imported.patterns) {
      await expect(page.locator(`a[href^="/pattern/${pattern.id}?"]`)).toBeVisible();
    }
  } else {
    await expect(page.locator('a[href="/collection/bowen-family-systems"]').first()).toBeVisible();
    await expect(page.locator('a[href="/collection/games-people-play"]').first()).toBeVisible();
  }
});

for (const pattern of imported.patterns) {
  test(`${pattern.title}: complete article and functioning illustration`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/pattern/${pattern.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(pattern.title);
    await expect(page.locator('.entity-header-top button').first()).toBeEnabled();
    expect((await page.locator('main').innerText()).split(/\s+/).length).toBeGreaterThan(1000);
    await expect(page.locator('a[href="/collection/bowen-family-systems"]').first()).toBeVisible();
    if (pattern.widget) {
      const outer = page.locator(`iframe[title="${pattern.widget.title}"]`);
      await expect(outer).toHaveAttribute('title', pattern.widget.title);
      const inner = page
        .frameLocator(`iframe[title="${pattern.widget.title}"]`)
        .frameLocator('iframe');
      const paths = inner.locator('button[data-story]');
      const next = inner.getByRole('button', { name: /^Next/ });
      const back = inner.getByRole('button', { name: 'Previous', exact: true });
      const exchange = inner.locator('[aria-live="polite"]');
      await expect(paths).toHaveCount(2);
      await expect(exchange).not.toBeEmpty();
      const initial = await exchange.innerText();
      for (let path = 0; path < 2; path++) {
        await paths.nth(path).click();
        await expect(paths.nth(path)).toHaveAttribute('aria-pressed', 'true');
        while (await back.isEnabled()) await back.click();
        await expect(exchange).toHaveText(initial);
        let steps = 0;
        while (await next.isEnabled()) {
          const previous = await exchange.innerText();
          await next.click();
          await expect(exchange).not.toHaveText(previous);
          expect(++steps).toBeLessThan(8);
        }
        expect(steps).toBeGreaterThanOrEqual(3);
      }
      const final = await exchange.innerText();
      await paths.first().click();
      await expect(exchange).not.toHaveText(final);
      await expect(next).toBeDisabled(); // Switching paths preserves the selected moment.
      expect(
        await inner.locator('body').evaluate((node) => node.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await outer.screenshot({ path: info.outputPath('interactive-example.png') });
    } else {
      const image = page.locator('img[src="/assets/bowen/family-diagram.svg"]');
      await expect(image).toBeVisible();
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await expect(page.locator('table tbody tr')).toHaveCount(5);
      await image.screenshot({ path: info.outputPath('family-diagram.png') });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

test('normal reload retains the current version-specific update worker', async ({ page }) => {
  await page.goto('/pattern/bowen-i-position');
  const version = (await (await page.request.get('/_app/version.json')).json()).version;
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.active?.scriptURL;
      }),
    )
    .toContain('version=' + version);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('I-Position');
});
