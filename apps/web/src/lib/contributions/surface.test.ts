// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContributionSurface } from './surface';
import type { ContributionAnchor, ContributionComment, ContributionEdit } from './model';

let surface: ContributionSurface;
afterEach(() => {
  surface?.destroy();
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
});
function fixture() {
  const root = document.createElement('div');
  root.innerHTML =
    '<div class="markdown-body"><h2 id="section-a">A section</h2><p>A <strong>useful</strong> <a href="#section-a">approach</a>.</p><div data-article-widget="demo"><p>Widget state stays private.</p></div><p>A second passage.</p></div>';
  document.body.append(root);
  const callbacks = { comment: vi.fn(), select: vi.fn(), edit: vi.fn(), open: vi.fn() };
  surface = new ContributionSurface(root, callbacks);
  return { root, callbacks };
}
describe('article contribution surface', () => {
  it('preserves links during editing and emits link-only changes without changing the wording', () => {
    const { root, callbacks } = fixture();
    surface.update('edit', [], [], null, false);
    const editor = root.querySelector<HTMLElement>('[contenteditable=true]')!;
    expect(editor.querySelector('a')?.getAttribute('href')).toBe('#section-a');
    const selection = { blockId: 'block-1', from: 2, to: 8, text: 'useful', href: null };
    expect(surface.setLink(selection, '/pattern/run-a-premortem')).toBe(true);
    const edit = callbacks.edit.mock.calls.at(-1)![0] as ContributionEdit;
    expect(edit.before).toBe(edit.after);
    expect(edit.afterLinks).toEqual([
      { from: 2, to: 8, href: '/pattern/run-a-premortem' },
      { from: 9, to: 17, href: '#section-a' },
    ]);
    expect(surface.setLink(selection, 'javascript:alert(1)')).toBe(false);
    surface.update('edit', [edit], [], null, true);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/pattern/run-a-premortem');
    surface.update('edit', [], [], null, false);
    expect(editor.querySelector('a')?.getAttribute('href')).toBe('#section-a');
  });
  it('preserves rich inline markup, scopes duplicate IDs and leaves widget internals alone', () => {
    const { root } = fixture();
    expect(surface.blocks).toHaveLength(3);
    expect(root.querySelector('h2')?.id).toBe('contribution-section-a');
    surface.update('edit', [], [], null, false);
    expect(root.querySelectorAll('[contenteditable=true]')).toHaveLength(2);
    expect(root.querySelector('[data-article-widget]')?.textContent).toBe(
      'Widget state stays private.',
    );
    surface.update('comment', [], [], null, false);
    expect(root.querySelector('strong')?.textContent).toBe('useful');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('#contribution-section-a');
    surface.destroy();
    expect(root.querySelector('h2')?.id).toBe('section-a');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('#section-a');
  });
  it('anchors selections across inline markup and highlights the exact original passage', () => {
    const { root, callbacks } = fixture();
    surface.update('comment', [], [], null, false);
    const p = root.querySelector('p')!,
      range = document.createRange();
    range.setStart(p.querySelector('strong')!.firstChild!, 0);
    range.setEnd(p.querySelector('a')!.firstChild!, 8);
    window.getSelection()!.addRange(range);
    const anchor = surface.selected()!;
    expect(anchor.quote).toBe('useful approach');
    expect(anchor.sectionId).toBe('section-a');
    expect(anchor.text.slice(anchor.start, anchor.end)).toBe(anchor.quote);
    const draft = { id: crypto.randomUUID(), anchor, body: 'Clarify this.' };
    surface.update('comment', [], [], draft, false);
    expect(
      Array.from(root.querySelectorAll('mark'))
        .map((mark) => mark.textContent)
        .join(''),
    ).toBe(anchor.quote);
    expect(root.querySelector('a')).not.toBeNull();
    (root.querySelector('.contribution-pin') as HTMLButtonElement).click();
    expect(callbacks.open).toHaveBeenCalledWith(draft.id);
  });
  it('collects a drag across paragraphs and keeps every passage attached to the same comment', () => {
    const { root, callbacks } = fixture();
    const paragraphs = root.querySelectorAll('p:not([data-article-widget] p)');
    const first = paragraphs[0]!,
      second = paragraphs[1]!;
    const range = document.createRange();
    range.setStart(first.querySelector('strong')!.firstChild!, 0);
    range.setEnd(second.firstChild!, 8);
    window.getSelection()!.addRange(range);
    const anchors = surface.selectedPassages();
    expect(anchors.map((a) => a.quote)).toEqual(['useful approach.', 'A second']);
    const comment = {
      id: crypto.randomUUID(),
      anchor: anchors[0]!,
      additionalAnchors: anchors.slice(1),
      body: 'Compare these explanations.',
    };
    surface.update('comment', [], [comment], null, false);
    expect(root.querySelectorAll('.contribution-pin')).toHaveLength(2);
    expect(
      Array.from(root.querySelectorAll('.contribution-pin')).map((p) => p.textContent),
    ).toEqual(['1', '1']);
    window.getSelection()!.removeAllRanges();
    (second.querySelector('mark') as HTMLElement).click();
    expect(callbacks.open).toHaveBeenCalledWith(comment.id);
    // Selecting the marked paragraph including its pin must still produce exact article offsets.
    const whole = document.createRange();
    whole.selectNodeContents(first);
    window.getSelection()!.addRange(whole);
    expect(surface.selectedPassages()[0]!.quote).toBe('A useful approach.');
    window.getSelection()!.removeAllRanges();
    surface.update('comment', [], [comment], comment, false, true);
    (second.querySelector('mark') as HTMLElement).click();
    expect(callbacks.comment).toHaveBeenCalledWith(
      expect.objectContaining({ blockId: 'block-2' }),
      [],
      false,
    );
  });
  it('uses Shift for additive gestures without changing editing or opening existing comments normally', () => {
    const { root, callbacks } = fixture();
    const p = root.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    window.getSelection()!.addRange(range);
    p.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, shiftKey: true }));
    expect(window.getSelection()!.rangeCount).toBe(0);
    const fresh = document.createRange();
    fresh.selectNodeContents(p.querySelector('strong')!);
    window.getSelection()!.addRange(fresh);
    // The gesture stays additive if Shift is released just before the mouse button.
    p.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(callbacks.comment).toHaveBeenCalledWith(
      expect.objectContaining({ quote: 'useful' }),
      [],
      true,
    );
    surface.update('edit', [], [], null, false);
    const editor = root.querySelector('[contenteditable=true]')!;
    const editingRange = document.createRange();
    editingRange.selectNodeContents(editor);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(editingRange);
    editor.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, shiftKey: true }));
    expect(window.getSelection()!.isCollapsed).toBe(false);
  });
  it('restores live diffs from saved edits and treats proposed markup as text', () => {
    const { root } = fixture();
    const edit: ContributionEdit = {
      blockId: 'block-1',
      sectionId: 'section-a',
      sectionTitle: 'A section',
      before: 'A useful approach.',
      after: '<img src=x onerror=alert(1)>',
    };
    surface.update('edit', [edit], [], null, false);
    const editor = root.querySelector<HTMLElement>('[contenteditable=true]')!;
    expect(root.querySelector('img')).toBeNull();
    expect(editor.querySelector('ins')?.textContent).toContain('<img');
    const original = editor.cloneNode(true) as HTMLElement;
    original.querySelectorAll('ins').forEach((node) => node.remove());
    expect(original.textContent).toBe(edit.before);
    editor.focus();
    surface.update('edit', [edit], [], null, false);
    expect(document.activeElement).toBe(editor);
    surface.update('edit', [], [], null, false);
    expect(editor.textContent).toBe(edit.before);
    expect(editor.querySelector('ins,del')).toBeNull();
  });
  it('shows multiple distinct pins and does not attach stale anchors to changed passages', () => {
    const { root } = fixture();
    const anchor: ContributionAnchor = {
      blockId: 'block-1',
      sectionId: 'section-a',
      sectionTitle: 'A section',
      text: 'A useful approach.',
      quote: '',
      start: 0,
      end: 0,
      x: 0.5,
      y: 0.3,
    };
    const comments: ContributionComment[] = [
      { id: crypto.randomUUID(), anchor, body: 'One' },
      { id: crypto.randomUUID(), anchor: { ...anchor, x: 0.8 }, body: 'Two' },
      { id: crypto.randomUUID(), anchor: { ...anchor, text: 'An older version' }, body: 'Stale' },
    ];
    surface.update('comment', [], comments, null, false);
    expect(root.querySelectorAll('.contribution-pin')).toHaveLength(2);
  });
});
