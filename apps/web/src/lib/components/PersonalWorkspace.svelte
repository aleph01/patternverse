<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount, tick, untrack } from 'svelte';
  import { LockKeyhole, Plus } from '@lucide/svelte';
  import type { LocalWorkspace, RawEntity, SavedLibraryEntry } from '@patternverse/workspace';
  import { setLibrarySaved } from '$lib/client/library-saves';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import { personalStatusLabel } from '@patternverse/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    deletePersonalPattern,
    deletePersonalStructure,
    planVerseAddition,
    planVerseRemoval,
    structureDependents,
    type PersonalStructure,
  } from '$lib/structure-management';
  import WorkspaceStructurePanel from './WorkspaceStructurePanel.svelte';
  import {
    workspaceManagementView,
    type WorkspaceContentTab,
  } from '$lib/client/workspace-management-view';
  import { emptyStructureDraft } from '$lib/client/structure-panel';
  import { verseAccentClass } from '$lib/verse-accent';

  let { commonsEntities }: { commonsEntities: readonly EntitySummary[] } = $props();
  let workspace: LocalWorkspace | undefined;
  let personal = $state<readonly RawEntity[]>([]);
  let savedEntries = $state<readonly SavedLibraryEntry[]>([]);
  let ready = $state(false);
  let busy = $state(false);
  let message = $state('');
  let error = $state('');
  let tab = $state<WorkspaceContentTab>('verse');
  let managingId = $state('');
  let details = $state(emptyStructureDraft());
  let panel = $state<HTMLElement>();

  const {
    verseIds,
    verses,
    visible,
    managing,
    members,
    unassigned,
    available,
    savedArticles,
    tabs,
  } = $derived(
    workspaceManagementView({
      personal,
      commons: commonsEntities,
      saved: savedEntries,
      tab,
      managingId,
    }),
  );

  let reload = async () => {};
  let resumeRefresh = async () => {};
  $effect(() => {
    if (!busy && !managingId) void untrack(resumeRefresh);
  });
  onMount(() => {
    const reader = createWorkspaceRefresh({
      read: async () => {
        workspace ??= await getLocalWorkspace();
        return Promise.all([workspace.listEntities(), workspace.listSavedEntries()]);
      },
      apply: ([entities, saved]) => {
        personal = entities;
        savedEntries = saved;
      },
      failed: () => {
        error = 'Could not refresh your workspace.';
      },
      settled: () => {
        ready = true;
      },
      canRefresh: () => !busy && !managingId,
    });
    reload = () => reader.refresh(true);
    resumeRefresh = reader.resume;
    const refresh = () => {
      void reader.refresh();
    };
    const unsubscribe = subscribeWorkspaceChanges(['entities', 'saved'], refresh);
    window.addEventListener('focus', refresh);
    refresh();
    return () => {
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  });
  async function manage(entity: PersonalStructure) {
    managingId = entity.id;
    details = { ...emptyStructureDraft(), title: entity.title, summary: entity.summary ?? '' };
    error = '';
    message = '';
    await tick();
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  async function saveDetails() {
    if (!workspace || !managing) return;
    const entity = managing;
    if (!details.title.trim()) throw new Error('Enter a name before saving.');
    await workspace.updateEntity(entity.id, (current) => ({
      ...current,
      title: details.title.trim(),
      summary: details.summary.trim() || undefined,
    }));
    await reload();
    message = 'Name and description saved. The item stays private.';
  }
  async function addToVerse() {
    if (!workspace || !managing || managing.type !== 'verse' || !details.addingId) return;
    const verseId = managing.id;
    const addingId = details.addingId;
    await workspace.mutateEntities((current) =>
      planVerseAddition(current, verseId, addingId, commonsEntities),
    );
    await reload();
    details.addingId = '';
    message = 'Added to this verse.';
  }
  async function removeFromVerse(entity: RawEntity) {
    if (!workspace || !managing || managing.type !== 'verse') return;
    const structure = managing;
    const destination = details.destination;
    await workspace.mutateEntities((current) =>
      planVerseRemoval(current, structure, entity.id, commonsEntities, destination),
    );
    await reload();
    message = destination
      ? 'Moved to the selected verse.'
      : 'Removed from this verse; its other verse homes are kept.';
  }
  async function remove(entity: RawEntity) {
    if (!workspace) return;
    const dependentCount =
      entity.type === 'verse' ? structureDependents(personal, entity).length : 0;
    if (dependentCount && !details.destination)
      throw new Error('Choose a destination verse before deleting this verse.');
    const warning =
      entity.type === 'verse' && dependentCount
        ? ' Its contents will move to the selected verse.'
        : entity.type === 'collection'
          ? ' Its patterns will stay in their verses.'
          : '';
    if (
      !window.confirm(`Delete “${entity.title}” from this device?${warning} This cannot be undone.`)
    )
      return;
    if (entity.type === 'verse' || entity.type === 'collection')
      await deletePersonalStructure(
        workspace,
        entity,
        commonsEntities,
        details.destination || undefined,
      );
    else await deletePersonalPattern(workspace, entity);
    managingId = '';
    await reload();
    message = `Deleted “${entity.title}”.${warning}`;
  }
  async function toggleStatus(entity: RawEntity) {
    if (!workspace) return;
    await workspace.updateEntity(entity.id, (current) => ({
      ...current,
      status: current.status === 'published' ? 'draft' : 'published',
    }));
    await reload();
    message = 'Status updated. Ready does not mean public.';
  }
  async function removeSavedEntry(savedEntry: SavedLibraryEntry) {
    if (!workspace) return;
    await setLibrarySaved(savedEntry.ref, false);
    await reload();
    message = 'Removed from my library. The public article is unchanged.';
  }
  async function action(work: () => Promise<void>) {
    if (busy) return;
    busy = true;
    error = '';
    message = '';
    try {
      await work();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Your change could not be saved.';
    } finally {
      busy = false;
    }
  }
  function hasHome(entity: RawEntity) {
    return (
      entity.type === 'verse' ||
      ('verses' in entity && entity.verses?.some((id) => verseIds.has(id)))
    );
  }
</script>

<section class="workspace-manager" aria-labelledby="content-title">
  <header class="content-heading">
    <div>
      <h2 id="content-title">your content</h2>
      <p>Make room for your own ideas. Organize them into verses and collections.</p>
    </div>
    <span><LockKeyhole size={13} aria-hidden="true" /> Private · only you</span>
  </header>
  <div class="creation-actions">
    <a href={resolve('/editor?type=verse')}><Plus size={16} aria-hidden="true" />New verse</a><a
      href={resolve('/editor?type=collection')}
      ><Plus size={16} aria-hidden="true" />New collection</a
    ><a href={resolve('/editor?type=pattern')}><Plus size={16} aria-hidden="true" />New pattern</a>
  </div>
  {#if error}<p class="notice error" role="alert">{error}</p>{/if}
  {#if message}<p class="notice" role="status">{message}</p>{/if}
  {#if unassigned.length}<div class="repair-note">
      <strong
        >{unassigned.length}
        {unassigned.length === 1 ? 'item needs' : 'items need'} a verse home</strong
      >
      <p>Older work is kept intact. Open each item’s editor to choose an existing verse.</p>
      {#each unassigned as entity (entity.id)}<a
          href={resolve(`/editor?id=${encodeURIComponent(entity.id)}`)}>{entity.title} →</a
        >{/each}
    </div>{/if}
  <div class="content-tabs" aria-label="Workspace content">
    {#each tabs as entry (entry.id)}<button
        type="button"
        aria-pressed={tab === entry.id}
        onclick={() => {
          tab = entry.id;
          managingId = '';
          void reload();
        }}>{entry.label}<span>{entry.count}</span></button
      >{/each}
  </div>
  {#if !ready}<p class="empty">Loading your workspace…</p>
  {:else if tab === 'saved'}
    <div class="content-grid">
      {#each savedArticles as { savedEntry, entity } (`${savedEntry.ref.sourceId}:${savedEntry.ref.entityId}`)}<article
          class="content-card"
        >
          <small
            >{savedEntry.ref.sourceId === 'personal' ? 'Mine' : 'commons'} · saved in my library</small
          >
          <h3>{entity?.title ?? savedEntry.ref.entityId}</h3>
          <p>{entity?.summary ?? 'Only the reference is saved here.'}</p>
          <footer>
            {#if entity}<a
                href={entity.sourceId === 'personal'
                  ? resolve(`/editor?id=${encodeURIComponent(entity.id)}`)
                  : resolve('/[type=entityType]/[id]', { type: entity.type, id: entity.id })}
                >Open {entity.type} →</a
              >{/if}<button
              disabled={busy}
              aria-label={`Remove ${entity?.title ?? savedEntry.ref.entityId} from my library`}
              onclick={() => action(() => removeSavedEntry(savedEntry))}
              >Remove from my library</button
            >
          </footer>
        </article>{/each}
    </div>
    {#if !savedEntries.length}<p class="empty">
        Add patterns or collections from Explore to keep them in your library.
      </p>{/if}
  {:else}
    <div class="content-grid">
      {#each visible as entity (entity.id)}<article
          class={'content-card ' +
            verseAccentClass(
              entity.type === 'verse'
                ? entity.id
                : (('verses' in entity ? entity.verses?.[0] : undefined) ?? entity.id),
            )}
        >
          <small>{entity.type} · mine · {personalStatusLabel(entity.status)}</small>
          <h3>{entity.title}</h3>
          <p>{entity.summary || 'Add a description to make this easy to recognize.'}</p>
          <div class="card-detail">
            {#if entity.type === 'verse'}{structureDependents(personal, entity).length} personal items{:else if entity.type === 'collection'}{entity
                .items.length} references · {hasHome(entity)
                ? 'Verse home set'
                : 'Choose a verse'}{:else}{hasHome(entity)
                ? 'Verse home set'
                : 'Choose a verse'}{/if}
          </div>
          <footer>
            {#if entity.type === 'verse' || entity.type === 'collection'}<button
                disabled={busy}
                onclick={() => manage(entity)}>Manage {entity.type} →</button
              >{:else}<a href={resolve(`/editor?id=${encodeURIComponent(entity.id)}`)}
                >Edit {entity.type} →</a
              ><button disabled={busy} onclick={() => action(() => toggleStatus(entity))}
                >{entity.status === 'published' ? 'Move to draft' : 'Mark ready'}</button
              ><button class="danger" disabled={busy} onclick={() => action(() => remove(entity))}
                >Delete</button
              >{/if}
          </footer>
        </article>{/each}
    </div>
    {#if !visible.length}<p class="empty">
        No personal {tab === 'verse' ? 'verses' : tab === 'collection' ? 'collections' : 'patterns'} yet.
        Start with a verse, then add patterns directly or gather them in a collection.
      </p>{/if}
  {/if}

  {#if managing}
    <WorkspaceStructurePanel
      {managing}
      {members}
      {available}
      {verses}
      {busy}
      bind:draft={details}
      bind:element={panel}
      actions={{
        close: () => {
          managingId = '';
          void reload();
        },
        save: () => action(saveDetails),
        add: () => action(addToVerse),
        remove: (entity) => action(() => removeFromVerse(entity)),
        delete: () => action(() => remove(managing!)),
      }}
    />
  {/if}
  {#if tab === 'verse' || tab === 'collection'}
    <details class="commons-readonly">
      <summary>Patternverse commons · read-only</summary>
      <p>
        You can use these in your library. Their names, descriptions and contents cannot be changed
        here.
      </p>
      <ul>
        {#each commonsEntities.filter((entry) => entry.type === tab) as entity (`${entity.sourceId}:${entity.id}`)}<li
          >
            <a href={resolve('/[type=entityType]/[id]', { type: entity.type, id: entity.id })}
              >{entity.title} →</a
            ><span>commons · read-only</span>
          </li>{/each}
      </ul>
    </details>
  {/if}
  <p class="device-note">
    Saved on this device. Clearing browser data can remove your work; sync or back it up first.
    “Ready” never publishes anything.
  </p>
</section>

<style>
  .workspace-manager {
    min-width: 0;
  }
  .content-heading {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.04em;
  }
  .content-heading p {
    margin: 0.6rem 0 0;
    max-width: 55ch;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }
  .content-heading > span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
    color: var(--green-dark);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .creation-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 1.6rem 0;
  }
  button,
  .creation-actions a {
    min-height: 44px;
    padding: 0.65rem 0.9rem;
    border: 1px solid #d3d7d1;
    border-radius: 6px;
    background: white;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  .creation-actions a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
  }
  button:hover:not(:disabled),
  .creation-actions a:hover {
    border-color: var(--green-dark);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .content-tabs {
    display: flex;
    gap: 1.3rem;
    border-bottom: 1px solid #e0e3dc;
    margin-bottom: 1.4rem;
    overflow-x: auto;
  }
  .content-tabs button {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-shrink: 0;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.65rem 0;
    background: transparent;
    color: var(--muted);
  }
  .content-tabs button[aria-pressed='true'] {
    border-bottom-color: var(--green-dark);
    color: var(--ink);
  }
  .content-tabs span {
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    background: #eef0eb;
    font-size: 0.7rem;
  }
  .content-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  .content-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 1.25rem;
    border: 1px solid #dfe3dc;
    border-radius: 10px;
    background: var(--verse-rest, #f7f9f5);
  }
  .content-card small {
    font-size: 0.68rem;
    font-weight: 700;
    color: #566158;
  }
  .content-card h3 {
    margin: 0.75rem 0 0.5rem;
    font-size: 1.1rem;
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  .content-card p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--muted);
    line-height: 1.5;
  }
  .card-detail {
    margin: 1rem 0;
    font-size: 0.72rem;
    color: #596157;
  }
  footer {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-start;
    min-height: 0;
    padding: 0;
    margin-top: auto;
  }
  footer a,
  footer button {
    font-size: 0.76rem;
  }
  footer a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
  }
  footer button {
    padding: 0.45rem 0.6rem;
    background: transparent;
  }
  .empty {
    padding: 1.5rem;
    border: 1px dashed #d5dbd0;
    border-radius: 8px;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .notice,
  .repair-note {
    padding: 1rem;
    background: #e9f7ef;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  .error {
    background: #fff0eb;
    color: #a62b1f;
  }
  .repair-note {
    background: #fff8df;
    margin-bottom: 1.2rem;
  }
  .repair-note a {
    display: block;
    padding: 0.4rem 0;
    color: var(--ink);
  }
  .commons-readonly p {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--muted);
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.65rem 0;
    border-bottom: 1px solid #e5e8e0;
    font-size: 0.8rem;
  }
  .danger {
    color: #a62b1f;
  }
  .commons-readonly {
    margin-top: 2rem;
    border-top: 1px solid #e1e5dd;
    padding-top: 1.2rem;
    font-size: 0.82rem;
  }
  summary {
    cursor: pointer;
    font-weight: 700;
  }
  .commons-readonly a {
    color: var(--ink);
  }
  .commons-readonly li span {
    color: var(--muted);
    white-space: nowrap;
    font-size: 0.7rem;
  }
  .device-note {
    margin: 1.8rem 0 0;
    font-size: 0.72rem;
    line-height: 1.6;
    color: var(--muted);
    max-width: 80ch;
  }
  @media (max-width: 800px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
    .content-heading {
      align-items: start;
      flex-direction: column;
      gap: 0.75rem;
    }
    .content-tabs {
      gap: 1rem;
    }
    .creation-actions {
      gap: 0.4rem;
    }
    .creation-actions a {
      padding-inline: 0.65rem;
      font-size: 0.74rem;
    }
    .content-card {
      padding: 1.1rem;
    }
  }
</style>
