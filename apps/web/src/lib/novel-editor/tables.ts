import type { Editor } from '@tiptap/core';

export interface TableAction {
  visible: boolean;
  left: number;
  top: number;
  placement: 'side' | 'above';
}
export function tableActionPosition(
  shell: { left: number; top: number; right: number },
  table: { top: number; right: number },
): Omit<TableAction, 'visible'> {
  const placement = shell.right - table.right >= 72 ? 'side' : 'above';
  return {
    placement,
    left: table.right - shell.left + (placement === 'side' ? 8 : 0),
    top:
      placement === 'side'
        ? Math.max(table.top - shell.top, -shell.top + 8)
        : table.top - shell.top - 8,
  };
}

/** Browser effects are owned here; the Svelte component only renders the published placement. */
export function createTableControls(
  shell: HTMLElement,
  getEditor: () => Editor | undefined,
  onchange: (action: TableAction) => void,
) {
  let pointerActive = false;
  let position = 0;
  let disposed = false;
  let action: TableAction = { visible: false, left: 0, top: 0, placement: 'side' };
  function publish(next: Partial<TableAction>) {
    if (disposed) return;
    action = { ...action, ...next };
    onchange(action);
  }
  function place(editor: Editor, table: HTMLTableElement) {
    const firstCell = table.querySelector<HTMLElement>('th, td');
    if (!firstCell || disposed) return;
    position = editor.view.posAtDOM(firstCell, 0) + 1;
    publish({
      visible: true,
      ...tableActionPosition(shell.getBoundingClientRect(), table.getBoundingClientRect()),
    });
  }
  function pointer(event: Event) {
    if (disposed) return;
    const target = event.target instanceof Element ? event.target : null;
    const table = target?.closest('table');
    const isAction = Boolean(target?.closest('.table-hover-action'));
    const editor = getEditor();
    if (table && editor) {
      pointerActive = true;
      place(editor, table);
      return;
    }
    pointerActive = isAction;
    if (!isAction && !editor?.isActive('table')) publish({ visible: false });
  }
  function leave() {
    if (disposed) return;
    pointerActive = false;
    if (!getEditor()?.isActive('table')) publish({ visible: false });
  }
  shell.addEventListener('pointermove', pointer);
  shell.addEventListener('pointerleave', leave);
  return {
    selection(editor: Editor) {
      if (disposed) return;
      if (!editor.isActive('table')) {
        if (!pointerActive) publish({ visible: false });
        return;
      }
      const node = editor.view.domAtPos(editor.state.selection.from).node;
      const element = node instanceof Element ? node : node.parentElement;
      const table = element?.closest('table');
      if (table) place(editor, table);
    },
    blur() {
      if (!pointerActive) publish({ visible: false });
    },
    deleteTable() {
      const editor = getEditor();
      if (disposed || !editor || position < 1) return;
      editor.chain().focus().setTextSelection(position).deleteTable().run();
      pointerActive = false;
      publish({ visible: false });
    },
    dispose() {
      disposed = true;
      shell.removeEventListener('pointermove', pointer);
      shell.removeEventListener('pointerleave', leave);
    },
  };
}
