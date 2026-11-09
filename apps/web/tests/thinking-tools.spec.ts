import { expect, test, type Page, type Locator } from '@playwright/test';

async function fillForm(form: Locator, number = '3') {
  for (const field of await form.getByRole('textbox').all())
    await field.fill('A concrete observation, a competing explanation, and a bounded next check.');
  for (const field of await form.getByRole('spinbutton').all()) await field.fill(number);
  for (const group of await form.locator('fieldset.choice-input').all())
    await group.getByRole('radio').first().check();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
const activeForm = (page: Page) =>
  page
    .locator('.pattern-form')
    .filter({ has: page.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }) });

for (const id of [
  'decision-matrix',
  'impact-effort-matrix',
  'zwicky-box',
  'connection-circles',
  'cynefin-framework',
  'ooda-loop',
]) {
  test(`${id} runs through actual forms and method-specific displays`, async ({ page }, info) => {
    await page.goto(`/pattern/${id}/run`);
    await expect(activeForm(page)).toBeVisible();
    let steps = 0;
    while ((await page.locator('#pattern-run-complete').count()) === 0 && steps++ < 35) {
      await expect
        .poll(
          async () =>
            (await page.locator('.worksheet-step.current').count()) +
            (await page.locator('#pattern-run-complete').count()),
        )
        .toBeGreaterThan(0);
      if (await page.locator('#pattern-run-complete').count()) break;
      const current = page.locator('.worksheet-step.current');
      const stepId = await current.getAttribute('id');
      const form = activeForm(page);
      if (await form.count()) {
        await fillForm(form);
        if (id === 'impact-effort-matrix' && (await form.getByRole('spinbutton').count())) {
          const field = form.getByRole('spinbutton').first();
          await field.fill('6');
          await form
            .getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true })
            .click();
          await expect(form.getByRole('alert')).toBeVisible();
          await expect(form.getByRole('textbox').first()).not.toHaveValue('');
          await field.fill('3');
          await noOverflow(page);
          await form.screenshot({ path: info.outputPath('mixed-initiative-form.png') });
        }
        await form.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
      } else if (await page.locator('.pattern-run-ranking').count()) {
        await expect(page.locator('.pattern-run-ranking li')).toHaveCount(1);
        await noOverflow(page);
        await page.getByRole('button', { name: /^(?:Next step|Continue) ↓$/, exact: true }).click();
      } else {
        await page.getByRole('button', { name: /^Finish/ }).click();
      }
      await expect
        .poll(async () =>
          page.locator('.worksheet-step.current').evaluateAll((nodes) => nodes[0]?.id ?? null),
        )
        .not.toBe(stepId);
      await noOverflow(page);
    }
    await expect(page.locator('#pattern-run-complete')).toBeVisible();
    await expect(
      page
        .getByText('A concrete observation, a competing explanation, and a bounded next check.', {
          exact: true,
        })
        .first(),
    ).toBeVisible();
    if (id === 'decision-matrix')
      await expect(page.getByText(/With revised weights:/).first()).toBeVisible();
    if (id === 'impact-effort-matrix') {
      if (info.project.name === 'mobile') await expect(page.locator('.show-graphic')).toBeHidden();
      else await expect(page.locator('.show-graphic')).toBeVisible();
      await expect(page.locator('.show-items')).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath(`${id}-complete.png`) });
  });
}

test('article figures remain readable in a contained scroll region', async ({ page }, info) => {
  for (const id of [
    'ishikawa-diagram',
    'iceberg-model',
    'decision-matrix',
    'connection-circles',
    'ladder-of-inference',
    'conflict-resolution-diagram',
    'zwicky-box',
    'ooda-loop',
    'minto-pyramid',
    'concept-mapping',
    'balancing-feedback-loops',
  ]) {
    await page.goto(`/pattern/${id}`);
    const figure = page.locator('figure.content-diagram');
    await expect(figure).toBeVisible();
    const image = figure.getByRole('img');
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(
      0,
    );
    await noOverflow(page);
    await figure.screenshot({ path: info.outputPath(`${id}-figure.png`) });
  }
});
