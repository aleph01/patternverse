import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('offers both reading paths and the problem-first guide', async ({ page }, info) => {
  await page.goto('/collection/statistics-field-guide');
  await expect(
    page.getByRole('heading', { name: 'Statistics Field Guide', exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Start Here: Statistical Reasoning/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Analyst Path: Design, Models, and Causality/ }).first(),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('statistics-guide.png') });
});

test('opens populated nested statistics indexes in the phone library', async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, 'The accordion is the phone library navigation.');
  await page.goto('/library?verse=commons%3Astatistics');
  const guide = page.getByRole('button', { name: 'Statistics Field Guide 8 collections' });
  await expect(guide).toBeVisible();
  if ((await guide.getAttribute('aria-expanded')) !== 'true') await guide.click();
  const contents = page.getByRole('region', { name: 'Statistics Field Guide collections' });
  await expect(contents.getByRole('link')).toHaveCount(8);
  await page.screenshot({ path: info.outputPath('statistics-populated-guide.png') });
  await contents.getByRole('link', { name: /Start Here: Statistical Reasoning/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Start Here: Statistical Reasoning', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Collection entries' }).getByRole('link'),
  ).toHaveCount(12);
});

const examples = [
  ['stats-base-rates', 'Base rates and positive results', '15.38%'],
  ['stats-report-uncertainty', 'Binomial uncertainty explorer', '5.52% to 17.44%'],
  ['stats-bound-rare-events', 'Zero-event upper bound', '2.9513%'],
  ['stats-partial-pooling', 'Partial pooling explorer', 'pooled estimate 0.83'],
  ['stats-show-distribution', 'Mean and median explorer', 'mean 13.64'],
  ['stats-separate-within-between', 'Group composition explorer', 'Raw A 36.00% versus B 74.00%'],
  [
    'stats-difference-in-differences',
    'Difference-in-differences explorer',
    'difference-in-differences 7.00',
  ],
  ['stats-factorial-interactions', 'Factorial interaction explorer', 'Interaction contrast 15.00'],
  ['stats-account-for-search', 'Multiple-testing explorer', '64.15%'],
] as const;

