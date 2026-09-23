<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import type { EntityType, RawEntity } from '@patternverse/schema';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import EntityList from './EntityList.svelte';

  let {
    verseId,
    commonsMembers,
  }: {
    verseId: string;
    commonsMembers: readonly EntitySummary[];
  } = $props();

  let personal = $state<readonly RawEntity[]>([]);

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
  {#each groupLabels as group (group.type)}
    {@const groupMembers = membersOf(group.type)}
    {#if groupMembers.length > 0}
      <section class="primary-relationship" aria-labelledby={`${group.type}-heading`}>
        <details class="relationship-disclosure">
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
          <EntityList items={groupMembers} compact />
        </details>
      </section>
    {/if}
  {/each}
</div>
