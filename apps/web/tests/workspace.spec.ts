import { expect, test } from '@playwright/test';

test('chooses an entity type before showing its matching editor', async ({ page }) => {
  await page.goto('/editor');

  await expect(page.getByRole('heading', { name: 'What would you like to create?' })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create a pattern' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a verse' })).toBeVisible();

  await page.getByRole('button', { name: 'Create a concept' }).click();
  await expect(page).toHaveURL(/\/editor\?type=concept$/);
  await expect(page.getByRole('heading', { name: 'New concept' })).toBeVisible();
  await expect(page.getByLabel('Type')).toHaveCount(0);
  await expect(page.getByLabel('Status')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verses' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Visual Markdown editor' })).toBeVisible();

  await page.goto('/editor');
  await page.getByRole('button', { name: 'Create a verse' }).click();
  await expect(page.getByRole('heading', { name: 'New verse' })).toBeVisible();
  await expect(page.getByLabel('Status')).toHaveCount(0);
  await expect(page.getByLabel('Summary')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Visual Markdown editor' })).toHaveCount(0);
});

test('personal entities persist and support local status updates and deletion', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('My First Pattern');
  await expect(page.getByLabel('ID · lowercase kebab-case')).toHaveValue('my-first-pattern');
  await page.locator('.novel-prose').fill('A private test entity.');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “My First Pattern” as draft.')).toBeVisible();

  await page.goto('/my');

  const localEntity = page.locator('.workspace-entities article').filter({
    has: page.getByRole('heading', { name: 'My First Pattern' }),
  });
  await expect(localEntity).toContainText('pattern · mine · draft');

  await page.reload();
  await expect(localEntity).toContainText('pattern · mine · draft');

  await localEntity.getByRole('button', { name: 'Publish locally' }).click();
  await expect(localEntity).toContainText('pattern · mine · published');

  page.once('dialog', (dialog) => dialog.accept());
  await localEntity.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.workspace-entities')).not.toBeVisible();
  await expect(
    page.getByText('Your personal patterns, concepts, and practices will appear here.'),
  ).toBeVisible();
});

test('occasionally manages personal Verses and Collections from a collapsed organizer', async ({
  page,
}) => {
  await page.goto('/my');

  const organizer = page.locator('.workspace-organizer');
  await expect(organizer).not.toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'New verse' })).not.toBeVisible();
  await organizer.locator('summary').click();
  await expect(page.getByRole('link', { name: 'New verse' })).toBeVisible();

  await page.getByRole('link', { name: 'New verse' }).click();
  await expect(page).toHaveURL(/\/editor\?type=verse$/);
  await expect(page.getByRole('heading', { name: 'New verse' })).toBeVisible();
  await expect(page.getByLabel('Type')).toHaveCount(0);
  await expect(page.getByLabel('Status')).toHaveCount(0);
  await expect(page.getByLabel('ID · lowercase kebab-case')).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('Personal Growth');
  await page.getByLabel('Summary').fill('A broad lens for meaningful personal change.');
  await expect(page.getByLabel('Aliases · one per line')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Visual Markdown editor' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Personal Growth” as draft.')).toBeVisible();

  await page.goto('/my');
  await organizer.locator('summary').click();
  const verseRow = organizer.locator('.structure-list li').filter({ hasText: 'Personal Growth' });
  await verseRow.getByRole('button', { name: 'Rename' }).click();
  await verseRow.getByLabel('Rename Personal Growth').fill('Growth and Change');
  await verseRow.getByRole('button', { name: 'Save name' }).click();
  await expect(organizer.getByText('Growth and Change', { exact: true })).toBeVisible();

  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Connected Pattern');
  const verses = page.getByRole('region', { name: 'Verses' });
  await verses.getByRole('searchbox', { name: 'Find Verses' }).fill('growth and change');
  await verses.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Connected Pattern” as draft.')).toBeVisible();

  await page.goto('/my');
  await organizer.locator('summary').click();
  const renamedVerse = organizer.locator('.structure-list li').filter({
    hasText: 'Growth and Change',
  });
  const verseDialogPromise = page.waitForEvent('dialog');
  const verseDeletePromise = renamedVerse.getByRole('button', { name: 'Delete' }).click();
  const verseDialog = await verseDialogPromise;
  expect(verseDialog.message()).toContain('This cannot be undone.');
  expect(verseDialog.message()).toContain('1 personal entity');
  await verseDialog.accept();
  await verseDeletePromise;
  await expect(organizer).not.toContainText('Growth and Change');

  await page.getByRole('link', { name: 'New collection' }).click();
  await expect(page).toHaveURL(/\/editor\?type=collection$/);
  await expect(page.getByLabel('Type')).toHaveCount(0);
  await page.getByLabel('Title', { exact: true }).fill('Weekly Focus');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Weekly Focus” as draft.')).toBeVisible();

  await page.goto('/my');
  await organizer.locator('summary').click();
  const collectionRow = organizer.locator('.structure-list li').filter({ hasText: 'Weekly Focus' });
  await collectionRow.getByRole('button', { name: 'Rename' }).click();
  await collectionRow.getByLabel('Rename Weekly Focus').fill('This Week');
  await collectionRow.getByRole('button', { name: 'Save name' }).click();
  await expect(organizer.getByText('This Week', { exact: true })).toBeVisible();

  const renamedCollection = organizer
    .locator('.structure-list li')
    .filter({ hasText: 'This Week' });
  const collectionDialogPromise = page.waitForEvent('dialog');
  const collectionDeletePromise = renamedCollection.getByRole('button', { name: 'Delete' }).click();
  const collectionDialog = await collectionDialogPromise;
  expect(collectionDialog.message()).toContain('Delete collection “This Week”?');
  expect(collectionDialog.message()).toContain('This cannot be undone.');
  await collectionDialog.accept();
  await collectionDeletePromise;
  await expect(organizer).not.toContainText('This Week');
});