test('loads every example through the real sandbox without horizontal overflow', async ({
  page,
}, info) => {
  for (const [id, title, answer] of examples) {
    await page.goto(`/pattern/${id}`);
    const preview = page.locator('.content-diagram img').first();
    await expect(preview).toBeVisible();
    await preview.scrollIntoViewIfNeeded();
    await expect
      .poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    expect(
      await preview
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Run example', exact: true }).click();
    const host = page.frameLocator(`iframe[title="${title}"]`);
    const example = host.frameLocator('iframe');
    await expect(example.locator('output')).toContainText(answer);
    const chartLabelSize = await example.locator('svg').evaluate((svg) => {
      const chart = svg as SVGSVGElement;
      return (14 * chart.getBoundingClientRect().width) / chart.viewBox.baseVal.width;
    });
    expect(chartLabelSize).toBeGreaterThanOrEqual(12);
    expect(
      await example
        .locator('body')
        .evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (id === 'stats-partial-pooling') {
      await example.getByRole('spinbutton', { name: 'Observations in the group' }).fill('100');
      await expect(example.locator('output')).toContainText('pooled estimate 5.65');
      await example.getByRole('button', { name: 'Reset inputs' }).click();
      await expect(example.locator('output')).toContainText('pooled estimate 0.83');
      await page
        .locator(`iframe[title="${title}"]`)
        .screenshot({ path: info.outputPath('partial-pooling-example.png') });
    }
    if (id === 'stats-account-for-search') {
      await expect(example.locator('svg')).not.toContainText('Simulated');
      await example.getByRole('button', { name: 'Simulate 1,000 experiments' }).click();
      await expect(example.locator('output')).toContainText('1,000 experiments');
      await expect(example.locator('svg')).toContainText('Simulated');
      await example
        .getByRole('spinbutton', { name: 'Independent null tests per experiment' })
        .fill('1');
      await expect(example.locator('output')).toContainText('No simulations yet');
      await expect(example.locator('svg')).not.toContainText('Simulated');
    }
    if (id === 'stats-base-rates')
      await page
        .locator(`iframe[title="${title}"]`)
        .screenshot({ path: info.outputPath('base-rates-example.png') });
    await page.getByRole('button', { name: 'Reset example', exact: true }).click();
    await expect(example.locator('output')).toContainText(answer);
  }
});

test('shows five illustrated worked cases without running an example', async ({
  page,
  isMobile,
}, info) => {
  const figures = [
    ['stats-draw-causal-model', 'causal-roles'],
    ['stats-paired-comparisons', 'paired-changes'],
    ['stats-handle-censoring', 'censored-follow-up'],
    ['stats-forecast-intervals', 'forecast-bands'],
    ['stats-combine-studies', 'evidence-forest'],
  ];
  for (const [id, asset] of figures) {
    await page.goto(`/pattern/${id}`);
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${asset}.png`) });
  }
});

test('offers statistics articles without interactive practice links', async ({ page }) => {
  for (const [id, title] of [
    ['stats-define-target', 'Define the Quantity You Want to Estimate'],
    ['stats-report-uncertainty', 'Report the Effect with Its Uncertainty'],
  ]) {
    await page.goto(`/pattern/${id}`);
    await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /try this practice/i })).toHaveCount(0);
    await expect(page.locator(`a[href="/pattern/${id}/run"]`)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Guided application', exact: true }),
    ).toHaveCount(0);
  }
});

test('reads four new patterns and three expanded illustrated cases', async ({
  page,
  isMobile,
}, info) => {
  const articles = [
    ['stats-update-beliefs', 'belief-update', '71.4%'],
    ['stats-plan-precision', 'precision-plan', '62 complete observations'],
    ['stats-check-model', 'model-mismatch', '2.45'],
    ['stats-practical-equivalence', 'equivalence-bounds', '90% confidence interval'],
    ['stats-validate-forward', 'validation-boundaries', '20.0'],
    ['stats-measurement-error', 'measurement-processes', '0.31 grams'],
    ['stats-sample-target', 'sampling-composition', '3.3'],
  ];
  for (const [id, asset, answer] of articles) {
    await page.goto(`/pattern/${id}`);
    await expect(page.locator('.entity-article')).toContainText(answer);
    for (const table of await page.locator('.entity-article table').all()) {
      expect(
        await table.evaluate(
          (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${asset}.png`) });
  }
  await page.goto('/collection/statistics-probability');
  await page
    .getByRole('link', { name: /Update Beliefs with Evidence/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pattern\/stats-update-beliefs/);
});

