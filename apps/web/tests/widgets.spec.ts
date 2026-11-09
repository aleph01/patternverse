import { expect, test, type Page } from '@playwright/test';
const inner = (page: Page) => page.frameLocator('.widget-step>iframe').frameLocator('iframe');
async function create(page: Page, template = 'Needs selector') {
  await page.goto('/my?pane=widgets', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Widgets', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Create widget', exact: true }).click();
  await page.locator('.templates').getByRole('button', { name: template, exact: true }).click();
  await page.getByLabel('Widget name', { exact: true }).fill('Needs workflow');
  await page.getByLabel('Purpose', { exact: true }).fill('Select needs for a later reflection.');
  await page.getByRole('button', { name: 'Save private version', exact: true }).click();
  await expect(page.getByText('Private version 0.1.0 saved.', { exact: false })).toBeVisible();
  return page.locator('.widget-settings');
}

test('Widgets → blocks → real practice → private saved run retains released code and accepted outputs', async ({
  page,
}) => {
  page.setDefaultTimeout(20000);

  const settings = await create(page);
  await settings.getByRole('button', { name: 'Preview', exact: true }).click();
  await settings.getByRole('combobox', { name: /Width/ }).selectOption('narrow');
  await settings.getByRole('button', { name: 'Run preview', exact: true }).click();
  await expect(inner(page).getByText('24 starting options', { exact: true })).toBeVisible();
  await inner(page).locator('[data-need="rest"]').focus();
  await inner(page).locator('[data-need="rest"]').press('Space');
  await settings.getByRole('button', { name: /Confirm example/ }).click();
  await expect(settings.getByText('Example answer confirmed.', { exact: true })).toBeVisible();
  await page.goto('/editor?type=pattern', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Title', { exact: true }).fill('Widget workflow');
  await page.getByRole('searchbox', { name: 'Find Verses', exact: true }).fill('Decision Making');
  await page.getByRole('button', { name: 'Add Decision Making', exact: true }).click();
  await page.locator('.editor-practice-disclosure summary').click();
  await page.getByRole('button', { name: 'Add practice', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  const source = page.getByRole('textbox', { name: 'Practice source', exact: true });
  await source.fill(':language 1\n:title "Needs practice"\n-> end\n');
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Add block before completion', exact: true }).click();
  await page.locator('.insert-menu').getByRole('button', { name: 'Widget', exact: true }).click();
  const picker = page.getByRole('region', { name: 'Insert widget', exact: true });
  await picker.getByLabel('Prompt', { exact: true }).fill('Which needs feel unmet?');
  await picker.getByRole('button', { name: 'Insert widget', exact: true }).click();
  await page.getByRole('tab', { name: 'Source', exact: true }).click();
  let text = await source.inputValue();
  expect(text).toContain('selection = !widget widget_ui.needs');
  expect(text).toMatch(/:import "personal\/needs-selector-[a-z\d-]+@0\.1\.0" as widget_ui/);
  text = text.replace(
    '-> end',
    'reflection = !ask {\nSelected needs: {{selection.needs}}\nWhat might help?\n}\n-> end',
  );
  await source.fill(text);
  await expect(page.getByText('✓ No issues', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click();
  await expect(page.getByText('Saved “Widget workflow” as draft.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Run saved practice', exact: false }).click();
  await expect(inner(page).getByRole('button', { name: 'Simple', exact: true })).toBeVisible();
  await inner(page).getByRole('button', { name: 'Detailed', exact: true }).click();
  await inner(page).locator('[data-need="water"]').click();
  await inner(page).getByRole('button', { name: 'Simple', exact: true }).click();
  await expect(
    inner(page).getByRole('button', { name: 'Remove Water', exact: true }),
  ).toBeVisible();
  await expect(
    inner(page).getByText('1 choices from Detailed kept in your selection.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Selected needs: Water/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your response', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save to workspace', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Practice history', exact: false }).click();
  const resume = page.getByRole('link', { name: 'Continue practice', exact: false });
  if (!(await resume.isVisible()))
    await page.locator('.run-list').getByRole('button').first().click();
  await resume.click();
  await expect(page.getByRole('heading', { name: /Selected needs: Water/ })).toBeVisible();
  await expect(page.getByText('needs: Water', { exact: true })).toBeVisible();
  await page.getByLabel('Your response', { exact: true }).fill('Make time for a drink.');
  await page.getByRole('button', { name: /^(?:Next step|Continue) ↓$/ }).click();
  await expect(page.locator('.pattern-run-completion')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the full allowed catalogue and native validation are preserved by the trusted fallback', async ({
  page,
}) => {
  page.setDefaultTimeout(20000);
  const settings = await create(page);
  await settings.getByRole('button', { name: 'Preview', exact: true }).click();
  await settings.getByLabel('Fixture inputs (JSON)', { exact: true }).fill('{"max":1}');
  await settings.getByRole('button', { name: 'Run preview', exact: true }).click();
  await inner(page).locator('[data-need="rest"]').click();
  await inner(page).getByRole('button', { name: 'Detailed', exact: true }).click();
  await inner(page).locator('[data-need="water"]').click();
  const confirm = settings.getByRole('button', { name: /Confirm example/ });
  await expect(confirm).toBeDisabled();
  await settings.getByRole('button', { name: 'Use a plain checklist', exact: true }).click();
  await expect(settings.getByRole('checkbox')).toHaveCount(68);
  await expect(settings.getByRole('checkbox', { name: 'Rest', exact: true })).toBeChecked();
  await expect(settings.getByRole('checkbox', { name: 'Water', exact: true })).toBeChecked();
  await expect(confirm).toBeDisabled();
  await settings.getByRole('checkbox', { name: 'Water', exact: true }).focus();
  await settings.getByRole('checkbox', { name: 'Water', exact: true }).press('Space');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(settings.getByText('Example answer confirmed.', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('arbitrary authored code uses the record bridge while parent DOM, storage, network and stale mounts are blocked', async ({
  page,
}) => {
  page.setDefaultTimeout(20000);
  let escaped = 0;
  await page.route('**/widget-exfil/**', (route) => {
    escaped++;
    void route.abort();
  });
  const settings = await create(page, 'Blank reflection widget');
  await settings.getByRole('button', { name: 'Code', exact: true }).click();
  await settings.getByRole('button', { name: 'widget.html', exact: true }).click();
  const markup = settings.getByRole('textbox', { name: 'widget.html source', exact: true });
  await markup.fill(
    (await markup.inputValue()).replace(
      '<body>',
      `<body><img src="${new URL('/widget-exfil/markup-image', page.url()).href}"><iframe src="${new URL('/widget-exfil/markup-frame', page.url()).href}"></iframe>`,
    ),
  );
  await settings.getByRole('button', { name: 'widget.js', exact: true }).click();
  await settings.getByRole('textbox', { name: 'widget.js source', exact: true })
    .fill(`const api=await widget.ready();
const p={dom:false,storage:false,indexedDB:false,network:false,peer:typeof RTCPeerConnection==='undefined',advance:typeof widget.complete==='undefined'};
try{void top.document.body;}catch{p.dom=true;}
try{localStorage.getItem('secret');}catch{p.storage=true;}
try{indexedDB.open('forbidden');}catch{p.indexedDB=true;}
try{await fetch('${new URL('/widget-exfil/fetch', page.url()).href}');}catch{p.network=true;}
const image=new Image();image.src='${new URL('/widget-exfil/image', page.url()).href}';
const output=document.createElement('output');output.id='probe';output.textContent=JSON.stringify(p);document.body.append(output);
await widget.setDraft({note:JSON.stringify(p),energy:api.inputs.energy});`);
  await settings.getByRole('button', { name: 'Preview', exact: true }).click();
  await settings.getByLabel('Fixture inputs (JSON)', { exact: true }).fill('{"energy":7}');
  await settings.getByRole('button', { name: 'Run preview', exact: true }).click();
  await expect(inner(page).locator('#probe')).toContainText('"dom":true');
  const probe = JSON.parse(await inner(page).locator('#probe').innerText());
  expect(Object.values(probe).every((v) => v === true)).toBe(true);
  expect(escaped).toBe(0);
  await expect(settings.getByRole('button', { name: /Confirm example/ })).toBeEnabled();
  // Messages without the private per-mount port cannot overwrite a draft.
  await page.evaluate(() =>
    window.postMessage(
      { type: 'draft', id: 999, outputs: { note: 'forged', energy: 99 } },
      location.origin,
    ),
  );
  await settings.getByRole('button', { name: /Confirm example/ }).click();
  await expect(settings.getByText('Example answer confirmed.', { exact: true })).toBeVisible();
  await expect(settings.locator(':scope > pre')).toContainText('"energy": 7');
  await settings.getByRole('button', { name: 'Restart preview', exact: true }).click();
  await expect(settings.getByText('Example answer confirmed.', { exact: true })).toHaveCount(0);
  await expect(inner(page).locator('#probe')).toBeVisible();
  expect(escaped).toBe(0);
  await inner(page)
    .locator('#probe')
    .evaluate(
      (_, target) => location.assign(target),
      new URL('/widget-exfil/navigation', page.url()).href,
    );
  await expect(settings.locator('.widget-error')).toContainText('unsupported navigation');
  expect(escaped).toBe(0);
});

test('exports a personal release and imports its exact code into another workspace without enabling it', async ({
  page,
  browser,
}) => {
  const settings = await create(page, 'Blank reflection widget');
  await settings.getByRole('button', { name: 'Versions', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await settings.getByRole('button', { name: 'Export package', exact: true }).click();
  const download = await downloadEvent;
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile((await download.path())!);
  const second = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const other = await second.newPage();
    await other.goto(new URL('/my?pane=widgets', page.url()).href, {
      waitUntil: 'domcontentloaded',
    });
    const manager = other.locator('.widget-settings');
    await manager.getByRole('heading', { name: 'Widgets', exact: true }).waitFor();
    await manager.locator('input[type=file]').setInputFiles({
      name: 'reflection.widget.json',
      mimeType: 'application/json',
      buffer: bytes,
    });
    await expect(
      manager.getByText('Package imported and disabled.', { exact: false }),
    ).toBeVisible();
    await expect(manager.getByText('Disabled release', { exact: true })).toBeVisible();
    await manager.locator('.widget-card').click();
    await expect(other).toHaveURL(/\/my\/widgets\/edit\?release=/);
    const inspector = other.locator('.widget-editor');
    const toggle = inspector.getByRole('checkbox', {
      name: 'Enabled for practice rendering',
      exact: true,
    });
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await inspector.getByRole('button', { name: 'Versions', exact: true }).click();
    const exported = other.waitForEvent('download');
    await inspector.getByRole('button', { name: 'Export package', exact: true }).click();
    expect(JSON.parse(await readFile((await (await exported).path())!, 'utf8'))).toEqual(
      JSON.parse(bytes.toString()),
    );
  } finally {
    await second.close();
  }
});

test('uses a dedicated widget tab, expandable carousel, and full-page editors and release inspection', async ({
  page,
}) => {
  page.setDefaultTimeout(20000);
  await page.goto('/my?pane=settings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'settings', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create widget', exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('button', { name: 'Widgets', exact: true })
    .click();
  await expect(page).toHaveURL(/pane=widgets/);
  for (let index = 1; index <= 5; index++) {
    await page.getByRole('link', { name: 'Create widget', exact: true }).click();
    await expect(page).toHaveURL(/\/my\/widgets\/edit\?new=1/);
    await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toHaveCount(0);
    await page.getByLabel('Widget name', { exact: true }).fill(`Carousel widget ${index}`);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByText('Widget draft saved.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/my\/widgets\/edit\?id=/);
    await page.getByRole('link', { name: '← Widgets', exact: true }).click();
  }
  const carousel = page.getByRole('region', { name: 'Widget carousel', exact: true });
  await expect(carousel.locator('.widget-card')).toHaveCount(5);
  const rail = carousel.locator('ul');
  expect(await rail.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  const next = page.getByRole('button', { name: 'Next widgets', exact: true });
  await expect(next).toBeEnabled();
  await next.focus();
  await next.press('Enter');
  await expect.poll(() => rail.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  await page.screenshot({
    path: `/tmp/widget-ui-carousel-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('link', { name: 'View all widgets', exact: true }).click();
  await expect(page).toHaveURL(/\/my\/widgets\?tab=mine/);
  await expect(page.getByRole('navigation', { name: 'Workspace navigation' })).toHaveCount(0);
  await expect(page.locator('.card-grid .widget-card')).toHaveCount(5);
  await page.getByRole('searchbox', { name: 'Find widgets', exact: true }).fill('widget 3');
  await expect(page.locator('.card-grid .widget-card')).toHaveCount(1);
  await page.locator('.widget-card').click();
  await expect(page.getByLabel('Widget name', { exact: true })).toHaveValue('Carousel widget 3');
  await page.getByRole('button', { name: 'Save private version', exact: true }).click();
  await expect(page.getByText('Private version 0.1.0 saved.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: '← Widgets', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Widget library' })
    .getByRole('button', { name: /Installed/ })
    .click();
  await page.locator('.widget-card').click();
  await expect(page).toHaveURL(/\/my\/widgets\/edit\?release=/);
  await expect(page.getByText('Private version 0.1.0 · Read-only', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Widget name', { exact: true })).toHaveAttribute('readonly', '');
  await page.screenshot({
    path: `/tmp/widget-ui-inspector-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'widget.json source', exact: true }),
  ).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Duplicate to edit', exact: true }).click();
  await expect(page).toHaveURL(/\/my\/widgets\/edit\?id=/);
  await expect(page.getByLabel('Widget name', { exact: true })).toHaveValue(
    'Carousel widget 3 copy',
  );
  await expect(page.getByLabel('Widget name', { exact: true })).not.toHaveAttribute('readonly', '');
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('highlights authored files, offers compact file actions, and displays visible input fields', async ({
  page,
}) => {
  page.setDefaultTimeout(30000);
  await create(page, 'Blank reflection widget');
  const name = page.getByLabel('Widget name', { exact: true });
  expect(
    await name.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth)),
  ).toBeGreaterThan(0);
  expect(await name.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.locator('.syntax-layer [class^="syntax-"]').first()).toBeVisible();
  for (const file of ['widget.html', 'widget.css', 'widget.js', 'widget.json']) {
    await page.getByRole('button', { name: file, exact: true }).click();
    await expect(page.getByRole('textbox', { name: `${file} source`, exact: true })).toBeVisible();
    await expect(page.locator('.syntax-layer [class^="syntax-"]').first()).toBeVisible();
  }
  const add = page.getByRole('button', { name: 'Add file', exact: true });
  expect(await add.innerText()).toBe('');
  await expect(page.getByLabel('New file name', { exact: true })).toHaveCount(0);
  await add.click();
  await page.getByLabel('New file name', { exact: true }).fill('helper.js');
  await page.getByLabel('New file name', { exact: true }).press('Enter');
  const source = page.getByRole('textbox', { name: 'helper.js source', exact: true });
  const code = 'const total = 42;\n// café & <script> remains text\n';
  await source.fill(code);
  await expect(page.locator('.syntax-layer .syntax-kwd').first()).toHaveText('const');
  await page.getByRole('button', { name: 'widget.json', exact: true }).click();
  const rename = page.getByRole('button', { name: 'Rename helper.js', exact: true });
  await rename.focus();
  await expect(rename).toHaveCSS('opacity', '1');
  await rename.click();
  const renameField = page.getByLabel('Rename file', { exact: true });
  await renameField.fill('renamed-helper.js');
  await renameField.press('Enter');
  // Renaming another file preserves the active file and both source buffers.
  await expect(
    page.getByRole('textbox', { name: 'widget.json source', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'renamed-helper.js', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'renamed-helper.js source', exact: true }),
  ).toHaveValue(code);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Widget draft saved.', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await page.getByRole('button', { name: 'renamed-helper.js', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'renamed-helper.js source', exact: true }),
  ).toHaveValue(code);
  await page.screenshot({
    path: `/tmp/widget-source-ui-${test.info().project.name}.png`,
    fullPage: true,
  });
  // Renaming an exported definition keeps the declared package export connected.
  await page.getByRole('button', { name: 'Rename widget.json', exact: true }).focus();
  await page.getByRole('button', { name: 'Rename widget.json', exact: true }).click();
  await page.getByLabel('Rename file', { exact: true }).fill('definition.json');
  await page.getByLabel('Rename file', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Inputs & outputs', exact: true }).click();
  await expect(page.getByText('energy', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByLabel('Version', { exact: true }).fill('0.2.0');
  await page.getByRole('button', { name: 'Save private version', exact: true }).click();
  await expect(page.getByText('Private version 0.2.0 saved.', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('left-aligns file names and supports hover deletion with undo and a safe active-file fallback', async ({
  page,
}) => {
  page.setDefaultTimeout(30000);
  await create(page, 'Blank reflection widget');
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  const fileNames = page.locator('.file-select');
  async function checkAlignment() {
    const lefts = await fileNames.evaluateAll((buttons) =>
      buttons.map((button) => {
        const range = document.createRange();
        range.selectNodeContents(button);
        return range.getBoundingClientRect().left;
      }),
    );
    const header = await page
      .locator('.files-heading>span')
      .evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1);
    expect(Math.abs(lefts[0] - header)).toBeLessThan(1);
  }
  await checkAlignment();
  await page.getByRole('button', { name: 'widget.html', exact: true }).hover();
  await expect(page.getByRole('button', { name: 'Delete widget.html', exact: true })).toBeVisible();
  await checkAlignment();
  const originalOrder = await fileNames.allTextContents();
  await page.getByRole('button', { name: 'Delete widget.html', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(fileNames).toHaveText(originalOrder);
  // Undo restores package bytes and file order, so its unchanged release remains valid.
  await page.getByRole('button', { name: 'Save private version', exact: true }).click();
  await expect(page.getByText('Private version 0.1.0 saved.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Add file', exact: true }).click();
  await page.getByLabel('New file name', { exact: true }).fill('spare.js');
  await page.getByLabel('New file name', { exact: true }).press('Enter');
  const source = 'const preserved = "draft content";';
  await page.getByRole('textbox', { name: 'spare.js source', exact: true }).fill(source);
  await page.getByRole('button', { name: 'widget.json', exact: true }).click();
  const spareRow = page
    .locator('.file-row')
    .filter({ has: page.getByRole('button', { name: 'spare.js', exact: true }) });
  await spareRow.hover();
  await expect(spareRow.locator('.file-actions')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Delete spare.js', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'widget.json source', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'spare.js', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'spare.js', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'spare.js source', exact: true })).toHaveValue(
    source,
  );
  // Keyboard focus exposes the same actions as hovering.
  const remove = page.getByRole('button', { name: 'Delete spare.js', exact: true });
  await remove.focus();
  await remove.press('Enter');
  await expect(
    page.getByRole('textbox', { name: 'widget.json source', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'spare.js source', exact: true })).toHaveValue(
    source,
  );
  await page.getByRole('button', { name: 'Delete spare.js', exact: true }).focus();
  await page.getByRole('button', { name: 'Delete spare.js', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Widget draft saved.', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'spare.js', exact: true })).toHaveCount(0);
  await checkAlignment();
  await page.getByRole('button', { name: 'widget.html', exact: true }).hover();
  await page.screenshot({
    path: `/tmp/widget-file-actions-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await checkAlignment();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
