<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import type { LibraryCollections } from '$lib/library-collections';
  import { libraryEntryKey } from '@patternverse/workspace/library';
  import MobileLibraryResults from './MobileLibraryResults.svelte';

  let {
    items,
    collections,
    selected = 'all',
    onselect,
  }: {
    items: readonly EntitySummary[];
    collections: LibraryCollections;
    selected?: string;
    onselect: (key: string) => void;
  } = $props();
  const uid = $props.id();
</script>

{#if items.length}
  <section class="mobile-collections" aria-label="Collections">
    {#each items as collection, index (libraryEntryKey(collection))}
      {@const key = libraryEntryKey(collection)}
      {@const members = collections.get(key) ?? []}
      {@const noun = members.every((member) => member.type === 'pattern')
        ? 'pattern'
        : members.every((member) => member.type === 'collection')
          ? 'collection'
          : 'item'}
      {@const contentsLabel = `${collection.title} ${noun}s`}
      {@const expanded = selected === key}
      <div class="mobile-collection">
        <button
          type="button"
          class="collection-toggle"
          aria-expanded={expanded}
          aria-controls={`${uid}-${index}`}
          onclick={() => onselect(key)}
        >
          <span
            ><span class="collection-title"
              >{collection.title}{collection.sourceId === 'personal' ? ' · Mine' : ''}</span
            >
            <span class="collection-count"
              >{members.length} {noun}{members.length === 1 ? '' : 's'}</span
            ></span
          >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
        {#if expanded}
          <div class="collection-patterns" id={`${uid}-${index}`}>
            <MobileLibraryResults
              items={members}
              collectionContext={collection}
              label={contentsLabel}
            />
            {#if !members.length}<p>No available items in this collection.</p>{/if}
          </div>
        {/if}
      </div>
    {/each}
  </section>
{/if}

<style>
  .mobile-collections {
    min-width: 0;
  }
  .mobile-collection {
    border-bottom: 1px solid #deded8;
  }
  .mobile-collection:first-child {
    border-top: 1px solid #deded8;
  }
  .collection-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 78px;
    padding: 18px 0;
    border: 0;
    color: var(--ink);
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .collection-title {
    display: block;
    font-size: 1.05rem;
    font-weight: 650;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
  .collection-count {
    display: block;
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .collection-toggle :global(svg) {
    flex-shrink: 0;
    color: var(--muted);
  }
  .collection-toggle[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
    color: var(--green-dark);
  }
  .collection-patterns {
    margin-bottom: 20px;
    padding-left: 13px;
    border-left: 2px solid var(--green-dark);
  }
  .collection-patterns p {
    padding: 1rem 0;
    color: var(--muted);
    font-size: 0.85rem;
  }
  button:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 2px;
  }
</style>
