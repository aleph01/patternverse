import { expect, test, type Page } from '@playwright/test';
import { expectFieldValue, fillField } from './bearings-helpers';

async function open(page: Page, tree = false, vim = false) {
  await page.route('https://openrouter.ai/api/v1/endpoints/zdr', (route) =>
    route.fulfill({
      json: {
        data: [
          { model_id: 'test/fast', model_name: 'Fast test model' },
          { model_id: 'test/careful', model_name: 'Careful test model' },
        ],
      },
    }),
  );
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  const id = await page.evaluate(
    async ({ tree, vim }) => {
      const path = '/src/lib/client/workspace.ts';
      const { getLocalWorkspace } = await import(path);
      const workspace = await getLocalWorkspace();
      const privatePath = '/src/lib/mira/private-store.ts';
      const { createPrivateMiraStore } = await import(privatePath);
      await createPrivateMiraStore().saveSettings({
        model: 'test/fast',
        openRouterKey: 'test-only',
        promptOverrides: {},
        activeSessionId: null,
      });
      localStorage.setItem('bearings-vim-mode', String(vim));
      localStorage.removeItem('bearings-ai-prompts-v1');
      localStorage.setItem(
        'bearings-ai-preferences-v1',
        JSON.stringify({ enabled: true, model: 'test/fast', style: 'Concise' }),
      );
      const situation = await workspace.createSituation('AI writing');
      await workspace.updateSituation(
        situation.id,
        {
          title: situation.title,
          context: '',
          notebook: {
            version: 1,
            chapters: [
              {
                id: 'chapter',
                title: 'Beginning',
                collapsed: false,
                cells: [
                  { id: 'root', kind: 'answer', text: 'I want more creative work.' },
                  {
                    id: 'child',
                    parentId: 'root',
                    kind: 'note',
                    text: 'I could try mentoring weekly.',
                  },
                  { id: 'target', parentId: 'root', kind: 'answer', text: '' },
                  { id: 'other', kind: 'answer', text: 'An unrelated branch about savings.' },
                ],
              },
            ],
            activeChapterId: 'chapter',
            draft: '',
            draftKind: 'answer',
            scrollTop: 0,
            view: tree ? 'tree' : 'notebook',
            activeCellId: 'target',
          },
        },
        situation.revision,
      );
      await workspace.createSituation('Do not send this other situation');
      return situation.id;
    },
    { tree, vim },
  );
  await page.goto(`/apps/bearings?preview=1&situation=${id}`);
  await expect(page.getByRole('region', { name: 'Situation notebook', exact: true })).toBeVisible();
  const close = page.getByRole('button', { name: 'Collapse library', exact: true });
  if (await close.isVisible()) await close.click();
  if (tree) await page.locator('.tree-cell[data-cell="target"] .select-note').click();
  return page.locator(`${tree ? '.tree-view' : '.viewport'} [data-cell="target"] .cell-text`);
}
async function library(page: Page) {
  if (!(await page.getByRole('button', { name: 'My prompts', exact: true }).first().isVisible()))
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page
    .locator('.library-tabs')
    .getByRole('button', { name: 'My prompts', exact: true })
    .click();
  return page.getByRole('region', { name: 'My prompts', exact: true });
}
type Request = { prompt: string; notes: { id: string; text: string }[] };
function result(input: Request) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            text: 'Try one small mentoring experiment.',
            sourceIds: input.notes.slice(0, 1).map((source) => source.id),
          }),
        },
      },
    ],
  };
}

