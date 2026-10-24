<script lang="ts">
  import { resolve } from '$app/paths';
  import type { RawEntity } from '@patternverse/workspace';
  import type { PersonalStructure } from '$lib/structure-management';
  import type { EntitySummary } from '$lib/server/commons';
  import type { StructureDraft, StructurePanelActions } from '$lib/client/structure-panel';

  let {
    managing,
    members,
    available,
    verses,
    busy,
    actions,
    draft = $bindable(),
    element = $bindable(),
  }: {
    managing: PersonalStructure;
    members: readonly RawEntity[];
    available: readonly RawEntity[];
    verses: readonly (RawEntity | EntitySummary)[];
    busy: boolean;
    actions: StructurePanelActions;
    draft: StructureDraft;
    element?: HTMLElement;
  } = $props();
</script>

<section class="manage-panel" bind:this={element} tabindex="-1" aria-labelledby="manage-title">
  <header>
    <h3 id="manage-title">Manage {managing.type}: {managing.title}</h3>
    <button onclick={actions.close} aria-label="Close management">×</button>
  </header>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void actions.save();
    }}
  >
    <fieldset disabled={busy}>
      <label>Name<input bind:value={draft.title} required /></label><label
        >Description<textarea bind:value={draft.summary} rows="2"></textarea></label
      ><button type="submit">Save details</button><a
        href={resolve(`/editor?id=${encodeURIComponent(managing.id)}`)}
        >{managing.type === 'collection' ? 'Edit collection contents' : 'Open full editor'} →</a
      >
    </fieldset>
  </form>
  {#if managing.type === 'verse'}
    <h4>Contents</h4>
    <p>Patterns can live directly in a verse. Collections are optional.</p>
    <div class="add-content">
      <label
        >Add your content<select bind:value={draft.addingId}
          ><option value="">Choose a pattern or collection</option
          >{#each available as entity (entity.id)}<option value={entity.id}
              >{entity.title} · {entity.type}</option
            >{/each}</select
        ></label
      ><button disabled={busy || !draft.addingId} onclick={actions.add}>Add to verse</button>
    </div>
    <label
      >Destination verse<select bind:value={draft.destination}
        ><option value="">Choose a verse to move contents to</option
        >{#each verses.filter((entry) => entry.id !== managing.id) as verse (verse.id)}<option
            value={verse.id}
            >{verse.title} · {verse.sourceId === 'personal' ? 'Mine' : 'commons'}</option
          >{/each}</select
      ></label
    >
    <ul>
      {#each members as entity (entity.id)}<li>
          <span>{entity.title}<small>{entity.type}</small></span><button
            disabled={busy}
            onclick={() => actions.remove(entity)}>{draft.destination ? 'Move' : 'Remove'}</button
          >
        </li>{/each}
    </ul>
    <p>
      Removing the last verse home requires a destination. Deleting this verse moves all its
      contents there first.
    </p>
  {:else}<p>
      Adding or removing collection references happens in the editor. Deleting this collection keeps
      its patterns and their verse homes.
    </p>{/if}
  <button
    class="danger delete-structure"
    disabled={busy || (managing.type === 'verse' && members.length > 0 && !draft.destination)}
    onclick={actions.delete}>Delete {managing.type}</button
  >
</section>

<style>
  button {
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
  button:hover:not(:disabled) {
    border-color: var(--green-dark);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .manage-panel {
    margin-top: 1.5rem;
    padding: 1.5rem;
    border: 1px solid #cdd7ca;
    border-radius: 10px;
  }
  .manage-panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .manage-panel h3 {
    margin: 0;
    font-size: 1.05rem;
  }
  .manage-panel h4 {
    margin: 1.6rem 0 0.5rem;
  }
  .manage-panel p {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--muted);
  }
  fieldset {
    padding: 0;
    margin: 1rem 0;
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }
  label {
    display: grid;
    width: 100%;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
  }
  input,
  textarea,
  select {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    border: 1px solid #d5dad1;
    border-radius: 5px;
    padding: 0.6rem;
    color: var(--ink);
    background: white;
    font: inherit;
  }
  .manage-panel a {
    font-size: 0.8rem;
    color: var(--green-dark);
    font-weight: 700;
  }
  .add-content {
    display: flex;
    align-items: end;
    gap: 0.6rem;
    margin: 1rem 0;
  }
  .add-content button {
    flex-shrink: 0;
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
  li small {
    display: block;
    color: var(--muted);
    margin-top: 0.3rem;
  }
  .danger {
    color: #a62b1f;
  }
  @media (max-width: 800px) {
    .manage-panel {
      padding: 1rem;
    }
    .add-content {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
