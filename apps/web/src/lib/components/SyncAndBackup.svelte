<script lang="ts">
  import { resolve } from '$app/paths';
  import { PUBLIC_DROPBOX_APP_KEY } from '$env/static/public';
  import { onMount } from 'svelte';
  import {
    createDropboxAuthorization,
    DROPBOX_CONNECTION_STORAGE_KEY,
    DROPBOX_FLOW_STORAGE_KEY,
    readDropboxConnection,
    type DropboxConnection,
  } from '$lib/client/dropbox-auth';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    forgetDropboxSyncKey,
    hasDropboxSyncKey,
    syncWithDropbox,
    type SyncChoice,
    type SyncConflict,
  } from '$lib/client/dropbox-sync';
  import { createPrivateMiraStore } from '$lib/mira/private-store';

  const appKey = PUBLIC_DROPBOX_APP_KEY;
  let connection = $state<DropboxConnection>();
  let connecting = $state(false);
  let connectionMessage = $state('');
  let syncPhrase = $state('');
  let syncing = $state(false);
  let remembered = $state(false);
  let conflicts = $state<readonly SyncConflict[]>([]);
  let choices = $state<Record<string, SyncChoice>>({});
  let conflictToken = $state<string>();

  const startDropboxConnection = async (): Promise<void> => {
    if (!appKey || connecting) {
      connectionMessage = 'Dropbox authorization is not configured in this build.';
      return;
    }

    connecting = true;
    connectionMessage = '';
    const redirectUri = `${window.location.origin}${resolve('/auth/dropbox/callback')}`;
    const authorization = await createDropboxAuthorization(appKey, redirectUri);
    sessionStorage.setItem(DROPBOX_FLOW_STORAGE_KEY, JSON.stringify(authorization.flow));
    window.location.assign(authorization.url);
  };

  const disconnect = async (): Promise<void> => {
    if (connection) await forgetDropboxSyncKey(connection.accountId);
    sessionStorage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY);
    connection = undefined;
    remembered = false;
    conflicts = [];
    choices = {};
    conflictToken = undefined;
    connectionMessage = 'Dropbox was disconnected from this browser session.';
  };

  const synchronize = async (): Promise<void> => {
    if (!connection || syncing) return;
    syncing = true;
    connectionMessage = '';
    try {
      const workspace = await getLocalWorkspace();
      const result = await syncWithDropbox({
        connection,
        workspace,
        mira: createPrivateMiraStore(),
        phrase: syncPhrase || undefined,
        choices,
        expectedConflictToken: conflictToken,
      });
      if (result.type === 'conflicts') {
        conflicts = result.conflicts;
        conflictToken = result.token;
        connectionMessage = 'Changes on both devices need a choice before syncing.';
      } else {
        conflicts = [];
        choices = {};
        conflictToken = undefined;
        syncPhrase = '';
        remembered = true;
        connectionMessage = `Synced ${result.entities} library items and ${result.sessions} Mira sessions.`;
        window.dispatchEvent(new Event('patternverse:sync-complete'));
      }
    } catch (cause) {
      connectionMessage = cause instanceof Error ? cause.message : 'Sync could not finish.';
      if (connectionMessage.includes('changed after you reviewed')) {
        conflicts = [];
        choices = {};
        conflictToken = undefined;
      }
    } finally {
      syncing = false;
    }
  };

  onMount(() => {
    connection = readDropboxConnection(sessionStorage);
    if (connection)
      void hasDropboxSyncKey(connection.accountId).then((saved) => (remembered = saved));
  });
</script>

<section class="sync-settings" aria-labelledby="sync-heading">
  <div class="my-section-heading">
    <p>Sync and backup</p>
    <h2 id="sync-heading">keep your work close.</h2>
  </div>

  <div class="sync-status-grid">
    <article class="device-status">
      <div class="status-kicker">
        <span class="status-dot active" aria-hidden="true"></span>
        <span>This device</span>
      </div>
      <h3>saved locally</h3>
      <p>Your personal workspace is available offline in this browser.</p>
      <strong>All local changes saved</strong>
    </article>

    <article class="cloud-status" class:connected={connection}>
      <div class="status-kicker">
        <span class="status-dot" class:active={connection} aria-hidden="true"></span>
        <span>Cloud storage</span>
      </div>
      {#if connection}
        <h3>Dropbox connected</h3>
        <p>{connection.displayName ?? connection.email ?? 'Your Dropbox account'}</p>
        <button type="button" onclick={() => void disconnect()}>Disconnect</button>
      {:else}
        <h3>not connected</h3>
        <p>
          Connect Dropbox to synchronize your personal library and Mira conversations between
          devices.
        </p>
        <button
          class="button-link primary"
          type="button"
          disabled={connecting}
          onclick={startDropboxConnection}
        >
          {connecting ? 'Opening Dropbox…' : 'Connect Dropbox'}
        </button>
      {/if}
    </article>
  </div>

  {#if connection}
    <div class="sync-controls">
      <h3>Encrypted cross-device sync</h3>
      <p>
        Personal library items and conversations are encrypted before they leave this device. Choose
        a strong phrase when linking your first device, then enter that same phrase on another
        device. This device remembers its key, so you do not need to unlock on every visit. Your
        OpenRouter key is never synced.
      </p>
      <label for="sync-phrase"
        >{remembered ? 'Sync phrase (only if changing key)' : 'Sync phrase'}</label
      >
      <input id="sync-phrase" type="password" bind:value={syncPhrase} autocomplete="new-password" />
      {#if conflicts.length}
        <div class="sync-conflicts" role="group" aria-label="Sync conflicts">
          <p>Choose which version to keep for each item changed on both devices.</p>
          {#each conflicts as conflict (conflict.key)}
            <label>
              <span>{conflict.title}</span>
              <select
                value={choices[conflict.key] ?? ''}
                onchange={(event) =>
                  (choices = {
                    ...choices,
                    [conflict.key]: event.currentTarget.value as SyncChoice,
                  })}
              >
                <option value="">Choose a version</option>
                <option value="local">This device</option>
                <option value="remote">Dropbox</option>
              </select>
            </label>
          {/each}
        </div>
      {/if}
      <button
        class="button-link primary"
        type="button"
        disabled={syncing || (conflicts.length > 0 && conflicts.some((item) => !choices[item.key]))}
        onclick={synchronize}
        >{syncing ? 'Syncing…' : conflicts.length ? 'Resolve and sync' : 'Sync now'}</button
      >
    </div>
  {/if}

  {#if connectionMessage}
    <p class="connection-message sync-connection-message" aria-live="polite">
      {connectionMessage}
    </p>
  {/if}
</section>
