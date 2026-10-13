<script lang="ts">
  import type {
    WorkspaceDropboxSyncResult,
    WorkspaceSyncChoice,
  } from '$lib/client/dropbox-workspace-sync';

  let {
    result,
    busy = false,
    onresolve,
    onretry,
    oncancel,
    onrecover,
  }: {
    result: Extract<WorkspaceDropboxSyncResult, { type: 'review' | 'blocked' }>;
    busy?: boolean;
    onresolve: (choices: Record<string, WorkspaceSyncChoice>, token: string) => void;
    onretry: () => void;
    oncancel: () => void;
    onrecover?: (choices: Record<string, WorkspaceSyncChoice>, token: string) => void;
  } = $props();
  let choices = $state<Record<string, WorkspaceSyncChoice>>({});
  let confirmed = $state(false);
  $effect(() => {
    void result;
    choices = {};
    confirmed = false;
  });
  const ready = $derived(
    (result.type === 'review' || (result.type === 'blocked' && result.token && onrecover)) &&
      result.items.length > 0 &&
      result.items.every((item) => choices[item.path]),
  );
</script>

<section class="sync-review" aria-label="Review workspace sync" aria-busy={busy}>
  <header>
    <h4>{result.type === 'blocked' ? 'update paused.' : 'choose the version to keep.'}</h4>
    <p role="status">
      {#if result.type === 'blocked'}
        {result.message} Choose which remaining updates to apply. An encrypted recovery copy will be kept.
        This settles the interrupted local update; Dropbox may still need a separate conflict review.
        Active Mira work stays protected. Not now leaves recovery unchanged.
      {:else if result.stale}
        Something changed since your last review. Your earlier choices were not applied. Review the
        latest versions.
      {:else}
        These records changed on both devices. Choose for each one; nothing is selected
        automatically.
      {/if}
    </p>
  </header>
  {#each result.items as item (item.path)}
    <article>
      <div class="record-heading">
        <span>{item.kind}</span>
        <h5>{item.title}</h5>
      </div>
      {#if result.type === 'review' || (result.type === 'blocked' && result.token && onrecover)}
        <fieldset disabled={busy}>
          <legend class="sr-only">Version to keep for {item.title}</legend>
          <label class:selected={choices[item.path] === 'local'}>
            <input type="radio" name={item.path} value="local" bind:group={choices[item.path]} />
            This device
          </label>
          <label class:selected={choices[item.path] === 'remote'}>
            <input
              type="radio"
              name={item.path}
              value="remote"
              disabled={!!item.protectedReason}
              bind:group={choices[item.path]}
            />
            {result.type === 'blocked' ? 'Pending update' : 'Dropbox'}
          </label>
        </fieldset>
        {#if item.protectedReason}<p>{item.protectedReason}</p>{/if}
      {/if}
      <details>
        <summary>Compare versions</summary>
        <div class="versions">
          <div>
            <h6>This device</h6>
            <pre>{item.local}</pre>
          </div>
          <div>
            <h6>{result.type === 'blocked' ? 'Pending update' : 'Dropbox'}</h6>
            <pre>{item.remote}</pre>
          </div>
        </div>
      </details>
    </article>
  {/each}
  {#if result.type === 'blocked' && result.token && result.items.length && onrecover}
    <label class="recovery-confirmation">
      <input type="checkbox" bind:checked={confirmed} disabled={busy} />
      I confirm these recovery choices. Replaced versions will stay in an encrypted recovery copy.
    </label>
  {/if}
  <div class="review-actions">
    <button type="button" disabled={busy} onclick={oncancel}>Not now</button>
    {#if result.type === 'blocked' && result.token && result.items.length && onrecover}
      <button
        class="primary"
        type="button"
        disabled={busy || !ready || !confirmed}
        onclick={() =>
          result.type === 'blocked' && result.token && onrecover?.({ ...choices }, result.token)}
      >
        {busy ? 'Applying…' : 'Apply recovery choices'}
      </button>
    {:else if result.type === 'review' && result.items.length}
      <button
        class="primary"
        type="button"
        disabled={busy || !ready}
        onclick={() => result.type === 'review' && onresolve({ ...choices }, result.token)}
      >
        {busy ? 'Syncing…' : 'Apply choices and sync'}
      </button>
    {:else}
      <button class="primary" type="button" disabled={busy} onclick={onretry}>
        {busy ? 'Retrying…' : 'Retry sync'}
      </button>
    {/if}
  </div>
</section>

<style>
  .sync-review {
    --muted: var(--text-muted-on-light);
    --ink-muted: var(--text-muted-on-light);
    border: 1px solid #cdd3cb;
    border-radius: 10px;
    background: #fff;
    color: #171914;
    margin: 1.25rem 0;
    overflow: hidden;
  }
  header,
  article,
  .review-actions {
    padding: 1rem;
  }
  article,
  .review-actions {
    border-top: 1px solid #dde2db;
  }
  h4 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
    line-height: 1.3;
  }
  p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
  }
  .record-heading span {
    color: #596354;
    font-size: 0.75rem;
  }
  h5 {
    margin: 0.2rem 0 0.75rem;
    font-size: 1rem;
    overflow-wrap: anywhere;
  }
  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    border: 0;
    margin: 0 0 0.75rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid #b9c3b5;
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    min-height: 44px;
  }
  label.selected {
    background: #e1f6e9;
    border-color: #007d50;
  }
  .recovery-confirmation {
    margin: 1rem;
    font-size: 0.85rem;
  }
  input {
    accent-color: #007d50;
  }
  summary {
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.5rem 0;
  }
  .versions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  h6 {
    margin: 0.5rem 0;
    font-size: 0.85rem;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 18rem;
    overflow: auto;
    background: #f4f6f2;
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0;
    font-size: 0.75rem;
  }
  .review-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button {
    padding: 0.65rem 0.85rem;
    border: 1px solid #b9c3b5;
    border-radius: 6px;
    background: white;
    font-size: 0.85rem;
    font-weight: 650;
    min-height: 44px;
    cursor: pointer;
  }
  button.primary {
    background: #171914;
    color: #fff;
    border-color: #171914;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible,
  summary:focus-visible {
    outline: 2px solid #007d50;
    outline-offset: 3px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @media (max-width: 600px) {
    .versions {
      grid-template-columns: 1fr;
    }
    .review-actions button {
      flex: 1;
    }
  }
</style>
