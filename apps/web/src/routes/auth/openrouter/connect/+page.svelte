<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Settings path is resolved before appending its query. */
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { beginOpenRouterConnection } from '$lib/mira/openrouter-auth';
  import { createPrivateMiraStore } from '$lib/mira/private-store';

  let connected = $state(false);
  let message = $state('Opening OpenRouter…');
  let failed = $state(false);

  async function connect() {
    failed = false;
    message = 'Opening OpenRouter…';
    try {
      const authorization = await beginOpenRouterConnection({
        callbackUrl: new URL(resolve('/auth/openrouter/callback'), location.origin).href,
        returnUrl: new URL(resolve('/auth/openrouter/connect'), location.origin).href,
        storage: sessionStorage,
      });
      location.assign(authorization);
    } catch {
      failed = true;
      message = 'Could not start the connection. Allow browser storage and try again.';
    }
  }

  onMount(() => {
    if (new URLSearchParams(location.search).get('connected') !== '1') {
      void connect();
      return;
    }
    void createPrivateMiraStore()
      .loadSettings()
      .then((settings) => {
        connected = Boolean(settings.openRouterKey.trim());
        failed = !connected;
        message = connected
          ? 'Return to your practice tab and retry the step. Your answers are still there.'
          : 'No OpenRouter connection was found. Try connecting again.';
      })
      .catch(() => {
        failed = true;
        message =
          'Could not read the connection on this device. Allow browser storage and try again.';
      });
  });
</script>

<svelte:head>
  <title>Connect with OpenRouter — Patternverse</title>
  <meta name="referrer" content="no-referrer" />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="oauth-callback-page">
  <section aria-labelledby="connection-heading">
    <p>patternverse / AI connection</p>
    <h1 id="connection-heading">
      {connected ? 'OpenRouter connected' : 'Connect with OpenRouter'}
    </h1>
    <p role="status">{message}</p>
    {#if connected}
      <p>
        AI steps use your OpenRouter account and credits. No practice responses were sent during
        sign-in.
      </p>
      <button type="button" onclick={() => window.close()}>Close this tab</button>
      <a href={`${resolve('/mira')}?panel=settings`}>Manage connection and model</a>
    {:else if failed}
      <button type="button" onclick={connect}>Connect with OpenRouter</button>
    {/if}
  </section>
</main>

<style>
  button {
    min-height: 44px;
    margin: 0 0.5rem 0.75rem 0;
    padding: 0.7rem 1rem;
    border: 1px solid var(--green);
    background: var(--green);
    color: #11110f;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 3px;
  }
</style>
