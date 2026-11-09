<script lang="ts">
  import { onMount, tick, untrack, type Snippet } from 'svelte';
  import { Plus, Minus, Maximize, GripVertical, BookOpen } from '@lucide/svelte';
  import {
    situationConnections,
    connectionKey,
    type Situation,
    type SituationConnection,
    type SituationMapPosition,
  } from '@patternverse/workspace';
  import {
    layoutSituations,
    mapBounds,
    connectionPath,
    MAP_NODE_WIDTH,
    MAP_NODE_HEIGHT,
    isMapSpaceFree,
    nearbySubproblemPosition,
  } from './graph';
  let {
    situations,
    selectedId,
    editing,
    disabled,
    canMove,
    canSelect,
    canAdd,
    draftPosition,
    draftParentId,
    childComposer,
    query,
    activeConnection,
    onselect,
    onmove,
    onaddsubproblem,
  }: {
    situations: readonly Situation[];
    selectedId: string;
    editing: boolean;
    disabled: boolean;
    canMove: boolean;
    canSelect: boolean;
    canAdd: boolean;
    draftPosition: SituationMapPosition | null;
    draftParentId: string;
    childComposer: Snippet;
    query: string;
    activeConnection: SituationConnection | null;
    onselect: (id: string) => void | Promise<void>;
    onmove: (situation: Situation, position: SituationMapPosition) => Promise<boolean>;
    onaddsubproblem: (position: SituationMapPosition) => void | Promise<void>;
  } = $props();
  type Gesture = {
    kind: 'pan' | 'node' | 'stem';
    pointerId: number;
    x: number;
    y: number;
    tx: number;
    ty: number;
    id?: string;
    original?: SituationMapPosition;
    moved: boolean;
    revision?: number;
  };

  let canvas = $state<HTMLDivElement>();
  let width = $state(600),
    height = $state(520),
    zoom = $state(1),
    tx = $state(0),
    ty = $state(0);
  let previewPosition = $state.raw<{ id: string; position: SituationMapPosition } | null>(null);
  let stemPosition = $state.raw<SituationMapPosition | null>(null),
    stemNotice = $state('');
  let stemButton = $state<HTMLButtonElement>();
  let suppressStemClick = false;
  let gesture: Gesture | null = null,
    suppressClick = false,
    alive = true,
    mounted = false,
    lastQuery = '';
  const nodes = $derived(
    layoutSituations(situations).map((node) =>
      previewPosition?.id === node.situation.id
        ? { ...node, position: previewPosition.position }
        : node,
    ),
  );
  const edges = $derived(situationConnections(situations));
  const positions = $derived(new Map(nodes.map((node) => [node.situation.id, node.position])));
  const selectedPosition = $derived(positions.get(selectedId));
  const stemStart = $derived(
    selectedPosition
      ? {
          x: (selectedPosition.x + MAP_NODE_WIDTH / 2) * zoom + tx,
          y: (selectedPosition.y + MAP_NODE_HEIGHT) * zoom + ty,
        }
      : null,
  );
  const stemEnd = $derived(
    stemPosition
      ? {
          x: (stemPosition.x + MAP_NODE_WIDTH / 2) * zoom + tx,
          y: stemPosition.y * zoom + ty,
        }
      : stemStart
        ? { x: stemStart.x, y: stemStart.y + 50 }
        : null,
  );
  const validStemPosition = $derived(!!stemPosition && isMapSpaceFree(stemPosition, nodes));
  const composerWidth = $derived(Math.min(270, width - 24));
  const composerPosition = $derived(
    draftPosition
      ? {
          x: Math.max(
            12,
            Math.min(
              width - composerWidth - 12,
              (draftPosition.x + MAP_NODE_WIDTH / 2) * zoom + tx - composerWidth / 2,
            ),
          ),
          y: Math.max(12, Math.min(height - 220, draftPosition.y * zoom + ty)),
        }
      : null,
  );
  const draftParent = $derived(positions.get(draftParentId));
  $effect(() => {
    const position = draftPosition;
    if (position) untrack(() => revealDraft(position));
  });
  const bounds = $derived(mapBounds(nodes));
  const worldWidth = $derived(Math.max(800, bounds.x + bounds.width + 100)),
    worldHeight = $derived(Math.max(600, bounds.y + bounds.height + 100));
  const matches = $derived(
    situations.filter((s) =>
      `${s.title} ${s.context}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
  $effect(() => {
    const id = selectedId;
    if (mounted && id) untrack(() => ensureVisible(id));
  });
  $effect(() => {
    const value = query.trim();
    if (value !== lastQuery && mounted && canSelect && !disabled) {
      lastQuery = value;
      if (value && matches[0]) {
        void onselect(matches[0].id);
        center(matches[0].id);
      }
    }
  });
  onMount(() => {
    mounted = true;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const initial = !canvas?.dataset.measured;
      width = box.width;
      height = box.height;
      if (canvas) canvas.dataset.measured = 'true';
      if (initial) fit();
    });
    if (canvas) observer.observe(canvas);
    void tick().then(() => {
      fit();
      if (query.trim() && canSelect && matches[0]) {
        lastQuery = query.trim();
        void onselect(matches[0].id);
        center(matches[0].id);
      }
    });
    return () => {
      alive = false;
      mounted = false;
      observer.disconnect();
    };
  });
  export function cancelGesture() {
    if (!gesture) return false;
    if (gesture.kind === 'stem') suppressStemClick = true;
    gesture = null;
    previewPosition = null;
    stemPosition = null;
    stemNotice = '';
    return true;
  }
  export function focusStem() {
    suppressStemClick = false;
    stemButton?.focus();
  }
  function ensureVisible(id: string) {
    const p = positions.get(id);
    if (!p) return;
    const x = p.x * zoom + tx,
      y = p.y * zoom + ty;
    if (
      x < 12 ||
      y < 12 ||
      x + MAP_NODE_WIDTH * zoom > width - 12 ||
      y + MAP_NODE_HEIGHT * zoom + 76 > height - 12
    )
      center(id);
  }
  function revealDraft(position: SituationMapPosition) {
    const parent = positions.get(draftParentId);
    if (!parent) return;
    const below = position.y >= parent.y + MAP_NODE_HEIGHT;
    if (below) {
      zoom = Math.max(0.2, Math.min(zoom, (height - 244) / Math.max(position.y - parent.y, 1)));
      ty = 12 - parent.y * zoom;
    }
    tx = width / 2 - (position.x + MAP_NODE_WIDTH / 2) * zoom;
  }
  function fit() {
    zoom = Math.max(
      0.2,
      Math.min(
        1.15,
        (width - 70) / Math.max(bounds.width, 1),
        (height - 70) / Math.max(bounds.height + 76, 1),
      ),
    );
    tx = (width - bounds.width * zoom) / 2 - bounds.x * zoom;
    ty = (height - (bounds.height + 76) * zoom) / 2 - bounds.y * zoom;
  }
  export function center(id: string) {
    const p = positions.get(id);
    if (!p) return;
    tx = width / 2 - (p.x + MAP_NODE_WIDTH / 2) * zoom;
    ty = height / 2 - (p.y + MAP_NODE_HEIGHT / 2) * zoom;
  }
  function scale(factor: number) {
    const next = Math.max(0.2, Math.min(2, zoom * factor));
    tx = width / 2 - ((width / 2 - tx) * next) / zoom;
    ty = height / 2 - ((height / 2 - ty) * next) / zoom;
    zoom = next;
  }
  function startPan(event: PointerEvent) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest('button, input, select, textarea, form') ||
      disabled
    )
      return;
    gesture = {
      kind: 'pan',
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      tx,
      ty,
      moved: false,
    };
    if (event.currentTarget instanceof HTMLElement)
      event.currentTarget.setPointerCapture(event.pointerId);
  }
  function startDrag(event: PointerEvent, situation: Situation) {
    suppressClick = false;
    if (!editing || disabled || !canMove || event.button !== 0) return;
    event.stopPropagation();
    const p = positions.get(situation.id)!;
    gesture = {
      kind: 'node',
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      tx,
      ty,
      id: situation.id,
      original: p,
      revision: situation.revision,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function startStem(event: PointerEvent) {
    event.stopPropagation();
    suppressStemClick = false;
    stemNotice = '';
    if (!canAdd || disabled || event.button !== 0) return;
    gesture = {
      kind: 'stem',
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      tx,
      ty,
      id: selectedId,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function addNearby() {
    if (suppressStemClick) {
      suppressStemClick = false;
      return;
    }
    if (!canAdd || disabled || !selectedPosition) return;
    const position = nearbySubproblemPosition(selectedPosition, nodes);
    if (position) void onaddsubproblem(position);
    else stemNotice = 'Pan to an empty space and drag the + there.';
  }
  function pointerMove(event: PointerEvent) {
    const current = gesture;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 4) current.moved = true;
    if (!current.moved) return;
    event.preventDefault();
    if (current.kind === 'pan') {
      tx = current.tx + dx;
      ty = current.ty + dy;
    } else if (current.kind === 'stem') {
      const rect = canvas!.getBoundingClientRect();
      stemPosition = {
        x: Math.max(
          0,
          Math.min(100000, (event.clientX - rect.left - tx) / zoom - MAP_NODE_WIDTH / 2),
        ),
        y: Math.max(0, Math.min(100000, (event.clientY - rect.top - ty) / zoom)),
      };
      stemNotice = isMapSpaceFree(stemPosition, nodes)
        ? 'Release to name the subproblem'
        : 'Choose an empty space';
    } else
      previewPosition = {
        id: current.id!,
        position: {
          x: Math.max(0, Math.min(100000, current.original!.x + dx / zoom)),
          y: Math.max(0, Math.min(100000, current.original!.y + dy / zoom)),
        },
      };
  }
  async function move(situation: Situation, position: SituationMapPosition) {
    const result = await onmove(situation, position);
    if (alive) {
      previewPosition = null;
      await tick();
    }
    return result;
  }
  function pointerEnd(event: PointerEvent, cancel = false) {
    const current = gesture;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture = null;
    if (current.kind === 'stem') {
      suppressStemClick = current.moved || cancel;
      const position = stemPosition;
      const rect = canvas!.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (
        !cancel &&
        current.moved &&
        inside &&
        position &&
        canAdd &&
        current.id === selectedId &&
        isMapSpaceFree(position, nodes)
      ) {
        stemNotice = '';
        void onaddsubproblem(position);
      } else if (current.moved && !cancel) stemNotice = 'Drop the + in an empty space on the map.';
      else stemNotice = '';
      stemPosition = null;
    } else if (current.kind === 'node') {
      suppressClick = current.moved;
      if (!cancel && current.moved && previewPosition) {
        const s = situations.find((s) => s.id === current.id);
        if (s) void move({ ...s, revision: current.revision! }, previewPosition.position);
      } else previewPosition = null;
    }
  }
  async function keyMove(event: KeyboardEvent, situation: Situation) {
    suppressClick = false;
    if (
      !editing ||
      disabled ||
      !canMove ||
      !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return;
    event.preventDefault();
    const p = positions.get(situation.id)!;
    const amount = event.shiftKey ? 50 : 20;
    await move(situation, {
      x: Math.max(
        0,
        Math.min(
          100000,
          p.x + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          100000,
          p.y + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0),
        ),
      ),
    });
    await tick();
    canvas
      ?.querySelector<HTMLButtonElement>(`[data-situation="${CSS.escape(situation.id)}"]`)
      ?.focus();
  }
</script>

<div class="map-area">
  <div
    class="map-canvas"
    class:editing
    bind:this={canvas}
    role="group"
    aria-label="Situation map. Drag the background to pan. Select a problem to preview its notebook."
    onpointerdown={startPan}
    onpointermove={pointerMove}
    onpointerup={(event) => pointerEnd(event)}
    onpointercancel={(event) => pointerEnd(event, true)}
    onlostpointercapture={(event) => pointerEnd(event, true)}
  >
    <div
      class="map-world"
      style:width={`${worldWidth}px`}
      style:height={`${worldHeight}px`}
      style:transform={`translate(${tx}px, ${ty}px) scale(${zoom})`}
    >
      <svg class="connections" width={worldWidth} height={worldHeight} aria-hidden="true">
        {#each edges as edge (connectionKey(edge))}{@const from = positions.get(
            edge.kind === 'part-of' ? edge.targetId : edge.sourceId,
          )}{@const to = positions.get(edge.kind === 'part-of' ? edge.sourceId : edge.targetId)}
          {#if from && to}<path
              d={connectionPath(from, to)}
              class:related={edge.kind === 'related'}
              class:active={activeConnection
                ? connectionKey(activeConnection) === connectionKey(edge)
                : edge.sourceId === selectedId || edge.targetId === selectedId}
            />{/if}
        {/each}
      </svg>
      {#each nodes as node (node.situation.id)}{@const parent = (
          node.situation.connections ?? []
        ).some((link) => link.kind === 'part-of')}
        <button
          class="map-node"
          class:dimmed={!!query.trim() && !matches.some((s) => s.id === node.situation.id)}
          class:movable={editing && !disabled && canMove}
          style:left={`${node.position.x}px`}
          style:top={`${node.position.y}px`}
          style:width={`${MAP_NODE_WIDTH}px`}
          style:height={`${MAP_NODE_HEIGHT}px`}
          data-situation={node.situation.id}
          aria-pressed={selectedId === node.situation.id}
          aria-label={node.situation.title}
          title={editing
            ? 'Drag to move · arrow keys move the focused problem'
            : node.situation.title}
          {disabled}
          onpointerdown={(event) => startDrag(event, node.situation)}
          onkeydown={(event) => keyMove(event, node.situation)}
          onfocus={(event) => {
            if (event.currentTarget.matches(':focus-visible')) ensureVisible(node.situation.id);
          }}
          onclick={() => {
            if (suppressClick) {
              suppressClick = false;
              return;
            }
            void onselect(node.situation.id);
          }}
        >
          <span class="node-heading"
            ><span class="node-kind">{parent ? 'Subproblem' : 'Situation'}</span
            >{#if node.situation.priority}<span
                class="node-priority"
                aria-label={`Priority ${node.situation.priority} out of 5`}
                >{node.situation.priority} / 5</span
              >{/if}</span
          ><span class="node-title">{node.situation.title}</span><span class="node-foot"
            >{#if editing}<GripVertical size={13} aria-hidden="true" />Move{:else}<BookOpen
                size={13}
                aria-hidden="true"
              />Notebook{/if}</span
          >
        </button>
      {/each}
      {#if stemPosition}<div
          class="subproblem-placeholder"
          class:invalid={!validStemPosition}
          style:left={`${stemPosition.x}px`}
          style:top={`${stemPosition.y}px`}
          style:width={`${MAP_NODE_WIDTH}px`}
          style:height={`${MAP_NODE_HEIGHT}px`}
          aria-hidden="true"
        >
          Subproblem
        </div>{/if}
    </div>
    {#if canAdd && !disabled && stemStart && stemEnd}
      <svg class="stem-line" {width} {height} aria-hidden="true"
        ><path
          class:invalid={stemPosition && !validStemPosition}
          d={`M ${stemStart.x} ${stemStart.y} C ${stemStart.x} ${stemStart.y + 32}, ${stemEnd.x} ${stemEnd.y - 32}, ${stemEnd.x} ${stemEnd.y}`}
        /></svg
      >
      <button
        class="stem-handle"
        bind:this={stemButton}
        aria-label="Add a subproblem"
        title="Drag to place a subproblem, or click to add nearby"
        style:left={`${stemEnd.x}px`}
        style:top={`${stemEnd.y}px`}
        onpointerdown={startStem}
        onclick={addNearby}><Plus size={16} aria-hidden="true" /></button
      >
    {/if}
    {#if draftPosition && draftParent && composerPosition}
      <svg class="stem-line" {width} {height} aria-hidden="true"
        ><path
          d={`M ${(draftParent.x + MAP_NODE_WIDTH / 2) * zoom + tx} ${(draftParent.y + MAP_NODE_HEIGHT) * zoom + ty} C ${(draftParent.x + MAP_NODE_WIDTH / 2) * zoom + tx} ${(draftParent.y + MAP_NODE_HEIGHT) * zoom + ty + 36}, ${composerPosition.x + composerWidth / 2} ${composerPosition.y - 36}, ${composerPosition.x + composerWidth / 2} ${composerPosition.y}`}
        /></svg
      >
      <div
        class="map-child-composer"
        style:left={`${composerPosition.x}px`}
        style:top={`${composerPosition.y}px`}
        style:width={`${composerWidth}px`}
      >
        {@render childComposer()}
      </div>
    {/if}
    {#if stemNotice}<p class="stem-notice" role="status">{stemNotice}</p>{/if}
    <div class="zoom-controls" role="group" aria-label="Map zoom controls">
      <button
        aria-label="Zoom out"
        title="Zoom out"
        disabled={disabled || zoom <= 0.2}
        onclick={() => scale(1 / 1.2)}><Minus size={16} /></button
      ><output aria-label="Map zoom">{Math.round(zoom * 100)}%</output><button
        aria-label="Zoom in"
        title="Zoom in"
        disabled={disabled || zoom >= 2}
        onclick={() => scale(1.2)}><Plus size={16} /></button
      ><button class="fit-map" aria-label="Fit map" title="Fit map" {disabled} onclick={fit}
        ><Maximize size={16} /></button
      >
    </div>
  </div>
  <div class="map-bottom">
    <div class="map-legend">
      <span><b></b>Part of</span><span><b class="dashed"></b>Related to</span>
    </div>
    <span class="stem-help">Select a card, then pull its + to add a subproblem</span>
  </div>
  {#if query.trim()}<p class="map-matches" role="status">
      {matches.length} matching {matches.length === 1 ? 'situation' : 'situations'}
    </p>{/if}
</div>

<style>
  .map-area {
    min-width: 0;
    background: var(--bearings-surface);
  }
  .node-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }
  .node-priority {
    font-size: 10px;
    color: var(--bearings-accent);
    white-space: nowrap;
  }
  .stem-line {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }
  .stem-line path {
    fill: none;
    stroke: var(--bearings-accent);
    stroke-width: 1.5;
    opacity: 0.8;
  }
  .stem-line path.invalid {
    stroke-dasharray: 4 4;
    opacity: 0.5;
  }
  .stem-handle {
    position: absolute;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    transform: translate(-50%, -50%);
    border: 0;
    background: transparent;
    color: var(--bearings-accent);
    cursor: grab;
    touch-action: none;
    z-index: 2;
  }
  .stem-handle::before {
    content: '';
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--bearings-accent);
    background: var(--bearings-paper);
    box-shadow: 0 3px 10px #30221114;
  }
  .stem-handle :global(svg) {
    position: relative;
  }
  .stem-handle:hover::before {
    background: var(--bearings-accent-soft);
  }
  .stem-handle:active {
    cursor: grabbing;
  }
  .subproblem-placeholder {
    position: absolute;
    box-sizing: border-box;
    border: 1px dashed var(--bearings-accent);
    border-radius: 9px;
    background: var(--bearings-accent-soft);
    padding: 12px;
    color: var(--bearings-muted);
    font-size: 12px;
    pointer-events: none;
  }
  .subproblem-placeholder.invalid {
    opacity: 0.4;
  }
  .map-child-composer {
    position: absolute;
    box-sizing: border-box;
    padding: 14px;
    border: 1px solid var(--bearings-line);
    border-radius: 12px;
    background: var(--bearings-paper);
    box-shadow: 0 8px 28px #3022111c;
    cursor: auto;
    user-select: text;
    touch-action: auto;
    z-index: 3;
  }
  .map-child-composer :global(.child-form) {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .map-child-composer :global(input) {
    font-size: 16px;
  }
  .stem-notice {
    position: absolute;
    left: 12px;
    bottom: 60px;
    max-width: calc(100% - 24px);
    margin: 0;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 11px;
    color: var(--bearings-muted);
    background: var(--bearings-paper);
    pointer-events: none;
  }
  .stem-help {
    font-size: 0.65rem;
    color: var(--bearings-muted);
  }
  .map-canvas {
    height: clamp(340px, calc(100dvh - 330px), 520px);
    position: relative;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    background-image: radial-gradient(var(--bearings-line) 0.8px, transparent 0.8px);
    background-size: 20px 20px;
    user-select: none;
  }
  .map-world {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .connections {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
  }
  .connections path {
    fill: none;
    stroke: var(--bearings-muted);
    stroke-width: 1.3;
    opacity: 0.5;
  }
  .connections path.related {
    stroke-dasharray: 6 5;
  }
  .connections path.active {
    stroke: var(--bearings-accent);
    opacity: 0.85;
    stroke-width: 1.6;
  }
  .map-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    text-align: left;
    border: 1px solid var(--bearings-line);
    border-radius: 7px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    padding: 11px 13px;
    cursor: pointer;
    font: inherit;
    box-shadow: 0 2px 8px #3022110c;
    overflow: hidden;
    touch-action: none;
  }
  .map-node[aria-pressed='true'] {
    border-color: var(--bearings-accent);
    background: var(--bearings-accent-soft);
  }
  .map-node.movable {
    cursor: grab;
  }
  .map-node.dimmed {
    opacity: 0.45;
  }
  .node-kind,
  .node-foot {
    font-size: 11px;
    color: var(--bearings-muted);
  }
  .node-title {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .node-foot {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
  }
  .map-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
  }
  .map-legend,
  .zoom-controls {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }
  .map-legend {
    font-size: 0.65rem;
    color: var(--bearings-muted);
  }
  .map-legend span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .map-legend b {
    display: block;
    width: 22px;
    border-top: 1px solid var(--bearings-muted);
  }
  .map-legend b.dashed {
    border-top-style: dashed;
  }
  .zoom-controls {
    position: absolute;
    right: 12px;
    bottom: 12px;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--bearings-line);
    border-radius: 13px;
    background: var(--bearings-paper);
    box-shadow: 0 4px 16px #30221114;
    z-index: 4;
  }
  .zoom-controls button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    color: var(--bearings-ink);
    background: transparent;
    cursor: pointer;
  }
  .zoom-controls button:hover:not(:disabled) {
    background: var(--bearings-surface);
  }
  .zoom-controls button.fit-map {
    margin-left: 4px;
    border-left: 1px solid var(--bearings-line);
    border-radius: 0 8px 8px 0;
  }
  @media (pointer: coarse) {
    .zoom-controls button {
      width: 44px;
      height: 44px;
    }
  }
  output {
    font-size: 0.65rem;
    font-variant-numeric: tabular-nums;
    color: var(--bearings-muted);
    min-width: 35px;
    text-align: center;
  }
  .map-matches {
    font-size: 0.72rem;
    color: var(--bearings-muted);
    margin: 0;
    padding: 0 0.9rem 0.8rem;
  }
  @media (max-width: 900px) {
    .map-canvas {
      height: 440px;
    }
  }
  @media (max-width: 480px) {
    .map-canvas {
      height: 380px;
    }
    .map-legend {
      gap: 0.6rem;
    }
  }
</style>
