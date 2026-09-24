<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    findMiraPattern,
    parseMiraPatternQuery,
    type MiraPatternSummary,
  } from '$lib/mira/context';

  let { data } = $props();
  let personal = $state<readonly MiraPatternSummary[]>([]);
  let localReady = $state(false);
  let context = $state<ReturnType<typeof parseMiraPatternQuery>>(null);
  const pattern = $derived(findMiraPattern(context, [...personal, ...data.patterns]));
  const returnHref = $derived(
    pattern?.sourceId === 'personal'
      ? `${resolve('/editor')}?id=${encodeURIComponent(pattern.id)}`
      : pattern
        ? resolve('/[type=entityType]/[id]', { type: 'pattern', id: pattern.id })
        : resolve('/'),
  );

  afterNavigate(() => {
    context = parseMiraPatternQuery(new URLSearchParams(window.location.search));
  });

  onMount(() => {
    let active = true;
    void getLocalWorkspace()
      .then((workspace) => workspace.listEntities())
      .then((entries) => {
        if (active) personal = entries.filter((entry) => entry.type === 'pattern');
      })
      .catch(() => {
        // A private lookup failure never substitutes a Commons item with the same ID.
      })
      .finally(() => {
        if (active) localReady = true;
      });
    return () => {
      active = false;
    };
  });
</script>

<svelte:head>
  <title>Mira — Patternverse</title>
  <meta name="description" content="Meet Mira, the reflective companion within Patternverse." />
</svelte:head>

<main class="mira-page">
  <header class="mira-intro">
    <p class="mira-eyebrow">Patternverse · Companion</p>
    <h1>Make room<br />to reflect<span>.</span></h1>
    <p>Mira is the conversational space for exploring a pattern in your own words.</p>
  </header>

  {#if pattern}
    <section class="mira-context" aria-labelledby="mira-context-title">
      <div>
        <p class="mira-eyebrow">Brought from your library · {pattern.sourceId}</p>
        <h2 id="mira-context-title">{pattern.title}</h2>
        {#if pattern.summary}<p>{pattern.summary}</p>{/if}
      </div>
      <a href={returnHref}>Back to pattern <span aria-hidden="true">↗</span></a>
    </section>
  {:else if context && localReady}
    <section class="mira-context" aria-live="polite">
      <p>This pattern could not be found in its original library source.</p>
      <a href={resolve('/')}>Return to the library <span aria-hidden="true">↗</span></a>
    </section>
  {/if}

  <section class="mira-transition" aria-labelledby="mira-transition-title">
    <p class="mira-eyebrow">Coming together</p>
    <h2 id="mira-transition-title">One place for knowledge and conversation.</h2>
    <p>
      Mira sessions are being integrated into Patternverse. Conversations are not available on this
      page yet. Your existing Mira sessions remain in the desktop app; none are imported, published,
      or synced automatically.
    </p>
    <a href={resolve('/')}>Explore the library <span aria-hidden="true">→</span></a>
  </section>
</main>
