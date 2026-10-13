<script lang="ts">
  import type { Usefulness } from '@patternverse/workspace';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';

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
  let saving = $state(false);
  let errorMessage = $state('');

  $effect(() => {
    const ref = { sourceId, entityId };
    usefulness = null;
    ready = false;
    saving = false;
    errorMessage = '';
    const reader = createWorkspaceRefresh({
      read: async () => (await getLocalWorkspace()).getUsefulness(ref),
      apply: (stored) => {
        usefulness = stored;
        errorMessage = '';
      },
      failed: () => {
        errorMessage = 'Local usefulness is unavailable in this browser.';
      },
      settled: () => {
        ready = true;
      },
    });
    const reload = () => {
      void reader.refresh();
    };
    reload();
    const unsubscribe = subscribeWorkspaceChanges(['ratings'], reload);
    window.addEventListener('focus', reload);
    return () => {
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', reload);
    };
  });

  const choose = async (value: Exclude<Usefulness, null>): Promise<void> => {
    if (!ready || saving) return;
    const ref = { sourceId, entityId };
    const current = () => sourceId === ref.sourceId && entityId === ref.entityId;
    const next = usefulness === value ? null : value;
    saving = true;
    try {
      const workspace = await getLocalWorkspace();
      await workspace.setUsefulness(ref, next);
      if (current()) {
        usefulness = next;
        errorMessage = '';
      }
    } catch {
      if (current()) errorMessage = 'Could not save usefulness locally.';
    } finally {
      if (current()) saving = false;
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
        disabled={!ready || saving}
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
