<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import BearingsMapCanvas from './BearingsMapCanvas.svelte';
  import BearingsPriority from './BearingsPriority.svelte';
  import {
    Network,
    Pencil,
    Check,
    Undo2,
    BookOpen,
    GitBranchPlus,
    Link,
    Unlink,
    X,
    RotateCcw,
    ArrowUpRight,
  } from '@lucide/svelte';
  import {
    canonicalConnection,
    connectionKey,
    situationConnections,
    type LocalWorkspace,
    type Situation,
    type SituationConnection,
    type SituationMapPosition,
    type SituationPriority,
  } from '@patternverse/workspace';
  import { linkedSituations, otherSituationId, relationFor, editedConnection } from './graph';

  let {
    situations,
    workspace,
    selectedId,
    onselect,
    onchange,
    onopen,
    onbusy,
    query = '',
    createChildInitially = $bindable(false),
  }: {
    situations: readonly Situation[];
    workspace: LocalWorkspace;
    selectedId: string;
    onselect: (id: string) => void;
    onchange: (situations: readonly Situation[]) => void;
    onopen: (situation: Situation) => void;
    onbusy: (busy: boolean) => void;
    query?: string;
    createChildInitially?: boolean;
  } = $props();
  type UndoAction = { label: string; apply: () => Promise<void> };
  type Editor = {
    previous: SituationConnection | null;
    sourceId: string;
    expected: readonly { id: string; revision: number }[];
  };
  let canvasView = $state<BearingsMapCanvas>();
  let editing = $state(false),
    busy = $state(false),
    error = $state(''),
    status = $state('');
  let undo = $state.raw<UndoAction | null>(null),
    editor = $state.raw<Editor | null>(null);
  let target = $state(''),
    relation = $state<'part-of' | 'contains' | 'related'>('related');
  let name = $state(''),
    nameBase = $state.raw<Situation | null>(null),
    nameTouched = $state(false),
    renaming = $state(false);
  let nameInput = $state<HTMLInputElement>();
  let childForm = $state(untrack(() => createChildInitially)),
    childTitle = $state(''),
    childBase = $state.raw<Situation | null>(null);
  let childInput = $state<HTMLInputElement>();
  let childPosition = $state.raw<SituationMapPosition | null>(null);
  let alive = true;
  const selected = $derived(situations.find((s) => s.id === selectedId) ?? situations[0]);
  const links = $derived(selected ? linkedSituations(situations, selected.id) : []);
  const cells = $derived(selected?.notebook?.chapters.flatMap((chapter) => chapter.cells) ?? []);
  const hasDraft = $derived(nameTouched || !!childTitle.trim() || !!editor);
  let lastSelected = '';
  $effect(() => {
    const id = selected?.id ?? '',
      title = selected?.title ?? '';
    if (id !== lastSelected) {
      name = title;
      nameTouched = false;
      nameBase = null;
      renaming = false;
      lastSelected = id;
    } else if (!nameTouched) name = title;
  });
  onMount(() => {
    if (childForm) {
      childBase = selected ?? null;
      createChildInitially = false;
    }
    void tick().then(() => {
      if (childForm) childInput?.focus();
    });
    return () => {
      alive = false;
      onbusy(false);
    };
  });
  beforeNavigate((navigation) => {
    if (busy || hasDraft) {
      navigation.cancel();
      error = 'Save or cancel your map edits before leaving.';
    }
  });
  const message = (cause: unknown) =>
    cause instanceof Error ? cause.message : 'This map change could not be saved.';
  async function perform(
    work: () => Promise<UndoAction | void>,
    remember = true,
  ): Promise<boolean> {
    if (busy) return false;
    busy = true;
    onbusy(true);
    error = '';
    try {
      const action = await work();
      if (alive) {
        if (remember) undo = action ?? null;
        status = 'Saved on this device';
      }
      return true;
    } catch (cause) {
      if (alive) error = message(cause);
      return false;
    } finally {
      if (alive) busy = false;
      onbusy(false);
    }
  }
  async function reload() {
    onchange(await workspace.listSituations());
  }
  async function rename(): Promise<boolean> {
    if (!nameTouched) return true;
    const base = nameBase ?? selected;
    if (!base) return false;
    const title = name.trim();
    if (!title) {
      error = 'Give the problem a name, or cancel the name change.';
      return false;
    }
    if (title === base.title) {
      nameTouched = false;
      nameBase = null;
      renaming = false;
      return true;
    }
    return perform(async () => {
      const saved = await workspace.updateSituation(
        base.id,
        { title, context: base.context },
        base.revision,
      );
      nameTouched = false;
      nameBase = null;
      renaming = false;
      await reload();
      return {
        label: 'Name changed',
        apply: async () => {
          await workspace.updateSituation(
            saved.id,
            { title: base.title, context: saved.context },
            saved.revision,
          );
          await reload();
        },
      };
    });
  }
  async function startRename() {
    if (busy || childForm || editor) return;
    renaming = true;
    await tick();
    nameInput?.focus();
    nameInput?.select();
  }
  function cancelRename() {
    name = selected?.title ?? '';
    nameTouched = false;
    nameBase = null;
    renaming = false;
    error = '';
  }
  async function setPriority(priority: SituationPriority | null) {
    const base = selected;
    if (!base || busy || hasDraft || childForm) return;
    await perform(async () => {
      const saved = await workspace.updateSituation(
        base.id,
        { title: base.title, context: base.context, priority },
        base.revision,
      );
      await reload();
      return {
        label: 'Priority changed',
        apply: async () => {
          await workspace.updateSituation(
            saved.id,
            { title: saved.title, context: saved.context, priority: base.priority ?? null },
            saved.revision,
          );
          await reload();
        },
      };
    });
  }
  export async function prepareLeave(): Promise<boolean> {
    if (busy) return false;
    if (childTitle.trim() || editor) {
      error = 'Save or cancel the connection or subproblem before leaving.';
      return false;
    }
    return rename();
  }
  async function select(id: string) {
    if (busy) return;
    if (childTitle.trim()) {
      error = 'Create or cancel this subproblem before selecting another situation.';
      return;
    }
    if (!(await rename())) return;
    editor = null;
    childForm = false;
    childBase = null;
    childPosition = null;
    error = '';
    onselect(id);
  }
  async function editMap() {
    if (editing) {
      if (!(await prepareLeave())) return;
      editing = false;
    } else editing = true;
  }
  async function startConnection(previous: SituationConnection | null) {
    if (!selected || busy || !(await rename())) return;
    await tick();
    if (childTitle.trim()) {
      error = 'Create or cancel this subproblem first.';
      return;
    }
    childForm = false;
    childPosition = null;
    childBase = null;
    editor = {
      previous,
      sourceId: selected.id,
      expected: situations.map((s) => ({ id: s.id, revision: s.revision })),
    };
    target = previous
      ? otherSituationId(previous, selected.id)
      : (situations.find((s) => s.id !== selected?.id)?.id ?? '');
    relation = previous ? relationFor(previous, selected.id) : 'related';
    error = '';
  }
  async function saveConnection(remove = false) {
    const form = editor;
    if (!form) return;
    if (!remove && !target) {
      error = 'Choose another situation.';
      return;
    }
    const next = remove
      ? null
      : canonicalConnection(editedConnection(form.sourceId, target, relation));
    if (next && form.previous && connectionKey(next) === connectionKey(form.previous)) {
      editor = null;
      return;
    }
    await perform(async () => {
      const records = await workspace.changeSituationConnection({
        previous: form.previous,
        next,
        expected: form.expected,
      });
      onchange(records);
      editor = null;
      return {
        label: remove
          ? 'Connection removed'
          : form.previous
            ? 'Connection changed'
            : 'Connection added',
        apply: async () => {
          onchange(
            await workspace.changeSituationConnection({
              previous: next,
              next: form.previous,
              expected: records,
            }),
          );
        },
      };
    });
  }
  async function startChild(position: SituationMapPosition | null = null) {
    if (!selected || busy || !(await rename())) return;
    editor = null;
    childBase = selected;
    childPosition = position;
    childForm = true;
    await tick();
    childInput?.focus();
  }
  async function cancelChild() {
    if (busy) return;
    childForm = false;
    childTitle = '';
    childBase = null;
    childPosition = null;
    error = '';
    await tick();
    canvasView?.focusStem();
  }
  async function createChild() {
    const parent = childBase;
    if (!parent || !childTitle.trim()) return;
    const ok = await perform(async () => {
      const child = await workspace.createSituation(
        childTitle.trim(),
        parent,
        childPosition ?? undefined,
      );
      const edge: SituationConnection = {
        sourceId: child.id,
        targetId: parent.id,
        kind: 'part-of',
      };
      childTitle = '';
      childForm = false;
      childBase = null;
      childPosition = null;
      await reload();
      onselect(child.id);
      return {
        label: 'Subproblem linked',
        apply: async () => {
          onchange(
            await workspace.changeSituationConnection({
              previous: edge,
              next: null,
              expected: [child, parent],
            }),
          );
        },
      };
    });
    if (ok) {
      await tick();
      if (selected) canvasView?.center(selected.id);
    }
  }
  async function move(situation: Situation, position: SituationMapPosition) {
    const old = situation.mapPosition ?? null;
    const ok = await perform(async () => {
      const saved = await workspace.positionSituationOnMap(
        situation.id,
        position,
        situation.revision,
      );
      await reload();
      return {
        label: 'Position changed',
        apply: async () => {
          await workspace.positionSituationOnMap(saved.id, old, saved.revision);
          await reload();
        },
      };
    });
    return ok;
  }
  async function undoChange() {
    const action = undo;
    if (!action) return;
    await perform(async () => {
      await action.apply();
      undo = null;
    }, false);
  }
  async function refresh() {
    let notice = '';
    const ok = await perform(async () => {
      const records = await workspace.listSituations();
      onchange(records);
      undo = null;
      if (nameTouched && nameBase) {
        const current = records.find((s) => s.id === nameBase?.id);
        if (current) {
          nameBase = current;
          error = `The saved name is “${current.title}”. Your draft is kept above; save it to replace the name.`;
        }
      }
      if (childBase) childBase = records.find((s) => s.id === childBase?.id) ?? childBase;
      if (editor) {
        const form = editor;
        const otherId = form.previous ? otherSituationId(form.previous, form.sourceId) : target;
        const saved = situationConnections(records).find(
          (edge) =>
            (edge.sourceId === form.sourceId && edge.targetId === otherId) ||
            (edge.sourceId === otherId && edge.targetId === form.sourceId),
        );
        if (!records.some((s) => s.id === form.sourceId) || (form.previous && !saved)) {
          editor = null;
          notice = 'The connection was removed. Choose a current connection to continue.';
        } else {
          editor = {
            ...form,
            previous: saved ?? null,
            expected: records.map((s) => ({ id: s.id, revision: s.revision })),
          };
          if (saved) {
            target = otherSituationId(saved, form.sourceId);
            relation = relationFor(saved, form.sourceId);
            notice = 'Latest connection loaded. Review it before saving.';
          }
        }
      }
    }, false);
    if (ok && notice) status = notice;
  }
  function escape() {
    if (busy) return;
    if (canvasView?.cancelGesture()) return;
    if (editor) {
      editor = null;
      error = '';
    } else if (childForm) {
      void cancelChild();
    } else if (renaming || nameTouched) cancelRename();
  }
