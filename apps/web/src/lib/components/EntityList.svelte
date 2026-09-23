<script lang="ts">
  import type { EntitySummary } from '$lib/server/commons';

  let {
    items,
    compact = false,
    startAt = 1,
  }: {
    items: readonly EntitySummary[];
    compact?: boolean;
    startAt?: number;
  } = $props();
</script>

<ol class:compact class="entity-list" start={startAt}>
  {#each items as item, index (`${item.sourceId}:${item.id}`)}
    <li>
      <span class="index">{String(index + startAt).padStart(2, '0')}</span>
      <div class="entity-copy">
        <h3>
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={item.url}>{item.title}</a>
        </h3>
        {#if item.summary}<p>{item.summary}</p>{/if}
      </div>
      <span class="entity-meta">
        {item.type} · {item.sourceId === 'commons' ? 'Commons' : 'Mine'}
        {#if item.status === 'draft'}
          · Draft{/if}
      </span>
    </li>
  {/each}
</ol>
