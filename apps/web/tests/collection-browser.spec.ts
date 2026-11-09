import { expect, test } from '@playwright/test';

test('browses a collection from quiet breadcrumbs and retains previous/next controls', async ({
  page,
}, info) => {
  await page.goto(
    '/pattern/define-the-decision-before-comparing-options?collection=commons%3Adecision-making-patterns',
  );
  const path = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  const trigger = path.getByRole('button', { name: 'Decision-Making Patterns', exact: true });
  await expect(trigger).toBeEnabled();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: 'Try this pattern yourself' })).toBeVisible();
  await trigger.click();
  const picker = page.getByRole('dialog');
  await expect(picker).toBeVisible();
  await expect(picker.locator('a[aria-current="page"]')).toContainText(
    'Define the Decision Before Comparing Options',
  );
  await expect(picker.getByRole('link', { name: 'Run a Premortem', exact: true })).toHaveAttribute(
    'href',
    /collection=commons%3Adecision-making-patterns.*verse=commons%3Adecision-making/,
  );
  await page.screenshot({ path: info.outputPath('breadcrumb-collection-open.png') });
  await picker.getByRole('link', { name: 'Run a Premortem', exact: true }).click();
  await expect(page).toHaveURL(
    /\/pattern\/run-a-premortem\?collection=commons%3Adecision-making-patterns&verse=commons%3Adecision-making$/,
  );
  await expect(picker).not.toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Run a Premortem');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.getByRole('link', { name: /Previous pattern: Define the Decision/ }).click();
  await expect(page).toHaveURL(/verse=commons%3Adecision-making$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Define the Decision Before Comparing Options',
  );
});

test('browses the single GoF collection without navigating until an article is chosen', async ({
  page,
}, info) => {
  await page.goto('/pattern/observer?collection=commons%3Agof-design-patterns');
  const path = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  const verse = path.getByRole('button', { name: 'Software Engineering', exact: true });
  await verse.click();
  const picker = page.getByRole('dialog');
  await picker.getByRole('button', { name: /^GoF Design Patterns\s/ }).click();
  await expect(
    picker.getByRole('heading', { name: 'GoF Design Patterns', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/pattern/observer?collection=commons%3Agof-design-patterns');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Observer');
  await page.screenshot({ path: info.outputPath('breadcrumb-sibling-collection.png') });
  await picker.getByRole('link', { name: 'Builder', exact: true }).click();
  await expect(page).toHaveURL(
    '/pattern/builder?collection=commons%3Agof-design-patterns&verse=commons%3Asoftware-engineering',
  );
  await expect(
    path.getByRole('button', { name: 'GoF Design Patterns', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    path.getByRole('button', { name: 'GoF Design Patterns', exact: true }),
  ).toBeEnabled();
  await page.goBack();
  await expect(page).toHaveURL('/pattern/observer?collection=commons%3Agof-design-patterns');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Observer');
  await expect(
    path.getByRole('button', { name: 'GoF Design Patterns', exact: true }),
  ).toBeVisible();
});

test('uses two mobile rows and a bottom sheet across responsive changes', async ({
  page,
}, info) => {
  await page.goto('/pattern/cbt-problem-solving?collection=commons%3Acbt');
  const path = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  const verse = path.getByRole('button', { name: 'Therapy & Wellbeing', exact: true });
  const collection = path.getByRole('button', {
    name: 'Cognitive Behavioral Therapy',
    exact: true,
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(verse).toBeVisible();
    const verseBox = (await verse.boundingBox())!;
    const collectionBox = (await collection.boundingBox())!;
    expect(verseBox.height).toBeGreaterThanOrEqual(44);
    if (width <= 800) expect(collectionBox.y).toBeGreaterThanOrEqual(verseBox.y + verseBox.height);
    await verse.click();
    const picker = page.getByRole('dialog');
    await expect(picker).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Close breadcrumb navigation' })).toBeFocused();
    if (width <= 800) {
      const box = (await picker.boundingBox())!;
      expect(box.y + box.height).toBeCloseTo(900, 0);
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`breadcrumb-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(verse).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  }
  await verse.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('opens other Verses from Library and supports collection pages', async ({ page }) => {
  await page.goto('/collection/gof-design-patterns');
  const path = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await path.getByRole('button', { name: 'Library', exact: true }).click();
  const picker = page.getByRole('dialog');
  await picker.getByRole('button', { name: /^Learning\s/ }).click();
  await picker.getByRole('button', { name: /^Learning How to Learn\s/ }).click();
  await picker.getByRole('link', { name: 'Active Recall', exact: true }).click();
  await expect(page).toHaveURL(
    '/pattern/active-recall?collection=commons%3Alearning-how-to-learn&verse=commons%3Alearning',
  );
  await expect(path.getByRole('button', { name: 'Learning', exact: true })).toBeVisible();
});

test('keeps the current collection available when sibling navigation cannot load', async ({
  page,
}) => {
  await page.route('**/library/navigation/*.json', (route) => route.abort());
  await page.goto('/pattern/observer?collection=commons%3Agof-design-patterns');
  const path = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await path.getByRole('button', { name: 'Software Engineering', exact: true }).click();
  const picker = page.getByRole('dialog');
  await expect(picker.getByRole('button', { name: 'Retry navigation' })).toBeVisible();
  await picker.getByRole('button', { name: /^GoF Design Patterns\s/ }).click();
  await expect(picker.getByRole('link', { name: 'Observer', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/pattern/observer?collection=commons%3Agof-design-patterns');
});

for (const category of ['creational', 'structural', 'behavioral']) {
  test(`redirects the retired GoF ${category} collection`, async ({ page }) => {
    await page.goto(`/collection/gof-${category}`);
    await expect(page).toHaveURL('/collection/gof-design-patterns');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('GoF Design Patterns');
  });
}
