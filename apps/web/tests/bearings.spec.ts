import { fillField, clickNotebookControl, notebookControl } from './bearings-helpers';
import { expectFieldValue, fieldValue, writingCursor, setWritingCursor } from './bearings-helpers';
import { expect, test } from '@playwright/test';
import { addTextCell } from './bearings-helpers';

test('toggles the sidebar with slash outside editors and returns home through the bear', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Modern workspace');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const note = await addTextCell(page, 'Make room for the next step.');
  const title = page.getByRole('textbox', { name: 'Situation title', exact: true });
  await title.focus();
  await title.press('Control+End');
  await title.press('/');
  await expectFieldValue(title, 'Modern workspace/');
  await fillField(title, 'Modern workspace');
  await note.locator('.cell-text').press('Control+End');
  await note.locator('.cell-text').press('/');
  await expectFieldValue(note.locator('.cell-text'), 'Make room for the next step./');
  const toggle = page.locator('.library-toggle');
  await expect(toggle).toHaveAttribute(
    'aria-expanded',
    info.project.name === 'mobile' ? 'false' : 'true',
  );
  await toggle.focus();
  await page.keyboard.press('/');
  await expect(toggle).toHaveAttribute(
    'aria-expanded',
    info.project.name === 'mobile' ? 'true' : 'false',
  );
  await page.keyboard.press('/');
  await expect(toggle).toHaveAttribute(
    'aria-expanded',
    info.project.name === 'mobile' ? 'false' : 'true',
  );
  if (info.project.name === 'mobile') await toggle.click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Decision');
  await search.press('/');
  await expectFieldValue(search, 'Decision/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await fillField(search, '');
  await page.getByRole('button', { name: 'Choose collections', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Choose collections', exact: true });
  await picker.getByRole('button', { name: 'Done', exact: true }).focus();
  await page.keyboard.press('/');
  await expect(picker).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await picker.press('Escape');
  await expect(page.locator('.rating-tools')).not.toHaveAttribute('open', '');
  await page.screenshot({ path: `/private/tmp/bearings-modern-${info.project.name}.png` });
  // A shortcut from a sidebar control returns focus to the persistent toolbar.
  await page.keyboard.press('/');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('/');
  await expectFieldValue(search, '');
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(toggle).toBeFocused();
  await expect(page.getByRole('button', { name: 'Back to situations', exact: true })).toHaveCount(
    0,
  );
  // Navigating via the bear flushes the last edit before closing the notebook.
  await fillField(note.locator('.cell-text'), 'Saved through the bear.');
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await expect(title).toHaveCount(0);
  await page
    .getByRole('button', { name: /Modern workspace/ })
    .first()
    .click();
  await expectFieldValue(page.locator('.cell-text'), 'Saved through the bear.');
});

test('previews a sidebar pattern by click or keyboard without adding it or leaving the notebook', async ({
  page,
}, info) => {
  const title = 'Define the Decision Before Comparing Options';
  await page.route('**/mira/reference/define-the-decision-before-comparing-options', (route) =>
    route.fulfill({
      json: {
        sourceId: 'commons',
        id: 'define-the-decision-before-comparing-options',
        title,
        summary: 'Make the decision explicit.',
        body: '## Clarify the choice\n\nA full article can be read before adding the pattern.',
        html: '<h2>Clarify the choice</h2><p>A full article can be read before adding the pattern.</p>',
        standaloneHref: null,
      },
    }),
  );
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Preview first');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const note = await addTextCell(page, 'Keep my writing in place.');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Define the Decision');
  const preview = page.getByRole('button', { name: `Preview pattern: ${title}`, exact: true });
  const originalUrl = page.url();
  await preview.locator('.item-summary').click();
  const reader = page.locator('.pattern-reader');
  await expect(reader.locator('.markdown-body')).toContainText(
    'A full article can be read before adding the pattern.',
  );
  await expect(reader).toHaveAttribute(
    'data-mode',
    info.project.name === 'desktop' ? 'split' : 'overlay',
  );
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await expectFieldValue(note.locator('.cell-text'), 'Keep my writing in place.');
  await reader.getByRole('button', { name: 'Close pattern reader', exact: true }).click();
  await expect(preview).toBeFocused();
  await preview.press('Enter');
  await expect(reader.locator('.markdown-body')).toContainText('Clarify the choice');
  await reader.getByRole('button', { name: 'Close pattern reader', exact: true }).press('Escape');
  await expect(preview).toBeFocused();
  await expectFieldValue(search, 'Define the Decision');
  await page.getByRole('button', { name: `Add pattern: ${title}`, exact: true }).click();
  await expect(reader).toHaveCount(0);
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const selectedId = await page.locator('.tree-cell.selected').getAttribute('data-cell');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await preview.locator('strong').click();
  await expect(reader.locator('.markdown-body')).toContainText('Clarify the choice');
  await expect(page.locator('.tree-cell.selected')).toHaveAttribute('data-cell', selectedId!);
  await expect(page.locator('.tree-cell')).toHaveCount(2);
  await expect(page).toHaveURL(originalUrl);
  await page.screenshot({
    path: `/private/tmp/bearings-sidebar-preview-${info.project.name}.png`,
    animations: 'disabled',
  });
});

test('reads a full pattern beside the notebook or in an overlay without navigating or losing edits', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(
    page.getByLabel('What would you like to work through?'),
    'Reading while thinking',
  );
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const note = await addTextCell(page, 'Keep this unfinished thought.');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
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
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  const originalUrl = page.url(),
    notebook = await page.locator('.notebook').elementHandle();
  let requests = 0;
  await page.route('**/mira/reference/*', (route) =>
    ++requests === 1 ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue(),
  );
  const read = page.getByRole('button', { name: 'Read pattern', exact: true });
  await read.click();
  const reader = page.locator('.pattern-reader');
  await expect(reader).toHaveAttribute(
    'data-mode',
    info.project.name === 'desktop' ? 'split' : 'overlay',
  );
  await expect(reader.getByRole('alert')).toContainText('try again');
  await reader.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(reader.locator('.markdown-body')).toBeVisible({ timeout: 15000 });
  expect((await reader.locator('.markdown-body').innerText()).length).toBeGreaterThan(400);
  await expect(reader.locator('.reader-header h2')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  await expect(page).toHaveURL(originalUrl);
  expect(await notebook!.evaluate((element) => element.isConnected)).toBe(true);
  if (info.project.name === 'desktop')
    await fillField(note.locator('.cell-text'), 'Edited while the pattern stays open.');
  await page.screenshot({
    path: `/private/tmp/bearings-reader-${info.project.name}.png`,
    fullPage: true,
  });
  await reader.getByRole('button', { name: 'Close pattern reader', exact: true }).click();
  await expect(reader).toHaveCount(0);
  await expect(info.project.name === 'desktop' ? note.locator('.cell-text') : read).toBeFocused();
  await expectFieldValue(
    note.locator('.cell-text'),
    info.project.name === 'desktop'
      ? 'Edited while the pattern stays open.'
      : 'Keep this unfinished thought.',
  );
  await read.click();
  await page.getByRole('button', { name: 'Close pattern reader', exact: true }).press('Escape');
  await expect(reader).toHaveCount(0);
  await expect(page).toHaveURL(originalUrl);
});

test('keeps related-pattern navigation inside the reader and adapts between split and overlay', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Desktop resize between the split pane and phone overlay',
  );
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Related reading');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
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
  await page.route('**/mira/reference/*', (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1)!);
    return route.fulfill({
      json: {
        sourceId: 'commons',
        id,
        title: id === 'related-reading' ? 'A related pattern' : 'Starting pattern',
        summary: '',
        body: 'Full reading text',
        html:
          id === 'related-reading'
            ? '<p>The second article remains inside Bearings.</p>'
            : '<p>Starting reading.</p><a href="/pattern/related-reading">Read a related pattern</a>',
        standaloneHref: null,
      },
    });
  });
  const url = page.url();
  await page.getByRole('button', { name: 'Read pattern', exact: true }).click();
  await expect(page.locator('.pattern-reader')).toHaveAttribute('data-mode', 'split');
  await page.getByRole('link', { name: 'Read a related pattern', exact: true }).click();
  await expect(page.locator('.reader-header h2')).toHaveText('A related pattern');
  await expect(page).toHaveURL(url);
  await page.setViewportSize({ width: 700, height: 850 });
  await expect(page.getByRole('dialog', { name: 'Pattern reader', exact: true })).toBeVisible();
  await expect(page.locator('.reader-header h2')).toHaveText('A related pattern');
  await page.setViewportSize({ width: 1280, height: 850 });
  await expect(page.locator('.pattern-reader')).toHaveAttribute('data-mode', 'split');
  await expect(page.locator('.reader-header h2')).toHaveText('A related pattern');
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('reads private pattern content locally without making a public article request', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  await page.evaluate(async () => {
    const modulePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(modulePath);
    const workspace = await getLocalWorkspace();
    await workspace.createEntity({
      id: 'define-the-decision-before-comparing-options',
      type: 'pattern',
      title: 'My private reading',
      summary: 'Only on my device',
      body: '## My own approach\n\nKeep this private detail inside my workspace.',
    });
  });
  let publicReads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/mira/reference/')) publicReads++;
  });
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Private reading');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await fillField(
    page.getByRole('searchbox', { name: 'Search patterns and ratings' }),
    'My private reading',
  );
  await page
    .getByRole('button', { name: 'Preview pattern: My private reading', exact: true })
    .click();
  await expect(page.locator('.pattern-reader .markdown-body')).toContainText(
    'Keep this private detail inside my workspace.',
  );
  await expect(page.locator('.notebook-cell')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close pattern reader', exact: true }).click();
  await page.getByRole('button', { name: 'Add pattern: My private reading', exact: true }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  const url = page.url();
  await page.getByRole('button', { name: 'Read pattern', exact: true }).click();
  await expect(page.locator('.pattern-reader .markdown-body')).toContainText(
    'Keep this private detail inside my workspace.',
  );
  await expect(page.locator('.reader-header h2')).toHaveText('My private reading');
  expect(publicReads).toBe(0);
  await expect(page).toHaveURL(url);
});

