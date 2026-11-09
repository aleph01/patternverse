import { expect, test } from '@playwright/test';
import { selectLibraryCategory } from './helpers/library';

const groups = [
  ['inputs-and-features', 8, 'ml-reframing'],
  ['learning-and-adaptation', 10, 'ml-active-learning'],
  ['evaluation-and-uncertainty', 8, 'ml-heuristic-benchmark'],
  ['training-and-deployment', 10, 'ml-schema-based-data-validation'],
  ['monitoring-and-robustness', 5, 'ml-continuous-model-evaluation'],
  ['decisions-and-feedback', 4, 'ml-decision-focused-learning'],
  ['generative-systems', 4, 'ml-few-shot-in-context-learning'],
  ['privacy-and-governance', 4, 'ml-federated-learning'],
] as const;

test('browses focused ML collections from the verse and preserves article context', async ({
  page,
  isMobile,
}) => {
  await page.goto('/library?verse=commons%3Amachine-learning');
  await selectLibraryCategory(page, 'Collections');
  const results = page.getByRole('region', { name: 'Library results', exact: true });
  await expect(results.getByText('Machine Learning Field Guide', { exact: true })).toHaveCount(0);
  if (isMobile) await expect(results.locator('.collection-toggle')).toHaveCount(8);
  else await expect(results.locator('a[href^="/collection/"]')).toHaveCount(8);
  for (const [slug] of groups) {
    await expect(
      isMobile
        ? results.getByRole('button', { name: new RegExp(`^${slug.replaceAll('-', ' ')}`, 'i') })
        : results.locator(`a[href^="/collection/machine-learning-${slug}"]`).first(),
    ).toBeVisible();
  }
  if (isMobile) await results.getByRole('button', { name: /^Inputs and features/ }).click();
  else
    await results
      .locator('a[href^="/collection/machine-learning-inputs-and-features"]')
      .first()
      .click();
  const entries = isMobile
    ? results.getByRole('region', { name: 'Inputs and features patterns', exact: true })
    : page.getByRole('dialog', { name: 'Inputs and features', exact: true });
  await expect(entries.locator('a[href^="/pattern/ml-reframing"]')).toBeVisible();
  await entries.locator('a[href^="/pattern/ml-reframing"]').click();
  await expect(page).toHaveURL(/collection=commons%3Amachine-learning-inputs-and-features/);
  await expect(
    page.getByRole('button', {
      name: isMobile ? /Browse Inputs and features/ : 'Inputs and features',
      exact: !isMobile,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('makes every focused collection navigable directly', async ({ page }) => {
  for (const [slug, count, first] of groups) {
    const id = `machine-learning-${slug}`;
    await page.goto(`/collection/${id}`);
    const entries = page.getByRole('region', { name: 'Collection entries', exact: true });
    await expect(entries.getByRole('link')).toHaveCount(count);
    const links = await entries
      .getByRole('link')
      .evaluateAll((elements) => elements.map((el) => el.getAttribute('href')));
    expect(links[0]).toContain(`/pattern/${first}?`);
    expect(links.every((href) => href?.includes(`collection=commons%3A${id}`))).toBe(true);
    expect(
      await page.locator('h1').evaluate((heading) => {
        const range = document.createRange();
        range.selectNodeContents(heading);
        const bounds = range.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth;
      }),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
