<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { Editor, Extension, InputRule } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Markdown } from '@tiptap/markdown';
  import { TableKit } from '@tiptap/extension-table';
  import { closeHistory } from '@tiptap/pm/history';
  import { Selection } from '@tiptap/pm/state';
  import { vimEditing } from './vim-action';
  import { cellDivider } from './cell-divider';
  import { registerRichEditor, richTextMap, replaceRichText } from './rich-text';
  import { useBearingsAi } from './ai.svelte';
  import { aiPrefix } from './ai';
  import type { CursorSettings } from './cursor-settings';
  import type { VimMode, VimStatus } from './vim';
  import type { WritingCaretPosition } from './writing-caret';
  let {
    value,
    label,
    cellId,
    placeholder,
    plain,
    hierarchical,
    vim,
    vimMode,
    cursor,
    onchange,
    oncycle,
    onnext,
    ondivider,
    onboundary,
    onvimchange,
  }: {
    value: string;
    label: string;
    cellId: string;
    placeholder: string;
    plain: boolean;
    hierarchical: boolean;
    vim: boolean;
    vimMode: VimMode;
    cursor: CursorSettings;
    onchange: (markdown: string) => void;
    oncycle: () => void;
    onnext: () => void;
    ondivider: (before: string, after: string) => void;
    onboundary?: (direction: 'left' | 'right' | 'up' | 'down', x: number) => boolean;
    onvimchange: (status: VimStatus) => void;
  } = $props();
  let host: HTMLDivElement;
  const ai = useBearingsAi();
  let editor = $state.raw<Editor>();
  let caret = $state<WritingCaretPosition | null>(null);
  let caretStep = $state(0);
  let vimAction: ReturnType<typeof vimEditing> | undefined;
  let frame = 0,
    composing = false,
    destroyed = false;
  let saved = '';
  let externalValue = '';
  const liveLinks = Extension.create({
    name: 'liveLinks',
    addInputRules() {
      return [
        new InputRule({
          find: /\[([^\]]+)\]\(([^\s)]+)\)$/,
          handler: ({ state, range, match }) => {
            const href = match[2]!;
            if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) return null;
            const text = match[1]!;
            state.tr.insertText(text, range.from, range.to).addMark(
              range.from,
              range.from + text.length,
              state.schema.marks.link!.create({
                href,
                target: '_blank',
                rel: 'noopener noreferrer',
              }),
            );
          },
        }),
      ];
    },
  });
  const literalTildes = Extension.create({
    name: 'literalTildes',
    markdownTokenName: 'del',
    parseMarkdown: (token) => ({ type: 'text', text: token.raw }),
  });
  function vimOptions() {
    return {
      enabled: vim,
      mode: vimMode,
      value: editor ? richTextMap(editor.state.doc).text : '',
      cellId,
      onstate: onvimchange,
      oncycle,
    };
  }
  $effect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute('aria-label', `${label} text`);
    editor.view.dom.dataset.placeholder = placeholder;
    if (vim) editor.view.dom.dataset.vimMode = vimMode;
    else delete editor.view.dom.dataset.vimMode;
    editor.view.dom.dataset.cursorShape = cursor.shape;
    vimAction?.update(vimOptions());
    if (value !== externalValue) {
      externalValue = value;
      if (value !== saved && value !== editor.getMarkdown()) {
        saved = value;
        editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
      }
    }
    schedule();
  });
  function schedule() {
    if (!destroyed && !frame) frame = requestAnimationFrame(measure);
  }
  function measure() {
    frame = 0;
    if (!editor || destroyed) return;
    const node = editor.view.dom;
    const shape =
      vim && vimMode === 'normal' ? 'block' : cursor.shape === 'vertical' ? 'bar' : 'underline';
    const native =
      composing ||
      !editor.isFocused ||
      !editor.state.selection.empty ||
      !document.hasFocus() ||
      document.hidden ||
      matchMedia('(forced-colors: active)').matches ||
      (!matchMedia('(hover: hover) and (pointer: fine)').matches && shape !== 'block');
    caret = null;
    node.classList.toggle('has-writing-caret', !native);
    if (native) return;
    const position = editor.state.selection.from;
    const rect = editor.view.coordsAtPos(position);
    const origin = host.getBoundingClientRect();
    let width =
      shape === 'bar'
        ? cursor.thickness
        : Math.max(11, parseFloat(getComputedStyle(node).fontSize) * 0.8);
    if (shape === 'block') {
      const next = editor.state.doc.nodeAt(position);
      width = next?.isText
        ? Math.max(
            2,
            editor.view.coordsAtPos(
              Math.min(position + [...(next.text ?? '')][0]!.length, editor.state.doc.content.size),
            ).left - rect.left,
          )
        : 8;
      if (width > 50) width = 8;
    }
    caret = {
      left: rect.left - origin.left,
      top: (shape === 'underline' ? rect.bottom - cursor.thickness + 1 : rect.top) - origin.top,
      width,
      height: shape === 'underline' ? cursor.thickness : rect.bottom - rect.top,
      shape,
    };
    caretStep++;
  }
  function keydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return true;
    if (!editor || event.isComposing) return false;
    if (
      onboundary &&
      editor.state.selection.empty &&
      !(vim && vimMode === 'normal') &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      const { doc, selection } = editor.state;
      const first = Selection.atStart(doc).from;
      const last = Selection.atEnd(doc).from;
      const caret = editor.view.coordsAtPos(selection.from);
      const direction = event.key.slice(5).toLowerCase() as 'left' | 'right' | 'up' | 'down';
      const edge = editor.view.coordsAtPos(direction === 'up' ? first : last);
      const atBoundary =
        direction === 'left'
          ? selection.from === first
          : direction === 'right'
            ? selection.from === last
            : direction === 'up'
              ? Math.abs(caret.top - edge.top) < 1
              : Math.abs(caret.bottom - edge.bottom) < 1;
      if (atBoundary && onboundary(direction, caret.left)) {
        event.preventDefault();
        return true;
      }
    }
    if (
      ai?.enabled &&
      event.key === ' ' &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      const { doc, selection } = editor.state;
      const map = richTextMap(doc);
      const scope = aiPrefix(map.text);
      if (
        scope &&
        selection.empty &&
        doc.childCount === 1 &&
        selection.$from.parent.type.name === 'paragraph' &&
        !editor.isActive('code') &&
        map.index(selection.from) === map.text.length
      ) {
        event.preventDefault();
        editor.commands.clearContent();
        ai.open(cellId, scope);
        return true;
      }
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const { selection, doc } = editor.state;
      const block = selection.$from.parent;
      const fence = /^```([\w+-]*)$/.exec(block.textContent);
      if (selection.empty && !block.type.spec.code && fence && selection.$from.depth === 1) {
        event.preventDefault();
        editor
          .chain()
          .deleteRange({ from: selection.$from.start(), to: selection.$from.end() })
          .setCodeBlock(fence[1] ? { language: fence[1] } : undefined)
          .run();
        return true;
      }
      const map = richTextMap(doc);
      const divider = cellDivider(map.text, map.index(selection.from), map.index(selection.to));
      if (selection.empty && !block.type.spec.code && selection.$from.depth === 1 && divider) {
        const before = doc
          .cut(0, divider.before ? map.positions[divider.before.length]! : 0)
          .toJSON();
        const after = doc
          .cut(
            divider.after
              ? map.positions[map.text.length - divider.after.length]!
              : doc.content.size,
            doc.content.size,
          )
          .toJSON();
        event.preventDefault();
        ondivider(editor.markdown!.serialize(before), editor.markdown!.serialize(after));
        return true;
      }
    }
    if (
      !hierarchical &&
      event.key === 'Enter' &&
      (event.shiftKey || event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      onnext();
      return true;
    }
    return false;
  }
  onMount(() => {
    saved = value;
    externalValue = value;
    const current = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({
          strike: false,
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
          dropcursor: { color: '#007a4d', width: 3 },
        }),
        Markdown.configure({ indentation: { style: 'space', size: 2 } }),
        TableKit.configure({ table: { resizable: false } }),
        liveLinks,
        literalTildes,
      ],
      content: value,
      contentType: 'markdown',
      enableInputRules: [
        'bold',
        'italic',
        'code',
        'heading',
        'bulletList',
        'orderedList',
        'blockquote',
        'codeBlock',
        'liveLinks',
      ],
      editorProps: {
        attributes: {
          class: `cell-text rich-text${plain ? ' plain' : ''}`,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': `${label} text`,
          spellcheck: 'true',
          'data-placeholder': placeholder,
        },
        handleKeyDown: (_view, event) => keydown(event),
        handleClick: (_view, _position, event) => {
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
          if (link && (event.metaKey || event.ctrlKey) && /^(https?:|mailto:)/i.test(link.href)) {
            event.preventDefault();
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return true;
          }
          return false;
        },
        handlePaste(_view, event) {
          const text = event.clipboardData?.getData('text/plain');
          if (
            !text ||
            event.clipboardData?.getData('text/html') ||
            !/(^#{1,6} |\*\*|```|^[-*] |^> |\[[^\]]+\]\()/m.test(text)
          )
            return false;
          event.preventDefault();
          current.commands.insertContent(text, { contentType: 'markdown' });
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => {
        saved = instance.getMarkdown();
        onchange(saved);
      },
      onTransaction: () => {
        vimAction?.update(vimOptions());
        schedule();
      },
      onFocus: schedule,
      // Removing a focused editor can synchronously emit blur during a Svelte render.
      onBlur: () =>
        untrack(() => {
          caret = null;
          current.view.dom.classList.remove('has-writing-caret');
        }),
    });
    editor = current;
    const node = current.view.dom;
    const unregister = registerRichEditor(node, current);
    const cellKeys = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (
        ai?.enabled &&
        vim &&
        vimMode === 'normal' &&
        event.key === '~' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !richTextMap(current.state.doc).text
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        current.commands.insertContent('~');
        onvimchange({ mode: 'insert', pending: '' });
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && keydown(event))
        event.stopImmediatePropagation();
    };
    node.addEventListener('keydown', cellKeys, true);
    vimAction = vimEditing(node, vimOptions(), {
      read: () => {
        const map = richTextMap(current.state.doc);
        return { text: map.text, cursor: map.index(current.state.selection.from) };
      },
      write: (text, at) => replaceRichText(current, text, at),
      undo: () => {
        current.commands.undo();
      },
      redo: () => {
        current.commands.redo();
      },
      boundary: () => current.view.dispatch(closeHistory(current.state.tr)),
    });
    // Android bypasses ProseMirror's keydown prop for Enter; cell commands must run first.
    const start = () => {
      composing = true;
      caret = null;
      node.classList.remove('has-writing-caret');
    };
    const end = () => {
      composing = false;
      schedule();
    };
    node.addEventListener('compositionstart', start);
    node.addEventListener('compositionend', end);
    document.addEventListener('selectionchange', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('blur', schedule);
    window.addEventListener('focus', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    const desktop = matchMedia('(hover: hover) and (pointer: fine)'),
      forcedColors = matchMedia('(forced-colors: active)');
    desktop.addEventListener('change', schedule);
    forcedColors.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    void document.fonts.ready.then(schedule);
    void tick().then(schedule);
    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      desktop.removeEventListener('change', schedule);
      forcedColors.removeEventListener('change', schedule);
      document.removeEventListener('visibilitychange', schedule);
      unregister();
      node.removeEventListener('keydown', cellKeys, true);
      vimAction?.destroy();
      current.destroy();
      document.removeEventListener('selectionchange', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('blur', schedule);
      window.removeEventListener('focus', schedule);
    };
  });