test('edits in place, inserts between cells, and adds library items beside the active cell', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Working in place');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const first = await addTextCell(page, 'First thought');
  const later = await addTextCell(page, 'Later thought');
  const laterId = await later.getAttribute('data-cell');
  await page.locator(`.insertion-point[data-before="${laterId}"] button`).click();
  await page
    .locator('.notebook-cell.active')
    .getByRole('group', { name: 'Cell type', exact: true })
    .getByRole('button', { name: 'Comment', exact: true })
    .click();
  await fillField(page.locator('.notebook-cell.active .cell-text'), 'Between these thoughts');
  await expect(page.locator('.cell-text')).toHaveCount(3);
  expect(
    await page
      .locator('.cell-text')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLElement).innerText.replace(/\n{2,}/g, '\n')),
      ),
  ).toEqual(['First thought', 'Between these thoughts', 'Later thought']);
  await fillField(first.locator('.cell-text'), 'Revised opening');
  await first.locator('.cell-text').press('Enter');
  await first.locator('.cell-text').pressSequentially('Another line');
  await first.locator('.cell-text').press('Shift+Enter');
  await expect(page.locator('.notebook-cell.active .cell-text')).toBeFocused();
  await fillField(page.locator('.notebook-cell.active .cell-text'), 'A follow-up here');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page.locator('.rating-tools summary').click();
  await page.getByRole('button', { name: 'Add Tension rating', exact: true }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(page.locator('.notebook-cell').nth(2)).toHaveClass(/rating/);
  await expect(page.locator('.composer')).toHaveCount(0);
  await expect(page.locator('.viewport .cell-text')).toHaveCount(4);
  await page.screenshot({
    path: `/private/tmp/bearings-inline-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'Working in place' }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(5);
  expect(
    await page
      .locator('.cell-text')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLElement).innerText.replace(/\n{2,}/g, '\n')),
      ),
  ).toEqual([
    'Revised opening\nAnother line',
    'A follow-up here',
    'Between these thoughts',
    'Later thought',
  ]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('opens an older bottom-bar draft as an editable cell without duplicating it after reload', async ({
  page,
}) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  const id = await page.evaluate(async () => {
    const modulePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(modulePath);
    const workspace = await getLocalWorkspace();
    const situation = await workspace.createSituation('Older notebook');
    await workspace.updateSituation(
      situation.id,
      {
        title: situation.title,
        context: '',
        notebook: {
          version: 1,
          chapters: [{ id: 'old-chapter', title: 'Beginning', collapsed: false, cells: [] }],
          activeChapterId: 'old-chapter',
          draft: 'Keep this unfinished thought.',
          draftKind: 'note',
          scrollTop: 0,
        },
      },
      situation.revision,
    );
    return situation.id;
  });
  await page.goto(`/apps/bearings?situation=${encodeURIComponent(id)}&preview=1`);
  await expectFieldValue(
    page.locator('.notebook-cell.note .cell-text'),
    'Keep this unfinished thought.',
  );
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await expectFieldValue(page.locator('.cell-text'), 'Keep this unfinished thought.');
});
test('filters sidebar patterns to attached practices without resetting search or scopes', async ({
  page,
}, info) => {
  test.setTimeout(45000);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).waitFor();
  await page.evaluate(async () => {
    const modulePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(modulePath);
    await (
      await getLocalWorkspace()
    ).createEntity({
      id: 'practice-filter-without-worksheet',
      type: 'pattern',
      title: 'Practice filter without worksheet',
      summary: 'A private pattern with no attached practice.',
      body: 'Keep this as an article only.',
    });
  });
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Find something to try');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const library = page.getByRole('complementary', { name: 'Patterns and ratings', exact: true });
  const toggle = library.getByRole('switch', { name: 'With practice', exact: true });
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  const cards = library.locator('.library-item[data-library-kind="pattern"]');
  await expect(toggle).not.toBeChecked();
  await fillField(search, 'Practice filter without worksheet');
  await expect(cards).toHaveCount(1);
  await toggle.press('Space');
  await expect(toggle).toBeChecked();
  await expect(cards).toHaveCount(0);
  await expect(library).toContainText('No matching patterns with a practice.');
  await expectFieldValue(search, 'Practice filter without worksheet');
  await expect(library.locator('h3 > span')).toHaveText('0');
  await fillField(search, 'Define the Decision');
  await expect(
    library.getByRole('button', {
      name: 'Preview pattern: Define the Decision Before Comparing Options',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Choose verses', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Choose verses', exact: true });
  await picker.locator('[data-scope-choice="commons:decision-making"]').check();
  await picker.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expectFieldValue(search, 'Define the Decision');
  await page.getByRole('button', { name: 'Choose collections', exact: true }).click();
  const collections = page.getByRole('dialog', { name: 'Choose collections', exact: true });
  await fillField(
    collections.getByRole('searchbox', { name: 'Search collections', exact: true }),
    'Decision-Making',
  );
  await collections.getByRole('searchbox').press('Enter');
  await expect(
    collections.locator('[data-scope-choice="commons:decision-making-patterns"]'),
  ).toBeChecked();
  await collections.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expectFieldValue(search, 'Define the Decision');
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(
    page.locator('[data-selected-scope="commons:decision-making-patterns"]'),
  ).toBeVisible();
  await expect(page.locator('[data-selected-scope="commons:decision-making"]')).toBeVisible();
  await toggle.press('Space');
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(toggle).toBeChecked();
  await expect(
    page.locator('[data-selected-scope="commons:decision-making-patterns"]'),
  ).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/bearings-practice-filter-${info.project.name}.png`,
    animations: 'disabled',
  });
  await fillField(search, 'Confidence');
  await expect(
    library.getByRole('button', { name: 'Add Confidence rating', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.notebook-cell')).toHaveCount(0);
  await fillField(search, 'Define the Decision');
  await library
    .getByRole('button', {
      name: 'Add pattern: Define the Decision Before Comparing Options',
      exact: true,
    })
    .click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose a practice', exact: true })).toBeVisible();
});

test('multi-selects verses and collections with soft pickers and keeps the library scope', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Explore across verses');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const verses = page.getByRole('dialog', { name: 'Choose verses', exact: true });
  const collections = page.getByRole('dialog', { name: 'Choose collections', exact: true });
  const verseTrigger = page.getByRole('button', { name: 'Choose verses', exact: true });
  const collectionTrigger = page.getByRole('button', { name: 'Choose collections', exact: true });
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  const abstract = page.getByRole('button', {
    name: 'Preview pattern: Abstract Factory',
    exact: true,
  });
  const decision = page.getByRole('button', {
    name: 'Preview pattern: Define the Decision Before Comparing Options',
    exact: true,
  });
  await verseTrigger.click();
  await expect(verses.getByRole('searchbox')).toBeFocused();
  await expect(verses.getByRole('heading', { name: 'Thinking & Learning' })).toBeVisible();
  await verses.locator('[data-scope-choice="commons:decision-making"]').check();
  await expect(verses).toBeVisible();
  await expect(verses.getByRole('checkbox', { name: /^All verses/ })).not.toBeChecked();
  await fillField(verses.getByRole('searchbox'), 'Software');
  await verses.getByRole('searchbox').press('Enter');
  await expect(verses.locator('[data-scope-choice="commons:software-engineering"]')).toBeChecked();
  await verses.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(verseTrigger).toBeFocused();
  await expect(verseTrigger).toContainText('2 verses');
  await expect(abstract).toBeVisible();
  await fillField(search, 'Define the Decision');
  await expect(decision).toBeVisible();
  await fillField(search, '');
  await collectionTrigger.click();
  await fillField(collections.getByRole('searchbox'), 'Decision-Making');
  await collections.getByRole('searchbox').press('Enter');
  await expect(collections).toBeVisible();
  await fillField(collections.getByRole('searchbox'), '');
  // A second collection is added without replacing the first selection.
  const next = collections.locator('[data-scope-choice]:not(:checked)').first();
  const secondKey = await next.getAttribute('data-scope-choice');
  await next.check();
  await expect(collections.locator('[data-scope-choice]:checked')).toHaveCount(2);
  await page.screenshot({ path: `/private/tmp/bearings-soft-picker-${info.project.name}.png` });
  await collections.press('Escape');
  await expect(collections).toBeHidden();
  await expect(collectionTrigger).toBeFocused();
  await expect(collectionTrigger).toContainText('2 collections');
  await expect(
    page.locator('[data-selected-scope="commons:decision-making-patterns"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  const note = await addTextCell(page, '');
  await note.locator('.cell-text').press('@');
  const quick = page.getByRole('dialog', { name: 'Find a pattern', exact: true });
  await expect(quick.locator('.scope')).toContainText('Decision Making');
  await expect(quick.locator('.scope')).toContainText('Software Engineering');
  await expect(quick.locator('.scope')).toContainText('Decision-Making Patterns');
  await fillField(quick.getByRole('combobox'), 'Define the Decision');
  await expect(quick.getByRole('option').first().locator('strong')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  await quick.press('Escape');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(verseTrigger).toContainText('2 verses');
  await expect(collectionTrigger).toContainText('2 collections');
  await page.locator(`[data-selected-scope="${secondKey}"] button`).click();
  await expect(collectionTrigger).toContainText('1 collection');
  await fillField(search, 'Define the Decision');
  await expect(decision).toBeVisible();
  await verseTrigger.click();
  await verses.locator('[data-scope-choice="commons:decision-making"]').uncheck();
  await verses.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.locator('[data-selected-scope="commons:decision-making-patterns"]'),
  ).toBeVisible();
  await expect(decision).toHaveCount(0);
  await verseTrigger.click();
  await verses.getByRole('checkbox', { name: /^All verses/ }).check();
  await verses.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(decision).toBeVisible();
  await collectionTrigger.click();
  await fillField(collections.getByRole('searchbox'), 'no-matching-collection-123');
  await expect(collections).toContainText('No matching collections.');
  // Outside clicks dismiss a picker without changing its selections.
  await page.mouse.click(2, 2);
  await expect(collections).toBeHidden();
  await expect(
    page.locator('[data-selected-scope="commons:decision-making-patterns"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear collections', exact: true }).click();
  await fillField(search, '');
  await expect(collectionTrigger).toContainText('All collections');
  await expect(abstract).toBeVisible();
  await verseTrigger.click();
  await verses.getByRole('button', { name: 'Done', exact: true }).focus();
  await page.keyboard.press('/');
  await expect(verses).toBeVisible();
  await verses.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Patterns and ratings' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: `/private/tmp/bearings-soft-filters-${info.project.name}.png` });
});

test('opens an existing workspace situation with its saved context and keeps one shared notebook', async ({
  page,
}) => {
  await page.goto('/my?pane=situations&preview=1');
  await fillField(
    page.getByRole('textbox', { name: 'New situation', exact: true }),
    'Existing situation',
  );
  await page.locator('.situations').getByRole('button', { name: 'Add', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open notebook: Existing situation', exact: true })
    .click();
  await fillField(
    page.getByLabel('Context · optional', { exact: true }),
    'Context from the existing app',
  );
  await page.getByRole('button', { name: 'Open in Bearings', exact: true }).click();
  await expect(page).toHaveURL(/\/apps\/bearings\?situation=/, { timeout: 15000 });
  await expectFieldValue(page.getByLabel('Situation title', { exact: true }), 'Existing situation');
  await expect(page.getByLabel('Situation context', { exact: true })).toHaveCount(0);
  await addTextCell(page, 'A shared notebook entry');
  await addTextCell(page, 'An unfinished shared thought');
  await page.goBack();
  await expect(page).toHaveURL(/\/my\?pane=situations&preview=1$/);
  await page
    .getByRole('link', { name: 'Open Bearings notebook: Existing situation', exact: true })
    .click();
  await expectFieldValue(page.locator('.cell-text').last(), 'An unfinished shared thought');
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await expect(page).toHaveURL(/\/apps\/bearings$/);
  await page.goto('/my?pane=situations&preview=1');
  await page.getByRole('button', { name: 'Rename: Existing situation', exact: true }).click();
  await expectFieldValue(
    page.getByLabel('Context · optional', { exact: true }),
    'Context from the existing app',
  );
  await fillField(
    page.getByLabel('Context · optional', { exact: true }),
    'Updated from My Workspace',
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('link', { name: 'Open Bearings notebook: Existing situation', exact: true })
    .click();
  await expectFieldValue(
    page.getByRole('textbox', { name: 'Note text', exact: true }).first(),
    'A shared notebook entry',
  );
});

test('creates an independent saved notebook, uses all cell kinds, reorganizes chapters and returns to continuous mode', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(
    page.getByLabel('What would you like to work through?'),
    'A difficult conversation',
  );
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await addTextCell(page, 'I want to listen before reacting.');
  await addTextCell(page, 'A reminder to pause', 'note');
  await addTextCell(page, 'Take a short walk first.', 'approach');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page.locator('.rating-tools summary').click();
  await page.getByRole('button', { name: 'Add Distress (SUD) rating', exact: true }).click();
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
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(5);
  const slider = page.getByRole('slider', { name: 'Distress (SUD)' });
  await slider.focus();
  await slider.press('Home');
  await expectFieldValue(slider, '0');
  await expect(page.locator('.notebook-cell.rating output')).toHaveText('0 / 100');
  await slider.press('ArrowRight');
  await expectFieldValue(slider, '1');
  await addTextCell(page, 'Still thinking…');
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'A difficult conversation' }).click();
  await expectFieldValue(page.locator('.cell-text').last(), 'Still thinking…');
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  await expectFieldValue(page.getByRole('slider', { name: 'Distress (SUD)' }), '1');
  await clickNotebookControl(page, 'Start a new chapter');
  await fillField(page.getByLabel('New chapter', { exact: true }), 'A fresh perspective');
  await page.getByRole('button', { name: 'Start chapter', exact: true }).click();
  await expect(await notebookControl(page, 'Jump to chapter', 'combobox')).toBeVisible();
  await (
    await notebookControl(page, 'Jump to chapter', 'combobox')
  ).selectOption({ label: 'Beginning' });
  await expect(page.getByRole('button', { name: /01 Beginning/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByRole('button', { name: /01 Beginning/ }).click();
  await expect(page.getByRole('button', { name: /01 Beginning/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.getByRole('button', { name: /02 A fresh perspective/ }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Merge with previous chapter' }).click();
  await expect(page.getByRole('combobox', { name: 'Jump to chapter' })).toHaveCount(0);
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  const handles = page.getByRole('button', { name: /Move .* cell/ });
  await handles.last().focus();
  await handles.last().press('ArrowUp');
  await expectFieldValue(
    page.locator('.notebook-cell').nth(4).getByRole('textbox'),
    'Still thinking…',
  );
  await page
    .locator('.notebook-cell')
    .nth(4)
    .click({ button: 'right', position: { x: 5, y: 5 } });
  await page.getByRole('menuitem', { name: 'Delete cell', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expectFieldValue(
    page.getByRole('textbox', { name: 'Situation title', exact: true }),
    'A difficult conversation',
  );
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  await expect(page.getByRole('combobox', { name: 'Jump to chapter' })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('runs a library practice and restores an unfinished field without repeating deleted responses', async ({
  page,
}, testInfo) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'A decision');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
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
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
  await page.getByRole('button', { name: 'Choose a practice', exact: true }).click();
  await page
    .getByRole('button', { name: 'Define the Decision Before Comparing Options', exact: true })
    .click();
  await fillField(
    page.getByRole('textbox', { name: 'How are you currently phrasing the decision?' }),
    'Should I change jobs?',
  );
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await fillField(
    page.getByRole('textbox', { name: 'What problem are you trying to solve?' }),
    'I want more room to create.',
  );
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'A decision' }).click();
  await page.getByRole('button', { name: 'Continue practice', exact: true }).click();
  await expectFieldValue(
    page.getByRole('textbox', { name: 'What problem are you trying to solve?' }),
    'I want more room to create.',
  );
  await fillField(
    page.getByRole('textbox', { name: 'What would a good outcome give you?' }),
    'Time and energy',
  );
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(4);
  await page
    .locator('.notebook-cell')
    .nth(1)
    .click({ button: 'right', position: { x: 5, y: 5 } });
  await page.getByRole('menuitem', { name: 'Delete cell', exact: true }).click();
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'A decision' }).click();
  await page.getByRole('button', { name: 'Continue practice', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Which constraints are genuinely fixed?' }),
  ).toBeVisible();
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
});

test('keeps long notebooks easy to navigate, preserves position, and separates situations', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop drag-and-drop and viewport checks');
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Long reflection');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  for (let i = 0; i < 9; i++) {
    await addTextCell(page, `${i + 1}. ${'Taking time to think this through.\n'.repeat(12)}`);
  }
  const viewport = page.locator('.viewport');
  await expect(page.locator('.notebook-cell.active .cell-text')).toBeFocused();
  await clickNotebookControl(page, 'Automatically follow new entries');
  await viewport.evaluate((el) => (el.scrollTop = 180));
  await page.locator('.rating-tools summary').click();
  await page.getByRole('button', { name: 'Add Tension rating', exact: true }).click();
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBe(180);
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'Long reflection' }).click();
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBe(180);
  await expect(page.getByRole('button', { name: 'Jump to bottom', exact: true })).toHaveCount(0);
  await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
    .toBeLessThan(5);
  await clickNotebookControl(page, 'Start a new chapter');
  await fillField(page.getByLabel('New chapter', { exact: true }), 'A new direction');
  await page.getByRole('button', { name: 'Start chapter', exact: true }).click();
  await (
    await notebookControl(page, 'Jump to chapter', 'combobox')
  ).selectOption({ label: 'Beginning' });
  // Keep both ends of the native drag visible; scrolling the destination into view
  // before dragstart otherwise makes Playwright grab a different cell at that coordinate.
  const draggedCell = page.locator('[data-chapter]').first().locator('.notebook-cell').last();
  const movedText = await fieldValue(draggedCell.getByRole('textbox'));
  await draggedCell.hover();
  // The move control is available through keyboard focus, without appearing on hover.
  await expect(draggedCell.locator('.drag-handle')).toHaveCSS('opacity', '0');
  await draggedCell.locator('.drag-handle').press('Escape');
  await draggedCell
    .locator('.drag-handle')
    .dragTo(page.getByRole('button', { name: /02 A new direction/ }));
  await expect(page.locator('[data-chapter]').nth(1).locator('.notebook-cell')).toHaveCount(1);
  await expectFieldValue(page.locator('[data-chapter]').nth(1).getByRole('textbox'), movedText);
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Another situation');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to situations', exact: true }).click();
  await page.locator('.situation-row').filter({ hasText: 'Long reflection' }).click();
  await expect(page.locator('.notebook-cell')).toHaveCount(10);
  await expect(await notebookControl(page, 'Jump to chapter', 'combobox')).toBeVisible();
  await page.screenshot({ path: '/private/tmp/bearings-desktop.png' });
});

test('removes pattern cells with the top-right button or Command Delete, with Undo', async ({
  page,
}) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Pattern deletion');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const first = await addTextCell(page, 'Keep this thought.');
  const empty = await addTextCell(page, '');
  const id = await empty.getAttribute('data-cell');
  await empty.locator('.cell-text').press('@');
  const picker = page.getByRole('dialog', { name: 'Find a pattern', exact: true });
  await fillField(picker.getByRole('combobox'), 'Define the Decision');
  await picker.getByRole('combobox').press('Enter');
  const pattern = page.locator(`.notebook-cell[data-cell="${id}"]`);
  await expect(pattern).toHaveAttribute('data-kind', 'pattern');
  await first.locator('.cell-text').focus();
  await pattern.getByRole('heading').click();
  await expect(pattern).toBeFocused();
  await expect(pattern).toHaveClass(/active/);
  await page.keyboard.press('Meta+Backspace');
  await expect(pattern).toHaveCount(0);
  await expect(first.locator('.cell-text')).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(pattern.getByRole('heading')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  const removePattern = pattern.getByRole('button', { name: 'Remove pattern', exact: true });
  const cardBox = (await pattern.boundingBox())!;
  const removeBox = (await removePattern.boundingBox())!;
  expect(removeBox.x).toBeGreaterThan(cardBox.x + cardBox.width / 2);
  expect(removeBox.y - cardBox.y).toBeLessThan(16);
  await removePattern.click();
  await expect(pattern).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await pattern.getByRole('button', { name: 'Read pattern', exact: true }).press('Meta+Delete');
  await expect(pattern).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectFieldValue(first.locator('.cell-text'), 'Keep this thought.');
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const treePattern = page.locator(`.tree-cell[data-cell="${id}"]`);
  const select = treePattern.locator('.select-note');
  if (await select.count()) await select.click();
  await treePattern.getByRole('heading').click();
  await page.keyboard.press('Meta+Backspace');
  await expect(treePattern).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(treePattern.getByRole('heading')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
  // Removing an unselected pattern must act on that card, preserving the other note.
  await page.locator('.tree-cell[data-kind="answer"] .select-note').click();
  await treePattern.getByRole('button', { name: 'Remove pattern', exact: true }).click();
  await expect(treePattern).toHaveCount(0);
  await expect(page.locator('.tree-cell[data-kind="answer"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await treePattern.getByRole('button', { name: 'Edit in fullscreen', exact: true }).focus();
  await treePattern.getByRole('button', { name: 'Edit in fullscreen', exact: true }).press('Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus.getByRole('button', { name: 'Read pattern', exact: true })).toBeFocused();
  await focus.getByRole('button', { name: 'Remove pattern', exact: true }).click();
  await expect(focus).toBeHidden();
  await expect(treePattern).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(pattern).toHaveCount(1);
  await page.reload();
  await expect(pattern.getByRole('heading')).toHaveText(
    'Define the Decision Before Comparing Options',
  );
});

test('deletes the focused notebook cell with Command Delete and restores it with Undo', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Keyboard deletion');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const first = await addTextCell(page, 'Keep the first cell.');
  const middle = await addTextCell(page, 'Delete this cell.');
  const last = await addTextCell(page, 'Keep the last cell.');
  const middleText = middle.locator('.cell-text');
  await middleText.press('Control+End');
  await middleText.press('Backspace');
  await expectFieldValue(middleText, 'Delete this cell');
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await middleText.press('Meta+Backspace');
  await expect(middle).toHaveCount(0);
  await expect(last.locator('.cell-text')).toBeFocused();
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectFieldValue(middleText, 'Delete this cell');
  await middleText.focus();
  // Holding the shortcut must not keep deleting the newly focused neighbor.
  await page.keyboard.down('Meta');
  await page.keyboard.down('Backspace');
  await page.keyboard.down('Backspace');
  await page.keyboard.up('Backspace');
  await page.keyboard.up('Meta');
  await expect(middle).toHaveCount(0);
  await expect(last.locator('.cell-text')).toBeFocused();
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  // Forward Delete is accepted too (the Mac key labelled Delete reports Backspace).
  await last.getByRole('button', { name: /Move .* cell/ }).press('Meta+Delete');
  await expect(last).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectFieldValue(last.locator('.cell-text'), 'Keep the last cell.');
  if (info.project.name === 'mobile')
    await page.getByRole('button', { name: 'Open library', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Confidence');
  await search.press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await page.getByRole('button', { name: 'Close library', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Situation title', exact: true });
  await title.press('Control+End');
  await title.press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await fillField(title, 'Keyboard deletion');
  await clickNotebookControl(page, 'Keyboard shortcuts');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
  await expect(help).toContainText('focused cell in Notebook');
  await help
    .getByRole('button', { name: 'Close keyboard shortcuts', exact: true })
    .press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await help.getByRole('button', { name: 'Close keyboard shortcuts', exact: true }).click();
  await last.locator('.cell-text').press('Control+Backspace');
  await expect(last).toHaveCount(0);
  await first.locator('.cell-text').press('Meta+Backspace');
  await expect(page.locator('.notebook-cell')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add cell', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectFieldValue(first.locator('.cell-text'), 'Keep the first cell.');
  await page.clock.install();
  await first.locator('.cell-text').press('Meta+Backspace');
  await page.clock.fastForward(9000);
  await expect(page.getByText('Cell deleted', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expectFieldValue(first.locator('.cell-text'), 'Keep the first cell.');
  await first.locator('.cell-text').press('Meta+Backspace');
  // The first deletion's deadline must not dismiss a newer Undo notice.
  await page.clock.fastForward(2000);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.clock.fastForward(9000);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
  await expect(page.getByText('Cell deleted', { exact: true })).toHaveCount(0);
  await expect(first).toHaveCount(0);
});

test('splits writing with a standalone Markdown divider and keeps the same cell type', async ({
  page,
}, info) => {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'A flowing notebook');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const original = await addTextCell(
    page,
    'Keep this thought.\n---\nBring this into the next cell.',
    'note',
  );
  const writing = original.locator('.cell-text');
  await setWritingCursor(writing, '---');
  await writing.press('Enter');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await expectFieldValue(writing, 'Keep this thought.');
  const active = page.locator('.notebook-cell.active');
  await expect(active).toHaveClass(/note/);
  await expectFieldValue(active.locator('.cell-text'), 'Bring this into the next cell.');
  await expect(active.locator('.cell-text')).toBeFocused();
  expect(await writingCursor(active.locator('.cell-text'))).toBe(0);
  await fillField(active.locator('.cell-text'), 'A second thought.\n---');
  await expectFieldValue(active.locator('.cell-text'), 'A second thought.\n---');
  await setWritingCursor(active.locator('.cell-text'), Number.MAX_SAFE_INTEGER);
  await active.locator('.cell-text').press('Enter');
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await expectFieldValue(active.locator('.cell-text'), '');
  await fillField(active.locator('.cell-text'), '```markdown\n---');
  await expectFieldValue(active.locator('.cell-text'), '```markdown\n---');
  await setWritingCursor(active.locator('.cell-text'), Number.MAX_SAFE_INTEGER);
  await active.locator('.cell-text').press('Enter');
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await expectFieldValue(active.locator('.cell-text'), '```markdown\n---\n');
  await fillField(active.locator('.cell-text'), 'Keep --- inline.');
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Close library', exact: true }).click();
    await active.locator('.cell-text').focus();
    await page.screenshot({
      path: '/private/tmp/bearings-left-line-and-divider.png',
      animations: 'disabled',
      caret: 'initial',
    });
  }
  await page.reload();
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await expectFieldValue(
    page.locator('.notebook-cell').first().locator('.cell-text'),
    'Keep this thought.',
  );
  await expectFieldValue(
    page.locator('.notebook-cell').last().locator('.cell-text'),
    'Keep --- inline.',
  );
});

test('switches cell type with adjacent icons without taking space from writing or losing the caret', async ({
  page,
}, info) => {
  test.setTimeout(45000);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Space to write');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const text = 'The writing and its position stay with this cell.';
  const cell = await addTextCell(page, text);
  const writing = cell.locator('.cell-text');
  const types = cell.getByRole('group', { name: 'Cell type', exact: true });
  await expect(types.getByRole('button')).toHaveCount(3);
  await expect(cell.getByRole('combobox', { name: 'Cell type', exact: true })).toHaveCount(0);
  const boxes = await types
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left);
  expect(boxes[1]!.right).toBeLessThanOrEqual(boxes[2]!.left);
  expect(boxes[0]!.top).toBe(boxes[2]!.top);
  await setWritingCursor(writing, 8);
  const surface = () => cell.evaluate((node) => getComputedStyle(node).backgroundColor);
  const noteSurface = await surface();
  await types.getByRole('button', { name: 'Comment', exact: true }).click();
  const commentSurface = await surface();
  expect(commentSurface).not.toBe(noteSurface);
  const commentIconColor = await cell
    .locator('.cell-type-icon[data-cell-type="note"]')
    .evaluate((node) => getComputedStyle(node).color);
  await expect(writing).toBeFocused();
  await expectFieldValue(writing, text);
  expect(await writingCursor(writing)).toBe(8);
  const shortHeight = (await writing.boundingBox())!.height;
  await fillField(
    writing,
    'A longer thought that wraps naturally and gives every line room. '.repeat(40),
  );
  await expect.poll(async () => (await writing.boundingBox())!.height).toBeGreaterThan(shortHeight);
  await expect
    .poll(() => writing.evaluate((node) => node.scrollHeight - node.clientHeight))
    .toBeLessThanOrEqual(1);
  await fillField(writing, text);
  await expect
    .poll(async () => (await writing.boundingBox())!.height)
    .toBeLessThanOrEqual(shortHeight + 1);
  await setWritingCursor(writing, 8);
  const caret = cell.locator('.writing-caret');
  await expect(cell.locator('.writing-selection')).toHaveCount(0);
  if (info.project.name === 'desktop') {
    await expect(caret).toHaveCount(1);
    await writing.hover();
    await expect(cell.locator('.drag-handle')).toHaveCSS('opacity', '0');
    const caretSize = (await caret.boundingBox())!;
    expect(caretSize.width).toBeGreaterThanOrEqual(11);
    expect(caretSize.height).toBe(3);
    await writing.press('ControlOrMeta+A');
    await expect(caret).toHaveCount(0);
    await expectFieldValue(writing, text);
    await writing.press('ArrowRight');
    await expect(caret).toHaveCount(1);
    await writing.dispatchEvent('compositionstart');
    await expect(caret).toHaveCount(0);
    await writing.dispatchEvent('compositionend');
    await expect(caret).toHaveCount(1);
    await fillField(
      writing,
      'A longer thought that wraps across lines and keeps growing. '.repeat(60),
    );
    await writing.press('Control+End');
    await expect(caret).toHaveCount(1);
    await expect
      .poll(async () => {
        const field = (await writing.boundingBox())!;
        const mark = (await caret.boundingBox())!;
        return mark.y >= field.y && mark.y + mark.height <= field.y + field.height + 1;
      })
      .toBe(true);
    await fillField(writing, text);
    await setWritingCursor(writing, 8);
  } else {
    await expect(caret).toHaveCount(0);
  }
  await expect(types.getByRole('button', { name: 'Comment', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await types.getByRole('button', { name: 'Own approach', exact: true }).click();
  await expect(cell).toHaveClass(/approach/);
  const approachSurface = await surface();
  expect(approachSurface).not.toBe(commentSurface);
  expect(approachSurface).toBe(noteSurface);
  expect(
    await cell
      .locator('.cell-type-icon[data-cell-type="approach"]')
      .evaluate((node) => getComputedStyle(node).color),
  ).not.toBe(commentIconColor);
  await expectFieldValue(writing, text);
  await types.getByRole('button', { name: 'Note', exact: true }).click();
  await expect(types.getByRole('button', { name: 'Note', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(writing).toHaveAttribute('data-placeholder', '');
  const topGap = await cell.evaluate(
    (e) =>
      e.querySelector('.cell-text')!.getBoundingClientRect().top - e.getBoundingClientRect().top,
  );
  expect(topGap).toBeLessThanOrEqual(24);
  await expect(cell.locator('.cell-shortcut')).toHaveCount(0);
  const library = page.getByRole('button', { name: 'Collapse library', exact: true });
  if (await library.isVisible()) await library.click();
  await page.screenshot({ path: `/private/tmp/bearings-cell-icons-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  const tree = page.locator('.tree-view');
  await tree.locator('.select-note').click();
  const treeTypes = tree.getByRole('group', { name: 'Cell type', exact: true });
  await treeTypes.getByRole('button', { name: 'Own approach', exact: true }).focus();
  await treeTypes.getByRole('button', { name: 'Own approach', exact: true }).press('Enter');
  await expectFieldValue(tree.locator('.cell-text'), text);
  await expect(tree.locator('.selected')).toHaveCSS('background-color', approachSurface);
  await tree.locator('.cell-text').press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor', exact: true });
  await expect(focus.locator('.focus-content')).toHaveCSS('background-color', approachSurface);
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(cell.getByRole('button', { name: 'Own approach', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectFieldValue(writing, text);
  await fillField(
    writing,
    'Try a small experiment this week. Notice what gives me energy, then adjust.',
  );
  await addTextCell(
    page,
    'I want more time for work that feels useful and leaves room to think.',
    'answer',
  );
  await addTextCell(
    page,
    'This might be less about choosing the perfect direction and more about making space to explore.',
    'note',
  );
  await page.locator('.notebook-tools').click();
  await expect(page.locator('.notebook-cell .cell-number')).toHaveText(['01', '02', '03']);
  for (const number of await page.locator('.notebook-cell .cell-number').all()) {
    expect((await number.boundingBox())!.x).toBeGreaterThanOrEqual(0);
  }
  await expect(page.locator('.insertion-point.between')).toHaveCount(2);
  expect(
    await page
      .locator('.insertion-point.between')
      .first()
      .evaluate((node) => getComputedStyle(node, '::after').opacity),
  ).toBe('1');
  await page.screenshot({
    path: `/private/tmp/bearings-cell-design-${info.project.name}.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(tree.locator('.tree-cell')).toHaveCount(3);
  await tree.screenshot({
    path: `/private/tmp/bearings-cell-design-tree-${info.project.name}.png`,
    animations: 'disabled',
  });
});

test('drags full pattern and rating cards into notebook positions without disturbing existing writing', async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Native mouse drag-and-drop; touch retains the add control',
  );
  test.setTimeout(45000);
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await fillField(page.getByLabel('What would you like to work through?'), 'Library drops');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  const first = await addTextCell(page, 'Keep the opening thought.');
  const later = await addTextCell(page, 'Keep the later thought.', 'note');
  const laterId = await later.getAttribute('data-cell');
  const search = page.getByRole('searchbox', { name: 'Search patterns and ratings' });
  await fillField(search, 'Define the Decision');
  const pattern = page.locator('.library-item[data-library-kind="pattern"]');
  const gap = page.locator(`.insertion-point[data-before="${laterId}"]`);
  await pattern.dragTo(gap);
  await expect(page.locator('.notebook-cell')).toHaveCount(3);
  await expect(page.locator('.notebook-cell').nth(1)).toHaveClass(/pattern/);
  await fillField(search, 'Confidence');
  const rating = page
    .locator('.library-item[data-library-kind="rating"]')
    .filter({ hasText: 'Confidence' });
  const size = await first.boundingBox();
  await rating.dragTo(first, { targetPosition: { x: size!.width / 2, y: size!.height - 4 } });
  await expect(page.locator('.notebook-cell')).toHaveCount(4);
  await expect(page.locator('.notebook-cell').nth(1)).toHaveClass(/rating/);
  await expect(page.locator('.notebook-cell').nth(2)).toHaveClass(/pattern/);
  await expectFieldValue(first.locator('.cell-text'), 'Keep the opening thought.');
  await expectFieldValue(later.locator('.cell-text'), 'Keep the later thought.');
  await expect(page.locator('.notebook-cell.rating output')).toHaveText('Unanswered');
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  const blank = await addTextCell(page, '  \n ');
  const blankId = await blank.getAttribute('data-cell');
  await fillField(search, 'Define the Decision');
  // A drop in a gap still inserts, even when the neighboring cell is empty.
  await pattern.dragTo(page.locator(`.insertion-point[data-before="${blankId}"]`));
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  expect((await fieldValue(blank.locator('.cell-text'))).trim()).toBe('');
  const blankBox = (await blank.boundingBox())!;
  await pattern.dragTo(blank, {
    targetPosition: { x: blankBox.width / 2, y: blankBox.height - 5 },
  });
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  await expect(blank).toHaveClass(/pattern/);
  await expect(blank.getByRole('button', { name: 'Read pattern', exact: true })).toBeVisible();
  await expectFieldValue(first.locator('.cell-text'), 'Keep the opening thought.');
  await page.reload();
  await expect(page.locator('.notebook-cell')).toHaveCount(6);
  await expect(blank).toHaveClass(/pattern/);
});
