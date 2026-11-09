import { expect, test, type Page } from '@playwright/test';

async function openPattern(page: Page, path: string) {
  await page.goto(path);
  // Wait for the mounted app before testing its scroll indicator and event handlers.
  await expect(page.locator('.entity-header-top button').first()).toBeEnabled();
}

async function openContents(page: Page) {
  if ((page.viewportSize()?.width ?? 0) <= 800) {
    const trigger = page
      .locator('.reader-navigation')
      .getByRole('button', { name: /On this page/ });
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  } else {
    const menu = page.locator('.outline-menu');
    if (
      (await menu.isVisible()) &&
      !(await menu.evaluate((element) => (element as HTMLDetailsElement).open))
    )
      await menu.locator('summary').click();
  }
  return page.getByRole('navigation', { name: 'Article contents', exact: true });
}

test('keeps navigation and long section labels within the page across desktop and phone widths', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop');
  await openPattern(page, '/pattern/observer');
  for (const width of [320, 768, 1199, 1200, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const contents = await openContents(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const targets = await contents.getByRole('link').evaluateAll((links) =>
      links.map((link) => {
        const id = decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
        return {
          exists: Boolean(document.getElementById(id)),
          right: link.getBoundingClientRect().right,
        };
      }),
    );
    expect(targets.length).toBeGreaterThan(5);
    expect(targets.every((target) => target.exists && target.right <= width)).toBe(true);
    await page.keyboard.press('Escape');
  }
});

test('brings article prose into the first screen with a compact heading', async ({
  page,
}, info) => {
  await openPattern(page, '/pattern/creative-reframing');
  const header = page.locator('.reader-header');
  await expect(header.getByRole('heading', { level: 1 })).toHaveText('Creative Reframing');
  const metrics = await header.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    title: Number.parseFloat(getComputedStyle(element.querySelector('h1')!).fontSize),
  }));
  expect(metrics.title).toBeLessThanOrEqual(56);
  expect(metrics.height).toBeLessThan(420);
  expect((await page.locator('.entity-article').boundingBox())!.y).toBeLessThan(750);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('reader.png'), fullPage: true });
});

test('offers a sticky desktop outline with keyboard links and scroll position', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop');
  await openPattern(page, '/pattern/observer');
  const panel = page.locator('.outline-desktop');
  await expect(panel).toBeVisible();
  await expect(page.locator('.outline-menu')).toBeHidden();
  const link = panel.getByRole('link', { name: 'Core idea', exact: true });
  const id = decodeURIComponent((await link.getAttribute('href'))!.slice(1));
  await link.focus();
  await link.press('Enter');
  await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  await expect(link).toHaveAttribute('aria-current', 'location');
  expect((await panel.boundingBox())!.y).toBeCloseTo(24, 0);
  await page.getByRole('heading', { name: 'Related patterns', exact: true }).evaluate((heading) => {
    window.scrollTo(0, heading.getBoundingClientRect().top + scrollY - 60);
  });
  await expect(panel.getByRole('link', { name: 'Related patterns', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
});

test('uses a keyboard-operable Contents menu when the sidebar does not fit', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'desktop');
  await openPattern(page, '/pattern/creative-reframing');
  await expect(page.locator('.outline-desktop')).toBeHidden();
  const menu = page.locator('.outline-menu');
  const mobile = (page.viewportSize()?.width ?? 0) <= 800;
  const summary = mobile
    ? page.locator('.reader-navigation').getByRole('button', { name: /On this page/ })
    : menu.locator('summary');
  await expect(summary).toBeVisible();
  await summary.focus();
  await summary.press('Enter');
  const link = page
    .getByRole('navigation', { name: 'Article contents', exact: true })
    .getByRole('link', { name: 'Worked examples', exact: true });
  await expect(link).toBeVisible();
  await link.focus();
  await link.press('Enter');
  await expect(menu).not.toHaveAttribute('open');
  const heading = page.getByRole('heading', { name: 'Worked examples', exact: true });
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/#user-content-article-section-worked-examples$/);
  // Opening the menu during native smooth scrolling would cancel the jump midway.
  await expect
    .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(mobile ? 130 : 96);
  await summary.click();
  await expect(link).toHaveAttribute('aria-current', 'location');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  if (mobile) await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(summary).toBeFocused();
});

test('omits an outline on short articles and resets it after article navigation', async ({
  page,
}) => {
  await openPattern(page, '/pattern/creative-reframing');
  await expect(
    page.locator(
      (page.viewportSize()?.width ?? 0) <= 800 ? '.reader-navigation' : '.article-outline',
    ),
  ).toBeVisible();
  await page.goto('/practice/set-a-good-enough-stopping-rule');
  await expect(page).toHaveURL('/practice/set-a-good-enough-stopping-rule');
  await expect(page.locator('.article-outline')).toHaveCount(0);
  await expect(page.locator('.reader-header h1')).toHaveText('Set a Good Enough Stopping Rule');
  await page.goBack();
  const contents = await openContents(page);
  await expect(contents.getByRole('link', { name: 'Core idea', exact: true })).toHaveCount(1);
  await expect(contents.getByRole('link', { name: 'Instructions', exact: true })).toHaveCount(0);
});

test('supports direct section links and preserves the collection header', async ({ page }) => {
  await openPattern(
    page,
    '/pattern/creative-reframing#user-content-article-section-worked-examples',
  );
  const contents = await openContents(page);
  await expect(
    contents.getByRole('link', { name: 'Worked examples', exact: true }),
  ).toHaveAttribute('aria-current', 'location');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Worked examples', exact: true }),
  ).toBeInViewport();
  await page.goto('/collection/reframing');
  await expect(page.locator('.collection-page .entity-hero')).toBeVisible();
  await expect(page.locator('.reader-header')).toHaveCount(0);
  await expect(page.locator('.article-outline')).toHaveCount(0);
});
