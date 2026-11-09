import { expect, test } from '@playwright/test';

test('reads the Meta Model overview, question types and graphics from NLP', async ({ page }) => {
  await page.goto('/collection/neuro-linguistic-programming');
  await expect(
    page.getByRole('heading', { level: 1, name: 'NLP: Sleight of Mouth', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('region', { name: 'Collection entries', exact: true })
    .getByRole('link', { name: /The Meta Model/ })
    .click();
  const article = page.getByRole('article', { name: 'The Meta Model article' });
  await expect(
    article.getByRole('heading', { name: 'Overview: the three broad categories' }),
  ).toBeVisible();
  for (const heading of [
    'Deletions: something is left out',
    'Generalizations: a pattern becomes a rule',
    'Distortions: a connection shapes the meaning',
    '13. Surface the built-in assumption',
  ])
    await expect(article.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(article.locator('figure')).toHaveCount(4);
  for (const image of await article.locator('figure img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
    if (test.info().project.name === 'mobile-chromium')
      expect(await image.evaluate((img) => (img as HTMLImageElement).currentSrc)).toContain(
        '-mobile.svg',
      );
  }
  await expect(
    article.locator('a[href*="meta-model-guide.pdf"], iframe, embed, object'),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('opens the native self-guided practice from the article', async ({ page }) => {
  await page.goto('/pattern/meta-model');
  await page
    .getByRole('navigation', { name: 'Pattern shortcuts' })
    .getByRole('link', { name: 'Try this pattern yourself' })
    .click();
  await expect(page).toHaveURL(/\/pattern\/meta-model\/run$/);
  await expect(
    page.getByRole('heading', { name: 'Write one sentence as it occurs to you' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your response' })
    .fill('They always reject my suggestions.');
  await page.getByRole('button', { name: /Next step/ }).click();
  await expect(
    page.getByRole('heading', { name: 'What matters to you in this situation?' }),
  ).toBeVisible();
  await expect(page.getByText(/I want my input to be heard/)).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your response' })
    .fill('My last suggestion received no reply.');
  await page.getByRole('button', { name: /Next step/ }).click();
  await expect(
    page.getByText('What would you like to understand better?', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'The details — who, what, or how?', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: "A rule or limit — always, never, can't, or must?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'My interpretation — what does it mean, and what supports it?',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: "A rule or limit — always, never, can't, or must?",
      exact: true,
    })
    .click();
  await expect(
    page.getByText('Pick one question about the rule or limit', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'In which situations does this happen, and are any different?',
      exact: true,
    })
    .click();
  for (const answer of [
    'Jo passed over one suggestion in the weekly meeting.',
    'One suggestion received no response; I do not know why.',
  ]) {
    await page.getByRole('textbox', { name: 'Your response' }).fill(answer);
    await page.getByRole('button', { name: /Next step/ }).click();
  }
  await page
    .getByRole('button', { name: 'Finish without choosing an action.', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('offers a short interpretation question list and carries the choice into the answer', async ({
  page,
}) => {
  await page.goto('/pattern/meta-model/run');
  for (const answer of [
    "They rejected my idea, so they don't respect me.",
    'I want my suggestions to receive a thoughtful response.',
  ]) {
    await page.getByRole('textbox', { name: 'Your response' }).fill(answer);
    await page.getByRole('button', { name: /Next step/ }).click();
  }
  await page
    .getByRole('button', {
      name: 'My interpretation — what does it mean, and what supports it?',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Pick one question about your interpretation' }),
  ).toBeVisible();
  for (const question of [
    'What did I observe, and what am I assuming it means?',
    'How does one thing lead to the other in this situation?',
    'What would this word or judgment look like in concrete actions?',
    'Write my own question.',
  ])
    await expect(page.getByRole('button', { name: question, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('button', {
      name: 'What did I observe, and what am I assuming it means?',
      exact: true,
    })
    .click();
  await expect(page.getByRole('heading', { name: 'Answer from a concrete example' })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Answer from a concrete example', exact: true })
      .getByText('Your question: What did I observe, and what am I assuming it means?'),
  ).toBeVisible();
  for (const answer of [
    'Jo said the proposal was too expensive. I inferred a lack of respect.',
    "Jo rejected this proposal on cost grounds; I don't know what Jo thinks of me.",
  ]) {
    await page.getByRole('textbox', { name: 'Your response' }).fill(answer);
    await page.getByRole('button', { name: /Next step/ }).click();
  }
  await page
    .getByRole('button', { name: 'Finish without choosing an action.', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'A moment to review.' })).toBeVisible();
  await expect(
    page.getByText('I want my suggestions to receive a thoughtful response.', { exact: true }),
  ).toBeVisible();
});
