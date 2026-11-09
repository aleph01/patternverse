import { expect, test } from '@playwright/test';

test('keeps mobile navigation at the top while reading and uses neutral paging controls', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone');
  await page.goto(
    '/pattern/creative-reframing?collection=commons:reframing&verse=commons:creativity',
  );
  const bar = page.locator('.reader-navigation');
  const contents = bar.getByRole('button', { name: /On this page/ });
  await expect(contents).toBeEnabled();
  await page
    .locator('.entity-article h2')
    .last()
    .evaluate((heading) => heading.scrollIntoView());
  await expect.poll(async () => (await bar.boundingBox())!.y).toBeCloseTo(0, 0);
  await expect(bar.getByRole('link', { name: /Next article/ })).toHaveAttribute(
    'href',
    /collection=commons%3Areframing/,
  );
  const colors = await bar.locator('.reader-controls > a').evaluateAll((links) =>
    links.map((link) => ({
      background: getComputedStyle(link).backgroundColor,
      color: getComputedStyle(link).color,
    })),
  );
  expect(colors[0]).toEqual(colors[1]);
  await expect(page.locator('.outline-menu')).toBeHidden();
  await contents.click();
  const panel = bar.getByRole('region', { name: 'Reader navigation' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Collection articles' })).toHaveCount(0);
  const link = panel.getByRole('link', { name: 'Worked examples', exact: true });
  await link.click();
  await expect(panel).toHaveCount(0);
  const heading = page.getByRole('heading', { name: 'Worked examples', exact: true });
  await expect(heading).toBeFocused();
  await expect
    .poll(async () => (await heading.boundingBox())!.y)
    .toBeGreaterThanOrEqual((await bar.boundingBox())!.height);
  await expect(contents).toHaveAccessibleName('On this page: Worked examples');
  await page.screenshot({ path: info.outputPath('sticky-top-reader.png') });
});

test('browses the collection without returning to the top and resets after article navigation', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone');
  await page.goto(
    '/pattern/creative-reframing?collection=commons:reframing&verse=commons:creativity',
  );
  const bar = page.locator('.reader-navigation');
  await expect(bar.getByRole('button', { name: /Browse/ })).toBeEnabled();
  await page
    .locator('.entity-article h2')
    .last()
    .evaluate((heading) => heading.scrollIntoView());
  await bar.getByRole('button', { name: /Browse/ }).click();
  const articles = bar.getByRole('navigation', { name: 'Collection articles' });
  await expect(page.getByRole('navigation', { name: 'Collection articles' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Article contents', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Previous and next in collection' }),
  ).toHaveCount(0);
  await expect(bar.getByRole('tab')).toHaveCount(0);
  await expect(articles.locator('[aria-current="page"]')).toContainText('Creative Reframing');
  await expect(articles.getByRole('link')).toHaveCount(17);
  const next = bar.getByRole('link', { name: /Next article:/ });
  const target = await next.getAttribute('href');
  await next.click();
  await expect(page).toHaveURL(new RegExp(target!.split('?')[0]), { timeout: 20000 });
  expect(new URL(page.url()).searchParams.get('collection')).toBe('commons:reframing');
  expect(new URL(page.url()).searchParams.get('verse')).toBe('commons:creativity');
  await expect(bar.getByRole('region', { name: 'Reader navigation' })).toHaveCount(0);
  await expect(bar.getByRole('button', { name: /On this page/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('.reader-header h1')).not.toHaveText('Creative Reframing');
});

test('fits narrow phones, keeps lists within the viewport, and leaves desktop navigation intact', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/pattern/observer');
  for (const width of [320, 390, 800, 801, 1200]) {
    await page.setViewportSize({ width, height: 740 });
    const bar = page.locator('.reader-navigation');
    if (width <= 800) {
      await expect(bar).toBeVisible();
      await bar.getByRole('button', { name: /On this page/ }).click();
      const panel = bar.getByRole('region', { name: 'Reader navigation' });
      await expect(panel).toBeVisible();
      expect(
        (await panel.boundingBox())!.y + (await panel.boundingBox())!.height,
      ).toBeLessThanOrEqual(740);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
    } else {
      await expect(bar).toBeHidden();
      await expect(
        page.locator(width >= 1200 ? '.outline-desktop' : '.outline-menu'),
      ).toBeVisible();
    }
  }
});
