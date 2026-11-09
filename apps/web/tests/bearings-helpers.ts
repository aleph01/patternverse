import { expect, type Page, type Locator } from '@playwright/test';
import type { Editor } from '@tiptap/core';

/** Desktop exposes actions directly; narrow layouts keep the same actions in the header menu. */
export async function notebookControl(
  page: Page,
  name: string,
  role: 'button' | 'combobox' = 'button',
) {
  const control = page.getByRole(role, { name, exact: true });
  if (!(await control.isVisible())) {
    const menu = page.getByRole('button', { name: 'Notebook actions', exact: true });
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
  }
  return control;
}
export async function clickNotebookControl(page: Page, name: string) {
  await (await notebookControl(page, name)).click();
}

/** Arrange text fixtures through the editor API; browser typing/paste has its own coverage. */
export async function fillField(field: Locator, value: string) {
  if (await field.evaluate((node) => (node as HTMLElement).isContentEditable)) {
    await field.focus();
    await field.evaluate((node, text) => {
      const editor = (node as HTMLElement & { editor: Editor }).editor;
      editor.commands.setContent({
        type: 'doc',
        content: text.split('\n').map((line) => ({
          type: 'paragraph',
          content: line ? [{ type: 'text', text: line }] : [],
        })),
      });
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    }, value);
  } else await field.fill(value);
  await expectFieldValue(field, value);
}

export async function fieldValue(field: Locator): Promise<string> {
  return field.evaluate(async (node: HTMLElement) => {
    if (!node.isContentEditable) return (node as HTMLInputElement).value;
    const modulePath = '/src/lib/bearings/rich-text.ts';
    const { richEditor } = await import(modulePath);
    return richEditor(node)?.getText({ blockSeparator: '\n' }) ?? node.innerText;
  });
}
export async function expectFieldValue(field: Locator, value: string | RegExp) {
  if (value instanceof RegExp) await expect.poll(() => fieldValue(field)).toMatch(value);
  else {
    const editable = await field.evaluate((node) => (node as HTMLElement).isContentEditable);
    await expect
      .poll(async () =>
        editable ? (await fieldValue(field)).replace(/\n{2,}/g, '\n') : fieldValue(field),
      )
      .toBe(editable ? value.replace(/\n{2,}/g, '\n') : value);
  }
}
export async function writingCursor(field: Locator): Promise<number> {
  return field.evaluate(async (node: HTMLElement) => {
    const modulePath = '/src/lib/bearings/rich-text.ts';
    const { richEditor, richTextMap } = await import(modulePath);
    const editor = richEditor(node);
    return editor
      ? richTextMap(editor.state.doc).index(editor.state.selection.from)
      : (node as HTMLTextAreaElement).selectionStart;
  });
}
export async function setWritingCursor(field: Locator, offset: number | string) {
  await field.evaluate(async (node: HTMLElement, at: number | string) => {
    const modulePath = '/src/lib/bearings/rich-text.ts';
    const { richEditor, setRichSelection } = await import(modulePath);
    const text = richEditor(node)?.getText({ blockSeparator: '\n' }) ?? '';
    setRichSelection(node, typeof at === 'string' ? text.indexOf(at) + at.length : at);
  }, offset);
}

export async function addTextCell(
  page: Page,
  text: string,
  kind: 'answer' | 'note' | 'approach' = 'answer',
) {
  await page.getByRole('button', { name: 'Add cell', exact: true }).last().click();
  const active = page.locator('.notebook-cell.active');
  const label = kind === 'approach' ? 'Own approach' : kind === 'note' ? 'Comment' : 'Note';
  await active
    .getByRole('group', { name: 'Cell type', exact: true })
    .getByRole('button', { name: label, exact: true })
    .click();
  await fillField(active.locator('.cell-text'), text);
  const id = await active.getAttribute('data-cell');
  return page.locator(`[data-cell="${id}"]`);
}
