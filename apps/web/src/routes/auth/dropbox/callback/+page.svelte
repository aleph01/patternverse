<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { PUBLIC_DROPBOX_APP_KEY } from '$env/static/public';
  import { onMount } from 'svelte';
  import {
    DROPBOX_CONNECTION_STORAGE_KEY,
    DROPBOX_FLOW_STORAGE_KEY,
    exchangeDropboxAuthorizationCode,
    type DropboxOAuthFlow,
  } from '$lib/client/dropbox-auth';

  const appKey = PUBLIC_DROPBOX_APP_KEY;
  let message = $state('Finishing your Dropbox connection…');

  onMount(() => {
    void (async () => {
      const params = new URL(window.location.href).searchParams;
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error_description') ?? params.get('error');
      const storedFlow = sessionStorage.getItem(DROPBOX_FLOW_STORAGE_KEY);

      if (error) throw new Error(error);
      if (!appKey || !code || !state || !storedFlow) {
        throw new Error('The Dropbox authorization response is incomplete.');
      }

      const flow = JSON.parse(storedFlow) as DropboxOAuthFlow;
      if (flow.state !== state) throw new Error('The Dropbox authorization state did not match.');

      const connection = await exchangeDropboxAuthorizationCode({ appKey, code, flow });
      sessionStorage.removeItem(DROPBOX_FLOW_STORAGE_KEY);
      sessionStorage.setItem(DROPBOX_CONNECTION_STORAGE_KEY, JSON.stringify(connection));
      await goto(resolve('/my'));
    })().catch((error: unknown) => {
      sessionStorage.removeItem(DROPBOX_FLOW_STORAGE_KEY);
      message = error instanceof Error ? error.message : 'Dropbox could not be connected.';
    });
  });
</script>

<svelte:head>
  <title>Connecting Dropbox — Patternverse</title>
</svelte:head>

<main class="oauth-callback-page">
  <section aria-labelledby="oauth-heading">
    <p>Dropbox</p>
    <h1 id="oauth-heading">{message}</h1>
    <a href={resolve('/my')}>Return to my Patternverse</a>
  </section>
</main>
