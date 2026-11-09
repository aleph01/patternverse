import { expect, test, type Locator, type Page } from '@playwright/test';
const path = '/pattern/define-the-decision-before-comparing-options';

test('opens feedback after the usefulness rating and submits recoverable structured feedback', async ({
  page,
}, testInfo) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({
      status: submissions.length === 1 ? 503 : 201,
      json:
        submissions.length === 1
          ? { error: 'Please try again. Your draft is kept.' }
          : { accepted: true, id: body.requestId },
    });
  });
  await page.goto(path);
  const sections = page.locator('.entity-meta-panel > .compact-meta-section');
  await expect(sections.nth(0)).toHaveAttribute('aria-labelledby', 'usefulness-heading');
  await expect(sections.nth(1)).toHaveAttribute('id', 'suggest-improvement');
  await page.getByRole('link', { name: 'Suggest an improvement' }).click();
  await expect(page).toHaveURL(new RegExp(`${path}/feedback$`));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const send = page.getByRole('button', { name: 'Send feedback', exact: true });
  await expect(send).toBeDisabled();
  const categories = page.getByRole('group', { name: 'Feedback categories' });
  await categories.getByRole('button', { name: /^Too short/i }).click();
  await categories.getByRole('button', { name: /^Too long/i }).click();
  await expect(categories.getByRole('button', { name: /^Too short/i })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await categories.getByRole('button', { name: /^Too long/i }).click();
  await categories.getByRole('button', { name: /^Missing example/i }).click();
  await categories.getByRole('button', { name: /^Error or inaccuracy/i }).click();
  await expect(
    page.getByText('Which statement seems incorrect? A correction or source would help.'),
  ).toBeVisible();
  await page
    .getByLabel('Anything you’d like to add?')
    .fill('The second claim needs a correction and a concrete example.');
  await page.screenshot({ path: testInfo.outputPath('quick-feedback.png'), fullPage: true });
  await page.reload();
  await expect(categories.getByRole('button', { name: /^Missing example/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Anything you’d like to add?')).toHaveValue(
    'The second claim needs a correction and a concrete example.',
  );
  await send.click();
  await expect(page.getByRole('alert')).toHaveText('Please try again. Your draft is kept.');
  await send.click();
  await expect(
    page.getByText('Your feedback has been received and is waiting for review.'),
  ).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[0]).toEqual(submissions[1]);
  expect(submissions[1]!.comments).toMatchObject([
    {
      feedback: {
        categories: ['example', 'error'],
        context: 'The second claim needs a correction and a concrete example.',
      },
    },
  ]);
  expect(submissions[1]!.edits).toEqual([]);
  expect(
    await page.evaluate(
      (path) => localStorage.getItem(`patternverse:article-contribution:v1:${path}`),
      path,
    ),
  ).toBeNull();
  await page.getByRole('button', { name: 'Back to article', exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`${path}#suggest-improvement$`));
});

