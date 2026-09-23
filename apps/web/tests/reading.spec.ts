import { expect, test } from '@playwright/test';

test('renders a Pattern with resolved links and derived relationships', async ({ page }) => {
  await page.goto('/pattern/creative-reframing');

  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  await expect(page.locator('article a[href="/practice/five-alternative-frames"]')).toHaveText(
    'Five Alternative Frames',
  );
  await expect(page.getByRole('heading', { level: 2, name: 'Practices' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Appears in' })).toBeVisible();
});

test('highlights Verse links without underlining them', async ({ page }) => {
  await page.goto('/concept/working-memory');

  const learning = page.getByRole('navigation', { name: 'Verses' }).getByRole('link', {
    name: 'Learning',
  });
  await learning.hover();
  await expect(learning).toHaveCSS('text-decoration-line', 'none');
  await expect(learning).toHaveCSS('background-color', 'rgb(24, 24, 20)');
});

test('preserves authored Collection order', async ({ page }) => {
  await page.goto('/collection/getting-unstuck');

  await expect(page.getByRole('heading', { level: 1, name: 'Getting Unstuck' })).toBeVisible();
  const titles = await page
    .locator('section[aria-labelledby="collection-items-heading"] .entity-copy h3')
    .allTextContents();
  expect(titles).toEqual([
    'Reduce the First Step',
    'Creative Reframing',
    'Five Alternative Frames',
  ]);
  await expect(page.locator('.personal-state')).toHaveCount(0);
});

test('presents a Verse as an authored domain page with grouped members', async ({ page }) => {
  await page.goto('/verse/creativity');

  await expect(page.getByRole('heading', { level: 1, name: 'Creativity' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Patterns' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Practices' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Collections' })).toBeVisible();
  await expect(page.locator('.personal-state')).toHaveCount(0);
});

test('orders Verse collections first and keeps member groups collapsed initially', async ({
  page,
}) => {
  await page.goto('/verse/therapy');

  const groups = page.locator('.verse-groups .primary-relationship');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0).getByRole('heading', { level: 2 })).toHaveText('Collections');
  await expect(groups.nth(1).getByRole('heading', { level: 2 })).toHaveText('Patterns');
  await expect(groups.locator('details[open]')).toHaveCount(0);
});

test('keeps structured Practice YAML out of the reading article', async ({ page }) => {
  await page.goto('/practice/five-alternative-frames');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Five Alternative Frames' }),
  ).toBeVisible();
  await expect(
    page.getByText('This article includes a declarative interactive Practice.'),
  ).toBeVisible();
  await expect(page.locator('article')).not.toContainText('steps:');
  await expect(page.locator('.personal-state')).toHaveCount(0);
});

test('offers an embedded Practice only on Patterns that define one', async ({ page }) => {
  await page.goto('/pattern/worry-exposure');

  await expect(page.getByRole('heading', { level: 1, name: 'Worry Exposure' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try this practice' })).toHaveAttribute(
    'href',
    '/pattern/worry-exposure/practice',
  );
  await expect(page.getByRole('link', { name: 'Begin Practice' })).toHaveAttribute(
    'href',
    '/pattern/worry-exposure/practice',
  );
  await expect(page.locator('article')).not.toContainText('defaultDurationSeconds');

  await page.goto('/pattern/reduce-the-first-step');
  await expect(page.getByRole('link', { name: 'Try this practice' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Begin Practice' })).toHaveCount(0);
});

test('renders the embedded Practice on a stable route', async ({ page }) => {
  await page.goto('/pattern/worry-exposure/practice');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Worry Exposure Practice' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Choose a worry' })).toBeVisible();
  await expect(page.getByText('Choose one recurring worry to work with.')).toBeVisible();
});
