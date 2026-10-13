<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import type { EntityType, RawEntity } from '@patternverse/schema';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import PaginatedEntityList from './PaginatedEntityList.svelte';
  import LibraryViewSwitch from './LibraryViewSwitch.svelte';

  let {
    verseId,
    commonsMembers,
  }: {
    verseId: string;
    commonsMembers: readonly EntitySummary[];
  } = $props();

  let personal = $state<readonly RawEntity[]>([]);
  let collectionLayout = $state<'cards' | 'list'>('cards');

  const personalMembers = $derived(
    personal
      .filter(
        (entity) =>
          entity.type !== 'verse' && 'verses' in entity && (entity.verses ?? []).includes(verseId),
      )
      .map((entity): EntitySummary => ({
        id: entity.id,
        sourceId: entity.sourceId,
        type: entity.type,
        title: entity.title,
        summary: entity.summary ?? '',
        status: entity.status,
        url: `${resolve('/editor')}?id=${encodeURIComponent(entity.id)}`,
      })),
  );
  const members = $derived([...personalMembers, ...commonsMembers]);

  const membersOf = (type: EntityType): readonly EntitySummary[] =>
    members.filter((member) => member.type === type);

  const groupLabels: ReadonlyArray<{ type: EntityType; title: string }> = [
    { type: 'collection', title: 'Collections' },
    { type: 'pattern', title: 'Patterns' },
    { type: 'concept', title: 'Concepts' },
    { type: 'practice', title: 'Practices' },
  ];

  onMount(() => {
    let active = true;
    void getLocalWorkspace()
      .then((workspace) => workspace.listEntities())
      .then((entities) => {
        if (active) personal = entities;
      });
    return () => {
      active = false;
    };
  });
</script>

<div class="verse-groups">
  {#each groupLabels as group (`${verseId}:${group.type}`)}
    {@const groupMembers = membersOf(group.type)}
    {#if groupMembers.length > 0}
      <section class="primary-relationship" aria-labelledby={`${group.type}-heading`}>
        <details class="relationship-disclosure" open={group.type === 'collection'}>
          <summary class="relationship-heading relationship-heading--simple">
            <h2 id={`${group.type}-heading`}>{group.title}</h2>
            <span class="relationship-heading-meta">
              <span>
                {groupMembers.length}
                {groupMembers.length === 1 ? 'entry' : 'entries'}
                {#if groupMembers.some((member) => member.sourceId === 'personal')}
                  · includes mine{/if}
              </span>
              <span class="disclosure-icon" aria-hidden="true"></span>
            </span>
          </summary>
          <div class:collection-browse={group.type === 'collection'}>
            {#if group.type === 'collection'}
              <div class="collections-toolbar">
                <LibraryViewSwitch
                  bind:layout={collectionLayout}
                  label="Collections view"
                  mobileVisible
                />
              </div>
            {/if}
            <PaginatedEntityList
              items={groupMembers}
              compact={group.type !== 'pattern' && group.type !== 'collection'}
              layout={group.type === 'collection' ? collectionLayout : 'list'}
              cardsOnMobile={group.type === 'collection'}
              label={group.title}
            />
          </div>
        </details>
      </section>
    {/if}
  {/each}
</div>

<style>
  .collection-browse {
    container-type: inline-size;
  }
  .collections-toolbar {
    display: flex;
    justify-content: flex-end;
    margin: 1.5rem 0 1rem;
  }
</style>
