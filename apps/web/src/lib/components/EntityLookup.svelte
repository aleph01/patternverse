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
  }: {
    id: string;
    label: string;
    description: string;
    options: readonly LookupOption[];
    selected: readonly string[];
    onchange: (ids: string[]) => void;
    ordered?: boolean;
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

<section class:ordered class="entity-lookup" aria-labelledby={`${id}-label`}>
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
              {/if}{option?.sourceId === 'personal' ? 'mine' : 'Commons'} · {entityId}
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
                {/if}{option.sourceId === 'personal' ? 'mine' : 'Commons'}
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
</section>
