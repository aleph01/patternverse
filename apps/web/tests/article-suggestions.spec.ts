import { expect, test } from '@playwright/test';

test('selects a personal article, preserves its copy after a failed send, and submits for review', async ({
  page,
}, testInfo) => {
  let accept = false;
  const sent: { requestId: string; suggestion: { body: string; reason: string } }[] = [];
  await page.route('**/api/contribute/status', (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    return route.fulfill(
      accept
        ? { status: 201, json: { accepted: true, id: body.requestId } }
        : { status: 503, json: { error: 'Please try again later.' } },
    );
  });
  await page.goto('/contribute');
  await expect(page.getByRole('link', { name: 'Write an article' })).toBeVisible();
  await page.evaluate(async () => {
    const workspacePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ workspacePath);
    const workspace = await getLocalWorkspace();
    await workspace.createEntity({
      id: 'one-small-step',
      type: 'pattern',
      title: 'Start with one small step',
      summary: 'Make a difficult task easier to begin.',
      attribution: 'A sample contributor',
      body: '## When to use it\n\nWhen a worthwhile task feels too large to start.\n\n## Try this\n\nChoose one useful step you can finish in five minutes.',
    });
    await workspace.createEntity({
      id: 'unselected-note',
      type: 'pattern',
      title: 'Another personal article',
      body: 'PRIVATE UNSELECTED ARTICLE',
    });
  });
  await page.reload();
  await page.getByLabel('Your article', { exact: true }).selectOption('one-small-step');
  const form = page.getByRole('form', { name: 'Suggest an article' });
  await expect(form.getByRole('heading', { name: 'Start with one small step' })).toBeVisible();
  await form.getByText('Read the full article text').click();
  await expect(form.locator('pre')).toContainText('Choose one useful step');
  await expect(form.getByRole('button', { name: 'Suggest article for review' })).toBeDisabled();
  await form
    .getByLabel(/Why would this be useful/)
    .fill('A practical starting point for anyone feeling stuck.');
  await form.getByRole('checkbox').check();
  await form.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('article-suggestion.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await form.getByRole('button', { name: 'Suggest article for review' }).click();
  await expect(page.getByRole('alert')).toContainText('Please try again later.');
  await page.evaluate(async () => {
    const workspacePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(/* @vite-ignore */ workspacePath);
    await (
      await getLocalWorkspace()
    ).updateEntity('one-small-step', (current: { body: string }) => ({
      ...current,
      body: 'PRIVATE LATER EDIT',
    }));
  });
  await page.reload();
  await expect(form.getByRole('heading', { name: 'Start with one small step' })).toBeVisible();
  await expect(form.getByRole('checkbox')).not.toBeChecked();
  await expect(form.getByLabel(/Why would this be useful/)).toHaveValue(
    'A practical starting point for anyone feeling stuck.',
  );
  await form.getByRole('checkbox').check();
  accept = true;
  await form.getByRole('button', { name: 'Suggest article for review' }).click();
  await expect(page.getByText('Your article suggestion is in the review inbox.')).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[0]!.requestId).toBe(sent[1]!.requestId);
  expect(JSON.stringify(sent)).not.toContain('PRIVATE');
  expect(sent[1]!.suggestion.body).toContain('Choose one useful step');
});
