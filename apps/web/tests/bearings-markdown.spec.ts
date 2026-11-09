import { expect, test, type Page } from '@playwright/test';
import { addTextCell } from './bearings-helpers';

async function open(page: Page) {
  await page.goto('/apps/bearings?preview=1');
  await page.getByRole('button', { name: 'New situation', exact: true }).click();
  await page.getByLabel('What would you like to work through?').fill('Markdown writing');
  await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
  return addTextCell(page, '');
}
async function savedText(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/src/lib/client/workspace.ts';
    const { getLocalWorkspace } = await import(modulePath);
    return (
      (await (await getLocalWorkspace()).listSituations())[0].notebook?.chapters[0].cells ?? []
    )
      .map((cell: { text: string }) => cell.text)
      .join('\n');
  });
}
test('formats Markdown while typing and keeps formatting through saving, Tree, and fullscreen', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const cell = await open(page);
  const field = cell.locator('.cell-text');
  await field.pressSequentially('# A clearer direction');
  await expect(field.locator('h1')).toHaveText('A clearer direction');
  await field.press('Enter');
  await field.pressSequentially('Try **one small step** and `notice` what happens.');
  await expect(field.locator('strong')).toHaveText('one small step');
  await expect(field.locator('code')).toHaveText('notice');
  await field.press('Enter');
  await field.pressSequentially('- Have a conversation');
  await expect(field.locator('ul li')).toContainText('Have a conversation');
  await field.press('Enter');
  await field.pressSequentially('Review what I learn');
  await expect(field.locator('ul li')).toHaveCount(2);
  await field.press('Enter');
  await field.press('Enter');
  await field.pressSequentially('> Keep room to explore.');
  await expect(field.locator('blockquote')).toContainText('Keep room to explore.');
  await expect.poll(() => savedText(page)).toContain('**one small step**');
  await page.screenshot({ path: `/private/tmp/bearings-markdown-${info.project.name}.png` });
  await page.reload();
  await expect(field.locator('h1')).toHaveText('A clearer direction');
  await expect(field.locator('strong')).toHaveText('one small step');
  await page.getByRole('button', { name: 'Tree', exact: true }).click();
  await expect(page.locator('.select-note .cell-markdown h1')).toHaveText('A clearer direction');
  await page.locator('.tree-cell .select-note').click();
  await expect(page.locator('.tree-cell .cell-text strong')).toHaveText('one small step');
  await page.locator('.tree-cell .cell-text').press('Shift+Enter');
  const focus = page.getByRole('dialog', { name: 'Focus editor' });
  await expect(focus.locator('.cell-text strong')).toHaveText('one small step');
  await focus.getByRole('button', { name: 'Done', exact: true }).click();
});

test('keeps inline pattern search, deletion, and Markdown dividers available in the live editor', async ({
  page,
}) => {
  test.setTimeout(60000);
  const cell = await open(page);
  let field = cell.locator('.cell-text');
  await field.pressSequentially('A **useful** thought.');
  await field.press('Enter');
  await field.pressSequentially('---');
  await field.press('Enter');
  await expect(page.locator('.notebook-cell')).toHaveCount(2);
  await expect(cell.locator('strong')).toHaveText('useful');
  field = page.locator('.notebook-cell.active .cell-text');
  await expect(field).toBeFocused();
  await field.press('@');
  const picker = page.getByRole('dialog', { name: 'Find a pattern' });
  await expect(picker).toHaveAttribute('data-anchor', 'caret');
  await picker.getByRole('combobox').fill('Define the Decision');
  await picker.getByRole('combobox').press('Enter');
  const pattern = page.locator('.notebook-cell.pattern');
  await expect(pattern).toHaveCount(1);
  await pattern.getByRole('heading').click();
  await page.keyboard.press('Meta+Backspace');
  await expect(pattern).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(pattern).toHaveCount(1);
  await expect(cell.locator('strong')).toHaveText('useful');
});

test('supports Vim editing, type cycling, and cursor preferences without removing formatting', async ({
  page,
}, info) => {
  const cell = await open(page);
  let field = cell.locator('.cell-text');
  await field.pressSequentially('A **bold** thought');
  await page.getByRole('button', { name: 'Notebook actions' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('switch', { name: 'Basic Vim mode' }).click();
  await settings.getByRole('button', { name: 'Vertical', exact: true }).click();
  await settings.getByRole('slider', { name: 'Cursor thickness' }).fill('4');
  await settings.getByRole('button', { name: 'Green cursor' }).click();
  await settings.getByRole('button', { name: 'Close settings' }).click();
  await field.focus();
  await expect(cell.locator('.writing-caret.block')).toHaveCount(1);
  await field.pressSequentially('ggw');
  await field.press('Shift+Tab');
  await expect(cell).toHaveAttribute('data-kind', 'note');
  field = cell.locator('.cell-text');
  await expect(field).toBeFocused();
  await field.pressSequentially('dw');
  await expect(field).not.toContainText('bold');
  await field.press('u');
  await expect(field.locator('strong')).toHaveText('bold');
  await field.press('A');
  await expect(field).toHaveAttribute('data-vim-mode', 'insert');
  if (info.project.name === 'desktop')
    await expect(cell.locator('.writing-caret')).toHaveCSS('width', '4px');
  await field.pressSequentially(' with more room');
  await expect(field).toContainText('with more room');
  await expect(field.locator('strong')).toHaveText('bold');
  await field.press('Escape');
  await expect(field).toHaveAttribute('data-vim-mode', 'normal');
  await field.press('@');
  await expect(page.getByRole('dialog', { name: 'Find a pattern' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Find a pattern' }).press('Escape');
  await expect(field).toBeFocused();
});

test('formats typed links and fenced code, and safely accepts pasted Markdown', async ({
  page,
}) => {
  const cell = await open(page);
  const field = cell.locator('.cell-text');
  await field.pressSequentially('[A reference](https://example.com)');
  await expect(field.locator('a')).toHaveText('A reference');
  await expect(field.locator('a')).toHaveAttribute('href', 'https://example.com');
  await field.press('Enter');
  await field.pressSequentially('```javascript');
  await field.press('Enter');
  await field.pressSequentially('const idea = "try it";');
  await field.press('Enter');
  await field.pressSequentially('---');
  await field.press('Enter');
  await expect(page.locator('.notebook-cell')).toHaveCount(1);
  await expect(field.locator('pre code')).toContainText('const idea');
  await expect(field.locator('pre code')).toContainText('---');
  const literal = await addTextCell(page, '');
  await literal.locator('.cell-text').pressSequentially('```');
  await literal.locator('.cell-text').press('Enter');
  await literal.locator('.cell-text').pressSequentially('@decorator');
  await expect(literal.locator('pre code')).toHaveText('@decorator');
  await expect(page.getByRole('dialog', { name: 'Find a pattern' })).toHaveCount(0);
  const pasted = await addTextCell(page, '');
  await pasted.locator('.cell-text').evaluate((node) => {
    const data = new DataTransfer();
    data.setData(
      'text/plain',
      '## Pasted idea\n\n**Keep the emphasis.**\n\n| Step | Why |\n| --- | --- |\n| Try | Learn |\n\n<script>window.markdownExecuted = true</script>',
    );
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(pasted.locator('h2')).toHaveText('Pasted idea');
  await expect(pasted.locator('strong')).toHaveText('Keep the emphasis.');
  await expect(pasted.locator('table')).toContainText('Learn');
  await expect(pasted.locator('script')).toHaveCount(0);
  expect(await page.evaluate(() => 'markdownExecuted' in window)).toBe(false);
});