test('accepts a category without context and offers draft recovery while unavailable', async ({
  page,
}) => {
  let available = false;
  const submissions: { comments: { feedback: { categories: string[]; context: string } }[] }[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(`${path}/feedback`);
  await page.getByRole('button', { name: /^Missing illustration/i }).click();
  await expect(page.getByRole('button', { name: 'Send feedback', exact: true })).toBeDisabled();
  await expect(page.getByText(/Submissions are temporarily unavailable/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Missing illustration/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  available = true;
  await page.getByRole('button', { name: 'Check again', exact: true }).first().click();
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await expect(
    page.getByText('Your feedback has been received and is waiting for review.'),
  ).toBeVisible();
  expect(submissions[0]!.comments[0]!.feedback).toEqual({
    categories: ['illustration'],
    context: '',
  });
});

test('submits quick feedback together with passage changes in one reviewed contribution', async ({
  page,
}) => {
  const submissions: { comments: { feedback?: { categories: string[] } }[]; edits: unknown[] }[] =
    [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(`${path}/feedback`);
  await page.getByRole('button', { name: /^Missing example/i }).click();
  await openEditor(page);
  await page.getByRole('button', { name: 'Comment on the whole article' }).click();
  await page
    .getByLabel('Your comment', { exact: true })
    .fill('Please show the tradeoffs in a real decision.');
  await page.getByRole('button', { name: 'Add comment', exact: true }).click();
  await page.getByRole('button', { name: 'Review contribution (2)' }).click();
  await expect(page.locator('.review-comments > li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(
    page.getByText('Your feedback has been received and is waiting for review.'),
  ).toBeVisible();
  expect(submissions[0]!.comments).toHaveLength(2);
  expect(submissions[0]!.comments[0]!.feedback?.categories).toEqual(['example']);
  expect(submissions[0]!.edits).toEqual([]);
});

async function openEditor(page: Page) {
  if (!new URL(page.url()).pathname.endsWith('/feedback')) {
    await page.getByRole('link', { name: 'Suggest an improvement' }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/feedback$`));
  }
  const rewrite = page.locator('.rewrite-section');
  await expect(rewrite).toBeVisible();
  if (!(await rewrite.evaluate((element) => (element as HTMLDetailsElement).open)))
    await rewrite.locator('summary').click();
}

async function proposedText(editor: Locator): Promise<string> {
  return editor.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[contenteditable="false"]').forEach((node) => node.remove());
    return copy.textContent ?? '';
  });
}

test('preserves existing links and supports adding, changing, removing and submitting article links', async ({
  page,
}, testInfo) => {
  const submissions: { edits: { before: string; after: string; afterLinks: unknown[] }[] }[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(path);
  await openEditor(page);
  const editorDialog = page.getByRole('main', { name: /Define the Decision/i });
  await editorDialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  const related = editorDialog.getByRole('textbox', { name: /Edit Related patterns/ });
  const originalHref = await related.locator('a').first().getAttribute('href');
  const articleUrl = page.url();
  await expect(related.locator('a')).toHaveCount(2);
  await related.locator('a').first().click();
  await expect(page).toHaveURL(articleUrl);
  await editorDialog.getByRole('button', { name: 'Edit link', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Link to an article', exact: true });
  await expect(picker).toBeVisible();
  await expect(picker.getByText(originalHref!, { exact: true })).toBeVisible();
  await picker.getByLabel('Find an article').fill('run a premortem');
  await picker.getByRole('button', { name: /^Link to Run a Premortem$/i }).click();
  await expect(picker).not.toBeVisible();
  await expect(related.locator('a').first()).toHaveAttribute('href', '/pattern/run-a-premortem');
  await expect(editorDialog.getByRole('button', { name: 'Review contribution (1)' })).toBeEnabled();
  await related.locator('a').first().click();
  await editorDialog.getByRole('button', { name: 'Edit link', exact: true }).click();
  await picker.getByRole('button', { name: 'Remove link', exact: true }).click();
  await expect(related.locator('a')).toHaveCount(1);
  await related
    .locator('..')
    .getByRole('button', { name: /^Revert changes to/ })
    .click();
  await expect(related.locator('a')).toHaveCount(2);
  await expect(related.locator('a').first()).toHaveAttribute('href', originalHref!);
  await expect(
    editorDialog.getByRole('button', { name: 'Review contribution', exact: true }),
  ).toBeDisabled();
  const first = editorDialog.locator('.contribution-inline-editor').first();
  const original = await proposedText(first);
  await first.evaluate((element) => {
    const range = document.createRange();
    range.setStart(element.firstChild!, 2);
    range.setEnd(element.firstChild!, 10);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await editorDialog.getByRole('button', { name: 'Link article', exact: true }).click();
  await picker.getByLabel('Find an article').fill('run a premortem');
  await page.screenshot({ path: testInfo.outputPath('article-link-picker.png') });
  await picker.getByRole('button', { name: /^Link to Run a Premortem$/i }).click();
  await expect(first.locator('a')).toHaveText('decision');
  await expect(first.locator('a')).toHaveAttribute('href', '/pattern/run-a-premortem');
  await expect.poll(() => proposedText(first)).toBe(original);
  await page.reload();
  await openEditor(page);
  await editorDialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  await expect(first.locator('a')).toHaveAttribute('href', '/pattern/run-a-premortem');
  await editorDialog.getByRole('button', { name: 'Review contribution (1)' }).click();
  await expect(editorDialog.locator('.review-item .contribution-diff a')).toHaveAttribute(
    'href',
    '/pattern/run-a-premortem',
  );
  await expect(editorDialog.getByRole('list', { name: 'Link changes' })).toContainText('Add link:');
  await editorDialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(editorDialog.getByText(/have been received together/)).toBeVisible();
  expect(submissions[0]!.edits).toHaveLength(1);
  expect(submissions[0]!.edits[0]!.before).toBe(submissions[0]!.edits[0]!.after);
  expect(submissions[0]!.edits[0]!.afterLinks).toEqual([
    { from: 2, to: 10, href: '/pattern/run-a-premortem' },
  ]);
});

test('marks changes live while typing and supports undo, redo and clean submission', async ({
  page,
}, testInfo) => {
  const submissions: { edits: { after: string }[] }[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main');
  await dialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  const editor = dialog.locator('.contribution-inline-editor').first();
  const original = await proposedText(editor);
  const revised = original.replace('difficult', 'complex');
  await editor.fill(revised);
  await expect(editor).toBeFocused();
  await expect(editor.locator('ins')).toHaveText('complex');
  await expect(editor.locator('ins')).toHaveCSS('background-color', 'rgb(255, 240, 166)');
  await expect(editor.locator('del')).toHaveText('difficult');
  await expect(editor.locator('del')).toHaveCSS('text-decoration-line', 'line-through');
  await expect(editor.locator('del')).toHaveCSS('color', 'rgb(24, 24, 20)');
  // No mode switch: the user stays in the paragraph and sees changes immediately.
  await expect(dialog.getByRole('button', { name: 'See changes', exact: true })).toBeVisible();
  await editor.press('End');
  await editor.pressSequentially(' More context.');
  await expect.poll(() => proposedText(editor)).toBe(`${revised} More context.`);
  await expect(editor.locator('ins').last()).toContainText('More context.');
  await editor.press('Backspace');
  await expect.poll(() => proposedText(editor)).toBe(`${revised} More context`);
  await editor.pressSequentially('.');
  await editor.press('ControlOrMeta+a');
  const copied = await editor.evaluate((element) => {
    const data = new DataTransfer();
    element.dispatchEvent(
      new ClipboardEvent('copy', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
    return data.getData('text/plain');
  });
  expect(copied).toBe(`${revised} More context.`);
  await editor.press('ArrowRight');
  const second = dialog.locator('.contribution-inline-editor').nth(1);
  const secondOriginal = await proposedText(second);
  await second.press('ControlOrMeta+a');
  await second.press('ArrowRight');
  await second.pressSequentially(' An example.');
  await expect.poll(() => proposedText(second)).toBe(`${secondOriginal} An example.`);
  await second.press('ControlOrMeta+z');
  await expect.poll(() => proposedText(second)).toBe(secondOriginal);
  await second.press('ControlOrMeta+Shift+z');
  await expect.poll(() => proposedText(second)).toBe(`${secondOriginal} An example.`);
  const pasted = '<img src=x onerror=alert(1)>\nExtra';
  await second.evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    data.setData('text/html', '<img src=x onerror=alert(1)>');
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, pasted);
  await expect.poll(() => proposedText(second)).toBe(`${secondOriginal} An example.${pasted}`);
  await expect(second.locator('img')).toHaveCount(0);
  await second.press('Enter');
  await second.pressSequentially('Another line.');
  await expect
    .poll(() => proposedText(second))
    .toBe(`${secondOriginal} An example.${pasted}\nAnother line.`);
  await dialog
    .locator('p.contribution-text-block')
    .nth(1)
    .getByRole('button', { name: /^Revert changes to/ })
    .click();
  await expect.poll(() => proposedText(second)).toBe(secondOriginal);
  await expect(second.locator('ins,del')).toHaveCount(0);
  await editor.click();
  await page.screenshot({ path: testInfo.outputPath('live-change-markers.png') });
  await dialog.getByRole('button', { name: 'Review contribution (1)' }).click();
  await expect(dialog.locator('.review-item ins').first()).toHaveText('complex');
  await expect(dialog.locator('.review-item del')).toHaveText('difficult');
  await dialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(dialog.getByText(/have been received together/)).toBeVisible();
  expect(submissions[0]!.edits).toHaveLength(1);
  expect(submissions[0]!.edits[0]!.after).toBe(`${revised} More context.`);
});

test('reverts individual paragraphs while preserving other edits and feedback', async ({
  page,
}, testInfo) => {
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main');
  await dialog.getByRole('button', { name: 'Comment on the whole article' }).click();
  await dialog.getByLabel('Your comment', { exact: true }).fill('Keep this feedback.');
  await dialog.getByRole('button', { name: 'Add comment', exact: true }).click();
  await dialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  const paragraphs = dialog.locator('p.contribution-text-block');
  const first = paragraphs.nth(0).locator('.contribution-inline-editor');
  const second = paragraphs.nth(1).locator('.contribution-inline-editor');
  const original = await proposedText(first);
  const secondOriginal = await proposedText(second);
  await expect(dialog.getByRole('button', { name: /^Revert changes to/ })).toHaveCount(0);
  await first.fill(`${original} A clearer explanation.`);
  // Emptying a paragraph is also an edit that can be reverted.
  await second.fill('');
  await expect(dialog.getByRole('button', { name: /^Revert changes to/ })).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: 'Review contribution (3)' })).toBeEnabled();
  await paragraphs
    .nth(0)
    .getByRole('button', { name: /^Revert changes to/ })
    .click();
  await expect.poll(() => proposedText(first)).toBe(original);
  await expect(first).toBeFocused();
  await expect.poll(() => proposedText(second)).toBe('');
  await expect(dialog.getByRole('button', { name: /^Revert changes to/ })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Review contribution (2)' })).toBeEnabled();
  await page.reload();
  await openEditor(page);
  await dialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  await expect.poll(() => proposedText(first)).toBe(original);
  await expect.poll(() => proposedText(second)).toBe('');
  await expect(dialog.getByText('Keep this feedback.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'See changes', exact: true }).click();
  await expect(paragraphs.nth(1).locator('del')).toContainText(secondOriginal);
  await paragraphs
    .nth(1)
    .getByRole('button', { name: /^Revert changes to/ })
    .click();
  await expect(paragraphs.nth(1)).toHaveText(secondOriginal);
  await expect(dialog.getByRole('region', { name: 'Article contribution surface' })).toBeFocused();
  await expect(dialog.getByRole('button', { name: /^Revert changes to/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Review contribution (1)' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await first.fill(`${original} A clearer explanation.`);
  await page.screenshot({ path: testInfo.outputPath('paragraph-revert.png') });
  await dialog.getByRole('button', { name: 'Review contribution (2)' }).click();
  await expect(dialog.locator('.review-item')).toHaveCount(1);
  await expect(dialog.locator('.review-comments > li')).toHaveCount(1);
});

test('collects pins, selected text and edits, restores the draft and submits once', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', async (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    await route.fulfill({
      status: submissions.length === 1 ? 503 : 201,
      json:
        submissions.length === 1
          ? { error: 'Please try again. Your draft is kept.' }
          : { accepted: true, id: body.requestId },
    });
  });
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main', {
    name: /Define the decision before comparing options/i,
  });
  await expect(dialog).toBeVisible();
  const paragraphs = dialog.locator('p.contribution-text-block');
  await expect(paragraphs.first()).toBeVisible();
  await paragraphs.first().click({ position: { x: 55, y: 15 } });
  await dialog
    .getByLabel('Your comment', { exact: true })
    .fill('Could you give a concrete example?');
  await dialog.getByRole('button', { name: 'Add comment', exact: true }).click();
  await paragraphs.nth(1).evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode()!;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(18, node.textContent!.length));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await dialog.getByRole('button', { name: 'Comment on selected text', exact: true }).click();
  await dialog.getByLabel('Your comment', { exact: true }).fill('Please clarify this phrase.');
  await dialog.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(dialog.locator('.contribution-pin')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Edit text', exact: true }).click();
  const editor = dialog.locator('.contribution-inline-editor').first();
  const original = await proposedText(editor);
  await editor.fill(`${original} A concrete example would help.`);
  await dialog.getByRole('button', { name: 'See changes', exact: true }).click();
  await expect(dialog.locator('ins')).toContainText(['A concrete example would help.']);
  await dialog.getByRole('button', { name: 'Back to article', exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`${path}#suggest-improvement$`));
  await openEditor(page);
  await expect(dialog.locator('.contribution-pin')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Review contribution (3)' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Review your contribution', exact: true }),
  ).toBeFocused();
  await expect(dialog.locator('.review-comments > li')).toHaveCount(2);
  await expect(dialog.locator('.review-comments blockquote')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Please try again. Your draft is kept.');
  await expect(dialog.locator('.review-comments > li')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(
    dialog.getByText(
      'Your edits and comments have been received together and are waiting for review.',
    ),
  ).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[0]).toEqual(submissions[1]);
  expect(submissions[1]!.comments).toHaveLength(2);
  expect(submissions[1]!.edits).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Back to article', exact: true }).last().click();
  await expect(page).toHaveURL(new RegExp(`${path}#suggest-improvement$`));
  expect(
    await page.evaluate(
      (path) => localStorage.getItem(`patternverse:article-contribution:v1:${path}`),
      path,
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('article-after-contribution.png'),
    fullPage: true,
  });
});

test('keeps the floating tools centered and allows drafting when the service is unavailable', async ({
  page,
}, testInfo) => {
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main');
  await dialog.getByRole('button', { name: 'Comment on the whole article' }).click();
  await dialog.getByLabel('Your comment', { exact: true }).fill('A general note for the editor.');
  await dialog.getByRole('button', { name: 'Add comment', exact: true }).click();
  const dock = await dialog.locator('.contribution-dock').boundingBox(),
    viewport = page.viewportSize()!;
  expect(Math.abs(dock!.x + dock!.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(dock!.y + dock!.height).toBeLessThanOrEqual(viewport.height);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('floating-contribution-tools.png'),
    fullPage: true,
  });
  await dialog.getByRole('button', { name: 'Review contribution (1)' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Submit contribution', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.locator('.contribution-review').getByText(/Submissions are temporarily unavailable/),
  ).toBeVisible();
  await expect(
    dialog
      .locator('.contribution-review')
      .getByRole('button', { name: 'download your draft', exact: true }),
  ).toBeVisible();
});

test('attaches several passages to one comment without losing the draft', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Touch fallback; desktop uses Shift selection.');
  const submissions: {
    comments: { body: string; anchor: { quote: string }; additionalAnchors: { quote: string }[] }[];
  }[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main', {
    name: /Define the decision before comparing options/i,
  });
  const paragraphs = dialog.locator('p.contribution-text-block');
  const composer = dialog.getByRole('region', { name: 'Write a comment' });
  await dialog.getByRole('button', { name: 'Leave feedback', exact: true }).click();
  await paragraphs.first().evaluate((first) => {
    const second = first.parentElement!.querySelectorAll('p.contribution-text-block')[1]!;
    const range = document.createRange();
    range.setStart(first.firstChild!, 2);
    range.setEnd(second.firstChild!, 20);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  if (testInfo.project.name === 'desktop') {
    await paragraphs.first().dispatchEvent('pointerup', { pointerType: 'mouse' });
  } else {
    await dialog.getByRole('button', { name: 'Comment on selected text', exact: true }).click();
  }
  await expect(composer.locator('.comment-passage')).toHaveCount(2);
  await expect(composer).toContainText('2 passages · one comment');
  const body = 'Could you make the relationship between these passages clearer?';
  await composer.getByLabel('Your comment', { exact: true }).fill(body);
  await composer.getByRole('button', { name: 'Add another passage' }).click();
  await expect(dialog.locator('.passage-picker')).toBeVisible();
  await paragraphs.nth(3).click({ position: { x: 40, y: 10 } });
  await expect(composer.locator('.comment-passage')).toHaveCount(3);
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await composer.getByRole('button', { name: 'Add another passage' }).click();
  await paragraphs.nth(2).evaluate((element) => {
    const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()!;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(12, node.textContent!.length));
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await dialog
    .locator('.passage-picker')
    .getByRole('button', { name: 'Add selected text', exact: true })
    .click();
  await expect(composer.locator('.comment-passage')).toHaveCount(4);
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await composer.getByRole('button', { name: 'Remove passage 4', exact: true }).click();
  await composer.getByRole('button', { name: 'Remove passage 2', exact: true }).click();
  await expect(composer.locator('.comment-passage')).toHaveCount(2);
  await expect(dialog.locator('.contribution-pin')).toHaveCount(2);
  await composer.getByRole('button', { name: 'Add another passage' }).click();
  await dialog
    .locator('.passage-picker')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await page.screenshot({ path: testInfo.outputPath('multiple-passages-one-comment.png') });
  await composer.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(dialog.locator('.feedback-list > li')).toHaveCount(1);
  await expect(dialog.locator('.contribution-pin')).toHaveText(['1', '1']);
  await paragraphs.nth(3).locator('mark').first().click();
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await page.reload();
  await openEditor(page);
  await expect(dialog.locator('.contribution-pin')).toHaveCount(2);
  await dialog.locator('.feedback-list').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(composer.locator('.comment-passage')).toHaveCount(2);
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await dialog.getByRole('button', { name: 'Review contribution (1)' }).click();
  await expect(dialog.locator('.review-comments > li')).toHaveCount(1);
  await expect(dialog.locator('.review-comments .comment-passage')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(dialog.getByText(/have been received together/)).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]!.comments).toHaveLength(1);
  expect(submissions[0]!.comments[0]!.body).toBe(body);
  expect(submissions[0]!.comments[0]!.anchor.quote).toBeTruthy();
  expect(submissions[0]!.comments[0]!.additionalAnchors).toHaveLength(1);
});

async function dragPassage(page: Page, passage: Locator, text: string, shift = false) {
  await passage.scrollIntoViewIfNeeded();
  const points = await passage.evaluate((element, quote) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement?.closest('button') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const content = nodes.map((node) => node.textContent).join('');
    const start = content.indexOf(quote);
    if (start < 0) throw new Error(`Missing passage: ${quote}`);
    const point = (offset: number, end: boolean) => {
      for (const node of nodes) {
        if (offset < node.length) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          const rect = range.getBoundingClientRect();
          return { x: end ? rect.right : rect.left, y: rect.top + rect.height / 2 };
        }
        offset -= node.length;
      }
      throw new Error('Selection falls outside the article text');
    };
    return { start: point(start, false), end: point(start + quote.length - 1, true) };
  }, text);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.move(points.start.x, points.start.y);
  await page.mouse.down();
  await page.mouse.move(points.end.x, points.end.y, { steps: 12 });
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

test('Shift selects separate passages for the same comment without extending through the gaps', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Shift requires a keyboard and mouse.');
  const submissions: {
    comments: { body: string; anchor: { quote: string }; additionalAnchors: { quote: string }[] }[];
  }[] = [];
  await page.route('**/api/article-contributions/status', (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route('**/api/article-contributions', (route) => {
    const body = route.request().postDataJSON();
    submissions.push(body);
    return route.fulfill({ status: 201, json: { accepted: true, id: body.requestId } });
  });
  await page.goto(path);
  await openEditor(page);
  const dialog = page.getByRole('main', {
    name: /Define the decision before comparing options/i,
  });
  const paragraphs = dialog.locator('p.contribution-text-block');
  const composer = dialog.getByRole('region', { name: 'Write a comment' });
  await dragPassage(page, paragraphs.first(), 'A decision');
  await expect(composer.locator('.comment-passage')).toHaveCount(1);
  const body = 'Could you clarify how these passages relate?';
  await composer.getByLabel('Your comment', { exact: true }).fill(body);
  await dragPassage(page, paragraphs.nth(2), 'That sounds', true);
  await expect(composer.locator('.comment-passage')).toHaveCount(2);
  await dragPassage(page, paragraphs.first(), 'alternatives', true);
  await expect(composer.locator('.comment-passage')).toHaveCount(3);
  await expect(composer.locator('blockquote')).toHaveText([
    'A decision',
    'That sounds',
    'alternatives',
  ]);
  // Re-selecting the same passage must not duplicate it.
  await dragPassage(page, paragraphs.nth(2), 'That sounds', true);
  await expect(composer.locator('.comment-passage')).toHaveCount(3);
  await paragraphs.nth(3).click({ modifiers: ['Shift'], position: { x: 40, y: 10 } });
  await expect(composer.locator('.comment-passage')).toHaveCount(4);
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await composer.getByRole('button', { name: 'Remove passage 2', exact: true }).click();
  await expect(composer.locator('.comment-passage')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('shift-select-passages.png') });
  await composer.getByRole('button', { name: 'Add comment', exact: true }).click();
  await expect(dialog.locator('.feedback-list > li')).toHaveCount(1);
  await page.reload();
  await openEditor(page);
  await dialog.locator('.feedback-list').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(composer.getByLabel('Your comment', { exact: true })).toHaveValue(body);
  await expect(composer.locator('.comment-passage')).toHaveCount(3);
  await paragraphs.nth(4).click({ modifiers: ['Shift'], position: { x: 40, y: 10 } });
  await expect(composer.locator('.comment-passage')).toHaveCount(4);
  await dialog.getByRole('button', { name: 'Review contribution (1)' }).click();
  await expect(dialog.locator('.review-comments > li')).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Submit contribution', exact: true }).click();
  await expect(dialog.getByText(/have been received together/)).toBeVisible();
  expect(submissions[0]!.comments).toHaveLength(1);
  expect(submissions[0]!.comments[0]!.body).toBe(body);
  expect(submissions[0]!.comments[0]!.anchor.quote).toBe('A decision');
  expect(submissions[0]!.comments[0]!.additionalAnchors).toHaveLength(3);
});
