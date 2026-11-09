import { VimBuffer, type VimMode, type VimRegister, type VimStatus } from './vim';

type Options = {
  enabled: boolean;
  mode: VimMode;
  value: string;
  cellId: string;
  onstate: (status: VimStatus) => void;
  oncycle: () => void;
};
// An internal yank register shared by cells, never written to the system clipboard.
const register: VimRegister = { text: '', linewise: false };

export type VimSurface = {
  read: () => { text: string; cursor: number };
  write: (text: string, cursor: number) => void;
  undo: () => void;
  redo: () => void;
  boundary?: () => void;
};
export function vimEditing(node: HTMLElement, options: Options, surface?: VimSurface) {
  const read = () =>
    surface?.read() ?? {
      text: (node as HTMLTextAreaElement).value,
      cursor: (node as HTMLTextAreaElement).selectionStart,
    };
  const write = (text: string, cursor: number) => {
    if (surface) surface.write(text, cursor);
    else {
      const field = node as HTMLTextAreaElement;
      field.value = text;
      field.setSelectionRange(cursor, cursor);
    }
  };
  let buffer = new VimBuffer(read().text, register);
  let applying = false;
  let status = '';
  let cycleTabHeld = false;
  const report = () => {
    const pending = buffer.pending;
    const next = `${buffer.mode}:${pending}`;
    if (next !== status) {
      status = next;
      options.onstate({ mode: buffer.mode, pending });
    }
  };
  const focus = () => {
    if (!options.enabled) return;
    buffer.clear();
    cycleTabHeld = false;
    buffer.cursor = read().cursor;
    buffer.setMode(options.mode);
    status = '';
    report();
  };
  const blur = () => {
    buffer.finishInsertion();
    buffer.clear();
    cycleTabHeld = false;
    if (options.enabled) report();
  };
  const input = () => {
    if (!options.enabled || applying) return;
    const current = read();
    buffer.input(current.text, current.cursor);
    report();
  };
  const keydown = (event: KeyboardEvent) => {
    if (
      !options.enabled ||
      event.defaultPrevented ||
      event.isComposing ||
      event.metaKey ||
      event.altKey ||
      (event.ctrlKey && !['r', '['].includes(event.key)) ||
      (event.shiftKey && event.key === 'Enter')
    )
      return;
    if (
      buffer.mode === 'normal' &&
      !event.ctrlKey &&
      event.key === 'Tab' &&
      (event.shiftKey || (event.repeat && cycleTabHeld))
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        buffer.clear();
        cycleTabHeld = true;
        report();
        options.oncycle();
      }
      return;
    }
    if (buffer.mode === 'normal' && ['/', '@'].includes(event.key)) {
      buffer.clear();
      report();
      // Reserve library shortcuts without inserting text; the app handles them.
      event.preventDefault();
      return;
    }
    if (
      surface &&
      buffer.mode === 'normal' &&
      ((event.key === 'u' && !event.ctrlKey) || (event.key === 'r' && event.ctrlKey))
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey) surface.redo();
      else surface.undo();
      buffer.reset(read().text);
      buffer.cursor = read().cursor;
      report();
      return;
    }
    buffer.cursor = read().cursor;
    const previousMode = buffer.mode;
    if (!buffer.key(event.key, event.ctrlKey)) return;
    event.preventDefault();
    event.stopPropagation();
    const changed = buffer.text !== read().text;
    applying = true;
    if (changed || buffer.mode !== previousMode) surface?.boundary?.();
    write(buffer.text, buffer.cursor);
    if (changed) {
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
    applying = false;
    // Also refresh the custom cursor for motions without an input event.
    node.dispatchEvent(new Event('select'));
    report();
  };
  const keyup = (event: KeyboardEvent) => {
    if (event.key === 'Tab' && cycleTabHeld) {
      event.preventDefault();
      event.stopPropagation();
      cycleTabHeld = false;
    }
  };
  node.addEventListener('keydown', keydown, !!surface);
  node.addEventListener('keyup', keyup, !!surface);
  node.addEventListener('input', input);
  node.addEventListener('focus', focus);
  node.addEventListener('blur', blur);
  return {
    update(next: Options) {
      if (applying) {
        options = next;
        return;
      }
      const changedCell = next.cellId !== options.cellId;
      const toggled = next.enabled !== options.enabled;
      options = next;
      if (changedCell || toggled) {
        buffer = new VimBuffer(read().text, register);
        cycleTabHeld = false;
      }
      if (next.value !== buffer.text) buffer.reset(next.value);
      if (next.enabled) buffer.setMode(next.mode);
      if (toggled && node === document.activeElement && next.enabled) focus();
    },
    destroy() {
      node.removeEventListener('keydown', keydown, !!surface);
      node.removeEventListener('keyup', keyup, !!surface);
      node.removeEventListener('input', input);
      node.removeEventListener('focus', focus);
      node.removeEventListener('blur', blur);
    },
  };
}
