import { expect, test } from '@playwright/test';

test('shows a website fallback if the host blocks WebAssembly, without executing elsewhere', async ({
  page,
}) => {
  await page.goto('/?block-wasm');
  const widget = page.frameLocator('iframe');
  await expect(widget.getByRole('alert')).toHaveText(
    'This chat host could not run the worksheet. You can use it on Patternverse instead.',
  );
  await expect(widget.getByRole('link', { name: 'Open on Patternverse ↗' })).toHaveAttribute(
    'href',
    'https://patternverse.org/pattern/define-the-decision-before-comparing-options',
  );
  await expect(widget.getByRole('textbox')).toHaveCount(0);
});

test('executes the shared worksheet inline without leaking answers or persisting state', async ({
  page,
}) => {
  const messages: unknown[] = [];
  const requests: string[] = [];
  await page.exposeFunction('recordWidgetMessage', (value: unknown) => messages.push(value));
  await page.addInitScript(() => {
    window.addEventListener('message', (event) => {
      if (event.source !== window)
        (window as unknown as { recordWidgetMessage(value: unknown): void }).recordWidgetMessage(
          event.data,
        );
    });
  });
  page.on('request', (request) => requests.push(request.url() + (request.postData() ?? '')));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const widget = page.frameLocator('iframe');
  const sentinel = 'private-answer-sentinel';
  await widget.getByLabel('How are you currently phrasing the decision?').fill(sentinel);
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(widget.getByRole('heading', { name: 'Clarify the outcome' })).toBeVisible();
  await expect(widget.getByText(sentinel, { exact: true })).toBeVisible();
  await widget.getByRole('button', { name: 'Export responses', exact: true }).click();
  await expect(widget.getByText(/Individual response imports/)).toBeVisible();
  await expect(widget.getByRole('link', { name: 'Open practice history ↗' })).toHaveCount(0);
  await widget.getByLabel('Run title', { exact: true }).fill('My private decision run');
  const archive = JSON.parse(
    await widget.getByLabel('Practice export', { exact: true }).inputValue(),
  );
  expect(archive).toMatchObject({
    format: 'patternverse-practice-run',
    version: 1,
    run: {
      title: 'My private decision run',
      origin: 'chatgpt',
      status: 'in-progress',
      patternRef: { sourceId: 'commons', entityId: 'define-the-decision-before-comparing-options' },
    },
  });
  expect(JSON.stringify(archive.run.responses)).toContain(sentinel);
  expect(typeof archive.run.checkpoint).toBe('string');
  expect(JSON.stringify(archive)).not.toContain('workspaceId');
  await widget.getByLabel('What problem are you trying to solve?').fill('Reduce maintenance');
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    widget.getByRole('heading', { name: 'Separate facts from assumptions' }),
  ).toHaveCount(0);
  await widget.getByLabel('What would a good outcome give you?').fill('Clearer boundaries');
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(
    widget.getByRole('heading', { name: 'Separate facts from assumptions' }),
  ).toBeVisible();
  const frame = page.frames().find((frame) => frame.parentFrame())!;
  expect(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await widget.getByLabel('Which constraints are genuinely fixed?').fill('Keep the app working');
  await widget
    .getByLabel('Which constraints are you merely assuming?')
    .fill('Everything needs rewriting');
  await widget
    .getByLabel('What alternatives disappear because of the way you phrased the question?')
    .fill('Incremental extraction');
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await widget
    .getByLabel('What is your rewritten decision question?')
    .fill('How might we simplify maintenance while keeping the app working?');
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await widget
    .getByLabel('What are at least three options that the new question makes visible?')
    .fill('Extract a boundary; improve tests; remove one duplication');
  await widget.getByRole('button', { name: 'Continue ↓' }).click();
  await expect(widget.getByText('Practice complete.', { exact: false })).toBeVisible();
  await widget.getByRole('button', { name: 'Restart' }).click();
  await expect(widget.getByLabel('How are you currently phrasing the decision?')).toHaveValue('');
  await expect(widget.getByLabel('Practice export')).toHaveCount(0);
  await page.reload();
  await expect(widget.getByLabel('How are you currently phrasing the decision?')).toHaveValue('');
  expect(JSON.stringify(messages)).not.toContain(sentinel);
  expect(requests.join('\n')).not.toContain(sentinel);
  expect(messages.some((value) => JSON.stringify(value).includes('ui/initialize'))).toBe(true);
  expect(
    messages.some((value) => JSON.stringify(value).includes('ui/notifications/size-changed')),
  ).toBe(true);
  expect(errors).toEqual([]);
});