test('uses tilde scope shortcuts without sending until Ask, and reviews editable drafts with Undo', async ({
  page,
}) => {
  const field = await open(page);
  const requests: Request[] = [];
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.provider).toEqual({ zdr: true, data_collection: 'deny', allow_fallbacks: false });
    const input = JSON.parse(body.messages[1].content) as Request;
    requests.push(input);
    await route.fulfill({ json: result(input) });
  });
  const prompt = page.getByRole('textbox', { name: 'AI prompt', exact: true });
  for (const [prefix, scope, ids] of [
    ['~', 'cell', []],
    ['~+', 'branch', ['root', 'child']],
    ['~++', 'situation', ['root', 'child', 'other']],
  ] as const) {
    await field.focus();
    await field.pressSequentially(prefix);
    await expect(prompt).toHaveCount(0);
    await field.press('Space');
    await expect(prompt).toBeFocused();
    await expect(prompt).toHaveCSS('outline-style', 'none');
    await expect(page.getByRole('combobox', { name: 'AI context', exact: true })).toHaveValue(
      scope,
    );
    expect(requests.length).toBe(scope === 'cell' ? 0 : scope === 'branch' ? 1 : 2);
    await prompt.fill('Suggest a small next step.');
    await prompt.press('Meta+Enter');
    await expect(page.getByRole('textbox', { name: 'Edit AI draft', exact: true })).toHaveValue(
      /mentoring/,
    );
    expect(requests.at(-1)!.notes.map((source) => source.id)).toEqual(ids);
    expect(JSON.stringify(requests.at(-1))).not.toContain('Do not send this other situation');
    if (scope !== 'situation') await prompt.press('Escape');
  }
  const draft = page.getByRole('textbox', { name: 'Edit AI draft', exact: true });
  await draft.fill('My edited draft.');
  await page.getByRole('button', { name: 'Insert as comment', exact: true }).click();
  const inserted = page
    .locator('.viewport [data-kind="note"]')
    .filter({ hasText: 'My edited draft.' });
  await expect(inserted).toBeVisible();
  await page
    .locator('.ai-composer .added')
    .getByRole('button', { name: 'Undo', exact: true })
    .click();
  await expect(inserted).toHaveCount(0);
  await expect(draft).toBeVisible();
  await page.getByRole('button', { name: 'Insert as comment', exact: true }).click();
  const insertedId = await inserted.getAttribute('data-cell');
  await fillField(
    page.locator(`.viewport [data-cell="${insertedId}"] .cell-text`),
    'A later edit by me.',
  );
  await page
    .locator('.ai-composer .added')
    .getByRole('button', { name: 'Undo', exact: true })
    .click();
  await expectFieldValue(
    page.locator('.viewport [data-kind="note"] .cell-text').last(),
    'A later edit by me.',
  );
  await page.screenshot({ path: '/private/tmp/bearings-ai-composer.png' });
});

