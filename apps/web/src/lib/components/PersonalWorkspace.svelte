<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import type { LocalWorkspace, RawEntity } from '@patternverse/workspace';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    deletePersonalStructure,
    structureDependents,
    type PersonalStructure,
  } from '$lib/structure-management';
  import UsefulnessControl from './UsefulnessControl.svelte';

  let workspace: LocalWorkspace | undefined;
  let personal = $state<readonly RawEntity[]>([]);
  let ready = $state(false);
  let message = $state('');
  let error = $state('');
  let renamingId = $state<string>();
  let renameTitle = $state('');

  const knowledgeEntities = $derived(
    personal.filter((entity) => entity.type !== 'verse' && entity.type !== 'collection'),
  );
  const structures = $derived(
    personal.filter(
      (entity): entity is PersonalStructure =>
        entity.type === 'verse' || entity.type === 'collection',
    ),
  );

  const reload = async (): Promise<void> => {
    if (!workspace) return;
    personal = await workspace.listEntities();
  };

  onMount(() => {
    let active = true;
    void getLocalWorkspace()
      .then(async (localWorkspace) => {
        workspace = localWorkspace;
        const entities = await localWorkspace.listEntities();
        if (active) personal = entities;
      })
      .catch(() => {
        if (active) message = 'The local workspace is unavailable in this browser.';
      })
      .finally(() => {
        if (active) ready = true;
      });
    return () => {
      active = false;
    };
  });

  const toggleStatus = async (entity: RawEntity): Promise<void> => {
    if (!workspace) return;
    const nextStatus = entity.status === 'published' ? 'draft' : 'published';
    await workspace.updateEntity(entity.id, (current) => ({ ...current, status: nextStatus }));
    await reload();
    message = `${entity.title} is now ${nextStatus}.`;
  };

  const remove = async (entity: RawEntity): Promise<void> => {
    if (!workspace || !window.confirm(`Delete "${entity.title}" from this browser?`)) return;
    await workspace.deleteEntity(entity.id);
    await reload();
    message = `${entity.title} was deleted from this browser.`;
  };

  const beginRename = (entity: PersonalStructure): void => {
    renamingId = entity.id;
    renameTitle = entity.title;
    error = '';
  };

  const cancelRename = (): void => {
    renamingId = undefined;
    renameTitle = '';
    error = '';
  };

  const rename = async (entity: PersonalStructure): Promise<void> => {
    const title = renameTitle.trim();
    if (!workspace || !title) {
      error = 'Enter a name before saving.';
      return;
    }
    await workspace.updateEntity(entity.id, (current) => ({ ...current, title }));
    await reload();
    renamingId = undefined;
    renameTitle = '';
    error = '';
    message = `Renamed “${entity.title}” to “${title}”.`;
  };

  const removeStructure = async (entity: PersonalStructure): Promise<void> => {
    if (!workspace) return;
    const dependentCount = structureDependents(personal, entity).length;
    const dependencyWarning =
      dependentCount === 0
        ? ''
        : ` It will also be removed from ${dependentCount} personal ${
            dependentCount === 1 ? 'entity' : 'entities'
          }.`;
    if (
      !window.confirm(
        `Delete ${entity.type} “${entity.title}”? This cannot be undone.${dependencyWarning}`,
      )
    )
      return;

    await deletePersonalStructure(workspace, personal, entity);
    await reload();
    if (renamingId === entity.id) cancelRename();
    message = `${entity.title} was deleted.${dependencyWarning}`;
  };
</script>

<section class="workspace my-workspace" aria-labelledby="workspace-heading">
  <div class="compact-workspace-heading">
    <div>
      <p>Personal workspace</p>
      <h2 id="workspace-heading">your work</h2>
    </div>
    <span
      >{knowledgeEntities.length}
      {knowledgeEntities.length === 1 ? 'entry' : 'entries'} · this device</span
    >
    <a class="button-link primary" href={resolve('/editor')}>Create new</a>
  </div>

  {#if knowledgeEntities.length > 0}
    <div class="workspace-entities">
      {#each knowledgeEntities as entity (`${entity.sourceId}:${entity.id}`)}
        <article>
          <div class="workspace-entity-copy">
            <p>{entity.type} · mine · {entity.status}</p>
            <h3>{entity.title}</h3>
            {#if entity.summary}<span>{entity.summary}</span>{/if}
          </div>
          <UsefulnessControl sourceId="personal" entityId={entity.id} compact />
          <div class="workspace-actions">
            <a class="button-link" href={resolve(`/editor?id=${encodeURIComponent(entity.id)}`)}
              >Edit</a
            >
            <button type="button" onclick={() => toggleStatus(entity)}>
              {entity.status === 'published' ? 'Move to draft' : 'Publish locally'}
            </button>
            <button class="danger" type="button" onclick={() => remove(entity)}>Delete</button>
          </div>
        </article>
      {/each}
    </div>
  {:else if ready}
    <p class="compact-workspace-empty">
      Your personal patterns, concepts, and practices will appear here.
    </p>
  {/if}

  <details class="workspace-organizer">
    <summary>
      <span>
        <strong>organize</strong>
        <small>verses &amp; collections</small>
      </span>
      <span>{structures.length} {structures.length === 1 ? 'item' : 'items'}</span>
      <i aria-hidden="true"></i>
    </summary>

    <div class="workspace-organizer-body">
      <div class="organizer-intro">
        <p>Occasional tools for maintaining the structure of your Patternverse.</p>
        <nav aria-label="Create a Verse or Collection">
          <!-- eslint-disable svelte/no-navigation-without-resolve -- The editor base path is resolved before local query parameters are added. -->
          <a class="button-link" href={`${resolve('/editor')}?type=verse`}>New verse</a>
          <a class="button-link" href={`${resolve('/editor')}?type=collection`}>New collection</a>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        </nav>
      </div>

      {#if structures.length > 0}
        <ul class="structure-list">
          {#each structures as entity (`${entity.sourceId}:${entity.id}`)}
            <li>
              <div class="structure-copy">
                <span>{entity.type}</span>
                {#if renamingId === entity.id}
                  <form onsubmit={(event) => (event.preventDefault(), rename(entity))}>
                    <label class="visually-hidden" for={`rename-${entity.id}`}
                      >Rename {entity.title}</label
                    >
                    <input id={`rename-${entity.id}`} bind:value={renameTitle} autocomplete="off" />
                    <button type="submit">Save name</button>
                    <button type="button" onclick={cancelRename}>Cancel</button>
                  </form>
                {:else}
                  <strong>{entity.title}</strong>
                {/if}
              </div>
              {#if renamingId !== entity.id}
                <div class="structure-actions">
                  <a href={resolve(`/editor?id=${encodeURIComponent(entity.id)}`)}>Edit contents</a>
                  <button type="button" onclick={() => beginRename(entity)}>Rename</button>
                  <button class="danger" type="button" onclick={() => removeStructure(entity)}
                    >Delete</button
                  >
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="organizer-empty">No personal verses or collections yet.</p>
      {/if}
      {#if error}<p class="organizer-error" role="alert">{error}</p>{/if}
    </div>
  </details>

  {#if message}<p class="workspace-message" aria-live="polite">{message}</p>{/if}
</section>
