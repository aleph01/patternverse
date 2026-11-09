import { expect, test } from '@playwright/test';

test('runs reduce with all callback forms and an explicit empty-list fallback', async ({
  page,
}) => {
  await page.goto('/about/pattern-language/functions#reduce/reduce-placeholders');
  const shorthand = page.locator('[data-example="reduce-placeholders.pattern.md"]');
  await shorthand.scrollIntoViewIfNeeded();
  await expect(shorthand.locator('.live-result')).toContainText('Result: 14');
  await page.getByLabel('Example variant').selectOption('reduce-named');
  await expect(page.locator('[data-example="reduce-named.pattern.md"] .live-result')).toContainText(
    'Result: 14',
  );
  await page.getByLabel('Example variant').selectOption('reduce-helper');
  await expect(
    page.locator('[data-example="reduce-helper.pattern.md"] .live-result'),
  ).toContainText('Result: 14');
  await page.getByLabel('Example variant').selectOption('reduce-empty');
  const empty = page.locator('[data-example="reduce-empty.pattern.md"]');
  await expect(empty.locator('.live-result')).toContainText('Result: 0');
  await empty.getByRole('button', { name: 'Edit reduce-empty.pattern.md' }).click();
  const source = empty.getByLabel('Edit reduce-empty.pattern.md source');
  await source.fill((await source.inputValue()).replace('= []', '= [5]'));
  await empty.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(empty.locator('.live-result')).toContainText('Result: 5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runs both lambda syntaxes and reports repeated placeholders as separate parameters', async ({
  page,
}) => {
  await page.goto('/about/pattern-language/functions#filter/filter-placeholders');
  const shorthand = page.locator('[data-example="filter-placeholders.pattern.md"]');
  await shorthand.scrollIntoViewIfNeeded();
  await expect(shorthand.locator('.live-result')).toContainText('Result: 8, 9');
  await page.getByLabel('Example variant').selectOption('filter-named');
  const named = page.locator('[data-example="filter-named.pattern.md"]');
  await expect(named.locator('.live-result')).toContainText('Result: 4, 8');
  await named.getByRole('button', { name: 'Edit filter-named.pattern.md' }).click();
  const source = named.getByLabel('Edit filter-named.pattern.md source');
  const original = await source.inputValue();
  await source.fill(original.replace('n => n >= 3 and n <= 8', '_ >= 3 and _ <= 8'));
  await named.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(named).toContainText('each _ is a separate parameter');
  await source.fill(original.replace('n >= 3', 'n >= 5'));
  await named.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(named.locator('.live-result')).toContainText('Result: 8');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runs nested lambda captures and both two-parameter fold syntaxes', async ({ page }) => {
  await page.goto('/about/pattern-language/functions#map/map-nested');
  const nested = page.locator('[data-example="map-nested.pattern.md"]');
  await nested.scrollIntoViewIfNeeded();
  await expect(nested.locator('.live-result')).toContainText('Result: 8, 7, 9');
  await page.goto('/about/pattern-language/functions#fold/fold-placeholders');
  const shorthand = page.locator('[data-example="fold-placeholders.pattern.md"]');
  await shorthand.scrollIntoViewIfNeeded();
  await expect(shorthand.locator('.live-result')).toContainText('Result: 14');
  await page.getByLabel('Example variant').selectOption('fold-named');
  await expect(page.locator('[data-example="fold-named.pattern.md"] .live-result')).toContainText(
    'Result: 14',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('opens the Functions tab, browses signatures, and restores an example variant', async ({
  page,
}) => {
  await page.goto('/about/pattern-language');
  await page
    .getByRole('navigation', { name: 'Pattern Language documentation' })
    .getByRole('link', { name: 'Functions', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Functions', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Function index' })
    .getByRole('link', { name: 'concat', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'concat', exact: true })).toBeVisible();
  await expect(page.locator('.signatures')).toContainText(
    'concat(left: list[T], right: list[T]) -> list[T]',
  );
  await page.getByLabel('Example variant').selectOption('concat-lists');
  await expect(page).toHaveURL(/#concat\/concat-lists$/);
  await page.reload();
  await expect(page.getByLabel('Example variant')).toHaveValue('concat-lists');
  const example = page.locator('[data-example="concat-lists.pattern.md"]');
  await example.scrollIntoViewIfNeeded();
  await expect(example.locator('.live-result')).toContainText('Ask for help');
  await page.getByRole('link', { name: 'Next function', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'contains', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'concat', exact: true })).toBeVisible();
  await expect(page.getByLabel('Example variant')).toHaveValue('concat-lists');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'contains', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Function parameters', exact: true })).toContainText(
    'literal case-sensitive substring',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('searches parameters and return types, filters categories, and clears no results', async ({
  page,
}) => {
  await page.goto('/about/pattern-language/functions');
  await page.getByLabel('Search functions').fill('fold(items');
  await expect(page.getByRole('heading', { name: 'fold', exact: true })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Function index' }).getByRole('link'),
  ).toHaveCount(1);
  await page.getByLabel('Category', { exact: true }).selectOption('Text');
  await expect(
    page.getByRole('heading', { name: 'No functions match', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('Reference data');
  await page.getByLabel('Search functions').fill('Optional');
  await expect(page.getByRole('heading', { name: 'lookup', exact: true })).toBeVisible();
  await expect(page.locator('.signatures')).toContainText('Optional[R]');
});

test('runs optional list access and edits an absence fallback', async ({ page }) => {
  await page.goto('/about/pattern-language/functions#first/first-empty');
  const example = page.locator('[data-example="first-empty.pattern.md"]');
  await example.scrollIntoViewIfNeeded();
  await expect(example.locator('.live-result')).toContainText('No notes yet.');
  await expect(example.locator('.token-directive').filter({ hasText: /^\?\?$/ })).toBeVisible();
  await example.getByRole('button', { name: 'Edit first-empty.pattern.md' }).click();
  const source = example.getByLabel('Edit first-empty.pattern.md source');
  await source.fill((await source.inputValue()).replace('No notes yet.', 'Choose one small step.'));
  await example.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(example.locator('.live-result')).toContainText('Choose one small step.');
  await page.getByLabel('Example variant').selectOption('first-note');
  await expect(page.locator('[data-example="first-note.pattern.md"] .live-result')).toContainText(
    'Pause',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runs isolated reference data, including missing lookup IDs, and edited source', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4237')) external.push(request.url());
    if (request.url().includes('/library/data/')) external.push(request.url());
  });
  await page.goto('/about/pattern-language/functions#lookup/lookup-present');
  const present = page.locator('[data-example="lookup-present.pattern.md"]');
  await present.scrollIntoViewIfNeeded();
  await expect(present.locator('.live-result')).toContainText('Wood');
  await page.getByLabel('Example variant').selectOption('lookup-absent');
  const absent = page.locator('[data-example="lookup-absent.pattern.md"]');
  await expect(absent.locator('.live-result')).toContainText('No material found.');
  await absent.getByRole('button', { name: 'Edit lookup-absent.pattern.md' }).click();
  const source = absent.getByLabel('Edit lookup-absent.pattern.md source');
  await source.fill((await source.inputValue()).replace('"missing"', '"steel"'));
  await absent.getByRole('button', { name: 'Run changes', exact: true }).click();
  await expect(absent.locator('.live-result')).toContainText('Steel');
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
