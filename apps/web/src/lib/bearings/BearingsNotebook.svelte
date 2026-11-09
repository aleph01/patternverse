<script lang="ts">
  import './cell-appearance.css';
  import { onMount, tick } from 'svelte';
  import { Plus, GripVertical, Undo2, ChevronRight, ChevronDown } from '@lucide/svelte';
  import {
    parseBearingsNotebook,
    type BearingsCell as Cell,
    type BearingsNotebook as Notebook,
  } from '@patternverse/workspace';
  import type { BearingsPattern } from './catalog';
  import BearingsCell from './BearingsCell.svelte';
  import BearingsCellIcon from './BearingsCellIcon.svelte';
  import BearingsRemovePattern from './BearingsRemovePattern.svelte';
  import BearingsMinimap from './BearingsMinimap.svelte';
  import BearingsVimStatus from './BearingsVimStatus.svelte';
  import { useBearingsAi } from './ai.svelte';
  import { insertAiComment, undoAiComment } from './ai';
  import {
    hasLibraryDrag,
    libraryCellFromData,
    libraryDragType,
    isEmptyTextCell,
    replaceEmptyLibraryCell,
  } from './library-drop';
  import BearingsTree from './BearingsTree.svelte';
  import BearingsShortcuts from './BearingsShortcuts.svelte';
  import type { VimStatus } from './vim';
  import { richEditor, richTextMap, setRichSelection } from './rich-text';
  import { defaultCursorSettings, type CursorSettings } from './cursor-settings';
  import {
    textKinds,
    childCells,
    notePath,
    outlineCells,
    visibleOutlineCells,
    withParent,
  } from './outline';
  import {
    insertCell,
    splitTextCell,
    updateCell,
    deleteCell,
    moveCell,
    restoreCell,
    startChapter,
    mergeChapters,
    textCell,
    recordPractice,
    allCells,
    insertionAfter,
    changeTextCellKind,
    recoverNotebookDraft,
    type DeletedCell,
  } from './notebook';
  let {
    document: doc,
    patterns,
    onchange,
    onread,
    vim = false,
    cursor = defaultCursorSettings,
    vimStatus = $bindable<VimStatus>({ mode: 'normal', pending: '' }),
    follow = $bindable(true),
    chapterForm = $bindable(false),
  }: {
    document: Notebook;
    patterns: readonly BearingsPattern[];
    vim?: boolean;
    cursor?: CursorSettings;
    vimStatus?: VimStatus;
    follow?: boolean;
    chapterForm?: boolean;
    onchange: (doc: Notebook) => void;
    onread: (pattern: NonNullable<Cell['pattern']>, trigger: HTMLButtonElement) => void;
  } = $props();
  let viewport = $state<HTMLDivElement>(null!);
  const ai = useBearingsAi();
  export async function askAi(prompt: string) {
    if (!ai?.enabled) return;
    let cell =
      allCells(doc).find(
        (cell) => cell.id === (doc.view === 'tree' ? doc.activeCellId : activeCellId),
      ) ?? allCells(doc).find((cell) => cell.id === doc.activeCellId);
    if (!cell) {
      const fresh = textCell('answer', '');
      if (!change(insertCell(doc, fresh))) return;
      cell = fresh;
    }
    await tick();
    if (treeMode) tree?.openAi(cell.id, prompt);
    else {
      activeCellId = cell.id;
      ai.open(cell.id, 'cell', prompt);
      await tick();
      viewport
        .querySelector<HTMLElement>(`[data-cell="${CSS.escape(cell.id)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }
  let minimapVisible = $state(false);
  function updateVim(status: VimStatus) {
    vimStatus = status;
  }
  $effect(() => {
    if (!vim) vimStatus = { mode: 'normal', pending: '' };
  });
  let tree = $state<BearingsTree>(),
    shortcuts = $state<BearingsShortcuts>();
  const treeMode = $derived(doc.view === 'tree');
  const documentMode = $derived(doc.view === 'document');
  const readingCells = (cells: readonly Cell[]) =>
    documentMode ? outlineCells(cells) : visibleOutlineCells(cells);
  let title = $state(''),
    previousTitle = $state('Beginning');
  let error = $state(''),
    removed = $state<DeletedCell | null>(null);
  let menu = $state<{ kind: 'cell' | 'chapter'; id: string; x: number; y: number } | null>(null);
  let dropMarker = $state<{
    chapterId: string;
    beforeId: string | null;
    cellId?: string;
    replace: boolean;
  } | null>(null);
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  let deletedUndoTimer: ReturnType<typeof setTimeout> | undefined;
  let ready = false;
  let activeCellId = $state<string | null>(null);
  const chapters = $derived(doc.chapters.length > 1);
  const visibleCells = $derived(
    doc.chapters.flatMap((chapter) =>
      !documentMode && chapters && chapter.collapsed ? [] : readingCells(chapter.cells),
    ),
  );
  const cellNumbers = $derived(
    new Map(visibleCells.map((cell, index) => [cell.id, String(index + 1).padStart(2, '0')])),
  );
  function jumpFromMinimap(id: string) {
    const chapter = doc.chapters.find((chapter) => chapter.cells.some((cell) => cell.id === id));
    const card = viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(id)}"]`);
    if (!chapter || !card || !change({ ...doc, activeCellId: id, activeChapterId: chapter.id }))
      return;
    activeCellId = id;
    card.focus({ preventScroll: true });
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        card.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        28,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  export function capturePosition() {
    clearTimeout(scrollTimer);
    if (treeMode) {
      tree?.capturePosition();
      return;
    }
    if (viewport && ready && Math.abs(doc.scrollTop - viewport.scrollTop) > 1)
      onchange({ ...doc, scrollTop: viewport.scrollTop });
  }
  onMount(() => {
    follow = true;
    chapterForm = false;
    vimStatus = { mode: 'normal', pending: '' };
    activeCellId = doc.activeCellId ?? null;
    viewport.scrollTop = doc.scrollTop;
    ready = true;
    if (doc.draft) {
      const recovered = recoverNotebookDraft(doc);
      if (change(recovered)) {
        activeCellId =
          recovered.chapters
            .find((chapter) => chapter.id === recovered.activeChapterId)
            ?.cells.at(-1)?.id ?? null;
        void tick().then(() => {
          if (activeCellId)
            viewport
              .querySelector<HTMLElement>(`[data-cell="${CSS.escape(activeCellId)}"]`)
              ?.scrollIntoView({ block: 'nearest' });
          capturePosition();
        });
      }
    }
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(deletedUndoTimer);
    };
  });
  function change(next: Notebook) {
    try {
      const parsed = parseBearingsNotebook(next);
      const selectionChanged = parsed.activeCellId !== doc.activeCellId;
      onchange(parsed);
      if (selectionChanged) activeCellId = parsed.activeCellId ?? null;
      error = '';
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This change could not be applied.';
      return false;
    }
  }
  export async function setView(view: NonNullable<Notebook['view']>) {
    capturePosition();
    await tick();
    let selectedId =
      activeCellId && allCells(doc).some((cell) => cell.id === activeCellId)
        ? activeCellId
        : undefined;
    const chapter = doc.chapters.find((c) => c.cells.some((cell) => cell.id === selectedId));
    const path =
      chapter && selectedId
        ? new Set(
            notePath(chapter.cells, selectedId)
              .slice(0, -1)
              .map((cell) => cell.id),
          )
        : new Set<string>();
    let next: Notebook = {
      ...doc,
      view,
      activeCellId: selectedId,
      ...(chapter ? { activeChapterId: chapter.id } : {}),
      chapters: doc.chapters.map((c) => ({
        ...c,
        cells: c.cells.map((cell) =>
          view !== 'document' && path.has(cell.id) && cell.collapsed
            ? { ...cell, collapsed: false }
            : cell,
        ),
      })),
    };
    if (view === 'document' && !allCells(next).length) {
      const first = textCell('answer', '');
      next = { ...insertCell(next, first), activeCellId: first.id };
      selectedId = first.id;
    }
    if (!change(next)) return;
    await tick();
    if (view === 'tree') tree?.activate();
    else if (selectedId) {
      const cell = viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(selectedId)}"]`);
      cell?.querySelector<HTMLElement>('.cell-text, input, button')?.focus({ preventScroll: true });
      cell?.scrollIntoView({ block: 'nearest' });
    }
  }
  export async function jump(id: string) {
    activeCellId = null;
    change({
      ...doc,
      activeChapterId: id,
      activeCellId: undefined,
      chapters: doc.chapters.map((c) => (c.id === id ? { ...c, collapsed: false } : c)),
    });
    await tick();
    viewport
      .querySelector<HTMLElement>(`[data-chapter="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'start' });
    capturePosition();
  }
  async function bottom() {
    const last = doc.chapters.at(-1)!;
    activeCellId = last.cells.at(-1)?.id ?? null;
    change({
      ...doc,
      activeChapterId: last.id,
      chapters: doc.chapters.map((c) => (c.id === last.id ? { ...c, collapsed: false } : c)),
    });
    await tick();
    viewport.scrollTop = viewport.scrollHeight;
    capturePosition();
  }
  export function openShortcuts(trigger: HTMLButtonElement) {
    shortcuts?.open(trigger);
  }
  export function startNewChapter() {
    previousTitle = doc.chapters[0]!.title;
    chapterForm = !chapterForm;
  }
  export async function add(cell: Cell) {
    if (treeMode) {
      tree?.add(cell);
      return;
    }
    const target = insertionAfter(doc, activeCellId);
    if (
      !change(insertCell(doc, withParent(cell, target.parentId), target.chapterId, target.beforeId))
    )
      return;
    activeCellId = cell.id;
    await tick();
    if (follow) {
      viewport
        .querySelector<HTMLElement>(`[data-cell="${CSS.escape(cell.id)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
      capturePosition();
    }
  }
  export async function pick(cell: Cell) {
    if (treeMode) {
      tree?.pick(cell);
      return;
    }
    const replacement = replaceEmptyLibraryCell(doc, activeCellId, cell);
    let id = cell.id;
    if (replacement) {
      if (!change(replacement)) return;
      id = replacement.activeCellId!;
      activeCellId = id;
    } else await add(cell);
    await tick();
    const card = viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(id)}"]`);
    card?.querySelector<HTMLElement>('.pattern-actions button')?.focus({ preventScroll: true });
    card?.scrollIntoView({ block: 'nearest' });
    capturePosition();
  }
  async function insertText(
    chapterId: string,
    beforeId: string | null,
    kind = doc.draftKind,
    parentId?: string,
  ) {
    const parent =
      parentId ??
      doc.chapters.find((c) => c.id === chapterId)?.cells.find((c) => c.id === beforeId)?.parentId;
    const cell = withParent(textCell(kind, ''), parent);
    if (!change(insertCell(doc, cell, chapterId, beforeId))) return;
    activeCellId = cell.id;
    await tick();
    const editor = viewport.querySelector<HTMLElement>(
      `[data-cell="${CSS.escape(cell.id)}"] .cell-text`,
    );
    editor?.focus({ preventScroll: true });
    editor?.scrollIntoView({ block: 'nearest' });
    capturePosition();
  }
  async function split(cell: Cell, before: string, after: string) {
    try {
      const next = splitTextCell(doc, cell.id, before, after, documentMode);
      if (!change(next)) return;
      activeCellId = next.activeCellId!;
      await tick();
      const editor = viewport.querySelector<HTMLElement>(
        `[data-cell="${CSS.escape(next.activeCellId!)}"] .cell-text`,
      );
      editor?.focus({ preventScroll: true });
      setRichSelection(editor, 0);
      editor?.scrollIntoView({ block: 'nearest' });
      capturePosition();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This cell could not be split.';
    }
  }
  function insertBelow(cell: Cell) {
    const target = insertionAfter(doc, cell.id);
    void insertText(
      target.chapterId,
      target.beforeId,
      ['answer', 'note', 'approach'].includes(cell.kind)
        ? (cell.kind as Notebook['draftKind'])
        : 'answer',
      target.parentId,
    );
  }
  function navigateWriting(cell: Cell, direction: 'left' | 'right' | 'up' | 'down', x: number) {
    if (!documentMode) return false;
    const backwards = direction === 'left' || direction === 'up';
    const at = visibleCells.findIndex((item) => item.id === cell.id);
    const neighbor = visibleCells[at + (backwards ? -1 : 1)];
    if (!neighbor) return false;
    const article = viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(neighbor.id)}"]`);
    const field = article?.querySelector<HTMLElement>('.cell-text');
    activeCellId = neighbor.id;
    if (field) {
      field.focus({ preventScroll: true });
      const editor = richEditor(field);
      if (editor) {
        const map = richTextMap(editor.state.doc);
        setRichSelection(field, backwards ? map.text.length : 0);
        if (direction === 'up' || direction === 'down') {
          const edge = editor.view.coordsAtPos(editor.state.selection.from);
          const position = editor.view.posAtCoords({ left: x, top: (edge.top + edge.bottom) / 2 });
          if (position) editor.commands.setTextSelection(position.pos);
        }
      }
    } else
      (article?.querySelector<HTMLElement>('summary, input, button') ?? article)?.focus({
        preventScroll: true,
      });
    article?.scrollIntoView({ block: 'nearest' });
    return true;
  }
  function context(event: MouseEvent, kind: 'cell' | 'chapter', id: string) {
    // Keep the browser's editing menu inside text fields.
    if ((event.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
    event.preventDefault();
    menu = {
      kind,
      id,
      x: Math.min(event.clientX, window.innerWidth - 225),
      y: Math.min(event.clientY, window.innerHeight - 160),
    };
  }
  function dismissDeletedUndo() {
    clearTimeout(deletedUndoTimer);
    deletedUndoTimer = undefined;
    removed = null;
  }
  function remove(id: string) {
    const result = deleteCell(doc, id);
    if (!change(result.document)) return false;
    clearTimeout(deletedUndoTimer);
    removed = result.removed;
    deletedUndoTimer = setTimeout(dismissDeletedUndo, 10000);
    if (activeCellId === id) activeCellId = result.removed.beforeId;
    menu = null;
    return true;
  }
  async function deleteShortcut(event: KeyboardEvent) {
    if (
      treeMode ||
      event.defaultPrevented ||
      event.isComposing ||
      !(event.metaKey || event.ctrlKey) ||
      event.altKey ||
      event.shiftKey ||
      !['Backspace', 'Delete'].includes(event.key) ||
      document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
    )
      return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest<HTMLElement>('.notebook-cell');
    if (!cell || !viewport.contains(cell)) return;
    const field = target.closest('input, textarea, select, [contenteditable], [role="textbox"]');
    // Practice fields and widget controls retain their own text editing behavior.
    if (field && !target.matches('.cell-text, .cell-title')) return;
    event.preventDefault();
    if (event.repeat) return;
    await removeAndFocus(cell.dataset.cell!);
  }
  async function removeAndFocus(id: string) {
    const visible = [...viewport.querySelectorAll<HTMLElement>('.notebook-cell')]
      .filter((cell) => cell.getClientRects().length > 0)
      .map((cell) => cell.dataset.cell!);
    const at = visible.indexOf(id);
    if (!remove(id)) return;
    await tick();
    const remaining = new Set(allCells(doc).map((cell) => cell.id));
    const nextId =
      visible.slice(at + 1).find((id) => remaining.has(id)) ??
      visible
        .slice(0, at)
        .reverse()
        .find((id) => remaining.has(id));
    activeCellId = nextId ?? null;
    const next = nextId
      ? viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(nextId)}"]`)
      : null;
    const control =
      next?.querySelector<HTMLElement>('.cell-text') ??
      next?.querySelector<HTMLElement>('.drag-handle') ??
      viewport.querySelector<HTMLElement>('.insertion-point button');
    control?.focus({ preventScroll: true });
    control?.scrollIntoView({ block: 'nearest' });
  }
  function merge(earlier: string, later: string) {
    if (removed?.chapterId === later) removed = { ...removed, chapterId: earlier };
    change(mergeChapters(doc, earlier, later));
    menu = null;
  }
  function keyboard(event: KeyboardEvent, id: string) {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
      menu = {
        kind: 'cell',
        id,
        x: Math.min(box.left, window.innerWidth - 225),
        y: Math.min(box.bottom, window.innerHeight - 160),
      };
    }
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const cells = allCells(doc),
      index = cells.findIndex((c) => c.id === id);
    const neighbor = cells[index + (event.key === 'ArrowUp' ? -1 : 1)];
    if (!neighbor) return;
    const chapter = doc.chapters.find((c) => c.cells.some((cell) => cell.id === neighbor.id))!;
    const at = chapter.cells.findIndex((c) => c.id === neighbor.id);
    change(
      moveCell(
        doc,
        id,
        chapter.id,
        event.key === 'ArrowUp' ? neighbor.id : (chapter.cells[at + 1]?.id ?? null),
      ),
    );
  }
  function dragOver(event: DragEvent, chapterId: string, beforeId: string | null, cellId?: string) {
    if (
      !hasLibraryDrag(event) &&
      !Array.from(event.dataTransfer?.types ?? []).includes('application/x-bearings-cell')
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = hasLibraryDrag(event) ? 'copy' : 'move';
    dropMarker = {
      chapterId,
      beforeId,
      cellId,
      replace:
        hasLibraryDrag(event) && isEmptyTextCell(allCells(doc).find((cell) => cell.id === cellId)),
    };
  }
  function dragLeave(event: DragEvent) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
    )
      dropMarker = null;
  }
  function drop(event: DragEvent, chapterId: string, beforeId: string | null, cellId?: string) {
    event.preventDefault();
    event.stopPropagation();
    dropMarker = null;
    try {
      const id = event.dataTransfer?.getData('application/x-bearings-cell');
      if (id) {
        if (change(moveCell(doc, id, chapterId, beforeId))) activeCellId = id;
      } else {
        const cell = libraryCellFromData(event.dataTransfer?.getData(libraryDragType) ?? '');
        if (!cell) return;
        const replacement = replaceEmptyLibraryCell(doc, cellId, cell);
        if (replacement) {
          if (change(replacement)) activeCellId = cellId!;
          return;
        }
        // Full allowlist validation at the notebook boundary, including external drops.
        const parentId = doc.chapters
          .find((c) => c.id === chapterId)
          ?.cells.find((c) => c.id === beforeId)?.parentId;
        if (change(insertCell(doc, withParent(cell, parentId), chapterId, beforeId)))
          activeCellId = cell.id;
      }
    } catch {
      error = 'That item could not be moved into this notebook.';
    }
  }