test('usefulness is private browser state that persists across reloads', async ({ page }) => {
  await page.goto('/pattern/creative-reframing');

  const useful = page.getByRole('button', { name: 'Useful', exact: true });
  await expect(useful).toBeEnabled();
  await useful.click();
  await expect(useful).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(useful).toHaveAttribute('aria-pressed', 'true');
});

test('creates, previews, validates, and edits a personal Markdown entity', async ({ page }) => {
  await page.goto('/editor?type=pattern');

  await page.getByLabel('Title', { exact: true }).fill('Notice the Next Move');
  await expect(page.getByLabel('ID · lowercase kebab-case')).toHaveValue('notice-the-next-move');
  await page.getByLabel('Summary').fill('A small prompt for choosing a useful next action.');
  await page.locator('.novel-prose').fill('Write down one move.');

  const verses = page.getByRole('region', { name: 'Verses' });
  await verses.getByRole('searchbox', { name: 'Find Verses' }).fill('creativity');
  await verses.getByRole('button', { name: 'Add' }).click();
  await expect(verses.getByText('Creativity', { exact: true })).toBeVisible();

  await expect(page.getByRole('region', { name: 'Visual Markdown editor' })).toContainText(
    'Write down one move.',
  );
  await page.locator('.novel-editor p').filter({ hasText: 'Write down' }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' Today.');
  await expect(page.locator('.novel-prose')).toContainText('Today.');
  await expect(page.getByText('unsaved changes').first()).toBeVisible();

  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Notice the Next Move” as draft.')).toBeVisible();
  await expect(page.getByText('Saved locally')).toBeVisible();

  await page.goto('/');
  const personalEntry = page.locator('#library .entity-list li').filter({
    hasText: 'Notice the Next Move',
  });
  await expect(personalEntry).toContainText('Draft');
  await personalEntry.getByRole('link', { name: 'Notice the Next Move' }).click();
  await expect(page).toHaveURL(/\/editor\?id=notice-the-next-move$/);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Notice the Next Move');
});