</script>

<svelte:window
  onbeforeunload={(event) => {
    if (busy || hasDraft) event.preventDefault();
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape') escape();
  }}
/>
{#snippet childComposer()}
  <form
    class="child-form"
    onsubmit={(event) => {
      event.preventDefault();
      void createChild();
    }}
  >
    <label class="field-label" for="map-child-title">New subproblem</label>
    <input
      bind:this={childInput}
      id="map-child-title"
      bind:value={childTitle}
      maxlength="180"
      required
      placeholder="What’s the smaller problem?"
      disabled={busy}
    />
    <p class="child-parent">Part of {childBase?.title}</p>
    <div>
      <button class="primary" type="submit" disabled={busy || !childTitle.trim()}
        >Create subproblem</button
      >
      <button class="quiet" type="button" disabled={busy} onclick={cancelChild}>Cancel</button>
    </div>
  </form>
{/snippet}
<section class="situation-map" aria-label="Connected situations">
  <div class="map-toolbar">
    <div class="map-caption">
      <Network size={16} aria-hidden="true" /><span>Connected situations</span>
    </div>
    <div class="map-actions">
      <button
        class="icon"
        aria-label="Undo graph change"
        title={undo?.label ?? 'Undo graph change'}
        disabled={!undo || busy || hasDraft}
        onclick={undoChange}><Undo2 size={17} /></button
      ><button class="edit-toggle" aria-pressed={editing} disabled={busy} onclick={editMap}
        >{#if editing}<Check size={16} /><span>Done editing</span>{:else}<Pencil size={16} /><span
            >Edit map</span
          >{/if}</button
      >
    </div>
  </div>
  <div class="map-workspace">
    <BearingsMapCanvas
      bind:this={canvasView}
      {situations}
      selectedId={selected?.id ?? ''}
      {editing}
      disabled={busy}
      canMove={!hasDraft && !childForm}
      canSelect={!hasDraft && !childForm && !busy}
      canAdd={!hasDraft && !childForm && !busy}
      draftPosition={childPosition}
      draftParentId={childBase?.id ?? ''}
      {childComposer}
      {query}
      activeConnection={editor?.previous ?? null}
      onselect={select}
      onmove={move}
      onaddsubproblem={startChild}
    />
    <aside class="map-inspector" aria-label="Selected situation">
      {#if selected}
        <div class="inspector-top">
          <span
            >{(selected.connections ?? []).some((link) => link.kind === 'part-of')
              ? 'Subproblem'
              : 'Situation'}</span
          ><span>{editing ? 'Edit map' : 'Notebook preview'}</span>
        </div>
        {#if editing || renaming}<label class="field-label" for="map-problem-name"
            >Problem name</label
          >
          <div class="name-field">
            <input
              id="map-problem-name"
              bind:this={nameInput}
              value={name}
              maxlength="180"
              disabled={busy || !!editor || childForm}
              oninput={(event) => {
                if (!nameTouched) nameBase = selected;
                nameTouched = true;
                name = event.currentTarget.value;
              }}
              onkeydown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void rename();
                }
              }}
            /><button
              class="icon"
              aria-label="Save problem name"
              title="Save name"
              disabled={busy || !nameTouched || !name.trim()}
              onclick={rename}><Check size={17} /></button
            >{#if nameTouched || renaming}<button
                class="icon"
                aria-label="Cancel name change"
                title="Cancel name change"
                onclick={cancelRename}><X size={16} /></button
              >{/if}
          </div>
        {:else}<div class="inspector-title">
            <h2>{selected.title}</h2>
            <button
              class="icon"
              aria-label="Rename situation"
              title="Rename situation"
              disabled={busy || !!editor || childForm}
              onclick={startRename}><Pencil size={15} /></button
            >
          </div>{/if}
        <div class="inspector-priority">
          <BearingsPriority
            value={selected.priority ?? null}
            disabled={busy || hasDraft || childForm}
            onchange={setPriority}
          />
        </div>
        {#if error}<div class="map-error" role="alert">
            <p>{error}</p>
            <button onclick={refresh} disabled={busy}><RotateCcw size={13} />Refresh map</button>
          </div>{/if}
        {#if editing}
          <div class="connection-list">
            <h3>Connections</h3>
            {#each links as edge (connectionKey(edge))}{@const other = situations.find(
                (s) => s.id === otherSituationId(edge, selected!.id),
              )}{#if other}<button
                  class="connection-row"
                  disabled={busy}
                  onclick={() => startConnection(edge)}
                  aria-label={`Edit connection with ${other.title}`}
                  ><span
                    ><small
                      >{relationFor(edge, selected.id) === 'contains'
                        ? 'Has subproblem'
                        : relationFor(edge, selected.id) === 'part-of'
                          ? 'Part of'
                          : 'Related to'}</small
                    >{other.title}</span
                  ><Pencil size={14} aria-hidden="true" /></button
                >{/if}{/each}
            {#if !links.length}<p class="muted">No connections yet.</p>{/if}
            <button
              class="connect-button"
              disabled={busy || situations.length < 2}
              onclick={() => startConnection(null)}
              ><Link size={15} />Connect another problem</button
            >
          </div>
          {#if editor}<div class="connection-editor">
              <label class="field-label" for="map-link-target">Other problem</label><select
                id="map-link-target"
                bind:value={target}
                disabled={busy}
                >{#each situations.filter((s) => s.id !== editor?.sourceId) as situation (situation.id)}<option
                    value={situation.id}>{situation.title}</option
                  >{/each}</select
              ><label class="field-label" for="map-link-kind">Relationship</label><select
                id="map-link-kind"
                bind:value={relation}
                disabled={busy}
                ><option value="part-of">Part of</option><option value="contains"
                  >Has subproblem</option
                ><option value="related">Related to</option></select
              >
              <div class="connection-editor-actions">
                <button class="primary" disabled={busy || !target} onclick={() => saveConnection()}
                  >Save connection</button
                ><button
                  class="quiet"
                  disabled={busy}
                  onclick={() => {
                    editor = null;
                    error = '';
                  }}>Cancel</button
                >
              </div>
              {#if editor.previous}<button
                  class="remove-connection"
                  disabled={busy}
                  onclick={() => saveConnection(true)}><Unlink size={14} />Remove connection</button
                >{/if}
            </div>{/if}
        {:else}
          {#if selected.context}<p class="context-preview">{selected.context}</p>{/if}
          <div class="notebook-preview">
            {#each cells.slice(0, 3) as cell (cell.id)}<div
                class="preview-cell"
                class:note={cell.kind === 'note'}
              >
                <span
                  >{cell.kind === 'approach'
                    ? 'Own approach'
                    : cell.kind === 'pattern'
                      ? 'Pattern'
                      : cell.kind === 'rating'
                        ? 'Rating'
                        : cell.kind === 'note'
                          ? 'Comment'
                          : 'Note'}</span
                >
                <p>
                  {cell.kind === 'pattern'
                    ? cell.pattern?.title
                    : cell.kind === 'rating'
                      ? `${cell.rating?.label}: ${cell.rating?.value ?? 'Unanswered'}`
                      : cell.text}
                </p>
              </div>{/each}{#if !cells.length}<p class="muted">A notebook of its own.</p>{/if}
          </div>
          {#if links.length}<div class="read-connections">
              <h3>Connected situations</h3>
              {#each links as edge (connectionKey(edge))}{@const other = situations.find(
                  (s) => s.id === otherSituationId(edge, selected!.id),
                )}{#if other}<button
                    class="connection-row"
                    disabled={busy}
                    onclick={() => select(other.id)}
                    ><span
                      ><small
                        >{relationFor(edge, selected.id) === 'contains'
                          ? 'Subproblem'
                          : relationFor(edge, selected.id) === 'part-of'
                            ? 'Part of'
                            : 'Related to'}</small
                      >{other.title}</span
                    ><ArrowUpRight size={14} /></button
                  >{/if}{/each}
            </div>{/if}
        {/if}
        <div class="inspector-actions">
          <button class="primary" disabled={busy} onclick={() => selected && onopen(selected)}
            ><BookOpen size={16} />Open notebook</button
          ><button class="new-child quiet" disabled={busy} onclick={() => startChild()}
            ><GitBranchPlus size={16} />Break out a subproblem</button
          >
        </div>
        {#if childForm && !childPosition}{@render childComposer()}{/if}
        <p class="save-status" role="status">{busy ? 'Saving…' : status}</p>
      {:else}<p class="muted">Create a situation to start your map.</p>{/if}
    </aside>
  </div>
</section>

<style>
  .situation-map {
    border: 1px solid var(--bearings-line);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bearings-paper);
  }
  .map-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--bearings-line);
  }
  .map-caption,
  .map-actions,
  .edit-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .map-caption {
    font-size: 0.8rem;
    color: var(--bearings-muted);
  }
  .map-actions {
    gap: 0.4rem;
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    border-radius: 5px;
    cursor: pointer;
    flex: none;
  }
  .icon:hover {
    background: var(--bearings-surface);
  }
  .edit-toggle {
    font: inherit;
    font-size: 0.76rem;
    color: inherit;
    border: 1px solid var(--bearings-line);
    background: transparent;
    padding: 0.45rem 0.7rem;
    border-radius: 5px;
    cursor: pointer;
  }
  .edit-toggle[aria-pressed='true'] {
    color: var(--bearings-accent);
    background: var(--bearings-surface);
  }
  .map-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
  }
  .map-inspector {
    padding: 1.25rem;
    border-left: 1px solid var(--bearings-line);
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .inspector-title {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
  }
  .inspector-title h2 {
    flex: 1;
    min-width: 0;
  }
  .inspector-priority {
    margin: 0.2rem 0 0.8rem;
  }
  .inspector-top {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    color: var(--bearings-muted);
    font-size: 0.66rem;
    margin-bottom: 0.8rem;
  }
  .inspector-top span:first-child {
    color: var(--bearings-accent);
  }
  h2 {
    font: 750 1.65rem/1.2 var(--font-sans);
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
    margin: 0.1rem 0 1rem;
  }
  h3 {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--bearings-muted);
    margin: 1.2rem 0 0.4rem;
  }
  .muted {
    color: var(--bearings-muted);
    font-size: 0.8rem;
    line-height: 1.6;
  }
  .context-preview {
    font-size: 0.78rem;
    color: var(--bearings-muted);
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 120px;
    overflow: auto;
    margin: 0 0 1.2rem;
  }
  .notebook-preview {
    display: grid;
    gap: 1rem;
  }
  .preview-cell {
    border-left: 2px solid var(--bearings-line);
    padding-left: 0.75rem;
  }
  .preview-cell.note {
    background: var(--bearings-surface);
    border: 0;
    border-radius: 4px;
    padding: 0.7rem;
  }
  .preview-cell > span {
    font-size: 0.65rem;
    color: var(--bearings-muted);
  }
  .preview-cell p {
    font-size: 0.8rem;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin: 0.3rem 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .connection-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    width: 100%;
    text-align: left;
    padding: 0.7rem 0;
    border: 0;
    border-bottom: 1px solid var(--bearings-line);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .connection-row > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .connection-row small {
    display: block;
    color: var(--bearings-muted);
    font-size: 0.65rem;
    margin-bottom: 0.2rem;
  }
  .connection-row :global(svg) {
    flex: none;
    color: var(--bearings-muted);
  }
  .connection-list {
    margin-top: 0.3rem;
  }
  .connect-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    color: var(--bearings-accent);
    border: 0;
    padding: 0.85rem 0;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .inspector-actions {
    display: grid;
    gap: 0.5rem;
    margin-top: auto;
    padding-top: 1.5rem;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font: inherit;
    font-size: 0.75rem;
    border: 0;
    border-radius: 5px;
    padding: 0.7rem 0.8rem;
    background: var(--bearings-accent);
    color: #fff;
    cursor: pointer;
  }
  .quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    background: transparent;
    border: 0;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 0.75rem;
    padding: 0.6rem 0.2rem;
    cursor: pointer;
  }
  .field-label {
    display: block;
    font-size: 0.7rem;
    color: var(--bearings-muted);
    margin: 0 0 0.4rem;
  }
  .name-field {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  .name-field input {
    flex: 1;
    width: 100%;
    min-width: 0;
  }
  input,
  select {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.65rem 0.6rem;
    border: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    color: inherit;
    border-radius: 5px;
    min-height: 42px;
    width: 100%;
    min-width: 0;
  }
  .connection-editor {
    background: var(--bearings-surface);
    padding: 0.8rem;
    border-radius: 5px;
    margin-top: 0.6rem;
  }
  .connection-editor select {
    margin-bottom: 0.8rem;
  }
  .connection-editor-actions,
  .child-form > div {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .remove-connection {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bearings-accent);
    font: inherit;
    font-size: 0.7rem;
    background: transparent;
    border: 0;
    padding: 0.8rem 0 0.1rem;
    cursor: pointer;
  }
  .child-form {
    padding-top: 1.1rem;
    margin-top: 1rem;
    border-top: 1px solid var(--bearings-line);
  }
  .child-parent {
    font-size: 0.7rem;
    color: var(--bearings-muted);
    overflow-wrap: anywhere;
    margin: 0.5rem 0 0.8rem;
  }
  .save-status {
    min-height: 1em;
    margin: 0.7rem 0 0;
    color: var(--bearings-muted);
    font-size: 0.65rem;
  }
  .map-error {
    background: #fae8e0;
    color: #9c2b25;
    padding: 0.75rem;
    border-radius: 5px;
    font-size: 0.75rem;
    margin-top: 0.8rem;
  }
  .map-error p {
    margin: 0 0 0.5rem;
    line-height: 1.6;
  }
  .map-error button {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.3rem 0;
  }
  @media (max-width: 900px) {
    .map-workspace {
      grid-template-columns: minmax(0, 1fr);
    }
    .map-inspector {
      border-left: 0;
      border-top: 1px solid var(--bearings-line);
    }
    .inspector-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
    .map-toolbar {
      padding: 0.6rem 0.8rem;
    }
  }
  @media (max-width: 480px) {
    .map-caption {
      font-size: 0.72rem;
    }
    .edit-toggle {
      font-size: 0.7rem;
    }
    .icon {
      width: 38px;
      height: 38px;
    }
    input,
    select {
      font-size: 16px;
    }
  }
</style>
