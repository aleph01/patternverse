<script lang="ts">
  import { MessageSquareText } from '@lucide/svelte';
  import Lambda from './BearingsLambdaIcon.svelte';
  import type { BearingsCell } from '@patternverse/workspace';
  let { kind }: { kind: BearingsCell['kind'] } = $props();
</script>

{#if kind === 'approach' || kind === 'note'}<span
    class="cell-type-icon"
    class:approach={kind === 'approach'}
    data-cell-type={kind}
    aria-hidden="true"
  >
    {#if kind === 'approach'}<Lambda size={14} />{:else}<MessageSquareText size={14} />{/if}
  </span>{/if}

<style>
  .cell-type-icon {
    display: inline-flex;
    align-items: center;
    color: var(--bearings-muted);
  }
  .cell-type-icon.approach {
    color: var(--bearings-accent);
  }
</style>