test('uses slash commands for structured writing', async ({ page }) => {
  await page.goto('/editor?type=pattern');

  const visualEditor = page.locator('.novel-prose');
  await visualEditor.click();
  await page.keyboard.type('/head');
  await expect(page.getByRole('listbox', { name: 'Insert a block' })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.type('A useful section');
  await expect(visualEditor.getByRole('heading', { level: 1 })).toHaveText('A useful section');
});

test('deletes an inserted table with its contextual hover action', async ({ page }) => {
  await page.goto('/editor?type=pattern');

  const visualEditor = page.locator('.novel-prose');
  await visualEditor.click();
  await page.keyboard.type('/table');
  await expect(page.getByRole('listbox', { name: 'Insert a block' })).toBeVisible();
  await page.keyboard.press('Enter');

  const table = visualEditor.locator('table');
  await expect(table).toHaveCount(1);
  await table.hover();
  const deleteTable = page.getByRole('button', { name: 'Delete table' });
  await expect(deleteTable).toBeVisible();

  const [tableBox, deleteBox] = await Promise.all([table.boundingBox(), deleteTable.boundingBox()]);
  if (!tableBox || !deleteBox) throw new Error('Table action geometry was unavailable.');
  const overlapsTable = !(
    deleteBox.x + deleteBox.width <= tableBox.x ||
    deleteBox.x >= tableBox.x + tableBox.width ||
    deleteBox.y + deleteBox.height <= tableBox.y ||
    deleteBox.y >= tableBox.y + tableBox.height
  );
  expect(overlapsTable).toBe(false);

  await deleteTable.click();
  await expect(visualEditor.locator('table')).toHaveCount(0);
});

test('searches personal and Commons knowledge together with source and type filters', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('My Momentum Reset');
  await page.getByLabel('Summary').fill('A private way to regain momentum after a stalled day.');
  await page.locator('.novel-prose').fill('Pause, reduce the scope, and restart gently.');

  const verses = page.getByRole('region', { name: 'Verses' });
  await verses.getByRole('searchbox', { name: 'Find Verses' }).fill('creativity');
  await verses.getByRole('button', { name: 'Add' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “My Momentum Reset” as draft.')).toBeVisible();

  await page.goto('/');
  await page.getByLabel('Search Patternverse').fill('my momentum reset');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/#library$/);
  await expect(page.locator('#library')).toContainText('My Momentum Reset');
  await expect(page.locator('#library')).toContainText('1 match');

  await page.getByLabel('Only mine').check();
  await expect(page.locator('#library')).toContainText('My Momentum Reset');
  await page.getByLabel('Search Patternverse').fill('creative reframing');
  await expect(page.locator('#library')).toContainText('Nothing matched yet.');
  await page.getByLabel('Only mine').uncheck();
  await expect(page.locator('#library')).toContainText('Creative Reframing');
  await page.getByLabel('Choose entity types').click();
  await page.getByLabel('Patterns', { exact: true }).uncheck();
  await page.getByLabel('Practices', { exact: true }).uncheck();
  await expect(page.locator('#library')).toContainText('Nothing matched yet.');

  await page.goto('/verse/creativity');
  await expect(page.locator('.verse-groups')).toContainText('My Momentum Reset');
  await expect(page.locator('.verse-groups')).toContainText('includes mine');
});

test('edits ordered Collection items and blocks invalid saves', async ({ page }) => {
  await page.goto('/editor?type=collection');
  await page.getByLabel('Title', { exact: true }).fill('A Useful Order');
  await expect(page.getByLabel('ID · lowercase kebab-case')).toHaveValue('a-useful-order');

  const items = page.getByRole('region', { name: 'Collection items' });
  const itemSearch = items.getByRole('searchbox', { name: 'Find Collection items' });
  await itemSearch.fill('creative reframing');
  await items.getByRole('button', { name: 'Add' }).click();
  await itemSearch.fill('working memory');
  await items.getByRole('button', { name: 'Add' }).click();
  await items.getByRole('button', { name: 'Move Working Memory up' }).click();
  await expect(items.locator('.lookup-selected li').first()).toContainText('Working Memory');

  await page.getByLabel('ID · lowercase kebab-case').fill('Invalid ID');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByRole('alert')).toContainText('lowercase-kebab-case');
});

test('protects unsaved editor changes during navigation', async ({ page }) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('An Unsaved Thought');

  const firstDialogPromise = page.waitForEvent('dialog');
  const firstClickPromise = page.getByRole('link', { name: 'Patternverse home' }).click();
  const firstDialog = await firstDialogPromise;
  expect(firstDialog.message()).toContain('Leave without saving');
  await firstDialog.dismiss();
  await firstClickPromise;
  await expect(page).toHaveURL(/\/editor$/);

  const secondDialogPromise = page.waitForEvent('dialog');
  const secondClickPromise = page.getByRole('link', { name: 'Patternverse home' }).click();
  const secondDialog = await secondDialogPromise;
  await secondDialog.accept();
  await secondClickPromise;
  await expect(page).toHaveURL('/');
});

test('builds and restores an embedded Practice without editing YAML', async ({ page }) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Builder Round Trip');
  await page.locator('.novel-prose').fill('This article stays ordinary Markdown.');

  await page.getByText('Interactive practice', { exact: true }).click();
  await page.getByRole('button', { name: 'Add practice' }).click();
  const builder = page.getByRole('region', { name: 'Interactive practice builder' });
  await builder.getByLabel('Practice title').fill('Builder Practice');
  await builder.getByLabel('Introduction optional').fill('A portable guided sequence.');

  await builder.getByRole('button', { name: 'Text input', exact: true }).click();
  const textBlock = builder.locator('.practice-builder-blocks > li').nth(1);
  await textBlock.getByLabel('Label', { exact: true }).fill('What happened?');
  await textBlock.getByLabel('Placeholder optional').fill('Write a private response.');
  await textBlock.getByLabel('Required').check();

  await builder.getByRole('button', { name: 'Timer', exact: true }).click();
  const timerBlock = builder.locator('.practice-builder-blocks > li').nth(2);
  await timerBlock.getByLabel('Label optional').fill('Pause here');
  await timerBlock.getByLabel('Default duration in minutes').fill('7');

  await builder.getByRole('button', { name: '+ Add step' }).click();
  await expect(builder.locator('.practice-builder-step')).toHaveCount(2);
  await builder.getByText('Preview complete Practice').click();
  await expect(builder).toContainText('What happened?');
  await expect(page.locator('body')).not.toContainText('patternverse-practice');

  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Builder Round Trip” as draft.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Practice title')).toHaveValue('Builder Practice');
  await expect(page.getByLabel('Default duration in minutes')).toHaveValue('7');

  await expect(page.locator('.novel-prose')).toContainText('This article stays ordinary Markdown.');
  await expect(page.locator('.novel-prose')).not.toContainText('patternverse-practice');
});
