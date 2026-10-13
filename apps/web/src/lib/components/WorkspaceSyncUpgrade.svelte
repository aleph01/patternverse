<script lang="ts">
  import type { WorkspaceDropboxSyncResult } from '$lib/client/dropbox-workspace-sync';
  let {
    result,
    busy = false,
    onupgrade,
    oncancel,
  }: {
    result: Extract<WorkspaceDropboxSyncResult, { type: 'upgrade' }>;
    busy?: boolean;
    onupgrade: (token: string) => void;
    oncancel: () => void;
  } = $props();
  let confirmed = $state(false);
  $effect(() => {
    void result;
    confirmed = false;
  });
</script>

<section aria-label="Upgrade Dropbox archive" class="upgrade-panel" aria-busy={busy}>
  <h4>{result.resumed ? 'resume the archive upgrade.' : 'upgrade your Dropbox archive.'}</h4>
  <p role="status">
    {#if result.stale}The archive or local work changed. Review and confirm this updated upgrade.{/if}
    {result.items} library items and {result.sessions} Mira conversations are in the older archive. Its
    encrypted original will be backed up and verified before upgrading. No local content is replaced.
  </p>
  <p>
    Saved library entries, ratings and practice responses will be merged on the next sync, not
    treated as deleted just because the older archive did not store them.
  </p>
  <label
    ><input type="checkbox" bind:checked={confirmed} disabled={busy} />
    I will use the updated sync on all my devices. Older versions will stop syncing after this upgrade.</label
  >
  <div class="actions">
    <button type="button" disabled={busy} onclick={oncancel}>Not now</button>
    <button
      class="primary"
      type="button"
      disabled={busy || !confirmed}
      onclick={() => onupgrade(result.token)}
    >
      {busy ? 'Upgrading…' : result.resumed ? 'Resume upgrade' : 'Back up and upgrade'}
    </button>
  </div>
</section>

<style>
  .upgrade-panel {
    --muted: var(--text-muted-on-light);
    --ink-muted: var(--text-muted-on-light);
    padding: 1rem;
    margin: 1.25rem 0;
    border: 1px solid #cdd3cb;
    border-radius: 10px;
    background: white;
    color: #171914;
  }
  h4 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    line-height: 1.3;
  }
  p,
  label {
    font-size: 0.9rem;
    line-height: 1.55;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    margin: 1rem 0;
  }
  input {
    margin-top: 0.35rem;
    accent-color: #007d50;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  button {
    padding: 0.65rem 0.85rem;
    min-height: 44px;
    border: 1px solid #b9c3b5;
    border-radius: 6px;
    background: white;
    font-size: 0.85rem;
    font-weight: 650;
    cursor: pointer;
  }
  button.primary {
    background: #171914;
    color: white;
    border-color: #171914;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid #007d50;
    outline-offset: 3px;
  }
  @media (max-width: 600px) {
    .actions button {
      flex: 1;
    }
  }
</style>
