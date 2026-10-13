<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- The return path is same-origin validated and already includes the resolved app base; the retry link resolves its base before appending parameters. */
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { finishOpenRouterConnection } from '$lib/mira/openrouter-auth';
  import { createPrivateMiraStore } from '$lib/mira/private-store';

  let message = $state('Connecting OpenRouter…');
  onMount(() => {
    const url = new URL(window.location.href);
    // Remove single-use authorization data from history before any network request.
    window.history.replaceState(window.history.state, '', window.location.pathname);
    void finishOpenRouterConnection({
      url,
      storage: sessionStorage,
      store: createPrivateMiraStore(),
    })
      .then(async (returnTo) => {
        message = 'OpenRouter connected. Returning to Patternverse…';
        await goto(returnTo, { replaceState: true });
      })
      .catch((cause: unknown) => {
        message =
          cause instanceof Error
            ? cause.message
            : 'OpenRouter could not be connected. Start the connection again.';
      });
  });
</script>

<svelte:head>
  <title>Connecting OpenRouter — Patternverse</title>
  <meta name="referrer" content="no-referrer" />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- eslint-disable svelte/no-navigation-without-resolve -- The Mira route is resolved before appending the settings query. -->
<main class="oauth-callback-page">
  <section aria-labelledby="openrouter-heading">
    <p>patternverse / AI connection</p>
    <h1 id="openrouter-heading">Connect with OpenRouter</h1>
    <p role="status">{message}</p>
    <a href={`${resolve('/mira')}?panel=settings`}>Return to Mira settings</a>
  </section>
</main>
