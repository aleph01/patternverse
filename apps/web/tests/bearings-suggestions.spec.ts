import { expect, test, type Page } from '@playwright/test';
import { addTextCell, fillField } from './bearings-helpers';

async function openExercise(page: Page, mobile: boolean, tree = false) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Creative work');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await addTextCell(
    page,
    'I want more room to create. A smaller project could help me explore this.',
  );
  if (mobile) await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await fillField(
    page.getByRole('searchbox', { name: 'Search patterns and ratings' }),
    'Define the Decision',
  );
  await page
    .getByRole('button', {
      name: 'Add pattern: Define the Decision Before Comparing Options',
      exact: true,
    })
    .click();
  if (mobile) await page.getByRole('button', { name: 'Close library', exact: true }).click();
  if (tree) await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a practice', exact: true }).click();
  await page
    .getByRole('button', { name: 'Define the Decision Before Comparing Options', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'How are you currently phrasing the decision?' })
    .fill('Should I change jobs?');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'What problem are you trying to solve?' }),
  ).toBeVisible();
}
async function connect(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/lib/mira/private-store.ts';
    const { createPrivateMiraStore } = await import(path);
    await createPrivateMiraStore().saveSettings({
      model: 'test/model',
      openRouterKey: 'test-only',
      promptOverrides: {},
      activeSessionId: null,
    });
  });
}
type Request = {
  fields: { id: string; answer: string }[];
  sources: { id: string; text: string }[];
  exercise: unknown;
};
function response(input: Request) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            suggestions: input.fields
              .filter((field) => !field.answer.trim())
              .map((field, index) => ({
                fieldId: field.id,
                text: `Draft ${index + 1}: make room for creative work.`,
                sourceIds: [input.sources[0]!.id],
              })),
          }),
        },
      },
    ],
  };
}

test('reviews, edits and undoes suggestions without overwriting existing or newly typed answers', async ({
  page,
}, info) => {
  await openExercise(page, info.project.name === 'mobile');
  await connect(page);
  const requests: Request[] = [];
  let release: (() => void) | undefined;
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.provider).toEqual({ zdr: true, data_collection: 'deny', allow_fallbacks: false });
    const input = JSON.parse(body.messages[1].content) as Request;
    requests.push(input);
    if (requests.length === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({ json: response(input) });
  });
  const problem = page.getByRole('textbox', { name: 'What problem are you trying to solve?' });
  const outcome = page.getByRole('textbox', { name: 'What would a good outcome give you?' });
  await problem.fill('Keep this answer exactly.');
  await page.getByRole('button', { name: 'Suggest from my notes', exact: true }).click();
  const draft = page.getByRole('textbox', { name: 'Edit suggested answer' });
  await expect(draft).toHaveValue(/Draft 1/);
  await expect(outcome).toHaveValue('');
  expect(requests[0]!.fields.some((field) => field.answer === 'Keep this answer exactly.')).toBe(
    true,
  );
  expect(JSON.stringify(requests[0]!.exercise)).toContain('Should I change jobs?');
  await page.locator('.suggestion summary').click();
  await expect(page.locator('.suggestion details')).toContainText('A smaller project');
  await draft.fill('Time for a smaller creative project.');
  await page.getByRole('button', { name: 'Use answer', exact: true }).click();
  await expect(outcome).toHaveValue('Time for a smaller creative project.');
  await expect(problem).toHaveValue('Keep this answer exactly.');
  await page.locator('.added').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(outcome).toHaveValue('');
  await page.getByRole('button', { name: 'Suggest from my notes', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  await outcome.fill('My own answer written while AI was working.');
  release!();
  await expect(
    page.getByRole('button', { name: 'Suggest from my notes', exact: true }),
  ).toBeVisible();
  await expect(draft).toHaveCount(0);
  await expect(outcome).toHaveValue('My own answer written while AI was working.');
  await outcome.fill('');
  await expect(draft).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page.getByRole('button', { name: 'Suggest from my notes', exact: true }).click();
  await expect(draft).toBeVisible();
  await page.getByRole('button', { name: 'Use answer', exact: true }).click();
  await outcome.fill('A later personal edit.');
  await expect(page.locator('.added')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'Creative work' }).click();
  await page.getByRole('button', { name: 'Continue practice', exact: true }).click();
  await expect(outcome).toHaveValue('A later personal edit.');
  await expect(problem).toHaveValue('Keep this answer exactly.');
});

test('supports bulk suggestions in tree exercises and handles disconnected, malformed and cancelled requests', async ({
  page,
}, info) => {
  await openExercise(page, info.project.name === 'mobile', true);
  const suggest = page.getByRole('button', { name: 'Suggest from my notes', exact: true });
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  const aiSettings = page.getByRole('dialog', { name: 'AI settings', exact: true });
  await aiSettings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  await expect(suggest).toBeDisabled();
  await aiSettings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  await aiSettings.getByRole('button', { name: 'Close AI settings', exact: true }).click();
  await suggest.click();
  await expect(page.getByRole('alert')).toContainText('Connect with OpenRouter');
  await connect(page);
  let count = 0;
  let release: (() => void) | undefined;
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    count++;
    if (count === 1)
      return route.fulfill({ json: { choices: [{ message: { content: 'invalid' } }] } });
    const input = JSON.parse(route.request().postDataJSON().messages[1].content) as Request;
    if (count === 2)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({ json: response(input) }).catch(() => {});
  });
  await suggest.click();
  await expect(page.getByRole('alert')).toContainText('invalid draft');
  await suggest.click();
  await expect.poll(() => count).toBe(2);
  await page.getByRole('button', { name: 'Cancel suggestions' }).click();
  release!();
  await expect(page.getByRole('textbox', { name: 'Edit suggested answer' })).toHaveCount(0);
  await suggest.click();
  await expect(page.getByRole('textbox', { name: 'Edit suggested answer' })).toHaveCount(2);
  await page
    .locator('.suggestion')
    .first()
    .screenshot({ path: `/private/tmp/bearings-suggestion-panel-${info.project.name}.png` });
  await page.screenshot({ path: `/private/tmp/bearings-suggestions-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Use 2 suggestions', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'What problem are you trying to solve?' }),
  ).toHaveValue(/Draft 1/);
  await expect(
    page.getByRole('textbox', { name: 'What would a good outcome give you?' }),
  ).toHaveValue(/Draft 2/);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Which constraints are genuinely fixed?' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Edit suggested answer' })).toHaveCount(0);
});
