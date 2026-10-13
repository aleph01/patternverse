// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusPicker, handleDialogKeydown } from './dialog-focus';

afterEach(() => {
  document.body.replaceChildren();
});
function fixture() {
  const trigger = document.createElement('button');
  const panel = document.createElement('div');
  panel.tabIndex = -1;
  const first = document.createElement('button');
  const disabled = document.createElement('input');
  disabled.disabled = true;
  const select = document.createElement('select');
  const textarea = document.createElement('textarea');
  panel.append(first, disabled, select, textarea);
  document.body.append(trigger, panel);
  trigger.focus();
  return { trigger, panel, first, select, textarea };
}
function key(shiftKey = false) {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
}

describe('shared Mira dialog keyboard focus', () => {
  it('includes selects and textareas and loops focus in both directions', () => {
    const test = fixture();
    const close = vi.fn();
    const action = focusPicker(test.panel, close);
    expect(document.activeElement).toBe(test.panel);
    test.panel.dispatchEvent(key());
    expect(document.activeElement).toBe(test.first);
    test.first.dispatchEvent(key(true));
    expect(document.activeElement).toBe(test.textarea);
    test.textarea.dispatchEvent(key());
    expect(document.activeElement).toBe(test.first);
    test.select.focus();
    const event = key();
    test.select.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    action.destroy();
    expect(document.activeElement).toBe(test.trigger);
  });

  it('closes on Escape and removes handlers when a picker is destroyed', () => {
    const test = fixture();
    const close = vi.fn();
    const action = focusPicker(test.panel, close);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    test.panel.dispatchEvent(escape);
    expect(close).toHaveBeenCalledTimes(1);
    expect(escape.defaultPrevented).toBe(true);
    action.destroy();
    test.panel.dispatchEvent(escape);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps focus inside an empty dialog and ignores unrelated keys', () => {
    const panel = document.createElement('div');
    const tab = key();
    handleDialogKeydown(tab, panel, vi.fn());
    expect(tab.defaultPrevented).toBe(true);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    handleDialogKeydown(enter, panel, vi.fn());
    expect(enter.defaultPrevented).toBe(false);
  });

  it('lets a coordinating host own return focus while preserving the keyboard trap', () => {
    const test = fixture();
    const close = vi.fn();
    const action = focusPicker(test.panel, { close, restoreFocus: false });
    test.panel.dispatchEvent(key());
    expect(document.activeElement).toBe(test.first);
    action.destroy();
    expect(document.activeElement).toBe(test.first);
  });

  it('updates the close callback without recapturing focus', () => {
    const test = fixture();
    const first = vi.fn();
    const next = vi.fn();
    const action = focusPicker(test.panel, first);
    action.update({ close: next, restoreFocus: false });
    test.panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(first).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    action.destroy();
    expect(document.activeElement).toBe(test.panel);
  });
});
