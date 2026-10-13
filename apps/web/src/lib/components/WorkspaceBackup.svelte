<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { downloadBlob } from '$lib/client/download';
  import {
    createWorkspaceBackup,
    decodeWorkspaceBackup,
    encodeWorkspaceBackup,
    MAX_WORKSPACE_BACKUP_BYTES,
    WORKSPACE_BACKUP_FILENAME,
    type WorkspaceBackup,
  } from '@patternverse/workspace/backup';
  let busy = $state(false);
  let message = $state('');
  let error = $state('');
  let importing = $state(false);
  let preview = $state<WorkspaceBackup | null>(null);
  let filename = $state('');
  let confirmed = $state(false);
  let recovery = $state<WorkspaceBackup | null>(null);
  let fileInput = $state<HTMLInputElement>();
  onMount(() => {
    void getLocalWorkspace()
      .then(async (workspace) => {
        recovery = (await workspace.getRecoveryBackup()) ?? null;
      })
      .catch(() => {
        error = 'Your local recovery copy could not be read.';
      });
  });
  const dated = (value: string) => new Date(value).toLocaleString();
  function downloadFile(backup: WorkspaceBackup, name = WORKSPACE_BACKUP_FILENAME) {
    downloadBlob(new Blob([encodeWorkspaceBackup(backup)], { type: 'application/cbor' }), name);
  }
  async function download() {
    if (busy) return;
    busy = true;
    message = '';
    error = '';
    try {
      downloadFile(createWorkspaceBackup(await (await getLocalWorkspace()).readWorkspaceData()));
      message = 'Backup downloaded. Keep it somewhere safe; it contains your private content.';
    } catch {
      error = 'The backup could not be downloaded. Your local data is unchanged.';
    } finally {
      busy = false;
    }
  }
  function cancel() {
    importing = false;
    preview = null;
    confirmed = false;
    error = '';
    if (fileInput) fileInput.value = '';
  }
  async function chooseFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    preview = null;
    confirmed = false;
    error = '';
    message = '';
    if (!file || busy) return;
    busy = true;
    try {
      if (file.size > MAX_WORKSPACE_BACKUP_BYTES)
        throw new Error('Choose a workspace backup smaller than 50 MB.');
      const backup = decodeWorkspaceBackup(new Uint8Array(await file.arrayBuffer()));
      filename = file.name;
      preview = backup;
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'This backup could not be read. Your workspace is unchanged.';
    } finally {
      busy = false;
    }
  }
  async function restore() {
    if (busy || !preview || !confirmed) return;
    busy = true;
    message = '';
    error = '';
    let replaced = false;
    try {
      const workspace = await getLocalWorkspace();
      await workspace.replaceFromBackup(preview);
      replaced = true;
      cancel();
      message =
        'Workspace restored on this device. Automatic sync is off; review your workspace before choosing Sync now or enabling automatic sync. Your previous workspace is kept below as a recovery copy.';
      recovery = (await workspace.getRecoveryBackup()) ?? null;
    } catch {
      if (replaced) {
        recovery = null;
        error =
          'The workspace was restored, but the recovery copy could not be displayed. Reopen Sync & backup to try reading it again.';
      } else {
        error =
          'The workspace could not be restored. Your workspace and previous recovery copy are unchanged. Check Sync & backup before trying again, or download a backup first.';
      }
    } finally {
      busy = false;
    }
  }
  function reviewRecovery() {
    if (!recovery || busy) return;
    importing = true;
    preview = recovery;
    filename = 'Previous workspace (local recovery copy)';
    confirmed = false;
    error = '';
    message = '';
    if (fileInput) fileInput.value = '';
  }
  function downloadRecovery() {
    if (!recovery || busy) return;
    error = '';
    try {
      downloadFile(recovery, 'patternverse-workspace-recovery.cbor');
    } catch {
      error = 'The recovery copy could not be downloaded. Your workspace is unchanged.';
    }
  }
</script>

