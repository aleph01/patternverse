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

  const appKey = PUBLIC_DROPBOX_APP_KEY;
  let connection = $state<DropboxConnection>();
  let connecting = $state(false);
  let connectionMessage = $state('');

  const startDropboxConnection = async (): Promise<void> => {
    if (!appKey || connecting) {
      connectionMessage = 'Dropbox authorization is not configured in this build.';
      return;
    }

    connecting = true;
    connectionMessage = '';
    const port = window.location.port ? `:${window.location.port}` : '';
    const localhostOrigin = `${window.location.protocol}//localhost${port}`;

    if (window.location.hostname !== 'localhost') {
      window.location.assign(`${localhostOrigin}${resolve('/my')}?connect=dropbox`);
      return;
    }

    const redirectUri = `${localhostOrigin}${resolve('/auth/dropbox/callback')}`;
    const authorization = await createDropboxAuthorization(appKey, redirectUri);
    sessionStorage.setItem(DROPBOX_FLOW_STORAGE_KEY, JSON.stringify(authorization.flow));
    window.location.assign(authorization.url);
  };

  const disconnect = (): void => {
    sessionStorage.removeItem(DROPBOX_CONNECTION_STORAGE_KEY);
    connection = undefined;
    connectionMessage = 'Dropbox was disconnected from this browser session.';
  };

  onMount(() => {
    connection = readDropboxConnection(sessionStorage);
    if (new URL(window.location.href).searchParams.get('connect') === 'dropbox') {
      void startDropboxConnection();
    }
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
        <button type="button" onclick={disconnect}>Disconnect</button>
      {:else}
        <h3>not connected</h3>
        <p>Connect Dropbox to synchronize only your personal workspace between devices.</p>
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

  {#if connectionMessage}
    <p class="connection-message sync-connection-message" aria-live="polite">
      {connectionMessage}
    </p>
  {/if}
</section>
