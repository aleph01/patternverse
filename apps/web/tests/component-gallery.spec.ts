import { expect, test } from '@playwright/test';

test('renders and edits mapping, grouping, ordering, relationships, and split views', async ({
  page,
}, testInfo) => {
  await page.goto('/about/pattern-language/components#show/map');
  await expect(
    page.getByRole('heading', { name: 'Data visualization & display', exact: true }),
  ).toBeVisible();
  const mapping = page.locator('[data-example="show-mapping.pattern.md"]');
  await mapping.scrollIntoViewIfNeeded();
  const plotted = mapping.getByRole('region', { name: 'Show ideas', exact: true });
  await expect(plotted.locator('.show-item-label')).toHaveText([
    'Take a pause',
    'Ask for help',
    'Take a walk',
  ]);
  const point = plotted.locator('circle').first();
  const originalY = await point.getAttribute('cy');
  if (testInfo.project.name === 'desktop') await expect(plotted.getByRole('img')).toBeVisible();
  await mapping.getByRole('button', { name: 'Edit show-mapping.pattern.md' }).click();
  const source = mapping.getByLabel('Edit show-mapping.pattern.md source');
  await source.fill((await source.inputValue()).replace('impact: 3', 'impact: 6'));
  await mapping.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(plotted.locator('dd').filter({ hasText: /^6$/ })).toBeVisible();
  await expect(point).not.toHaveAttribute('cy', originalY!);

  await page.getByLabel('Example variant').selectOption('group');
  const grouped = page.locator('[data-example="show-grouping.pattern.md"]');
  await expect(grouped.getByRole('heading', { name: 'category: Rest', exact: true })).toBeVisible();
  await expect(
    grouped.getByRole('heading', { name: 'category: Support', exact: true }),
  ).toBeVisible();
  await expect(grouped.locator('.show-items').first().locator('.show-item-label')).toHaveText([
    'Take a pause',
    'Take a walk',
  ]);

  await page.getByLabel('Example variant').selectOption('order');
  const ordered = page.locator('[data-example="show-ordering.pattern.md"]');
  await expect(ordered.locator('.show-item-label')).toHaveText([
    'Ask for help',
    'Take a walk',
    'Take a pause',
  ]);

  await page.getByLabel('Example variant').selectOption('relationships');
  const relationships = page.locator('[data-example="relationships.pattern.md"]');
  await expect(relationships.locator('.show-relations')).toContainText('Notice → Explore');
  await expect(relationships.locator('.show-relations')).toContainText('Explore → Try');

  await page.getByLabel('Example variant').selectOption('split');
  const split = page.locator('[data-example="show-split-views.pattern.md"]');
  await expect(
    split.getByRole('heading', { name: 'scenario: Expected', exact: true }),
  ).toBeVisible();
  await expect(
    split.getByRole('heading', { name: 'scenario: Optimistic', exact: true }),
  ).toBeVisible();
  await expect(split.locator('.show-dimensions')).toHaveText([
    'effort: 1–3 × impact: 3–6',
    'effort: 1–3 × impact: 3–6',
  ]);
  await expect(split.locator('.show-item-label')).toHaveCount(6);
  await expect(split.locator('.show-warning')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('opens the gallery, browses components, and restores a linked variant', async ({ page }) => {
  await page.goto('/about/pattern-language');
  await page
    .getByRole('navigation', { name: 'Pattern Language documentation' })
    .getByRole('link', { name: 'Components', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Components', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Component index' })
    .getByRole('link', { name: 'Countdown timer' })
    .click();
  await expect(page.getByRole('heading', { name: 'Countdown timer', exact: true })).toBeVisible();
  await page.getByLabel('Example variant').selectOption('adjustable');
  await expect(page).toHaveURL(/#timer\/adjustable$/);
  const parameters = page.getByRole('table', { name: 'Component parameters', exact: true });
  await expect(parameters.getByRole('row', { name: /^:duration/ })).toContainText('Required');
  await expect(parameters.getByRole('row', { name: /^:adjustable/ })).toContainText('false');
  await page.reload();
  await expect(page.getByLabel('Example variant')).toHaveValue('adjustable');
  await page.locator('[data-example="adjustable-timer.pattern.md"]').scrollIntoViewIfNeeded();
  await expect(
    page
      .locator('[data-example="adjustable-timer.pattern.md"]')
      .getByRole('button', { name: 'Restart' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Next component', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Grouped form', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Previous component', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Countdown timer', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('searches parameter names, filters categories, and recovers from no results', async ({
  page,
}) => {
  await page.goto('/about/pattern-language/components');
  await page.getByLabel('Search components').fill('initial_view');
  await expect(page.getByRole('heading', { name: 'Extension widget', exact: true })).toBeVisible();
  await page.getByLabel('Example variant').selectOption('needs');
  await expect(
    page.getByRole('table', { name: 'Component parameters', exact: true }),
  ).toContainText(':with initial_view');
  await page.getByLabel('Category', { exact: true }).selectOption('Questions & choices');
  await expect(
    page.getByRole('heading', { name: 'No components match', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Search components').fill('blocking');
  await expect(page.getByRole('heading', { name: 'Countdown timer', exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Component index' }).getByRole('link'),
  ).toHaveCount(1);
});

test('runs a bundled widget and its checklist fallback without installing a package', async ({
  page,
}) => {
  await page.goto('/about/pattern-language/components#widget/reflection');
  const widget = page.locator('[data-example="widget-reflection.pattern.md"]');
  await widget.scrollIntoViewIfNeeded();
  const frame = widget.frameLocator('iframe').frameLocator('iframe');
  await frame.getByLabel('Reflection', { exact: true }).fill('A sample note');
  await frame.getByLabel('Energy', { exact: true }).press('ArrowRight');
  await widget.getByRole('button', { name: 'Confirm example →' }).click();
  await expect(widget.locator('.live-result')).toContainText('Note: A sample note');
  await expect(widget.locator('.live-result')).toContainText('Energy: 6');
  await page.getByLabel('Example variant').selectOption('choice-tags');
  const choices = page.locator('[data-example="widget-choice-tags.pattern.md"]');
  await choices.getByRole('button', { name: 'Use a plain checklist' }).click();
  await choices.getByRole('checkbox', { name: 'First option' }).check();
  await choices.getByRole('button', { name: 'Confirm example →' }).click();
  await expect(choices.locator('.live-result')).toContainText('First option');
  await expect(choices.getByRole('alert')).toHaveCount(0);
});

test('switches candidate-suggestion variants and uses a checked sample reply', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4237')) externalRequests.push(request.url());
  });
  await page.goto('/about/pattern-language/components#suggest/filter');
  await expect(page.getByLabel('Example variant')).toHaveValue('filter');
  const widget = page.locator('[data-example="suggest-filter.pattern.md"]');
  await widget.scrollIntoViewIfNeeded();
  await widget.getByRole('button', { name: 'Use sample filter' }).click();
  const shown = widget.getByRole('region', { name: 'Show suggestion.items' });
  await expect(shown).toContainText('Ask for help');
  await expect(shown).not.toContainText('Take a pause');
  expect(externalRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
