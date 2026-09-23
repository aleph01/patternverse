<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import type { EntityType } from '@patternverse/schema';
  import type { RawEntity } from '@patternverse/workspace';
  import {
    createLibrary,
    createLibrarySearch,
    createPersonalSource,
    type LibrarySearchDocument,
    type LibrarySource,
  } from '@patternverse/workspace/library';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import EntityList from './EntityList.svelte';

  let {
    commons,
    commonsSearchDocuments,
    query = $bindable(''),
  }: {
    commons: readonly EntitySummary[];
    commonsSearchDocuments: readonly LibrarySearchDocument[];
    query?: string;
  } = $props();

  let personal = $state<readonly RawEntity[]>([]);
  let ready = $state(false);
  let message = $state('');
  let onlyMine = $state(false);
  const defaultTypes: readonly EntityType[] = ['pattern', 'concept', 'practice'];
  const typeOptions: ReadonlyArray<{ value: EntityType; label: string }> = [
    { value: 'pattern', label: 'Patterns' },
    { value: 'concept', label: 'Concepts' },
    { value: 'practice', label: 'Practices' },
    { value: 'collection', label: 'Collections' },
    { value: 'verse', label: 'Verses' },
  ];
  let selectedTypes = $state<EntityType[]>([...defaultTypes]);

  const commonsSource = $derived<LibrarySource>({
    id: 'commons',
    name: 'Patternverse Commons',
    readonly: true,
    entries: commons,
    searchDocuments: commonsSearchDocuments,
  });
  const library = $derived(createLibrary([createPersonalSource(personal, commons), commonsSource]));
  const search = $derived(createLibrarySearch(library));
  const results = $derived(
    search
      .search(query, {
        ...(onlyMine ? { sourceId: 'personal' } : {}),
      })
      .filter((entry) => selectedTypes.includes(entry.type))
      .map((entry): EntitySummary => ({
        ...entry,
        url:
          entry.sourceId === 'personal'
            ? `${resolve('/editor')}?id=${encodeURIComponent(entry.id)}`
            : `/${entry.type}/${entry.id}`,
      })),
  );
  const resultLabel = $derived(
    query.trim()
      ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}`
      : `${results.length} ${results.length === 1 ? 'entry' : 'entries'}`,
  );
  const typeFilterLabel = $derived.by(() => {
    if (selectedTypes.length === typeOptions.length) return 'All types';
    if (
      selectedTypes.length === defaultTypes.length &&
      defaultTypes.every((type) => selectedTypes.includes(type))
    ) {
      return 'Patterns, concepts & practices';
    }
    if (selectedTypes.length === 0) return 'No types';
    if (selectedTypes.length === 1) {
      return typeOptions.find((option) => option.value === selectedTypes[0])?.label ?? '1 type';
    }
    return `${selectedTypes.length} types`;
  });
  onMount(() => {
    let active = true;
    void getLocalWorkspace()
      .then(async (localWorkspace) => {
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

  const toggleType = (type: EntityType): void => {
    selectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((candidate) => candidate !== type)
      : [...selectedTypes, type];
  };
</script>

<section class="library" id="library" aria-labelledby="library-heading">
  <div class="section-heading split-heading">
    <div>
      <p>From your unified library</p>
      <h2 id="library-heading">Start somewhere useful</h2>
    </div>
    <span class="source-note">
      {library.entries.length} entries · {personal.length} mine · {commons.length} Commons
    </span>
  </div>

  <div class="library-tools">
    <label class="library-mine-filter">
      <input type="checkbox" bind:checked={onlyMine} />
      <span>Only mine</span>
    </label>

    <div class="library-type-filter">
      <span>Type</span>
      <details class="library-type-multiselect">
        <summary aria-label="Choose entity types">
          <span>{typeFilterLabel}</span>
          <span class="multiselect-chevron" aria-hidden="true"></span>
        </summary>
        <div role="group" aria-label="Entity types">
          {#each typeOptions as option (option.value)}
            <label>
              <input
                type="checkbox"
                checked={selectedTypes.includes(option.value)}
                onchange={() => toggleType(option.value)}
              />
              <span>{option.label}</span>
            </label>
          {/each}
        </div>
      </details>
    </div>
  </div>

  <div class="library-results-heading" aria-live="polite">
    <p>{resultLabel}</p>
    {#if query.trim()}<span>for “{query.trim()}”</span>{/if}
  </div>

  {#if results.length > 0}
    <EntityList items={results} />
  {:else if ready}
    <div class="library-empty">
      <h3>Nothing matched yet.</h3>
      <p>Try fewer words, another type, or search across all sources.</p>
      <button
        type="button"
        onclick={() => {
          query = '';
          onlyMine = false;
          selectedTypes = [...defaultTypes];
        }}>Clear search</button
      >
    </div>
  {/if}

  {#if message}<p class="library-message" aria-live="polite">{message}</p>{/if}
</section>
