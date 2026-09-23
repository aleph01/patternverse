<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Editor, type Editor as TiptapEditor } from '@tiptap/core';
  import Placeholder from '@tiptap/extension-placeholder';
  import { TableKit } from '@tiptap/extension-table';
  import { Markdown } from '@tiptap/markdown';
  import StarterKit from '@tiptap/starter-kit';
  import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

  type SlashItem = {
    id: 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'quote' | 'code' | 'rule' | 'table';
    label: string;
    description: string;
    mark: string;
    keywords: string;
  };

  let {
    value,
    disabled = false,
    onchange,
  }: {
    value: string;
    disabled?: boolean;
    onchange: (markdown: string) => void;
  } = $props();

  const slashItems: readonly SlashItem[] = [
    {
      id: 'text',
      label: 'Text',
      description: 'A simple paragraph',
      mark: 'T',
      keywords: 'paragraph plain',
    },
    {
      id: 'h1',
      label: 'Heading 1',
      description: 'Large section heading',
      mark: 'H1',
      keywords: 'title heading',
    },
    {
      id: 'h2',
      label: 'Heading 2',
      description: 'Medium section heading',
      mark: 'H2',
      keywords: 'subtitle heading',
    },
    {
      id: 'h3',
      label: 'Heading 3',
      description: 'Small section heading',
      mark: 'H3',
      keywords: 'heading',
    },
    {
      id: 'bullet',
      label: 'Bullet list',
      description: 'Create an unordered list',
      mark: '•',
      keywords: 'unordered list',
    },
    {
      id: 'numbered',
      label: 'Numbered list',
      description: 'Create an ordered list',
      mark: '1.',
      keywords: 'ordered list',
    },
    {
      id: 'quote',
      label: 'Quote',
      description: 'Capture a quotation',
      mark: '“',
      keywords: 'blockquote citation',
    },
    {
      id: 'code',
      label: 'Code block',
      description: 'Write preformatted code',
      mark: '</>',
      keywords: 'code preformatted',
    },
    {
      id: 'rule',
      label: 'Divider',
      description: 'Separate sections visually',
      mark: '—',
      keywords: 'horizontal rule separator',
    },
    {
      id: 'table',
      label: 'Table',
      description: 'Insert a three-column table',
      mark: '▦',
      keywords: 'grid rows columns',
    },
  ];

  let editorElement: HTMLDivElement;
  let editorShell: HTMLDivElement;
  let editor = $state<TiptapEditor>();
  let editorState = $state<{ editor?: TiptapEditor }>({});
  let slashOpen = $state(false);
  let slashQuery = $state('');
  let slashIndex = $state(0);
  let slashLeft = $state(0);
  let slashTop = $state(0);
  let slashRange = $state({ from: 0, to: 0 });
  let linkOpen = $state(false);
  let linkHref = $state('');
  let linkInput = $state<HTMLInputElement>();
  let linkRange = $state({ from: 0, to: 0 });
  let linkWasActive = $state(false);
  let tableActionVisible = $state(false);
  let tableActionLeft = $state(0);
  let tableActionTop = $state(0);
  let tableActionPlacement = $state<'side' | 'above'>('side');
  let tableActionPosition = $state(0);
  let tablePointerActive = false;

  const visibleSlashItems = $derived(
    slashItems.filter((item) => {
      const query = slashQuery.trim().toLowerCase();
      return !query || `${item.label} ${item.keywords}`.toLowerCase().includes(query);
    }),
  );

  $effect(() => {
    editor?.setEditable(!disabled);
  });

  const updateSlashMenu = (instance: TiptapEditor): void => {
    const { selection } = instance.state;
    if (!selection.empty) {
      slashOpen = false;
      return;
    }

    const fromPosition = selection.$from;
    const beforeCursor = fromPosition.parent.textBetween(
      0,
      fromPosition.parentOffset,
      undefined,
      '\ufffc',
    );
    const match = beforeCursor.match(/(?:^|\s)\/([\w ]*)$/);
    if (!match) {
      slashOpen = false;
      return;
    }

    const nextQuery = match[1] ?? '';
    if (nextQuery !== slashQuery) slashIndex = 0;
    slashQuery = nextQuery;
    slashRange = {
      from: selection.from - nextQuery.length - 1,
      to: selection.from,
    };

    const caret = instance.view.coordsAtPos(selection.from);
    const shell = editorShell.getBoundingClientRect();
    slashLeft = Math.max(12, Math.min(caret.left - shell.left, shell.width - 312));
    slashTop = caret.bottom - shell.top + 10;
    slashOpen = true;
  };

  const runSlashItem = (item: SlashItem): void => {
    if (!editor) return;
    const chain = editor.chain().focus().deleteRange(slashRange);

    if (item.id === 'text') chain.setParagraph().run();
    if (item.id === 'h1') chain.setHeading({ level: 1 }).run();
    if (item.id === 'h2') chain.setHeading({ level: 2 }).run();
    if (item.id === 'h3') chain.setHeading({ level: 3 }).run();
    if (item.id === 'bullet') chain.toggleBulletList().run();
    if (item.id === 'numbered') chain.toggleOrderedList().run();
    if (item.id === 'quote') chain.toggleBlockquote().run();
    if (item.id === 'code') chain.toggleCodeBlock().run();
    if (item.id === 'rule') chain.setHorizontalRule().run();
    if (item.id === 'table') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

    slashOpen = false;
  };

  const handleSlashKey = (event: KeyboardEvent): boolean => {
    if (!slashOpen) return false;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      slashIndex = (slashIndex + 1) % Math.max(visibleSlashItems.length, 1);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      slashIndex =
        (slashIndex - 1 + Math.max(visibleSlashItems.length, 1)) %
        Math.max(visibleSlashItems.length, 1);
      return true;
    }
    if (event.key === 'Enter' && visibleSlashItems[slashIndex]) {
      event.preventDefault();
      runSlashItem(visibleSlashItems[slashIndex]);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      slashOpen = false;
      return true;
    }
    return false;
  };

  const openLinkEditor = async (): Promise<void> => {
    if (!editor) return;
    linkRange = { from: editor.state.selection.from, to: editor.state.selection.to };
    linkWasActive = editor.isActive('link');
    linkHref = String(editor.getAttributes('link').href ?? '');
    linkOpen = true;
    await tick();
    linkInput?.focus();
    linkInput?.select();
  };

  const closeLinkEditor = (): void => {
    linkOpen = false;
    editor?.chain().focus().setTextSelection(linkRange).run();
  };

  const applyLink = (): void => {
    if (!editor) return;
    const href = linkHref.trim();
    const chain = editor.chain().focus().setTextSelection(linkRange);
    if (linkWasActive) chain.extendMarkRange('link');
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    linkOpen = false;
  };

  const removeLink = (): void => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(linkRange).extendMarkRange('link').unsetLink().run();
    linkOpen = false;
  };

  const placeTableAction = (instance: TiptapEditor, table: HTMLTableElement): void => {
    const firstCell = table.querySelector<HTMLElement>('th, td');
    if (!firstCell) return;

    const shellRect = editorShell.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const roomToTheRight = shellRect.right - tableRect.right;
    tableActionPlacement = roomToTheRight >= 72 ? 'side' : 'above';

    if (tableActionPlacement === 'side') {
      tableActionLeft = tableRect.right - shellRect.left + 8;
      tableActionTop = Math.max(tableRect.top - shellRect.top, -shellRect.top + 8);
    } else {
      tableActionLeft = tableRect.right - shellRect.left;
      tableActionTop = tableRect.top - shellRect.top - 8;
    }
    tableActionPosition = instance.view.posAtDOM(firstCell, 0) + 1;
    tableActionVisible = true;
  };

  const tableFromTarget = (target: EventTarget | null): HTMLTableElement | undefined => {
    if (!(target instanceof Element)) return undefined;
    return (target.closest('table') as HTMLTableElement | null) ?? undefined;
  };

  const updateTableActionFromPointer = (event: PointerEvent): void => {
    const table = tableFromTarget(event.target);
    const isAction =
      event.target instanceof Element && Boolean(event.target.closest('.table-hover-action'));

    if (table && editor) {
      tablePointerActive = true;
      placeTableAction(editor, table);
      return;
    }

    tablePointerActive = isAction;
    if (!isAction && !editor?.isActive('table')) {
      tableActionVisible = false;
    }
  };

  const updateTableActionFromSelection = (instance: TiptapEditor): void => {
    if (!instance.isActive('table')) {
      if (!tablePointerActive) {
        tableActionVisible = false;
      }
      return;
    }

    const domAtSelection = instance.view.domAtPos(instance.state.selection.from).node;
    const element =
      domAtSelection instanceof Element ? domAtSelection : domAtSelection.parentElement;
    const table = element?.closest('table') as HTMLTableElement | null;
    if (table) placeTableAction(instance, table);
  };

  const deleteContextTable = (): void => {
    if (!editor || tableActionPosition < 1) return;
    editor.chain().focus().setTextSelection(tableActionPosition).deleteTable().run();
    tablePointerActive = false;
    tableActionVisible = false;
  };

  onMount(() => {
    const instance = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
          dropcursor: { color: '#007a4d', width: 3 },
        }),
        Markdown.configure({
          indentation: { style: 'space', size: 2 },
        }),
        Placeholder.configure({
          placeholder: 'Start writing, or press / for commands…',
          showOnlyWhenEditable: true,
        }),
        TableKit.configure({
          table: { resizable: true },
        }),
        GlobalDragHandle.configure({
          dragHandleWidth: 24,
          scrollTreshold: 80,
        }),
      ],
      content: value,
      contentType: 'markdown',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'novel-prose',
          'aria-label': 'Visual Markdown editor',
          spellcheck: 'true',
        },
        handleKeyDown: (_view, event) => handleSlashKey(event),
      },
      onCreate: ({ editor: current }) => {
        editor = current;
        editorState = { editor: current };
        updateTableActionFromSelection(current);
      },
      onTransaction: ({ editor: current }) => {
        editorState = { editor: current };
        updateTableActionFromSelection(current);
      },
      onSelectionUpdate: ({ editor: current }) => updateSlashMenu(current),
      onUpdate: ({ editor: current }) => {
        onchange(current.getMarkdown());
        updateSlashMenu(current);
      },
      onBlur: ({ editor: current }) => {
        onchange(current.getMarkdown());
        if (!tablePointerActive) tableActionVisible = false;
      },
    });

    editor = instance;
    editorState = { editor: instance };
    editorShell.addEventListener('pointermove', updateTableActionFromPointer);
    editorShell.addEventListener('pointerleave', () => {
      tablePointerActive = false;
      if (!instance.isActive('table')) tableActionVisible = false;
    });

    return () => {
      editorShell.removeEventListener('pointermove', updateTableActionFromPointer);
      instance.destroy();
    };
  });
