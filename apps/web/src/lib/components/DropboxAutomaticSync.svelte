<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { isDropboxSignInOnlyEnabled } from '$lib/release-features';
  import { dropboxSyncState, startDropboxAutomaticSync } from '$lib/client/dropbox-auto-sync';
  onMount(() => {
    if (isDropboxSignInOnlyEnabled('__TAURI_INTERNALS__' in window))
      return startDropboxAutomaticSync();
  });
  const needsReview = $derived(
    $dropboxSyncState.result &&
      $dropboxSyncState.result.type !== 'complete' &&
      $dropboxSyncState.result.type !== 'cancelled',
  );
</script>

{#if needsReview}
  <aside class="sync-attention" aria-label="Dropbox sync status">
    <span role="status">{$dropboxSyncState.message}</span>
    <a href={resolve('/my?pane=sync')}>Open Sync & backup →</a>
  </aside>
{/if}

<style>
  .sync-attention {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.85rem 5vw;
    background: #f5f1e5;
    border-bottom: 1px solid #ddd5c1;
    color: var(--ink);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  a {
    color: var(--green-dark);
    font-weight: 700;
  }
</style>