<section aria-labelledby="backup-title">
  <h3 id="backup-title">backup & restore</h3>
  <p>
    Download your patterns, verses, collections, saved library items, usefulness ratings, and saved
    practice responses, plus your situations and context, in a compact binary backup (.cbor).
    Includes saved practice checkpoints; excludes Mira conversations, device preferences, and AI
    credentials. Backups are not encrypted—keep them somewhere safe.
  </p>
  <div class="actions">
    <button disabled={busy} onclick={download}
      >{busy ? 'Preparing…' : 'Download workspace backup'}</button
    ><button
      disabled={busy || importing}
      onclick={() => {
        importing = true;
        message = '';
        error = '';
      }}>Restore from backup</button
    >
  </div>
  {#if importing}
    <div class="restore-panel" aria-labelledby="restore-title">
      <h4 id="restore-title">restore a workspace</h4>
      <p id="file-help">
        Choose a .cbor backup or an older .json export. Files stay on this device. Maximum 50 MB.
      </p>
      <label class="file-label"
        >Choose a workspace backup<input
          bind:this={fileInput}
          type="file"
          accept=".cbor,.json,application/cbor,application/json"
          disabled={busy}
          onchange={chooseFile}
          aria-describedby="file-help"
        /></label
      >
      {#if preview}
        <div class="preview" aria-label="Backup preview">
          <strong>{preview.workspace.name}</strong>
          <p>{filename}<br />Backed up {dated(preview.exportedAt)}</p>
          <dl>
            <div>
              <dt>Patterns</dt>
              <dd>{preview.entities.filter((e) => e.type === 'pattern').length}</dd>
            </div>
            <div>
              <dt>Verses</dt>
              <dd>{preview.entities.filter((e) => e.type === 'verse').length}</dd>
            </div>
            <div>
              <dt>Collections</dt>
              <dd>{preview.entities.filter((e) => e.type === 'collection').length}</dd>
            </div>
            <div>
              <dt>Other articles</dt>
              <dd>
                {preview.entities.filter((e) => e.type === 'concept' || e.type === 'practice')
                  .length}
              </dd>
            </div>
            <div>
              <dt>Saved library items</dt>
              <dd>{preview.favorites.length}</dd>
            </div>
            <div>
              <dt>Ratings</dt>
              <dd>{preview.usefulness.length}</dd>
            </div>
            <div>
              <dt>Saved responses</dt>
              <dd>{preview.practiceRuns.length}</dd>
            </div>
            <div>
              <dt>Situations</dt>
              <dd>{preview.situations.length}</dd>
            </div>
          </dl>
        </div>
        <p class="warning">
          This replaces all private content, situations, and saved responses in your current
          workspace; it does not merge them. Public library content, Mira conversations, AI
          connections, and other preferences stay unchanged. Automatic sync will be turned off so
          you can review the restored content before uploading it. Close other open editors or
          practices before restoring.
        </p>
        <p>
          One recovery copy of your current workspace will be kept on this device. Each restore
          replaces that copy. Download it if you want to keep it longer; clearing browser data
          removes it.
        </p>
        <label class="confirm"
          ><input type="checkbox" bind:checked={confirmed} disabled={busy} />I understand this
          replaces my current workspace.</label
        >
      {/if}
      <div class="actions">
        {#if preview}<button class="replace" disabled={busy || !confirmed} onclick={restore}
            >{busy ? 'Restoring…' : 'Replace workspace'}</button
          >{/if}
        <button disabled={busy} onclick={cancel}>Cancel</button>
      </div>
    </div>
  {/if}
  {#if recovery}
    <div class="recovery">
      <h4>previous workspace</h4>
      <p>Recovery copy from {dated(recovery.exportedAt)}, saved before the last restore.</p>
      <div class="actions">
        <button disabled={busy} onclick={reviewRecovery}>Review recovery copy</button><button
          disabled={busy}
          onclick={downloadRecovery}>Download recovery copy</button
        >
      </div>
    </div>
  {/if}
  {#if message}<p role="status">{message}</p>{/if}{#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
  section {
    margin-top: 1.5rem;
    padding: 1.4rem;
    border: 1px solid #dfe4da;
    border-radius: 10px;
    background: #f7f9f5;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  p {
    max-width: 75ch;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--muted);
  }
  button {
    min-height: 44px;
    border: 1px solid #c9d3c3;
    padding: 0.7rem 0.9rem;
    background: white;
    color: var(--ink);
    border-radius: 6px;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .restore-panel,
  .recovery {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid #dfe4da;
  }
  h4 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }
  .file-label {
    display: grid;
    gap: 0.5rem;
    font-size: 0.82rem;
    font-weight: 600;
  }
  input[type='file'] {
    max-width: 100%;
    min-width: 0;
    font: inherit;
  }
  .preview {
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid #dfe4da;
    background: white;
    border-radius: 6px;
  }
  .preview p {
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.8rem;
    margin: 0;
  }
  dt {
    font-size: 0.75rem;
    color: var(--muted);
  }
  dd {
    margin: 0.2rem 0 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .warning {
    color: var(--ink);
  }
  .confirm {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.82rem;
    line-height: 1.5;
    margin: 1rem 0;
  }
  .confirm input {
    margin: 0.2rem 0 0;
  }
  .replace {
    background: var(--ink);
    color: white;
    border-color: var(--ink);
  }
  [role='alert'] {
    color: #a62b1f;
  }
</style>
