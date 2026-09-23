<script lang="ts">
  import { onMount } from 'svelte';
  import type { Usefulness } from '@patternverse/workspace';
  import { getLocalWorkspace } from '$lib/client/workspace';

  let {
    sourceId,
    entityId,
    compact = false,
  }: { sourceId: string; entityId: string; compact?: boolean } = $props();

  const choices = [
    { value: 0, label: 'Not useful' },
    { value: 1, label: 'Useful' },
    { value: 2, label: 'Very useful' },
  ] as const;

  let usefulness = $state<Usefulness>(null);
  let ready = $state(false);
  let errorMessage = $state('');

  onMount(() => {
    let active = true;
    void getLocalWorkspace()
      .then((workspace) => workspace.getUsefulness({ sourceId, entityId }))
      .then((stored) => {
        if (active) usefulness = stored;
      })
      .catch(() => {
        if (active) errorMessage = 'Local usefulness is unavailable in this browser.';
      })
      .finally(() => {
        if (active) ready = true;
      });
    return () => {
      active = false;
    };
  });

  const choose = async (value: Exclude<Usefulness, null>): Promise<void> => {
    if (!ready) return;
    const next = usefulness === value ? null : value;
    try {
      const workspace = await getLocalWorkspace();
      await workspace.setUsefulness({ sourceId, entityId }, next);
      usefulness = next;
      errorMessage = '';
    } catch {
      errorMessage = 'Could not save usefulness locally.';
    }
  };
</script>

<fieldset class:compact class="usefulness-control">
  <legend>Useful to you?</legend>
  <div class="usefulness-options">
    {#each choices as choice (choice.value)}
      <button
        type="button"
        class:active={usefulness === choice.value}
        aria-pressed={usefulness === choice.value}
        disabled={!ready}
        onclick={() => choose(choice.value)}>{choice.label}</button
      >
    {/each}
  </div>
  {#if !compact}
    <small>{errorMessage || 'Private to this browser. Choose again to clear.'}</small>
  {:else if errorMessage}
    <small>{errorMessage}</small>
  {/if}
</fieldset>
