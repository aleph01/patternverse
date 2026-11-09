<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import HorizontalShelf from './HorizontalShelf.svelte';
  import MiraMark from '$lib/mira/MiraMark.svelte';
  import { resolveReleaseFeatures } from '$lib/release-features';
  import PreviewOnly from '$lib/preview/PreviewOnly.svelte';
  let desktop = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
  });
</script>

<div class="home-apps">
  <HorizontalShelf id="home-apps" eyebrow="Put it into practice" heading="A space for you">
    <PreviewOnly>
      <article class="home-app-card bearings-app">
        <a href={resolve('/apps/bearings')}>
          <div class="app-art bearings-art" aria-hidden="true">
            <img
              src={`${resolve('/apps/bearings/icon.png')}?v=green`}
              width="160"
              height="160"
              alt=""
            />
          </div>
          <div class="app-copy">
            <h3>Bearings</h3>
            <p>Work through your situations with a notebook, patterns, and your own approaches.</p>
            <span>Open Bearings <span aria-hidden="true">↗</span></span>
          </div>
        </a>
      </article>
    </PreviewOnly>
    <article class="home-app-card mira">
      <a href={resolve('/apps/mira')}>
        <div class="app-art mira-art" aria-hidden="true"><MiraMark size="140px" /></div>
        <div class="app-copy">
          <h3>mira</h3>
          <p>
            {features.guidedExercises
              ? 'A companion for reflection and guided practice.'
              : 'A companion for reflective conversations.'}
          </p>
          <span>Open mira <span aria-hidden="true">↗</span></span>
        </div>
      </a>
    </article>
  </HorizontalShelf>
</div>

<style>
  .home-apps {
    --shelf-card-width: min(82vw, 480px);
  }
  .home-app-card {
    border: 1px solid var(--ink);
    border-radius: 8px;
    overflow: hidden;
  }
  .home-app-card > a {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: inherit;
  }
  .mira {
    background: #181814;
    color: #fff;
  }
  .bearings-app {
    background: #fffcf7;
    color: #35312d;
  }
  .bearings-art {
    background: #cb3c32;
  }
  .bearings-art img {
    height: 160px;
    width: 160px;
    object-fit: cover;
  }
  .app-art {
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .mira-art {
    color: #fff;
    background: #292a25;
  }
  .app-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 1.5rem;
  }
  h3 {
    margin: 0 0 0.75rem;
    font:
      400 2rem Georgia,
      serif;
  }
  p {
    margin: 0 0 1rem;
    line-height: 1.5;
  }
  .app-copy > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 44px;
    margin-top: auto;
    font-weight: 700;
    font-size: 0.85rem;
  }
  a:focus-visible {
    outline-offset: -5px;
  }
  a:hover .app-copy > span {
    text-decoration: underline;
  }
</style>