</script>

<div
  class="novel-editor-shell"
  class:is-disabled={disabled}
  bind:this={editorShell}
  role="region"
  aria-label="Visual Markdown editor"
>
  <div class="novel-editor" bind:this={editorElement}></div>

  {#if tableActionVisible}
    <div
      class="table-hover-action"
      class:above={tableActionPlacement === 'above'}
      style:left={`${tableActionLeft}px`}
      style:top={`${tableActionTop}px`}
    >
      <button
        type="button"
        aria-label="Delete table"
        title="Delete table"
        onmousedown={(event) => event.preventDefault()}
        onclick={deleteContextTable}>delete</button
      >
    </div>
  {/if}

  <div
    class="novel-formatting-toolbar"
    role="toolbar"
    aria-label="Text formatting"
    tabindex="-1"
    onmousedown={(event) => {
      if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
    }}
  >
    <button
      type="button"
      class:active={editorState.editor?.isActive('bold')}
      aria-label="Bold"
      title="Bold"
      onclick={() => editor?.chain().focus().toggleBold().run()}>B</button
    >
    <button
      type="button"
      class:active={editorState.editor?.isActive('italic')}
      aria-label="Italic"
      title="Italic"
      onclick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button
    >
    <button
      type="button"
      class:active={editorState.editor?.isActive('underline')}
      aria-label="Underline"
      title="Underline"
      onclick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></button
    >
    <button
      type="button"
      class:active={editorState.editor?.isActive('strike')}
      aria-label="Strikethrough"
      title="Strikethrough"
      onclick={() => editor?.chain().focus().toggleStrike().run()}><s>S</s></button
    >
    <button
      type="button"
      class:active={editorState.editor?.isActive('code')}
      aria-label="Inline code"
      title="Inline code"
      onclick={() => editor?.chain().focus().toggleCode().run()}>&lt;/&gt;</button
    >
    <span aria-hidden="true"></span>
    {#if linkOpen}
      <form
        class="link-editor"
        aria-label="Add or edit link"
        onsubmit={(event) => {
          event.preventDefault();
          applyLink();
        }}
      >
        <input
          bind:this={linkInput}
          bind:value={linkHref}
          type="url"
          inputmode="url"
          aria-label="Link URL"
          placeholder="https://example.com"
          onkeydown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeLinkEditor();
            }
          }}
        />
        <button type="submit">apply</button>
        {#if linkWasActive}
          <button type="button" class="remove-link" onclick={removeLink}>remove</button>
        {/if}
        <button
          type="button"
          class="close-link"
          aria-label="Cancel"
          title="Cancel"
          onclick={closeLinkEditor}>×</button
        >
      </form>
    {:else}
      <button
        type="button"
        class:active={editorState.editor?.isActive('link')}
        aria-label="Add or edit link"
        title="Add or edit link"
        onclick={openLinkEditor}
      >
        <span class="link-symbol" aria-hidden="true"><i></i><i></i></span>
      </button>
    {/if}
  </div>

  {#if slashOpen}
    <div
      class="novel-slash-menu"
      style:--slash-left={`${slashLeft}px`}
      style:--slash-top={`${slashTop}px`}
      role="listbox"
      aria-label="Insert a block"
      tabindex="-1"
      onmousedown={(event) => event.preventDefault()}
    >
      <p>Turn into</p>
      {#if visibleSlashItems.length > 0}
        {#each visibleSlashItems as item, index (item.label)}
          <button
            type="button"
            role="option"
            aria-selected={index === slashIndex}
            class:active={index === slashIndex}
            onmousemove={() => (slashIndex = index)}
            onclick={() => runSlashItem(item)}
          >
            <span class="slash-mark" aria-hidden="true">{item.mark}</span>
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
          </button>
        {/each}
      {:else}
        <span class="slash-empty">No matching blocks</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .novel-editor-shell {
    position: relative;
    min-height: 560px;
    display: flex;
    flex-direction: column;
    background: white;
  }

  .novel-editor-shell.is-disabled {
    opacity: 0.62;
  }

  .novel-editor {
    flex: 1;
    min-height: 560px;
  }

  :global(.novel-editor .novel-prose) {
    min-height: 560px;
    padding: clamp(3rem, 7vw, 6.5rem) clamp(2rem, 11vw, 10rem);
    color: var(--ink);
    caret-color: var(--green-dark);
    font-size: clamp(1.05rem, 1.3vw, 1.2rem);
    line-height: 1.72;
  }

  :global(.novel-editor .novel-prose:focus) {
    outline: none;
  }

  :global(.novel-editor .novel-prose > :first-child) {
    margin-top: 0;
  }

  :global(.novel-editor .novel-prose > :last-child) {
    margin-bottom: 0;
  }

  :global(.novel-editor .novel-prose p) {
    margin: 0 0 1.15em;
  }

  :global(.novel-editor .novel-prose h1),
  :global(.novel-editor .novel-prose h2),
  :global(.novel-editor .novel-prose h3) {
    margin: 1.6em 0 0.55em;
    font-family: inherit;
    line-height: 1.02;
    letter-spacing: -0.045em;
  }

  :global(.novel-editor .novel-prose h1) {
    font-size: clamp(2.8rem, 6vw, 5.4rem);
  }

  :global(.novel-editor .novel-prose h2) {
    font-size: clamp(2rem, 4vw, 3.4rem);
  }

  :global(.novel-editor .novel-prose h3) {
    font-size: clamp(1.45rem, 2.4vw, 2.1rem);
  }

  :global(.novel-editor .novel-prose ul),
  :global(.novel-editor .novel-prose ol) {
    margin: 0 0 1.3em;
    padding-left: 1.6em;
  }

  :global(.novel-editor .novel-prose blockquote) {
    margin: 1.5em 0;
    padding: 0.25em 0 0.25em 1.25em;
    border-left: 3px solid var(--green-dark);
    color: #474740;
  }

  :global(.novel-editor .novel-prose code) {
    padding: 0.12em 0.3em;
    background: #eeede7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.88em;
  }

  :global(.novel-editor .novel-prose pre) {
    overflow-x: auto;
    margin: 1.5em 0;
    padding: 1.2rem 1.4rem;
    color: white;
    background: var(--ink);
    line-height: 1.55;
  }

  :global(.novel-editor .novel-prose pre code) {
    padding: 0;
    background: transparent;
  }

  :global(.novel-editor .novel-prose hr) {
    margin: 2.5rem 0;
    border: 0;
    border-top: 1px solid #cdccc5;
  }

  :global(.novel-editor .novel-prose table) {
    width: 100%;
    margin: 1.5em 0;
    border-collapse: collapse;
  }

  :global(.novel-editor .novel-prose th),
  :global(.novel-editor .novel-prose td) {
    min-width: 7rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid #cdccc5;
    text-align: left;
    vertical-align: top;
  }

  :global(.novel-editor .novel-prose th) {
    background: #f1f0eb;
  }

  :global(.novel-editor .novel-prose p.is-editor-empty:first-child::before) {
    height: 0;
    float: left;
    color: #98978f;
    content: attr(data-placeholder);
    pointer-events: none;
  }

  :global(.novel-editor .novel-prose ::selection) {
    background: #bfead4;
  }

  :global(.drag-handle) {
    position: fixed;
    z-index: 30;
    width: 24px;
    height: 24px;
    display: grid;
    color: #8d8c84;
    border-radius: 4px;
    cursor: grab;
    place-items: center;
    transition:
      color 120ms ease,
      background 120ms ease,
      opacity 120ms ease;
  }

  :global(.drag-handle::before) {
    content: '⠿';
    font-size: 1.1rem;
    line-height: 1;
  }

  :global(.drag-handle:hover) {
    color: var(--ink);
    background: #eeede7;
  }

  :global(.drag-handle.hide) {
    opacity: 0;
    pointer-events: none;
  }

  .novel-formatting-toolbar {
    display: flex;
    gap: 2px;
    align-items: center;
    min-height: 54px;
    padding: 8px 1rem;
    border-top: 1px solid #deddd6;
    background: #faf9f6;
  }

  .novel-formatting-toolbar > span {
    width: 1px;
    height: 24px;
    margin: 0 3px;
    background: #deddd6;
  }

  .novel-formatting-toolbar button {
    width: 34px;
    min-height: 34px;
    display: grid;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    font-size: 0.76rem;
    text-transform: none;
    place-items: center;
  }

  .novel-formatting-toolbar button:hover,
  .novel-formatting-toolbar button.active {
    color: var(--ink);
    background: #e2f5ea;
  }

  .table-hover-action {
    position: absolute;
    z-index: 15;
  }

  .table-hover-action.above {
    transform: translate(-100%, -100%);
  }

  .table-hover-action button {
    min-height: 30px;
    padding: 0 0.65rem;
    border: 1px solid #d5b9aa;
    border-radius: 5px;
    color: #6a3b2c;
    background: #fff9f6;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: lowercase;
    box-shadow: 0 4px 14px rgb(35 25 20 / 10%);
  }

  .table-hover-action button:hover,
  .table-hover-action button:focus-visible {
    color: #fff;
    background: #6a3b2c;
  }

  .link-symbol {
    position: relative;
    width: 18px;
    height: 14px;
    display: block;
    transform: rotate(-38deg);
  }

  .link-symbol i {
    position: absolute;
    width: 11px;
    height: 6px;
    border: 2px solid currentcolor;
    border-radius: 999px;
  }

  .link-symbol i:first-child {
    top: 0;
    left: 0;
  }

  .link-symbol i:last-child {
    right: 0;
    bottom: 0;
  }

  .link-editor {
    display: flex;
    flex: 1;
    gap: 5px;
    align-items: center;
    max-width: 520px;
  }

  .link-editor input {
    min-width: 120px;
    height: 36px;
    flex: 1;
    padding: 0 0.65rem;
    border: 1px solid #a7a69f;
    border-radius: 5px;
    background: white;
    font: inherit;
  }

  .link-editor input:focus {
    border-color: var(--green-dark);
    outline: 2px solid #ccebd9;
    outline-offset: 0;
  }

  .link-editor button {
    width: auto;
    min-width: 0;
    padding: 0 0.7rem;
    font-size: 0.68rem;
    font-weight: 800;
  }

  .link-editor .remove-link {
    color: #77503d;
  }

  .link-editor .close-link {
    width: 34px;
    padding: 0;
    font-size: 1.15rem;
    font-weight: 500;
  }

  .novel-slash-menu {
    position: absolute;
    z-index: 20;
    top: var(--slash-top);
    left: var(--slash-left);
    width: min(300px, calc(100% - 24px));
    max-height: 380px;
    overflow-y: auto;
    padding: 6px;
    border: 1px solid #d2d1ca;
    border-radius: 10px;
    background: white;
    box-shadow: 0 14px 38px rgb(24 24 20 / 18%);
  }

  .novel-slash-menu > p {
    margin: 0;
    padding: 0.55rem 0.65rem 0.4rem;
    color: #74736b;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .novel-slash-menu button {
    width: 100%;
    min-height: 52px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 0.65rem;
    align-items: center;
    padding: 0.45rem 0.55rem;
    border: 0;
    border-radius: 6px;
    text-align: left;
    text-transform: none;
  }

  .novel-slash-menu button:hover,
  .novel-slash-menu button.active {
    color: var(--ink);
    background: #e7f6ee;
  }

  .slash-mark {
    width: 36px;
    height: 36px;
    display: grid;
    border: 1px solid #d8d7d0;
    border-radius: 5px;
    background: white;
    font-size: 0.7rem;
    font-weight: 800;
    place-items: center;
  }

  .novel-slash-menu button > span:last-child {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .novel-slash-menu strong {
    font-size: 0.78rem;
  }

  .novel-slash-menu small {
    overflow: hidden;
    color: #727169;
    font-size: 0.68rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slash-empty {
    display: block;
    padding: 1rem;
    color: #727169;
    font-size: 0.8rem;
  }

  @media (max-width: 700px) {
    .novel-editor-shell,
    .novel-editor,
    :global(.novel-editor .novel-prose) {
      min-height: 440px;
    }

    :global(.novel-editor .novel-prose) {
      padding: 2.5rem 1.25rem 4rem 2.6rem;
    }
  }
</style>