</script>

<div
  class="rich-writing-shell"
  style:--writing-cursor-color={cursor.color ?? 'var(--bearings-ink)'}
>
  <div class="rich-writing" class:plain bind:this={host}></div>
  {#if caret}{#key caretStep}<span
        class="writing-caret"
        class:block={caret.shape === 'block'}
        aria-hidden="true"
        style:left={`${caret.left}px`}
        style:top={`${caret.top}px`}
        style:width={`${caret.width}px`}
        style:height={`${caret.height}px`}
      ></span>{/key}{/if}
</div>

<style>
  .rich-writing-shell {
    position: relative;
  }
  .rich-writing :global(.rich-text) {
    position: relative;
    min-height: 52px;
    outline: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: inherit;
    caret-color: var(--writing-cursor-color);
    line-height: 1.7;
  }
  .rich-writing
    :global(.rich-text:has(> p:only-child > br.ProseMirror-trailingBreak:only-child))::before {
    content: attr(data-placeholder);
    position: absolute;
    color: var(--bearings-muted);
    pointer-events: none;
  }
  .rich-writing.plain :global(.rich-text) {
    min-height: 72px;
  }
  .rich-writing :global(.has-writing-caret) {
    caret-color: transparent;
  }
  .rich-writing :global([data-vim-mode='normal']) {
    caret-shape: block;
  }
  @media (hover: hover) and (pointer: fine) {
    .rich-writing :global([data-cursor-shape='horizontal']:not([data-vim-mode='normal'])) {
      caret-shape: underscore;
    }
  }
  .rich-writing :global(.rich-text > :first-child) {
    margin-top: 0;
  }
  .rich-writing :global(.rich-text > :last-child) {
    margin-bottom: 0;
  }
  .rich-writing :global(p) {
    margin: 0.55em 0;
  }
  .rich-writing :global(h1),
  .rich-writing :global(h2),
  .rich-writing :global(h3) {
    font-family: inherit;
    line-height: 1.3;
    margin: 0.85em 0 0.35em;
    letter-spacing: -0.02em;
    font-weight: 650;
  }
  .rich-writing :global(h1) {
    font-size: 1.7em;
  }
  .rich-writing :global(h2) {
    font-size: 1.4em;
  }
  .rich-writing :global(h3) {
    font-size: 1.15em;
  }
  .rich-writing :global(ul),
  .rich-writing :global(ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .rich-writing :global(li > p) {
    margin: 0.15em 0;
  }
  .rich-writing :global(blockquote) {
    margin: 0.7em 0;
    padding: 0.1em 0 0.1em 1em;
    border-left: 2px solid var(--bearings-line);
    color: var(--bearings-muted);
  }
  .rich-writing :global(a) {
    color: var(--bearings-accent);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: text;
  }
  .rich-writing :global(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    background: var(--bearings-surface);
    border-radius: 4px;
    padding: 0.1em 0.3em;
  }
  .rich-writing :global(pre) {
    font-family: ui-monospace, monospace;
    font-size: 0.85em;
    white-space: pre-wrap;
    padding: 0.8em 1em;
    border-radius: 6px;
    background: var(--bearings-surface);
    overflow-wrap: anywhere;
  }
  .rich-writing :global(pre code) {
    padding: 0;
    background: none;
  }
  .rich-writing :global(table) {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    margin: 0.7em 0;
  }
  .rich-writing :global(td),
  .rich-writing :global(th) {
    border: 1px solid var(--bearings-line);
    padding: 0.4em 0.6em;
    min-width: 1em;
  }
  .rich-writing :global(th) {
    background: var(--bearings-surface);
  }
  .writing-caret {
    position: absolute;
    z-index: 1;
    border-radius: 1px;
    background: var(--writing-cursor-color);
    pointer-events: none;
    animation: blink 1s step-end infinite;
  }
  .writing-caret.block {
    background: color-mix(in srgb, var(--writing-cursor-color) 28%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--writing-cursor-color) 45%, transparent);
    animation: none;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .writing-caret {
      animation: none;
    }
  }
</style>
