import { expect, test } from '@playwright/test';

test('chooses an entity type before showing its matching editor', async ({ page }) => {
  await page.goto('/editor');

  await expect(page.getByRole('heading', { name: 'What would you like to create?' })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create a pattern' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a verse' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a collection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a concept' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create a practice' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Create a pattern' }).click();
  await expect(page).toHaveURL(/\/editor\?type=pattern$/);
  await expect(page.getByRole('heading', { name: 'New pattern' })).toBeVisible();
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

test('old creation URLs offer patterns instead of new concepts or standalone practices', async ({
  page,
}) => {
  for (const type of ['concept', 'practice']) {
    await page.goto(`/editor?type=${type}`);
    await expect(
      page.getByRole('heading', { name: 'What would you like to create?' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a pattern' })).toBeVisible();
    await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Create a ${type}` })).toHaveCount(0);
  }
});

test('personal entities persist and support local status updates and deletion', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('My First Pattern');
  await page.locator('summary').filter({ hasText: 'Credits & technical details' }).click();
  await expect(page.getByLabel('Pattern ID', { exact: true })).toHaveValue('my-first-pattern');
  await page.locator('.novel-prose').fill('A private test entity.');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “My First Pattern” as draft.')).toBeVisible();

  await page.goto('/my');

  await page.getByRole('button', { name: /^Patterns/ }).click();
  const localEntity = page.locator('.content-card').filter({
    has: page.getByRole('heading', { name: 'My First Pattern' }),
  });
  await expect(localEntity).toContainText('pattern · mine · draft');

  await page.reload();
  await page.getByRole('button', { name: /^Patterns/ }).click();
  await expect(localEntity).toContainText('pattern · mine · draft');

  await localEntity.getByRole('button', { name: 'Mark ready' }).click();
  await expect(localEntity).toContainText('pattern · mine · ready');

  page.once('dialog', (dialog) => dialog.accept());
  await localEntity.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.content-card')).toHaveCount(0);
  await expect(page.getByText(/No personal patterns yet/)).toBeVisible();
});

test('workspace exposes creation and compact navigation without manual ordering', async ({
  page,
}) => {
  await page.goto('/my');
  await expect(page.getByRole('link', { name: 'New verse', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New collection', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New pattern', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /reorder|move .* up/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Workspace name')).toBeVisible();
  await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download workspace backup' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();

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

  await page.goto('/library');
  await page.getByRole('searchbox').fill('my momentum reset');
  await expect(page.locator('#library')).toContainText('My Momentum Reset');
  await expect(page.locator('#library')).toContainText('1 match');
  await page.getByRole('button', { name: /^My library/ }).click();
  await expect(page.locator('#library')).toContainText('My Momentum Reset');
  await page.getByRole('searchbox').fill('creative reframing');
  await expect(page.locator('#library')).toContainText('No matching patterns');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('#library')).toContainText('Creative Reframing');
  await expect(page.getByRole('button', { name: 'Concepts', exact: true })).toHaveCount(0);

  await page.goto('/verse/creativity');
  await expect(page.locator('.verse-groups')).toContainText('My Momentum Reset');
  await expect(page.locator('.verse-groups')).toContainText('includes mine');
});

test('edits collection references without manual ordering and blocks invalid saves', async ({
  page,
}) => {
  await page.goto('/editor?type=collection&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('A Useful Order');
  await expect(page.getByLabel('ID · lowercase kebab-case')).toHaveValue('a-useful-order');

  const items = page.getByRole('region', { name: 'Collection items' });
  const itemSearch = items.getByRole('searchbox', { name: 'Find Collection items' });
  await itemSearch.fill('creative reframing');
  await items.getByRole('button', { name: 'Add' }).click();
  await itemSearch.fill('working memory');
  await items.getByRole('button', { name: 'Add' }).click();
  await expect(items.getByRole('button', { name: /^Move / })).toHaveCount(0);
  await expect(items.locator('.lookup-selected li').first()).toContainText('Creative Reframing');

  await page.getByLabel('ID · lowercase kebab-case').fill('Invalid ID');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByRole('alert')).toContainText('lowercase-kebab-case');
});

test('protects unsaved editor changes during navigation', async ({ page }) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('An Unsaved Thought');

  const firstDialogPromise = page.waitForEvent('dialog');
  const firstClickPromise = page
    .getByRole('banner')
    .getByRole('link', { name: 'Patternverse home' })
    .click();
  const firstDialog = await firstDialogPromise;
  expect(firstDialog.message()).toContain('Leave without saving');
  await firstDialog.dismiss();
  await firstClickPromise;
  await expect(page).toHaveURL(/\/editor\?type=pattern$/);

  const secondDialogPromise = page.waitForEvent('dialog');
  const secondClickPromise = page
    .getByRole('banner')
    .getByRole('link', { name: 'Patternverse home' })
    .click();
  const secondDialog = await secondDialogPromise;
  await secondDialog.accept();
  await secondClickPromise;
  await expect(page).toHaveURL('/');
});

test('preserves the builder for an existing legacy Practice without forced conversion', async ({
  page,
}) => {
  await page.goto('/editor?type=pattern&verse=creativity');
  await page.getByLabel('Title', { exact: true }).fill('Builder Round Trip');
  await page.locator('.novel-prose').fill('This article stays ordinary Markdown.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved “Builder Round Trip” as draft.')).toBeVisible();
  // Simulate an existing portable legacy record in this isolated test browser.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('patternverse-workspace-v1');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('entities', 'readwrite');
      const store = transaction.objectStore('entities');
      const read = store.get('builder-round-trip');
      read.onsuccess = () =>
        store.put({
          ...read.result,
          body: 'This article stays ordinary Markdown.\n\n```patternverse-practice\ntitle: Legacy Practice\nsteps:\n  - id: first-step\n    blocks:\n      - id: first-copy\n        type: markdown\n        content: Take a small step.\n```',
        });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.goto('/editor?id=builder-round-trip');
  await expect(page.getByText('Existing structured practice · unchanged')).toBeVisible();
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
