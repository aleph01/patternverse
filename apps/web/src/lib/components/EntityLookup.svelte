<script lang="ts">
  import type { EntityType } from '@patternverse/schema';
  import { verseAccentClass } from '$lib/verse-accent';

  export type LookupOption = {
    readonly id: string;
    readonly sourceId: string;
    readonly type: EntityType;
    readonly title: string;
    readonly summary?: string;
  };

  let {
    id,
    label,
    description,
    options,
    selected,
    onchange,
    ordered = false,
    compact = false,
  }: {
    id: string;
    label: string;
    description: string;
    options: readonly LookupOption[];
    selected: readonly string[];
    onchange: (ids: string[]) => void;
    ordered?: boolean;
    compact?: boolean;
  } = $props();

  let query = $state('');

  const selectedSet = $derived(new Set(selected));
  const matches = $derived.by(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return options
      .filter((option) => !selectedSet.has(option.id))
      .filter((option) => {
        if (!normalizedQuery) return true;
        return [option.title, option.id, option.type, option.summary ?? ''].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        );
      })
      .slice(0, 6);
  });

  const optionFor = (entityId: string): LookupOption | undefined =>
    options.find((option) => option.id === entityId);

  const add = (entityId: string): void => {
    if (selectedSet.has(entityId)) return;
    onchange([...selected, entityId]);
    query = '';
  };

  const remove = (entityId: string): void => {
    onchange(selected.filter((id) => id !== entityId));
  };

  const move = (index: number, direction: -1 | 1): void => {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return;
    const reordered = [...selected];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    onchange(reordered);
  };
</script>

<section class:ordered class:compact class="entity-lookup" aria-labelledby={`${id}-label`}>
  <div class="entity-lookup-heading">
    <div>
      <h2 id={`${id}-label`}>{label}</h2>
      <p>{description}</p>
    </div>
    <span>{selected.length} selected</span>
  </div>

  {#if selected.length > 0}
    <ol class="lookup-selected" aria-label={`Selected ${label}`}>
      {#each selected as entityId, index (entityId)}
        {@const option = optionFor(entityId)}
        <li
          class:verse-option={option?.type === 'verse'}
          class={option?.type === 'verse' ? verseAccentClass(entityId) : ''}
        >
          <span class="lookup-order">{String(index + 1).padStart(2, '0')}</span>
          <span class="lookup-entity-copy">
            <strong>{option?.title ?? entityId}</strong>
            <small>
              {#if option?.type !== 'verse'}{option?.type ?? 'entity'} ·
              {/if}{option?.sourceId === 'personal' ? 'mine' : 'commons'} · {entityId}
            </small>
          </span>
          {#if ordered}
            <button
              type="button"
              aria-label={`Move ${option?.title ?? entityId} up`}
              disabled={index === 0}
              onclick={() => move(index, -1)}>↑</button
            >
            <button
              type="button"
              aria-label={`Move ${option?.title ?? entityId} down`}
              disabled={index === selected.length - 1}
              onclick={() => move(index, 1)}>↓</button
            >
          {/if}
          <button
            class="danger"
            type="button"
            aria-label={`Remove ${option?.title ?? entityId}`}
            onclick={() => remove(entityId)}><span aria-hidden="true">×</span></button
          >
        </li>
      {/each}
    </ol>
  {:else}
    <p class="lookup-empty">Nothing selected yet.</p>
  {/if}

  {#snippet choices()}
    <div class="lookup-search">
      <label for={id}>Find {label}</label>
      <input
        {id}
        type="search"
        bind:value={query}
        autocomplete="off"
        placeholder={`Search ${label.toLocaleLowerCase()} by title or ID`}
      />
    </div>

    {#if matches.length > 0}
      <ul class="lookup-results" aria-label={`Available ${label}`}>
        {#each matches as option (`${option.sourceId}:${option.id}`)}
          <li
            class:verse-option={option.type === 'verse'}
            class={option.type === 'verse' ? verseAccentClass(option.id) : ''}
          >
            <button
              class="lookup-option-button"
              type="button"
              aria-label={`Add ${option.title}`}
              onclick={() => add(option.id)}
            >
              <span class="lookup-option-copy">
                <strong>{option.title}</strong>
                <small>
                  {#if option.type !== 'verse'}{option.type} ·
                  {/if}{option.sourceId === 'personal' ? 'mine' : 'commons'}
                </small>
              </span>
              <span class="lookup-add" aria-hidden="true">+</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="lookup-empty">No matching entities available.</p>
    {/if}
  {/snippet}
  {#if compact}
    <details class="lookup-chooser" open={selected.length === 0}>
      <summary>{selected.length ? 'Add or change verses' : 'Choose a verse'}</summary>
      {@render choices()}
    </details>
  {:else}
    {@render choices()}
  {/if}
</section>

<style>
  .entity-lookup.compact {
    margin-top: 0;
    padding-top: 0;
    border: 0;
  }
  .compact :global(.entity-lookup-heading h2) {
    font-size: 0.85rem;
    line-height: 1.4;
    letter-spacing: 0;
    text-transform: none;
  }
  .compact :global(.entity-lookup-heading p) {
    font-size: 0.8rem;
    margin: 0.35rem 0 0;
  }
  .compact :global(.entity-lookup-heading > span),
  .compact :global(.lookup-order),
  .compact :global(.lookup-selected small) {
    display: none;
  }
  .compact :global(.lookup-selected) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 0;
    margin: 0.7rem 0;
  }
  .compact :global(.lookup-selected li) {
    display: flex;
    gap: 0.6rem;
    min-height: 44px;
    padding: 0 0.4rem 0 0.8rem;
    max-width: 100%;
    border: 1px solid #d7dcd3;
    border-radius: 6px;
  }
  .compact :global(.lookup-selected strong) {
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .compact :global(.lookup-selected .danger) {
    min-width: 44px;
    min-height: 44px;
  }
  .compact :global(.lookup-search) {
    margin: 0.75rem 0;
  }
  .lookup-chooser > summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--green-dark);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  .compact :global(.lookup-results) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    border: 0;
  }
  .compact :global(.lookup-results li) {
    border: 0;
    min-width: 0;
  }
  .compact :global(.lookup-results .lookup-option-button) {
    border-radius: 6px;
  }
  @media (max-width: 600px) {
    .compact :global(.lookup-results) {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
