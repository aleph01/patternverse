<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { treeColumns, treePositions } from './tree-layout';
  import { useBearingsAi } from './ai.svelte';
  import { insertAiComment, undoAiComment } from './ai';
  import { Selection } from '@tiptap/pm/state';
  import { Plus, Minimize2, Maximize2, Undo2, ChevronRight } from '@lucide/svelte';
  import {
    parseBearingsNotebook,
    type BearingsCell as Cell,
    type BearingsNotebook as Notebook,
  } from '@patternverse/workspace';
  import type { BearingsPattern } from './catalog';
  import BearingsCell from './BearingsCell.svelte';
  import BearingsMarkdown from './BearingsMarkdown.svelte';
  import BearingsCellIcon from './BearingsCellIcon.svelte';
  import BearingsRemovePattern from './BearingsRemovePattern.svelte';
  import BearingsVimStatus from './BearingsVimStatus.svelte';
  import type { VimStatus } from './vim';
  import { setRichSelection, richEditor } from './rich-text';
  import { defaultCursorSettings, type CursorSettings } from './cursor-settings';
  import {
    libraryCellFromData,
    libraryDragType,
    hasLibraryDrag,
    isEmptyTextCell,
    replaceEmptyLibraryCell,
  } from './library-drop';
  import {
    childCells,
    notePath,
    noteLabel,
    noteBody,
    textKinds,
    insertRelative,
    moveNoteBranch,
    relocateNoteBranch,
    branchIds,
    mergeTextNotes,
  } from './outline';
  import {
    updateCell,
    deleteCell,
    recordPractice,
    textCell,
    changeTextCellKind,
    splitTextCell,
  } from './notebook';
  let {
    document: doc,
    patterns,
    onchange,
    onread,
    vim = false,
    cursor = defaultCursorSettings,
    vimStatus,
    onvimchange,
  }: {
    document: Notebook;
    patterns: readonly BearingsPattern[];
    vim?: boolean;
    cursor?: CursorSettings;
    vimStatus: VimStatus;
    onvimchange: (status: VimStatus) => void;
    onchange: (doc: Notebook) => boolean;
    onread: (pattern: NonNullable<Cell['pattern']>, trigger: HTMLButtonElement) => void;
  } = $props();
  let viewport: HTMLDivElement, fullscreen: HTMLDialogElement;
  const ai = useBearingsAi();
  export function openAi(id: string, prompt: string) {
    if (!ai?.enabled) return;
    editing = id;
    if (commit({ ...doc, activeCellId: id })) {
      ai.open(id, 'cell', prompt);
      void tick().then(() =>
        viewport
          .querySelector<HTMLElement>('.ai-composer textarea')
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
      );
    }
  }
  let editing = $state<string | null>(null),
    fullscreenId = $state<string | null>(null);
  let undo = $state.raw<Notebook | null>(null),
    message = $state(''),
    error = $state('');
  let dropTarget = $state<{
    id: string | null;
    where: 'above' | 'below' | 'child' | 'replace';
  } | null>(null);
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  let ready = false;
  let branchId = $state<string>();
  const cardDragType = 'application/x-bearings-move';
  let draggedId = $state<string | null>(null);
  let suppressCardClick = false;
  let pointerDrag:
    { id: string; x: number; y: number; pointerId: number; active: boolean } | undefined;
  const chapter = $derived(doc.chapters.find((c) => c.id === doc.activeChapterId)!);
  const selected = $derived(chapter.cells.find((c) => c.id === doc.activeCellId));
  const branch = $derived(
    selected ?? chapter.cells.find((c) => c.id === branchId) ?? chapter.cells[0],
  );
  const path = $derived(branch ? notePath(chapter.cells, branch.id) : []);
  const columns = $derived(treeColumns(chapter.cells));
  let arrangeTree: (() => void) | undefined;
  function layoutTree(node: HTMLDivElement, initial: typeof columns) {
    let specs = initial,
      frame = 0;
    const scroll = node.parentElement!;
    let observed: HTMLElement[] = [];
    function join(
      parent: HTMLElement,
      child: HTMLElement,
      edge: 'top' | 'bottom',
      difference: number,
    ) {
      const flat = Math.abs(difference) < 1;
      const radius = flat ? 0 : Math.min(16, Math.abs(difference) / 2);
      parent.dataset[edge === 'top' ? 'outgoingTop' : 'outgoingBottom'] = flat
        ? 'flat'
        : difference > 0
          ? 'concave'
          : 'convex';
      child.dataset[edge === 'top' ? 'incomingTop' : 'incomingBottom'] = flat
        ? 'flat'
        : difference > 0
          ? 'convex'
          : 'concave';
      parent.style.setProperty(`--outgoing-${edge}-radius`, `${radius}px`);
      child.style.setProperty(`--incoming-${edge}-radius`, `${radius}px`);
    }
    function measure() {
      const cards = Array.from(node.querySelectorAll<HTMLElement>('.tree-cell'));
      for (const old of observed) if (!cards.includes(old)) observer.unobserve(old);
      observed = observed.filter((old) => cards.includes(old));
      const byId = new Map(cards.map((card) => [card.dataset.cell!, card]));
      const heights = new Map(
        cards.map((card) => [card.dataset.cell!, card.getBoundingClientRect().height]),
      );
      for (const card of cards) {
        if (!observed.includes(card)) {
          observed.push(card);
          observer.observe(card);
        }
        delete card.dataset.incomingTop;
        delete card.dataset.incomingBottom;
        delete card.dataset.outgoingTop;
        delete card.dataset.outgoingBottom;
      }
      const { positions, height } = treePositions(specs.flat(), heights);
      const padding = parseFloat(getComputedStyle(node).paddingTop) || 0;
      const offset = Math.max(0, (scroll.clientHeight - 2 * padding - height) / 2);
      for (const [id, card] of byId)
        card.style.top = `${(positions.get(id)! + offset).toFixed(2)}px`;
      for (const column of node.querySelectorAll<HTMLElement>(':scope > .tree-column')) {
        column.style.height = `${height + offset}px`;
      }
      for (const parent of chapter.cells) {
        const kids = childCells(chapter.cells, parent.id);
        const first = kids[0],
          last = kids.at(-1),
          element = byId.get(parent.id);
        if (!first || !last || !element) continue;
        const top = positions.get(parent.id)!;
        const firstElement = byId.get(first.id)!,
          lastElement = byId.get(last.id)!;
        join(element, firstElement, 'top', top - positions.get(first.id)!);
        join(
          element,
          lastElement,
          'bottom',
          positions.get(last.id)! + heights.get(last.id)! - top - heights.get(parent.id)!,
        );
      }
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
        void reveal(false);
      });
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(scroll);
    arrangeTree = measure;
    schedule();
    return {
      update(next: typeof columns) {
        specs = next;
        schedule();
      },
      destroy() {
        observer.disconnect();
        cancelAnimationFrame(frame);
        arrangeTree = undefined;
      },
    };
  }
  const focused = $derived(
    fullscreenId ? chapter.cells.find((c) => c.id === fullscreenId) : undefined,
  );
  export function capturePosition() {
    clearTimeout(scrollTimer);
    if (!ready || !viewport) return;
    if (
      Math.abs((doc.treeScrollLeft ?? 0) - viewport.scrollLeft) > 1 ||
      Math.abs((doc.treeScrollTop ?? 0) - viewport.scrollTop) > 1
    )
      onchange({ ...doc, treeScrollLeft: viewport.scrollLeft, treeScrollTop: viewport.scrollTop });
  }
  onMount(() => {
    viewport.scrollLeft = doc.treeScrollLeft ?? 0;
    viewport.scrollTop = doc.treeScrollTop ?? 0;
    ready = true;
    void reveal(false);
    return () => {
      clearTimeout(scrollTimer);
    };
  });
  export function activate() {
    void reveal();
  }
  async function reveal(focus = true, atEnd = false) {
    await tick();
    if (focus) arrangeTree?.();
    if (!selected || !viewport) return;
    const card = viewport.querySelector<HTMLElement>(`[data-cell="${CSS.escape(selected.id)}"]`);
    if (!card) return;
    const control =
      editing === selected.id
        ? (card.querySelector<HTMLElement>('.cell-text') ??
          card.querySelector<HTMLElement>('input, select, button'))
        : (card.querySelector<HTMLElement>('.select-note') ?? card);
    if (focus) control?.focus({ preventScroll: true });
    if (focus && atEnd && control) richEditor(control)?.commands.focus('end');
    const a = card.getBoundingClientRect(),
      b = viewport.getBoundingClientRect(),
      margin = viewport.clientWidth < 600 ? 8 : 20;
    if (a.right > b.right - margin) viewport.scrollLeft += a.right - b.right + margin;
    else if (a.left < b.left + margin) viewport.scrollLeft += a.left - b.left - margin;
    if (!focus && (a.bottom < b.top || a.top > b.bottom))
      viewport.scrollTop += a.top + a.height / 2 - b.top - b.height / 2;
    if (focus) card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function commit(next: Notebook, remember = false) {
    try {
      const valid = parseBearingsNotebook(next);
      const previous = remember ? parseBearingsNotebook(doc) : null;
      const contentChanged = next.chapters !== doc.chapters;
      if (!onchange(valid)) return false;
      if (previous) undo = previous;
      else if (contentChanged) undo = null;
      error = '';
      message = '';
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This change could not be applied.';
      return false;
    }
  }
  function choose(id: string, edit = false) {
    editing = edit ? id : null;
    if (commit({ ...doc, activeCellId: id })) void reveal(true, edit);
  }
  function deselectOutside(event: MouseEvent) {
    const target = event.target;
    if (
      event.defaultPrevented ||
      fullscreen.open ||
      !(target instanceof Element) ||
      !viewport.contains(target) ||
      target.closest('.tree-cell, button, a, input, textarea, select') ||
      !selected
    )
      return;
    branchId = selected.id;
    if (!commit({ ...doc, activeCellId: undefined })) return;
    editing = null;
    const active = document.activeElement;
    if (active instanceof HTMLElement && viewport.contains(active)) active.blur();
  }
  async function finish() {
    editing = null;
    await reveal();
  }
  export function add(cell: Cell) {
    try {
      const next = insertRelative(doc, selected?.id ?? null, 'child', cell);
      if (commit(next, true)) {
        editing = textKinds.has(cell.kind) ? cell.id : null;
        void reveal();
      }
    } catch (cause) {
      error = String(cause instanceof Error ? cause.message : cause);
    }
  }
  export function pick(cell: Cell) {
    if (fullscreen.open) closeFullscreen();
    const replacement = replaceEmptyLibraryCell(doc, selected?.id, cell);
    if (!replacement) {
      add(cell);
      return;
    }
    if (commit(replacement, true)) {
      editing = null;
      void reveal();
    }
  }
  function insert(where: 'child' | 'above' | 'below', fromId = selected?.id ?? null) {
    try {
      const cell = textCell('answer', '');
      if (commit(insertRelative(doc, fromId, where, cell), true)) {
        editing = cell.id;
        void reveal();
        return true;
      }
    } catch (cause) {
      error = String(cause instanceof Error ? cause.message : cause);
    }
    return false;
  }
  async function split(cell: Cell, before: string, after: string) {
    try {
      const next = splitTextCell(doc, cell.id, before, after, true);
      if (!commit(next, true)) return;
      if (fullscreen.open) {
        fullscreenId = next.activeCellId!;
        await tick();
        const editor = fullscreen.querySelector<HTMLElement>('.cell-text');
        editor?.focus();
        setRichSelection(editor, 0);
      } else {
        editing = next.activeCellId!;
        await reveal();
        setRichSelection(viewport.querySelector<HTMLElement>('.cell-text'), 0);
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This cell could not be split.';
    }
  }
  function dropPosition(event: { clientY: number }, id: string | null, moving = false) {
    if (!id) return 'below' as const;
    if (!moving && isEmptyTextCell(chapter.cells.find((cell) => cell.id === id)))
      return 'replace' as const;
    const box = viewport
      .querySelector<HTMLElement>(`[data-cell="${CSS.escape(id)}"]`)!
      .getBoundingClientRect();
    const fraction = (event.clientY - box.top) / box.height;
    return fraction < 0.25
      ? ('above' as const)
      : fraction > 0.75
        ? ('below' as const)
        : ('child' as const);
  }
  function validMove(targetId: string | null) {
    return !!draggedId && (!targetId || !branchIds(chapter.cells, draggedId).has(targetId));
  }
  function autoScroll(x: number, y: number) {
    const box = viewport.getBoundingClientRect();
    if (x < box.left + 40) viewport.scrollLeft -= 18;
    else if (x > box.right - 40) viewport.scrollLeft += 18;
    if (y < box.top + 40) viewport.scrollTop -= 18;
    else if (y > box.bottom - 40) viewport.scrollTop += 18;
  }
  function endDrag() {
    draggedId = null;
    dropTarget = null;
    pointerDrag = undefined;
  }
  function startDrag(event: DragEvent, id: string) {
    if (
      !event.dataTransfer ||
      (event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable], a, .hover-control'))
    ) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    draggedId = id;
    event.dataTransfer.setData(cardDragType, id);
    event.dataTransfer.effectAllowed = 'move';
  }
  function moveCard(id: string, targetId: string | null, where: 'above' | 'below' | 'child') {
    try {
      if (commit(relocateNoteBranch(doc, id, targetId, where), true)) {
        editing = null;
        message = 'Card and its children moved.';
        void reveal();
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This card could not be moved.';
    }
    endDrag();
  }
  function startPointerDrag(event: PointerEvent, id: string) {
    suppressCardClick = false;
    if (event.pointerType === 'mouse' || event.button !== 0) return;
    event.stopPropagation();
    pointerDrag = {
      id,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      active: false,
    };
  }
  function pointerMove(event: PointerEvent) {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    if (
      !pointerDrag.active &&
      Math.hypot(event.clientX - pointerDrag.x, event.clientY - pointerDrag.y) < 7
    )
      return;
    if (!pointerDrag.active)
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointerDrag.active = true;
    draggedId = pointerDrag.id;
    event.preventDefault();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const card = element?.closest<HTMLElement>('.tree-cell');
    const id = card?.dataset.cell ?? null;
    dropTarget =
      element && viewport.contains(element) && validMove(id)
        ? { id, where: dropPosition(event, id, true) }
        : null;
    autoScroll(event.clientX, event.clientY);
  }
  function pointerEnd(event: PointerEvent) {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    const target = dropTarget;
    suppressCardClick = pointerDrag.active;
    if (pointerDrag.active && target)
      moveCard(pointerDrag.id, target.id, target.where === 'replace' ? 'child' : target.where);
    endDrag();
  }
  function dragOver(event: DragEvent, id: string | null) {
    const moving =
      !!draggedId && Array.from(event.dataTransfer?.types ?? []).includes(cardDragType);
    if (!moving && !hasLibraryDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (moving && !validMove(id)) {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
      dropTarget = null;
      return;
    }
    if (event.dataTransfer) event.dataTransfer.dropEffect = moving ? 'move' : 'copy';
    dropTarget = { id, where: dropPosition(event, id, moving) };
    autoScroll(event.clientX, event.clientY);
  }
  function dropLibrary(event: DragEvent, id: string | null) {
    if (draggedId && Array.from(event.dataTransfer?.types ?? []).includes(cardDragType)) {
      event.preventDefault();
      event.stopPropagation();
      if (validMove(id))
        moveCard(draggedId, id, dropPosition(event, id, true) as 'above' | 'below' | 'child');
      else endDrag();
      return;
    }
    if (!hasLibraryDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const where = dropPosition(event, id);
    dropTarget = null;
    try {
      const cell = libraryCellFromData(event.dataTransfer?.getData(libraryDragType) ?? '');
      if (!cell) return;
      const replacement = replaceEmptyLibraryCell(doc, id, cell);
      if (
        commit(
          replacement ?? insertRelative(doc, id, where === 'replace' ? 'child' : where, cell),
          true,
        )
      ) {
        editing = null;
        message = replacement ? 'Empty cell replaced.' : 'Library item added.';
        void reveal();
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'That library item could not be added.';
    }
  }
  function dragLeave(event: DragEvent) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
    )
      dropTarget = null;
  }
  function navigate(key: string) {
    if (!selected) {
      if (!branch) return false;
      choose(branch.id);
      return true;
    }
    const siblings = childCells(chapter.cells, selected.parentId),
      at = siblings.findIndex((c) => c.id === selected.id);
    const next =
      key === 'ArrowLeft'
        ? chapter.cells.find((c) => c.id === selected.parentId)
        : key === 'ArrowRight'
          ? childCells(chapter.cells, selected.id)[0]
          : siblings[at + (key === 'ArrowUp' ? -1 : 1)];
    if (!next) return false;
    choose(next.id);
    return true;
  }
  function atWritingEdge(target: HTMLElement, key: string) {
    const editor = richEditor(target);
    if (!editor || !editor.state.selection.empty) return false;
    const { selection, doc } = editor.state;
    const start = Selection.atStart(doc),
      end = Selection.atEnd(doc);
    if (key === 'ArrowLeft') return selection.from === start.from;
    if (key === 'ArrowRight') return selection.from === end.from;
    // A visual line boundary inside a multi-paragraph note still belongs to that note.
    const up = key === 'ArrowUp';
    return (
      selection.$from.parent === (up ? start : end).$from.parent &&
      editor.view.endOfTextblock(up ? 'up' : 'down')
    );
  }
  function move(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
    if (!selected) return false;
    try {
      const next = moveNoteBranch(doc, selected.id, key);
      if (next === doc) return false;
      if (commit(next, true)) {
        editing = null;
        message = 'Note and its children moved.';
        void reveal();
        return true;
      }
    } catch (cause) {
      error = String(cause instanceof Error ? cause.message : cause);
    }
    return false;
  }
  function remove(id = selected?.id) {
    const cell = chapter.cells.find((cell) => cell.id === id);
    if (!cell) return false;
    const siblings = childCells(chapter.cells, cell.parentId),
      at = siblings.findIndex((c) => c.id === cell.id);
    const nextId = siblings[at + 1]?.id ?? siblings[at - 1]?.id ?? cell.parentId;
    const next = {
      ...deleteCell(doc, cell.id).document,
      ...(nextId ? { activeCellId: nextId } : {}),
    };
    if (commit(next, true)) {
      editing = null;
      message = 'Note and its children deleted.';
      void reveal();
      return true;
    }
    return false;
  }
  function merge(direction: 'next' | 'previous') {
    if (!selected) return false;
    try {
      const next = mergeTextNotes(doc, selected.id, direction);
      if (next === doc) return false;
      if (commit(next, true)) {
        editing = null;
        message = 'Notes merged. Children kept.';
        void reveal();
        return true;
      }
    } catch (cause) {
      error = String(cause instanceof Error ? cause.message : cause);
    }
    return false;
  }
  async function openFullscreen(id: string) {
    if (!commit({ ...doc, activeCellId: id })) return;
    editing = null;
    fullscreenId = id;
    await tick();
    fullscreen.showModal();
    (
      fullscreen.querySelector<HTMLElement>('.cell-text') ??
      fullscreen.querySelector<HTMLElement>('.pattern-actions button') ??
      fullscreen.querySelector<HTMLElement>(
        '.focus-content input, .focus-content select, .focus-content button',
      )
    )?.focus();
  }
  function closeFullscreen() {
    fullscreen.close();
    fullscreenId = null;
  }
  function shortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target.closest('.library-panel, .app-header, .notebook-tools, .pattern-reader')
    )
      return;
    if (target.closest('.ai-composer')) return;
    const modal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
    if (modal && modal !== fullscreen) return;
    if (event.key === 'Escape') {
      if (fullscreen.open) return; // Let the native dialog close and restore card focus.
      if (editing) {
        event.preventDefault();
        void finish();
      }
      return;
    }
    const field = target.closest('input, textarea, select, [contenteditable], [role="textbox"]');
    const noteEditor =
      !!target.closest('.cell-text') && (viewport.contains(target) || fullscreen.contains(target));
    if (field && !noteEditor) return;
    const command = event.metaKey || event.ctrlKey;
    const arrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
    let action: (() => boolean) | null = null;
    if (command && !event.altKey) {
      if (['Backspace', 'Delete'].includes(event.key) && !event.shiftKey) action = remove;
      else if (event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp'))
        action = () => merge(event.key === 'ArrowDown' ? 'next' : 'previous');
      else if (!event.shiftKey && ['ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
        action = () =>
          insert(
            event.key === 'ArrowRight' ? 'child' : event.key === 'ArrowUp' ? 'above' : 'below',
          );
    } else if (event.altKey && !command && !event.shiftKey && arrow) {
      action = () => move(event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
    }
    if (action) {
      event.preventDefault();
      if (event.repeat) return;
      if (action() && fullscreen.open) closeFullscreen();
      return;
    }
    if (!command && !event.altKey && event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat && !fullscreen.open && selected) void openFullscreen(selected.id);
      return;
    }
    if (!command && !event.altKey && !event.shiftKey && arrow && !fullscreen.open) {
      const normal = noteEditor && vim && vimStatus.mode === 'normal';
      if (field && !normal && !atWritingEdge(target, event.key)) return;
      const moved = navigate(event.key);
      if (!field || normal || moved) event.preventDefault();
      return;
    }
    // Enter remains a text editing key; fullscreen arrows always move the caret.
    if (field || fullscreen.open) return;
    if (!command && !event.altKey && !event.shiftKey && event.key === 'Enter') {
      if (target.closest('button:not(.select-note)')) return;
      event.preventDefault();
      if (event.repeat) return;
      if (branch) choose(branch.id, true);
      else insert('below');
    }
  }
  function practice(
    cell: Cell,
    value: NonNullable<Cell['practice']>,
    responses: readonly { id: string; prompt: string; answer: string }[],
    runId: string,
  ) {
    commit(recordPractice(doc, cell.id, value, responses, runId));
  }
</script>

<svelte:window
  onclick={deselectOutside}
  onkeydowncapture={(event) => {
    if (event.target instanceof Element && event.target.closest('.ai-composer')) return;
    if (event.key === 'Escape' && (!vim || vimStatus.mode === 'normal')) {
      if (fullscreen.open && event.target instanceof Node && fullscreen.contains(event.target)) {
        event.preventDefault();
        closeFullscreen();
        return;
      }
      shortcut(event);
    }
    const arrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
    if (
      ((event.metaKey || event.ctrlKey) &&
        (arrow || ['Backspace', 'Delete'].includes(event.key))) ||
      (event.altKey && arrow) ||
      (arrow && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) ||
      (event.shiftKey && event.key === 'Enter')
    )
      shortcut(event);
  }}
  onkeydown={shortcut}
  ondragend={() => (dropTarget = null)}
/>
{#snippet cellEditor(cell: Cell)}
  <BearingsCell
    notebook={doc}
    onaicomment={(text) => {
      const id = crypto.randomUUID();
      return commit(insertAiComment(doc, cell.id, text, id), true) ? id : null;
    }}
    onaiundo={(id, text) => {
      const next = undoAiComment(doc, id, text);
      return !!next && commit(next);
    }}
    {cell}
    {patterns}
    {onread}
    {vim}
    {cursor}
    vimMode={vimStatus.mode}
    {onvimchange}
    active
    plain
    hierarchical
    onchange={(update) => commit(updateCell(doc, cell.id, update))}
    onkindchange={(kind) => commit(changeTextCellKind(doc, cell.id, kind))}
    onnext={() => insert('below')}
    ondivider={(before, after) => void split(cell, before, after)}
    onpractice={(value, responses, runId) => practice(cell, value, responses, runId)}
  />
{/snippet}
<section
  class="tree-view"
  class:library-dragging={!!dropTarget || !!draggedId}
  aria-label="Hierarchical notebook"
>
  {#if branch}<nav class="note-path" aria-label="Note path">
      {#each path as cell, index (cell.id)}{#if index}<ChevronRight
            size={12}
            aria-hidden="true"
          />{/if}{#if cell.id === branch.id}<span>{noteLabel(cell)}</span>{:else}<button
            onclick={() => choose(cell.id)}>{noteLabel(cell)}</button
          >{/if}{/each}
    </nav>{/if}
  <div
    class="tree-viewport"
    class:drop-root={dropTarget?.id === null}
    ondragover={(event) => dragOver(event, null)}
    ondrop={(event) => dropLibrary(event, null)}
    ondragleave={dragLeave}
    role="region"
    aria-label="Horizontally scrollable notes"
    bind:this={viewport}
    onscroll={() => {
      if (ready) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(capturePosition, 300);
      }
    }}
  >
    <div class="tree-columns" use:layoutTree={columns}>
      {#if !chapter.cells.length}<div class="empty-tree">
          <button class="start" onclick={() => insert('below')}
            ><Plus size={17} />Start writing</button
          >
        </div>
      {:else}{#each columns as column, index (index)}<section
            class="tree-column"
            aria-label={`Notes at depth ${index + 1}`}
          >
            {#each column as cell (cell.id)}{@const active = cell.id === selected?.id}
              <article
                class="tree-cell"
                class:writing-surface={textKinds.has(cell.kind)}
                data-kind={cell.kind}
                class:selected={active}
                class:branch-parent={path.some((ancestor) => ancestor.id === cell.id) &&
                  cell.id !== branch?.id}
                class:group-first={childCells(chapter.cells, cell.parentId)[0]?.id === cell.id}
                class:group-last={childCells(chapter.cells, cell.parentId).at(-1)?.id === cell.id}
                tabindex="-1"
                aria-label={`Card: ${noteLabel(cell)}`}
                class:drop-above={dropTarget?.id === cell.id && dropTarget.where === 'above'}
                class:drop-below={dropTarget?.id === cell.id && dropTarget.where === 'below'}
                class:drop-child={dropTarget?.id === cell.id && dropTarget.where === 'child'}
                class:drop-replace={dropTarget?.id === cell.id && dropTarget.where === 'replace'}
                data-cell={cell.id}
                data-parent={cell.parentId ?? ''}
                draggable={editing !== cell.id}
                class:drag-source={draggedId === cell.id}
                ondragstart={(event) => startDrag(event, cell.id)}
                ondragend={endDrag}
                ondragover={(event) => dragOver(event, cell.id)}
                ondrop={(event) => dropLibrary(event, cell.id)}
                ondragleave={dragLeave}
                onfocusout={(event) => {
                  if (
                    editing === cell.id &&
                    ai?.target?.cellId !== cell.id &&
                    event.relatedTarget instanceof Node &&
                    !event.currentTarget.contains(event.relatedTarget) &&
                    !(
                      event.relatedTarget instanceof HTMLElement &&
                      event.relatedTarget.closest('.pattern-picker')
                    )
                  )
                    editing = null;
                }}
              >
                <span class="join-curve incoming-top" aria-hidden="true"></span>
                <span class="join-curve incoming-bottom" aria-hidden="true"></span>
                <span class="join-curve outgoing-top" aria-hidden="true"></span>
                <span class="join-curve outgoing-bottom" aria-hidden="true"></span>
                {#if cell.kind === 'pattern'}<BearingsRemovePattern
                    onremove={() => remove(cell.id)}
                  />{/if}
                {#if textKinds.has(cell.kind)}<span class="tree-type-icon"
                    ><BearingsCellIcon kind={cell.kind} /></span
                  >{/if}
                {#if !fullscreenId && (editing === cell.id || (active && !textKinds.has(cell.kind)))}<div
                    class="card-editor"
                  >
                    {@render cellEditor(cell)}
                  </div>
                {:else}<button
                    class="select-note"
                    draggable="true"
                    onpointerdown={(event) => startPointerDrag(event, cell.id)}
                    onpointermove={pointerMove}
                    onpointerup={pointerEnd}
                    onpointercancel={() => {
                      if (pointerDrag) endDrag();
                    }}
                    aria-label={`Select note: ${noteLabel(cell)}`}
                    aria-pressed={active}
                    onclick={() => {
                      if (suppressCardClick) {
                        suppressCardClick = false;
                        return;
                      }
                      choose(cell.id, textKinds.has(cell.kind));
                    }}
                  >
                    {#if cell.pattern || cell.rating}<h3>
                        {cell.pattern?.title || cell.rating?.label}
                      </h3>{/if}
                    {#if textKinds.has(cell.kind) && noteBody(cell)}<BearingsMarkdown
                        text={noteBody(cell)}
                      />{:else}<p>
                        {cell.kind === 'pattern'
                          ? cell.pattern?.summary
                          : cell.kind === 'rating'
                            ? cell.rating?.value === null
                              ? 'Unanswered'
                              : `${cell.rating?.value} / ${cell.rating?.max}`
                            : noteBody(cell) || 'Start with a thought…'}
                      </p>{/if}
                  </button>{/if}
                {#if dropTarget?.id === cell.id}<span class="drop-hint" aria-hidden="true"
                    >{draggedId
                      ? dropTarget.where === 'child'
                        ? 'Move as child'
                        : dropTarget.where === 'above'
                          ? 'Move above'
                          : 'Move below'
                      : dropTarget.where === 'replace'
                        ? 'Replace empty cell'
                        : dropTarget.where === 'child'
                          ? 'Add child'
                          : dropTarget.where === 'above'
                            ? 'Add above'
                            : 'Add below'}</span
                  >{/if}
                <button
                  class="hover-control fullscreen-control"
                  aria-label="Edit in fullscreen"
                  title="Edit in fullscreen (Shift Enter)"
                  onclick={() => openFullscreen(cell.id)}><Maximize2 size={14} /></button
                >
                {#if editing !== cell.id}
                  <button
                    class="hover-control add-above"
                    aria-label="Add note above"
                    title="Add note above"
                    onclick={() => insert('above', cell.id)}><Plus size={14} /></button
                  >
                  <button
                    class="hover-control add-below"
                    aria-label="Add note below"
                    title="Add note below"
                    onclick={() => insert('below', cell.id)}><Plus size={14} /></button
                  >
                  <button
                    class="hover-control add-child"
                    aria-label="Add child note"
                    title="Add child note"
                    onclick={() => insert('child', cell.id)}><Plus size={14} /></button
                  >
                {/if}
              </article>
            {/each}
          </section>{/each}{/if}
    </div>
  </div>
  <footer>
    {#if vim}<span class="notebook-vim"><BearingsVimStatus status={vimStatus} /></span>{/if}
    <span class="tree-status" role={error ? 'alert' : 'status'}
      >{error || message || `${chapter.cells.length} notes`}</span
    >{#if undo}<button
        class="undo"
        onclick={() => {
          if (undo && commit(undo)) {
            undo = null;
            editing = null;
            void reveal();
            message = 'Change undone.';
          }
        }}><Undo2 size={14} />Undo</button
      >{/if}<span class="key-hint"
      >{editing
        ? 'Esc · navigate cards · Shift Enter · fullscreen'
        : 'Enter · edit · ↑ ↓ ← → · navigate'}</span
    >
  </footer>
</section>
<dialog
  class="focus-editor"
  bind:this={fullscreen}
  aria-labelledby="tree-focus-title"
  onclose={() => {
    fullscreenId = null;
    void reveal();
  }}
>
  <header>
    <h2 id="tree-focus-title" class="sr-only">Focus editor</h2>
    <div class="focus-context">
      <span class="focus-chapter">{chapter.title}</span><span aria-hidden="true">/</span><span
        class="focus-position"
        >{String(chapter.cells.findIndex((cell) => cell.id === fullscreenId) + 1).padStart(
          2,
          '0',
        )}</span
      >
    </div>
    <button aria-label="Done" title="Return to Tree" onclick={closeFullscreen}
      ><span class="focus-escape" aria-hidden="true">esc</span><Minimize2 size={16} /></button
    >
  </header>
  {#if focused}<div
      class="focus-content"
      class:writing-surface={textKinds.has(focused.kind)}
      data-kind={focused.kind}
    >
      {#if focused.kind === 'pattern'}<BearingsRemovePattern
          onremove={() => {
            if (focused && remove(focused.id)) closeFullscreen();
          }}
        />{/if}
      {#if textKinds.has(focused.kind)}<span class="focus-type-icon"
          ><BearingsCellIcon kind={focused.kind} /></span
        >{/if}
      {@render cellEditor(focused)}
    </div>{/if}
  {#if vim}<div class="focus-vim"><BearingsVimStatus status={vimStatus} /></div>{/if}
</dialog>

<style>
  .notebook-vim {
    display: flex;
    flex: none;
  }
  .focus-vim {
    position: fixed;
    left: 20px;
    bottom: max(12px, env(safe-area-inset-bottom));
    pointer-events: none;
  }
  .tree-view {
    min-width: 0;
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bearings-surface);
  }
  .note-path {
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    color: var(--bearings-muted);
    font-size: 11px;
    flex: none;
  }
  .note-path button {
    padding: 2px;
    color: inherit;
    font: inherit;
    border: 0;
    border-radius: 3px;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .note-path span {
    color: var(--bearings-ink);
  }
  .note-path :global(svg) {
    flex: none;
  }
  .tree-viewport {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--bearings-muted) var(--bearings-surface);
  }
  .tree-columns {
    display: flex;
    gap: 0;
    align-items: flex-start;
    width: max-content;
    min-width: 100%;
    min-height: 100%;
    padding: 32px 32px 32px 24px;
    box-sizing: border-box;
  }
  .tree-column {
    position: relative;
    width: 360px;
    flex: 0 0 360px;
  }
  .tree-cell {
    --tree-cell-rest: color-mix(in srgb, var(--bearings-ink) 10%, var(--bearings-surface));
    --tree-cell-color: var(--tree-cell-rest);
    position: absolute;
    left: 0;
    right: 0;
    border: 0;
    border-bottom: 1px solid var(--bearings-line);
    border-radius: 0;
    background: var(--tree-cell-color);
    color: var(--bearings-muted);
    transition:
      background 150ms,
      color 150ms;
  }
  .tree-cell.writing-surface {
    --tree-cell-rest: color-mix(in srgb, var(--bearings-ink) 10%, var(--cell-fill));
    border-left: var(--cell-edge-width) var(--cell-edge-style) var(--cell-edge);
  }
  .tree-cell.writing-surface.selected {
    --tree-cell-color: var(--cell-fill);
    color: var(--cell-ink);
    box-shadow: none;
  }
  .tree-type-icon {
    position: absolute;
    left: 7px;
    top: 22px;
    display: inline-flex;
    pointer-events: none;
  }
  .tree-cell.writing-surface > .select-note,
  .tree-cell.writing-surface > .card-editor {
    padding-left: 32px;
  }
  .tree-cell:focus-visible,
  .tree-cell:has(:global(.cell-text:focus-visible)) {
    outline: 2px solid var(--bearings-accent);
    outline-offset: -2px;
  }
  @media (hover: hover) and (pointer: fine) {
    .tree-cell:not(.selected, .drop-child, .drop-replace):hover {
      --tree-cell-color: color-mix(in srgb, var(--tree-cell-rest) 80%, var(--bearings-paper));
    }
    .tree-cell.writing-surface:not(.drop-above, .drop-below, .drop-child, .drop-replace) {
      box-shadow: none;
      outline: none;
    }
    .tree-cell.writing-surface[data-kind='answer'] {
      border-left-color: transparent;
    }
    .tree-cell.writing-surface :global(.select-note:focus-visible) {
      outline: none;
    }
  }
  .card-editor :global(.cell-text.plain:focus-visible) {
    outline: none;
  }
  .tree-cell.drop-above,
  .tree-cell.selected.drop-above {
    box-shadow: inset 0 3px var(--bearings-accent);
  }
  .tree-cell.drop-below,
  .tree-cell.selected.drop-below {
    box-shadow: inset 0 -3px var(--bearings-accent);
  }
  .tree-cell.drop-child,
  .tree-cell.selected.drop-child {
    outline: 2px solid var(--bearings-accent);
    outline-offset: -2px;
    --tree-cell-color: var(--bearings-accent-soft);
  }
  .tree-cell.drop-replace,
  .tree-cell.selected.drop-replace {
    outline: 2px dashed var(--bearings-accent);
    outline-offset: -2px;
    --tree-cell-color: var(--bearings-accent-soft);
  }
  .drop-root {
    box-shadow: inset 0 0 0 2px var(--bearings-accent);
  }
  .drop-hint {
    position: absolute;
    top: 4px;
    right: 8px;
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 11px;
    background: var(--bearings-accent);
    color: var(--bearings-paper);
    pointer-events: none;
    z-index: 4;
  }
  .library-dragging .hover-control {
    opacity: 0 !important;
    pointer-events: none !important;
  }
  .tree-cell.drag-source {
    opacity: 0.5;
  }
  .tree-cell.group-last {
    border-bottom: 0;
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
  }
  .tree-cell.group-first {
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }
  .tree-cell.selected {
    --tree-cell-color: var(--bearings-paper);
    color: var(--bearings-ink);
    box-shadow: inset 3px 0 var(--bearings-accent);
  }
  .tree-cell.branch-parent {
    z-index: 1;
  }
  .tree-cell:hover {
    z-index: 2;
  }
  .tree-cell:focus-within {
    z-index: 3;
  }
  .tree-cell:global([data-incoming-top]) {
    border-top-left-radius: 0;
  }
  .tree-cell:global([data-incoming-bottom]) {
    border-bottom-left-radius: 0;
  }
  .tree-cell:global([data-outgoing-top]) {
    border-top-right-radius: 0;
  }
  .tree-cell:global([data-outgoing-bottom]) {
    border-bottom-right-radius: 0;
  }
  .tree-cell:global([data-incoming-top='convex']) {
    border-top-left-radius: var(--incoming-top-radius);
  }
  .tree-cell:global([data-incoming-bottom='convex']) {
    border-bottom-left-radius: var(--incoming-bottom-radius);
  }
  .tree-cell:global([data-outgoing-top='convex']) {
    border-top-right-radius: var(--outgoing-top-radius);
  }
  .tree-cell:global([data-outgoing-bottom='convex']) {
    border-bottom-right-radius: var(--outgoing-bottom-radius);
  }
  .join-curve {
    display: none;
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }
  .tree-cell:global([data-outgoing-top='concave']) > .outgoing-top {
    display: block;
    right: 0;
    top: calc(-1 * var(--outgoing-top-radius));
    width: var(--outgoing-top-radius);
    height: var(--outgoing-top-radius);
    background: radial-gradient(
      circle at top left,
      transparent var(--outgoing-top-radius),
      var(--tree-cell-color) var(--outgoing-top-radius)
    );
  }
  .tree-cell:global([data-outgoing-bottom='concave']) > .outgoing-bottom {
    display: block;
    right: 0;
    bottom: calc(-1 * var(--outgoing-bottom-radius));
    width: var(--outgoing-bottom-radius);
    height: var(--outgoing-bottom-radius);
    background: radial-gradient(
      circle at bottom left,
      transparent var(--outgoing-bottom-radius),
      var(--tree-cell-color) var(--outgoing-bottom-radius)
    );
  }
  .tree-cell:global([data-incoming-top='concave']) > .incoming-top {
    display: block;
    left: 0;
    top: calc(-1 * var(--incoming-top-radius));
    width: var(--incoming-top-radius);
    height: var(--incoming-top-radius);
    background: radial-gradient(
      circle at top right,
      transparent var(--incoming-top-radius),
      var(--tree-cell-color) var(--incoming-top-radius)
    );
  }
  .tree-cell:global([data-incoming-bottom='concave']) > .incoming-bottom {
    display: block;
    left: 0;
    bottom: calc(-1 * var(--incoming-bottom-radius));
    width: var(--incoming-bottom-radius);
    height: var(--incoming-bottom-radius);
    background: radial-gradient(
      circle at bottom right,
      transparent var(--incoming-bottom-radius),
      var(--tree-cell-color) var(--incoming-bottom-radius)
    );
  }
  .select-note {
    touch-action: none;
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    padding: 18px 20px;
    min-height: 108px;
    font: inherit;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }
  h3 {
    font-size: 17px;
    font-weight: 650;
    letter-spacing: -0.035em;
    line-height: 1.35;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .selected h3 {
    font-weight: 750;
  }
  p {
    font-size: 14px;
    line-height: 1.75;
    white-space: pre-wrap;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .card-editor {
    padding: 18px 20px;
  }
  button:hover {
    background: var(--bearings-accent-soft);
  }
  .select-note:hover {
    background: transparent;
  }
  footer {
    min-height: 44px;
    flex-direction: row;
    justify-content: flex-start;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    font-size: 11px;
    color: var(--bearings-muted);
    flex: none;
  }
  .tree-status {
    overflow-wrap: anywhere;
  }
  .key-hint {
    margin-left: auto;
    white-space: nowrap;
  }
  .undo {
    display: flex;
    align-items: center;
    gap: 5px;
    border: 0;
    padding: 3px;
    font: inherit;
    color: var(--bearings-accent);
    background: transparent;
    cursor: pointer;
  }
  .empty-tree {
    max-width: 420px;
    padding: 40px 30px;
  }
  .start {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    font: inherit;
    font-size: 13px;
    border: 1px solid var(--bearings-ink);
    background: var(--bearings-accent-soft);
    color: var(--bearings-ink);
    border-radius: 4px;
    cursor: pointer;
  }
  .focus-editor {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    border: 0;
    border-radius: 0;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    overflow: auto;
  }
  .focus-editor::backdrop {
    background: var(--bearings-paper);
  }
  .focus-editor header button {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 4px 8px;
    border: 0;
    border-radius: 4px;
    font: inherit;
    font-size: 12px;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .focus-editor header {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    min-height: 64px;
    box-sizing: border-box;
    padding: 12px 28px;
    background: var(--bearings-paper);
    color: var(--bearings-muted);
  }
  .focus-context {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    font-size: 11px;
  }
  .focus-chapter {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .focus-position {
    font-variant-numeric: tabular-nums;
  }
  .focus-escape {
    font-size: 11px;
  }
  .focus-content {
    position: relative;
    width: min(720px, calc(100% - 112px));
    margin: 64px auto 80px;
    padding: 0;
    min-height: calc(100dvh - 208px);
  }
  .focus-content.writing-surface {
    background: transparent;
    color: var(--cell-ink);
    border: 0;
  }
  .focus-type-icon {
    position: absolute;
    left: -24px;
    top: 8px;
    display: inline-flex;
    pointer-events: none;
  }
  .focus-content :global(.cell-title) {
    font-size: 26px;
  }
  .focus-content :global(.cell-text) {
    min-height: calc(100dvh - 208px);
    font-size: 18px;
    line-height: 1.85;
  }
  .focus-content :global(.cell-kind.plain) {
    left: auto;
    right: 0;
    top: -24px;
  }
  @media (hover: hover) and (pointer: fine) {
    .focus-content :global(.cell-kind) {
      opacity: 0;
      pointer-events: none;
    }
    .focus-content:hover :global(.cell-kind),
    .focus-content :global(.cell-kind:focus-within) {
      opacity: 1;
      pointer-events: auto;
    }
  }
  .hover-control {
    position: absolute;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 28px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 3px;
    background: var(--bearings-paper);
    color: var(--bearings-muted);
    opacity: 0;
    pointer-events: none;
    cursor: pointer;
    transition:
      opacity 120ms,
      background 120ms;
  }
  .fullscreen-control {
    top: 0;
    right: 0;
    transform: translate(25%, -25%);
    width: 24px;
    height: 24px;
    border: 0;
  }
  .tree-cell[data-kind='pattern'] > .fullscreen-control {
    right: 48px;
  }
  .tree-cell[data-kind='pattern'] > .select-note h3 {
    padding-right: 40px;
  }
  @media (pointer: coarse) {
    .tree-cell[data-kind='pattern'] > .fullscreen-control {
      right: 60px;
    }
    .tree-cell[data-kind='pattern'] > .select-note h3 {
      padding-right: 52px;
    }
  }
  .add-above {
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .add-below {
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 50%);
  }
  .add-child {
    right: 0;
    top: 50%;
    transform: translate(50%, -50%);
    width: 22px;
    height: 28px;
  }
  .tree-cell:hover .hover-control,
  .tree-cell:focus-within .hover-control {
    opacity: 1;
    pointer-events: auto;
  }
  .tree-viewport:has(.tree-cell:hover) .tree-cell:not(:hover):not(:focus-within) .hover-control {
    opacity: 0;
    pointer-events: none;
  }
  .tree-viewport:has(.tree-cell:hover) .tree-cell:not(:hover) .hover-control:focus-visible {
    opacity: 1;
    pointer-events: auto;
  }
  .selected .hover-control {
    color: var(--bearings-accent);
  }
  .tree-cell .hover-control:hover {
    background: var(--bearings-accent-soft);
    color: var(--bearings-accent);
  }
  @media (max-width: 700px) {
    .tree-columns {
      padding: 24px 24px 24px 16px;
    }
    .tree-column {
      width: min(360px, calc(100vw - 48px));
      flex-basis: min(360px, calc(100vw - 48px));
    }
    .note-path {
      padding: 10px 16px;
    }
    .key-hint {
      display: none;
    }
    .focus-content {
      width: calc(100% - 64px);
      margin-top: 48px;
    }
    .focus-type-icon {
      left: -22px;
    }
    .focus-editor header {
      padding: 12px 16px;
    }
    .focus-escape {
      display: none;
    }
  }
  @media (hover: none), (pointer: coarse) {
    .tree-cell.selected .hover-control {
      opacity: 1;
      pointer-events: auto;
    }
  }
  @media (pointer: coarse) {
    .focus-editor header button {
      min-width: 44px;
      min-height: 44px;
    }
    .card-editor {
      padding-top: 28px;
    }
    .tree-cell:has(> .card-editor) > .tree-type-icon {
      top: 32px;
    }
    .card-editor :global(.cell-kind button) {
      width: 36px;
    }
    .card-editor :global(.cell-kind.plain) {
      left: 0;
    }
    .hover-control::after {
      content: '';
      position: absolute;
      width: 44px;
      height: 44px;
    }
    .fullscreen-control {
      top: 0;
      right: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tree-cell {
      transition: none;
    }
  }
</style>
