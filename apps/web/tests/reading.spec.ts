import { expect, test } from '@playwright/test';

test('renders a Pattern with resolved links and derived relationships', async ({ page }) => {
  await page.goto('/pattern/creative-reframing');

  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  await expect(page.locator('article a[href="/practice/five-alternative-frames"]')).toHaveText(
    'Five Alternative Frames',
  );
  await expect(page.getByRole('heading', { level: 2, name: 'Practices' })).toBeVisible();
  const appearsInHeading = page.getByRole('heading', { level: 2, name: 'Appears in' });
  await expect(appearsInHeading).toBeVisible();
  await expect(appearsInHeading).toHaveCSS('font-size', '16px');
  await expect(
    page.getByRole('heading', { level: 2, name: 'was this useful for you?' }),
  ).toBeVisible();
  await expect(page.locator('.entity-meta-panel')).toBeVisible();
  const compactSummaries = page.locator('.entity-meta-panel .entity-list.compact .entity-copy p');
  await expect(compactSummaries).toHaveCount(3);
  await expect(compactSummaries.first()).toBeHidden();
});

test('highlights Verse links without underlining them', async ({ page }) => {
  await page.goto('/concept/working-memory');

  await expect(page.getByRole('heading', { level: 2, name: 'Linked by' })).toBeVisible();
  const learning = page.getByRole('navigation', { name: 'Verses' }).getByRole('link', {
    name: 'Learning',
  });
  await learning.hover();
  await expect(learning).toHaveCSS('text-decoration-line', 'none');
  await expect(learning).toHaveCSS('background-color', 'rgb(24, 24, 20)');
});

test('preserves authored Collection order', async ({ page }) => {
  await page.goto('/collection/getting-unstuck');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Find New Possibilities' }),
  ).toBeVisible();
  const titles = await page
    .locator('section[aria-labelledby="collection-items-heading"] .feed-copy h3')
    .allTextContents();
  expect(titles).toEqual([
    'Five Alternative Frames',
    'Look Outside the Frame',
    'Escape Your Hammer',
    'Find Hidden Properties',
    'Break a False Trade-Off',
    'Find Alternative Paths',
    'Generate Real Options',
    'Validate the Frame',
    'Reduce the First Step',
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

test('orders Verse collections first and expands only collections initially', async ({ page }) => {
  await page.goto('/verse/therapy');

  const groups = page.locator('.verse-groups .primary-relationship');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0).getByRole('heading', { level: 2 })).toHaveText('Collections');
  await expect(groups.nth(1).getByRole('heading', { level: 2 })).toHaveText('Patterns');
  await expect(groups.nth(0).locator('details')).toHaveAttribute('open', '');
  await expect(groups.nth(1).locator('details')).not.toHaveAttribute('open', '');
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

test('offers embedded Practice on a Pattern that defines one', async ({ page }) => {
  await page.goto('/pattern/reduce-the-first-step');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Reduce the First Step' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try this pattern', exact: true })).toHaveAttribute(
    'href',
    '/pattern/reduce-the-first-step/run',
  );
  await expect(page.locator('article')).not.toContainText('steps:');
});

test('renders the embedded Practice on a stable route', async ({ page }) => {
  await page.goto('/pattern/reduce-the-first-step/practice');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Reduce the First Step' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Name the task' })).toBeVisible();
  await expect(page.getByLabel('What are you finding hard to start?')).toBeVisible();
});

test('shows exactly the ten curated CBT patterns', async ({ page }) => {
  await page.goto('/collection/cbt');
  const titles = await page
    .locator('section[aria-labelledby="collection-items-heading"] .feed-copy h3')
    .allTextContents();
  expect(titles).toEqual([
    'Thought Record / Cognitive Restructuring',
    'Behavioral Activation',
    'Exposure',
    'Behavioral Experiment',
    'Problem Solving',
    'Identify Cognitive Distortions',
    'Downward Arrow',
    'Worry Time / Stimulus Control for Worry',
    'Activity–Mood Monitoring',
    'Graded Task Assignment',
  ]);
  await expect(
    page.getByRole('link', { name: /Acceptance and Commitment|Therapy techniques/ }),
  ).toHaveCount(0);
});
