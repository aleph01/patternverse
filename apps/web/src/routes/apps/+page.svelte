<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import TileArt from '$lib/apps/tender-wilds/TileArt.svelte';
  import MiraMark from '$lib/mira/MiraMark.svelte';
  import { resolveReleaseFeatures } from '$lib/release-features';
  import '$lib/apps/apps.css';

  let desktop = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
  });
</script>

<svelte:head
  ><title>Apps — Patternverse</title><meta
    name="description"
    content="Explore the apps inside Patternverse."
  /></svelte:head
>
<main class="apps-page">
  <header class="apps-intro">
    <h1>Apps</h1>
    <p>Make room for reflection.</p>
  </header>
  <a class="mira-app-tile" href={resolve('/apps/mira')}>
    <div>
      <h2>mira</h2>
      <p>
        {features.guidedExercises
          ? 'A companion for reflection and guided practice.'
          : 'A companion for reflective conversations.'}
      </p>
      <span class="tile-action">Open mira <span aria-hidden="true">→</span></span>
    </div>
    <div class="tile-art"><MiraMark size="220px" /></div>
  </a>
  <a class="tender-app-tile" href={resolve('/apps/tender-wilds')}>
    <div class="tender-tile-copy">
      <h2>Tender Wilds</h2>
      <p>
        Build habits through play. Grow a garden, discover new seeds, and explore a world of your
        own.
      </p>
    </div>
    <div class="tender-tile-art" aria-hidden="true">
      <TileArt />
    </div>
    <span class="tile-action tender-tile-action"
      >Open Tender Wilds <span aria-hidden="true">→</span></span
    >
  </a>
</main>

<style>
  .tender-app-tile {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    grid-template-areas: 'copy art' 'action art';
    align-items: center;
    column-gap: 32px;
    padding: 36px;
    margin-top: 24px;
    max-width: 820px;
    background: #fff3c4;
    color: var(--ink);
    border: 1px solid var(--ink);
    border-radius: 12px;
  }
  .tender-tile-copy {
    grid-area: copy;
  }
  .tender-app-tile h2 {
    font:
      400 3rem Georgia,
      serif;
    margin: 0 0 16px;
  }
  .tender-app-tile p {
    line-height: 1.6;
    max-width: 32ch;
    margin: 0;
  }
  .tender-tile-art {
    grid-area: art;
    width: 100%;
    max-width: 270px;
    justify-self: center;
  }
  .tender-tile-art > :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .tender-tile-action {
    grid-area: action;
    justify-self: start;
  }
  .tender-app-tile:focus-visible {
    outline: 3px solid #007a4d;
    outline-offset: 5px;
  }
  @media (max-width: 520px) {
    .tender-app-tile {
      padding: 24px;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'copy' 'art' 'action';
    }
    .tender-app-tile h2 {
      font-size: 2.5rem;
    }
    .tender-tile-art {
      max-width: 200px;
      margin-top: 8px;
    }
    .tender-tile-action {
      margin-top: 12px;
      width: 100%;
      justify-content: center;
      gap: 16px;
    }
  }
</style>