</script>

<svelte:window
  ondragend={() => (dropMarker = null)}
  onkeydowncapture={(e) => void deleteShortcut(e)}
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      menu = null;
      chapterForm = false;
    }
  }}
  onpointerdown={(e) => {
    if (!(e.target as HTMLElement).closest('.notebook-menu')) menu = null;
  }}
/>
{#snippet insertionPoint(
  chapterId: string,
  beforeId: string | null,
  empty = false,
  between = false,
)}
  <div
    class="insertion-point"
    class:between
    class:drop-target={dropMarker?.chapterId === chapterId &&
      dropMarker.beforeId === beforeId &&
      !dropMarker.cellId}
    role="group"
    aria-label="Cell insertion point"
    class:empty
    data-before={beforeId ?? 'end'}
    ondragover={(event) => dragOver(event, chapterId, beforeId)}
    ondragleave={dragLeave}
    ondrop={(event) => drop(event, chapterId, beforeId)}
  >
    {#if !documentMode || empty || beforeId === null}<button
        type="button"
        aria-label={documentMode
          ? empty
            ? 'Start writing'
            : 'Continue writing'
          : beforeId === null
            ? 'Add cell'
            : 'Insert cell above'}
        title={documentMode ? undefined : 'Insert a cell here'}
        onclick={() => insertText(chapterId, beforeId)}
        >{#if documentMode}<span class="sr-only">Continue writing</span>{:else}<Plus
            size={16}
            aria-hidden="true"
          />
          {#if beforeId === null}<span>{empty ? 'Start writing here…' : 'Add cell'}</span>{/if}{/if}
      </button>{/if}
  </div>
{/snippet}
<section
  class="notebook"
  class:document-mode={documentMode}
  class:vim-active={vim && !treeMode}
  aria-label={documentMode ? 'Situation document' : 'Situation notebook'}
>
  {#if chapterForm}<form
      class="chapter-form"
      onsubmit={(e) => {
        e.preventDefault();
        change(startChapter(doc, title, previousTitle));
        title = '';
        chapterForm = false;
        void bottom();
      }}
    >
      {#if !chapters}<label
          >Current chapter<input bind:value={previousTitle} maxlength="180" required /></label
        >{/if}<label
        >New chapter<input
          bind:value={title}
          placeholder="A fresh perspective…"
          maxlength="180"
          required
        /></label
      ><button class="primary" type="submit">Start chapter</button>
    </form>{/if}
  {#if error}<p class="notice" role="alert">{error}</p>{/if}
  {#if treeMode}<BearingsTree
      bind:this={tree}
      document={doc}
      {patterns}
      {onread}
      {vim}
      {cursor}
      {vimStatus}
      onvimchange={updateVim}
      onchange={change}
    />{/if}
  <div
    class="viewport"
    class:has-minimap={minimapVisible}
    hidden={treeMode}
    bind:this={viewport}
    onscroll={() => {
      if (ready) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(capturePosition, 350);
      }
    }}
  >
    <div class="pages">
      {#each doc.chapters as chapter, index (chapter.id)}
        <section
          class="chapter"
          data-chapter={chapter.id}
          aria-label={chapters ? chapter.title : 'Notebook entries'}
          ondragover={(event) => dragOver(event, chapter.id, null)}
          ondragleave={dragLeave}
          ondrop={(e) => drop(e, chapter.id, null)}
        >
          {#if chapters && documentMode}<div class="document-chapter-heading">
              <h2>{chapter.title}</h2>
            </div>
          {:else if chapters}<div
              class="chapter-heading"
              oncontextmenu={(e) => context(e, 'chapter', chapter.id)}
              role="group"
              aria-label={`${chapter.title} chapter`}
            >
              <button
                class="chapter-toggle"
                aria-expanded={!chapter.collapsed}
                onclick={() => {
                  activeCellId = null;
                  change({
                    ...doc,
                    activeChapterId: chapter.id,
                    chapters: doc.chapters.map((c) =>
                      c.id === chapter.id ? { ...c, collapsed: !c.collapsed } : c,
                    ),
                  });
                }}
                >{#if chapter.collapsed}<ChevronRight size={17} />{:else}<ChevronDown
                    size={17}
                  />{/if}<span class="chapter-number">{String(index + 1).padStart(2, '0')}</span>
                <h2>{chapter.title}</h2>
                <span class="count">{chapter.cells.length}</span></button
              >
            </div>{/if}
          <div hidden={!documentMode && chapters && chapter.collapsed}>
            {#each readingCells(chapter.cells) as cell, cellIndex (cell.id)}
              {@render insertionPoint(chapter.id, cell.id, false, cellIndex > 0)}
              <article
                class="notebook-cell"
                class:writing-surface={textKinds.has(cell.kind)}
                data-kind={cell.kind}
                class:active={activeCellId === cell.id}
                class:drop-target={dropMarker?.cellId === cell.id}
                class:drop-replace={dropMarker?.cellId === cell.id && dropMarker.replace}
                class:note={cell.kind === 'note'}
                class:approach={cell.kind === 'approach'}
                class:pattern={cell.kind === 'pattern'}
                class:rating={cell.kind === 'rating'}
                data-cell={cell.id}
                tabindex="-1"
                onfocusin={() => (activeCellId = cell.id)}
                oncontextmenu={(e) => context(e, 'cell', cell.id)}
                ondragover={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const at = chapter.cells.findIndex((c) => c.id === cell.id);
                  dragOver(
                    event,
                    chapter.id,
                    event.clientY < rect.top + rect.height / 2
                      ? cell.id
                      : (chapter.cells[at + 1]?.id ?? null),
                    cell.id,
                  );
                }}
                ondragleave={dragLeave}
                ondrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const at = chapter.cells.findIndex((c) => c.id === cell.id);
                  drop(
                    e,
                    chapter.id,
                    e.clientY < rect.top + rect.height / 2
                      ? cell.id
                      : (chapter.cells[at + 1]?.id ?? null),
                    cell.id,
                  );
                }}
              >
                {#if !documentMode}<span class="cell-number" aria-hidden="true"
                    ><span>{cellNumbers.get(cell.id)}</span><span class="cell-type-symbol"
                      >{#if textKinds.has(cell.kind)}<BearingsCellIcon
                          kind={cell.kind}
                        />{/if}</span
                    ></span
                  >{/if}
                {#if dropMarker?.cellId === cell.id && dropMarker.replace}<span
                    class="replace-hint"
                    aria-hidden="true">Replace empty cell</span
                  >{/if}
                {#if !documentMode}<button
                    class="drag-handle"
                    draggable="true"
                    aria-label={`Move ${cell.kind === 'answer' ? 'note' : cell.kind === 'note' ? 'comment' : cell.kind === 'approach' ? 'own approach' : cell.kind} cell. Use arrow keys to reorder, or Shift F10 for menu.`}
                    title="Drag to move · arrow keys to reorder · right-click for options"
                    onkeydown={(e) => keyboard(e, cell.id)}
                    ondragstart={(e) => {
                      e.dataTransfer?.setData('application/x-bearings-cell', cell.id);
                      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                    }}><GripVertical size={17} /></button
                  >{/if}
                {#if !documentMode && childCells(chapter.cells, cell.id).length}<button
                    class="branch-toggle"
                    aria-label={cell.collapsed ? 'Expand note branch' : 'Collapse note branch'}
                    aria-expanded={!cell.collapsed}
                    onclick={() => change(updateCell(doc, cell.id, { collapsed: !cell.collapsed }))}
                    >{#if cell.collapsed}<ChevronRight size={16} />{:else}<ChevronDown
                        size={16}
                      />{/if}</button
                  >{/if}
                {#if cell.kind === 'pattern'}<BearingsRemovePattern
                    onremove={() => void removeAndFocus(cell.id)}
                  />{/if}
                <BearingsCell
                  notebook={doc}
                  onaicomment={(text) => {
                    const id = crypto.randomUUID();
                    return change(insertAiComment(doc, cell.id, text, id)) ? id : null;
                  }}
                  onaiundo={(id, text) => {
                    const next = undoAiComment(doc, id, text);
                    return !!next && change(next);
                  }}
                  {cell}
                  {patterns}
                  {onread}
                  {vim}
                  {cursor}
                  {documentMode}
                  plain={documentMode}
                  onboundary={documentMode
                    ? (direction, x) => navigateWriting(cell, direction, x)
                    : undefined}
                  vimMode={vimStatus.mode}
                  onvimchange={updateVim}
                  active={activeCellId === cell.id}
                  onkindchange={(kind) => change(changeTextCellKind(doc, cell.id, kind))}
                  onnext={() => insertBelow(cell)}
                  ondivider={(before, after) => void split(cell, before, after)}
                  onchange={(update) => change(updateCell(doc, cell.id, update))}
                  onpractice={(practice, responses, runId) => {
                    change(recordPractice(doc, cell.id, practice, responses, runId));
                    if (responses.length && follow)
                      void tick().then(() => {
                        viewport
                          .querySelector<HTMLElement>(`[data-cell="${CSS.escape(cell.id)}"]`)
                          ?.scrollIntoView({ block: 'nearest' });
                        capturePosition();
                      });
                  }}
                />
              </article>
            {/each}
            {@render insertionPoint(chapter.id, null, !chapter.cells.length)}
          </div>
        </section>
      {/each}
    </div>
  </div>
  <BearingsMinimap
    {viewport}
    cells={visibleCells}
    activeId={activeCellId}
    enabled={!treeMode}
    onselect={jumpFromMinimap}
    onvisibility={(visible) => (minimapVisible = visible)}
  />
  {#if removed && !treeMode}<div class="undo" role="status">
      <span>Cell deleted</span><button
        onclick={() => {
          if (removed) change(restoreCell(doc, removed));
          dismissDeletedUndo();
        }}><Undo2 size={14} />Undo</button
      >
    </div>{/if}
  {#if vim && !treeMode}<div class="notebook-vim">
      <BearingsVimStatus status={vimStatus} />
    </div>{/if}
</section>
<BearingsShortcuts
  bind:this={shortcuts}
  onclose={() => {
    if (treeMode) tree?.activate();
  }}
/>
{#if menu}<div
    class="notebook-menu"
    role="menu"
    style:left={`${menu.x}px`}
    style:top={`${menu.y}px`}
  >
    {#if menu.kind === 'cell'}<button role="menuitem" onclick={() => menu && remove(menu.id)}
        >Delete cell</button
      >
    {:else}{@const at = doc.chapters.findIndex((c) => c.id === menu?.id)}{#if at > 0}<button
          role="menuitem"
          onclick={() => merge(doc.chapters[at - 1]!.id, doc.chapters[at]!.id)}
          >Merge with previous chapter</button
        >{/if}{#if at < doc.chapters.length - 1}<button
          role="menuitem"
          onclick={() => merge(doc.chapters[at]!.id, doc.chapters[at + 1]!.id)}
          >Merge with next chapter</button
        >{/if}{/if}
    <button role="menuitem" onclick={() => (menu = null)}>Cancel</button>
  </div>{/if}

<style>
  .notebook-vim {
    position: absolute;
    bottom: max(12px, env(safe-area-inset-bottom));
    left: 14px;
    z-index: 5;
    pointer-events: none;
  }
  .notebook.vim-active .pages {
    padding-bottom: 3.5rem;
  }
  .notebook.vim-active > .undo {
    padding-left: 118px;
  }
  .notebook {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    position: relative;
    background: var(--bearings-paper);
  }
  .branch-toggle {
    display: grid;
    place-items: center;
    position: absolute;
    left: -25px;
    top: 36px;
    width: 22px;
    height: 22px;
    margin: 0;
    padding: 3px;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    border-radius: 3px;
    cursor: pointer;
  }

  .viewport {
    overflow: auto;
    min-height: 0;
    flex: 1;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
  .pages {
    max-width: 790px;
    margin: auto;
    padding: 1.8rem 3rem 1rem;
  }
  .viewport.has-minimap .pages {
    padding-left: calc(3rem + 32px);
  }
  .chapter {
    scroll-margin-top: 1rem;
  }
  .chapter-heading {
    border-bottom: 1px solid var(--bearings-line);
    margin: 1rem 0 1.1rem;
  }
  .chapter-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    text-align: left;
    padding: 0.8rem 0;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
  }
  .chapter-number,
  .count {
    font-size: 0.68rem;
    color: var(--bearings-muted);
  }
  .chapter-toggle h2 {
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    flex: 1;
  }
  .notebook-cell {
    position: relative;
    padding: 0.65rem 0.75rem;
    margin: 0;
    border-left: 2px solid transparent;
    overflow-wrap: anywhere;
  }
  .cell-number {
    position: absolute;
    right: calc(100% + 0.5rem);
    top: 0.75rem;
    color: color-mix(in srgb, var(--bearings-muted) 58%, var(--bearings-paper));
    font:
      0.625rem / 1.6 ui-monospace,
      monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .cell-type-symbol {
    display: inline-flex;
    width: 14px;
    height: 14px;
  }
  .notebook-cell:has(> .drag-handle:focus-visible) .cell-type-symbol {
    visibility: hidden;
  }
  .notebook-cell.active {
    box-shadow: 0 0 0 1px var(--bearings-line);
    border-radius: 6px;
  }
  .insertion-point {
    position: relative;
    display: flex;
    align-items: center;
    height: 24px;
  }
  .notebook-cell.drop-target {
    outline: 2px solid var(--bearings-accent);
    outline-offset: -2px;
  }
  .notebook-cell.drop-replace {
    outline-style: dashed;
  }
  .replace-hint {
    position: absolute;
    bottom: 6px;
    right: 8px;
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 11px;
    background: var(--bearings-accent);
    color: var(--bearings-paper);
    pointer-events: none;
  }
  .insertion-point.drop-target {
    background: var(--bearings-accent-soft);
  }
  .insertion-point.drop-target::after {
    opacity: 1;
    background: var(--bearings-accent);
  }
  .insertion-point::after {
    content: '';
    height: 1px;
    background: var(--bearings-line);
    flex: 1;
    opacity: 0;
  }
  .insertion-point.between::after {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    opacity: 1;
  }
  .insertion-point.between:hover button,
  .insertion-point.between:focus-within button {
    background: var(--bearings-paper);
  }
  .insertion-point button {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 28px;
    padding: 0.3rem 0.4rem;
    border: 0;
    border-radius: 5px;
    color: var(--bearings-muted);
    background: transparent;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }
  @media (hover: hover) and (pointer: fine) {
    .insertion-point:not(.empty) button {
      opacity: 0;
    }
    .insertion-point:not(.empty):hover button,
    .insertion-point:not(.empty):focus-within button,
    .insertion-point.drop-target button {
      opacity: 1;
    }
  }
  .insertion-point button:hover {
    color: var(--bearings-accent);
    background: var(--bearings-surface);
  }
  .insertion-point:hover::after,
  .insertion-point:focus-within::after {
    opacity: 1;
  }
  .insertion-point.empty {
    height: auto;
    min-height: 92px;
    margin: 0.6rem 0;
  }
  .insertion-point.empty button {
    width: 100%;
    min-height: 92px;
    justify-content: flex-start;
    padding: 1rem 1.2rem;
    border: 1px dashed var(--bearings-line);
    border-radius: 7px;
    font-size: 0.85rem;
  }
  .notebook-cell.writing-surface {
    border: 1px solid transparent;
    border-left: var(--cell-edge-width) var(--cell-edge-style) var(--cell-edge);
    border-radius: 6px;
    background: var(--cell-fill);
    color: var(--cell-ink);
  }
  .notebook-cell.writing-surface.active {
    box-shadow: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .notebook-cell.writing-surface {
      border-top-color: transparent;
      border-right-color: transparent;
      border-bottom-color: transparent;
    }
    .notebook-cell.writing-surface[data-kind='answer'] {
      border-left-color: transparent;
    }
    .notebook-cell.writing-surface.active {
      box-shadow: none;
    }
  }
  .notebook-cell.pattern {
    border-left-color: var(--bearings-accent);
  }
  .notebook-cell.rating {
    border: 1px solid var(--bearings-line);
    border-radius: 6px;
  }
  .drag-handle {
    position: absolute;
    left: -29px;
    top: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 25px;
    height: 30px;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    opacity: 0;
    pointer-events: none;
    cursor: grab;
  }
  .drag-handle:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }
  .undo {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    padding: 0.4rem;
    background: var(--bearings-surface);
  }
  .undo button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: 0;
    color: var(--bearings-accent);
    font: inherit;
    padding: 0.5rem;
    cursor: pointer;
  }
  .chapter-form {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
    background: var(--bearings-surface);
    padding: 1rem 2rem;
  }
  .chapter-form label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.72rem;
    flex: 1;
  }
  .chapter-form input {
    font: inherit;
    background: var(--bearings-paper);
    border: 1px solid var(--bearings-line);
    border-radius: 4px;
    padding: 0.65rem;
    min-width: 100px;
    color: inherit;
  }
  .primary {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.65rem 0.8rem;
    border: 0;
    border-radius: 4px;
    background: var(--bearings-accent);
    color: #fff;
    cursor: pointer;
  }
  .notice {
    padding: 0.75rem 2rem;
    color: var(--bearings-accent);
    font-size: 0.8rem;
  }
  .notebook-menu {
    position: fixed;
    z-index: 50;
    width: 215px;
    background: var(--bearings-paper, #fffdf9);
    color: var(--bearings-ink, #322f2b);
    box-shadow: 0 4px 25px #0002;
    border: 1px solid var(--bearings-line, #dedbd5);
    border-radius: 7px;
    padding: 0.35rem;
  }
  .notebook-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.7rem 0.5rem;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .notebook-menu button:hover {
    background: var(--bearings-surface);
  }
  @media (max-width: 700px) {
    .pages {
      padding: 1rem 1.6rem 1rem 3rem;
    }
    .cell-number {
      font-size: 0.6rem;
    }
    .chapter-form {
      padding: 0.8rem;
    }
    .notebook-cell {
      padding: 0.75rem;
    }
    .drag-handle {
      left: -26px;
    }
  }
  @media (pointer: coarse) {
    .notebook-cell {
      padding-top: 1.25rem;
    }
    .cell-number {
      top: 1.35rem;
    }
    .insertion-point {
      min-height: 44px;
    }
    .insertion-point button {
      min-height: 44px;
      min-width: 44px;
    }
  }
  .document-mode .pages {
    max-width: 740px;
    padding: 3.2rem 3rem 2rem;
  }
  .document-mode .viewport.has-minimap .pages {
    padding-left: calc(3rem + 32px);
  }
  .document-mode .notebook-cell {
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    color: var(--bearings-ink);
  }
  .document-mode .notebook-cell.pattern {
    border-left: 2px solid var(--bearings-line);
    padding-left: 1rem;
  }
  .document-mode .notebook-cell :global(.rich-text) {
    min-height: 1.7em;
  }
  .document-mode .insertion-point {
    height: 56px;
    min-height: 0;
    margin: 0;
  }
  .document-mode .insertion-point:not(.between):not(.empty):not([data-before='end']) {
    height: 0;
  }
  .document-mode .insertion-point[data-before='end'],
  .document-mode .insertion-point.empty {
    height: 80px;
  }
  .document-mode .insertion-point button {
    width: 100%;
    height: 100%;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    border-radius: 0;
    opacity: 1;
    cursor: text;
  }
  .document-mode .insertion-point:not(.between)::after {
    content: none;
  }
  .document-chapter-heading h2 {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0 0 1.5rem;
  }
  @media (max-width: 700px) {
    .document-mode .pages {
      padding: 2rem 1.4rem 2rem;
    }
    .document-mode .viewport.has-minimap .pages {
      padding-left: calc(1.4rem + 32px);
    }
  }
</style>