test('curates a prompt shelf and manages global AI settings independently of the writing context', async ({
  page,
}, info) => {
  const field = await open(page);
  let requestCount = 0;
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    requestCount++;
    return route.fulfill({
      json: result(JSON.parse(route.request().postDataJSON().messages[1].content)),
    });
  });
  const shelf = await library(page);
  await shelf.getByRole('button', { name: 'New prompt', exact: true }).click();
  let editor = page.getByRole('dialog', { name: 'New prompt', exact: true });
  await editor.getByLabel('Name', { exact: true }).fill('Find the assumption');
  await editor.getByLabel('Prompt', { exact: true }).fill('Help me examine my assumptions.');
  await editor.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await shelf.getByRole('button', { name: 'Edit Find the assumption', exact: true }).click();
  editor = page.getByRole('dialog', { name: 'Edit prompt', exact: true });
  await editor.getByLabel('Name', { exact: true }).fill('Reflect carefully');
  await editor.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await shelf.getByRole('button', { name: 'Use prompt: Reflect carefully', exact: true }).click();
  if (info.project.name === 'desktop')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'AI prompt', exact: true })).toHaveValue(
    'Help me examine my assumptions.',
  );
  await page.getByRole('button', { name: 'Save this prompt', exact: true }).click();
  const savedDraft = page.getByRole('dialog', { name: 'New prompt', exact: true });
  await expect(savedDraft.getByLabel('Prompt', { exact: true })).toHaveValue(
    'Help me examine my assumptions.',
  );
  await savedDraft.getByLabel('Name', { exact: true }).fill('Saved draft prompt');
  await savedDraft.getByRole('button', { name: 'Save prompt', exact: true }).click();
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  expect(requestCount).toBe(0);
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'AI settings', exact: true });
  await expect(settings).not.toContainText('Mira');
  await settings.getByLabel('Model', { exact: true }).selectOption('test/careful');
  await settings.getByLabel('Response style', { exact: true }).selectOption('Ask one question');
  await settings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  await settings.getByRole('button', { name: 'Close AI settings', exact: true }).click();
  await expect(field).toBeVisible();
  await field.pressSequentially('~++ ');
  await expect(page.getByRole('textbox', { name: 'AI prompt', exact: true })).toBeHidden();
  await expectFieldValue(field, '~++ ');
  await page.reload();
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  await expect(settings.getByRole('switch', { name: 'Enable AI', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(settings.getByLabel('Model', { exact: true })).toHaveValue('test/careful');
  await settings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  await settings.getByRole('button', { name: 'Close AI settings', exact: true }).click();
  const restored = await library(page);
  await expect(restored).toContainText('Reflect carefully');
  await restored
    .getByRole('button', { name: 'Use prompt: Reflect carefully', exact: true })
    .click();
  if (info.project.name === 'desktop')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Edit AI draft', exact: true })).toBeVisible();
  expect(requestCount).toBe(1);
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  await page.screenshot({ path: `/private/tmp/bearings-ai-settings-${info.project.name}.png` });
});

test('supports AI entry in Vim Tree and fullscreen, cancels when switched off, and leaves tildes literal', async ({
  page,
}) => {
  const field = await open(page, true, true);
  await expect(field).toHaveAttribute('data-vim-mode', 'normal');
  await field.press('~');
  await field.pressSequentially('++');
  await field.press('Space');
  const prompt = page.getByRole('textbox', { name: 'AI prompt', exact: true });
  await expect(prompt).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'AI context', exact: true })).toHaveValue(
    'situation',
  );
  let release: (() => void) | undefined;
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: { choices: [{ message: { content: '{"text":"A late reply","sourceIds":[]}' } }] },
      })
      .catch(() => {});
  });
  await prompt.fill('Suggest an experiment.');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'AI settings', exact: true });
  await settings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  release!();
  await settings.getByRole('button', { name: 'Close AI settings', exact: true }).click();
  await expect(field).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Edit AI draft' })).toHaveCount(0);
  await field.pressSequentially('~~literal~~ ');
  await expect(field.locator('s,del')).toHaveCount(0);
  await expectFieldValue(field, '~~literal~~ ');
  await page.reload();
  await page.locator('.tree-cell[data-cell="target"] .select-note').click();
  await expectFieldValue(field, '~~literal~~ ');
  await fillField(field, '');
  await page.getByRole('button', { name: 'AI settings', exact: true }).click();
  await settings.getByRole('switch', { name: 'Enable AI', exact: true }).click();
  await settings.getByRole('button', { name: 'Close AI settings', exact: true }).click();
  if (!(await field.isVisible()))
    await page.locator('.tree-cell[data-cell="target"] .select-note').click();
  await field.focus();
  await field.press('Escape');
  await page.keyboard.press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus.locator('s,del')).toHaveCount(0);
  await focus.locator('.cell-text').press('~');
  await focus.locator('.cell-text').press('+');
  await focus.locator('.cell-text').press('Space');
  await expect(focus.getByRole('textbox', { name: 'AI prompt', exact: true })).toBeFocused();
  await expect(focus.getByRole('combobox', { name: 'AI context', exact: true })).toHaveValue(
    'branch',
  );
  await focus.getByRole('textbox', { name: 'AI prompt', exact: true }).press('Escape');
  await expect(focus).toBeVisible();
});