test('reads assignment, validity, resampling, monitoring and three diagnostic examples', async ({
  page,
  isMobile,
}, info) => {
  const articles = [
    ['stats-measurement-validity', 'measure-claim', '25-point improvement'],
    ['stats-resample-units', 'resample-units', '4.71'],
    ['stats-monitor-baseline', 'stable-baseline', '94 and 106 grams'],
    ['stats-choose-assignment-unit', 'assignment-units', '20 randomized branches'],
    ['stats-missingness', 'missingness-sensitivity', 'm = 55'],
    ['stats-hidden-structure', 'structure-scaling', '99.99%'],
    ['stats-test-simulation', 'simulation-coverage', '67.35%'],
  ];
  for (const [id, asset, answer] of articles) {
    await page.goto(`/pattern/${id}`);
    await expect(page.locator('.entity-article')).toContainText(answer);
    for (const table of await page.locator('.entity-article table').all()) {
      expect(
        await table.evaluate(
          (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${asset}.png`) });
  }
  for (const [collection, title, id] of [
    [
      'statistics-measurement',
      'Check That the Measure Matches the Claim',
      'stats-measurement-validity',
    ],
    ['statistics-dependence', 'Resample Whole Units', 'stats-resample-units'],
    ['statistics-time', 'Monitor Against a Stable Baseline', 'stats-monitor-baseline'],
    ['statistics-design', 'Choose the Unit of Assignment', 'stats-choose-assignment-unit'],
  ]) {
    await page.goto(`/collection/${collection}`);
    await page
      .getByRole('link', { name: new RegExp(title) })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/pattern/${id}`));
  }
});

test('shows four causal-design figures with worked arithmetic and phone layouts', async ({
  page,
  isMobile,
}, info) => {
  const articles = [
    ['stats-align-time-zero', 'aligned-time-zero', '0 percentage points'],
    ['stats-check-overlap', 'comparable-support', '45 percentage points'],
    ['stats-regression-discontinuity', 'threshold-comparison', '6 points'],
    ['stats-synthetic-control', 'synthetic-trajectory', '9 index points'],
  ];
  for (const [id, asset, answer] of articles) {
    await page.goto(`/pattern/${id}`);
    await expect(page.locator('.entity-article')).toContainText(answer);
    for (const table of await page.locator('.entity-article table').all()) {
      expect(
        await table.evaluate(
          (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image.scrollIntoViewIfNeeded();
    await image
      .locator('..')
      .locator('..')
      .screenshot({ path: info.outputPath(`${asset}.png`) });
  }
});

test('shows effects, outcome models, regularization and blocking with phone figures', async ({
  page,
  isMobile,
}, info) => {
  const articles = [
    [
      'stats-communicate-effects',
      'absolute-effects',
      '0.56 to 1.44 additional completions per 1,000',
    ],
    ['stats-match-outcome', 'outcome-support', '0.01 / 0.02 = 0.5'],
    ['stats-regularize', 'regularization-tradeoff', '2.8125'],
    ['stats-randomize-blocks', 'blocked-assignment', '0.41 points'],
  ];
  for (const [id, asset, answer] of articles) {
    await page.goto(`/pattern/${id}`);
    await expect(page.locator('.entity-article')).toContainText(answer);
    for (const table of await page.locator('.entity-article table').all()) {
      expect(
        await table.evaluate(
          (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image.scrollIntoViewIfNeeded();
    // Keep the phone's sticky contents menu out of full-height figure captures only.
    await image
      .locator('..')
      .locator('..')
      .screenshot({
        path: info.outputPath(`${asset}.png`),
        style: '.article-outline { visibility: hidden !important; }',
      });
  }
});

test('completes the illustrated guide with six worked cases and phone layouts', async ({
  page,
  isMobile,
}, info) => {
  const articles = [
    ['stats-define-target', 'defined-target', '5 percentage points'],
    ['stats-investigate-extremes', 'extremes-influence', '52.63%'],
    ['stats-challenge-causal-effect', 'causal-sensitivity', '5.04'],
    ['stats-confirm-fresh', 'fresh-confirmation', '64.15%'],
    ['stats-choose-consequences', 'decision-consequences', '1.90 units'],
    ['stats-instrumental-variables', 'instrument-pathways', '10 performance points'],
  ];
  for (const [id, asset, answer] of articles) {
    await page.goto(`/pattern/${id}`);
    await expect(page.locator('.entity-article')).toContainText(answer);
    for (const table of await page.locator('.entity-article table').all()) {
      expect(
        await table.evaluate(
          (el) => el.getBoundingClientRect().width <= el.parentElement!.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const image = page.locator(`img[src="/assets/statistics/${asset}.svg"]`);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBe(isMobile ? 360 : 720);
    expect(
      await image
        .locator('..')
        .locator('..')
        .locator('..')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await image
      .locator('..')
      .locator('..')
      .screenshot({
        path: info.outputPath(`${asset}.png`),
        style: '.article-outline { visibility: hidden !important; }',
      });
  }
});

test('keeps labels inside all 84 authored statistics illustrations', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Both SVG layouts are checked once at their authored dimensions.');
  const metadata = JSON.parse(
    readFileSync(
      new URL('../../../docs/pattern-packages/statistics.json', import.meta.url),
      'utf8',
    ),
  ) as { patterns: { visual: { asset: string; preview_asset?: string } }[] };
  for (const { visual } of metadata.patterns) {
    const asset = visual.asset.endsWith('.svg') ? visual.asset : visual.preview_asset!;
    for (const name of [asset, asset.replace('.svg', '-mobile.svg')]) {
      await page.goto(`/assets/${name}`);
      const clipped = await page.locator('svg').evaluate((svg) => {
        const frame = svg.getBoundingClientRect();
        return [...svg.querySelectorAll('text')].flatMap((text) => {
          const box = text.getBoundingClientRect();
          return box.left < frame.left - 1 ||
            box.right > frame.right + 1 ||
            box.top < frame.top - 1 ||
            box.bottom > frame.bottom + 1
            ? [text.textContent]
            : [];
        });
      });
      expect(clipped, name).toEqual([]);
    }
  }
});
