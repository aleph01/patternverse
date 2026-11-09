<script lang="ts">
  import { resolve } from '$app/paths';
  import PatternverseGuide from '$lib/components/PatternverseGuide.svelte';
  import DailyPatterns from '$lib/components/DailyPatterns.svelte';
  import HomeVerses from '$lib/components/HomeVerses.svelte';
  import HomeApps from '$lib/components/HomeApps.svelte';
  import HomeChatGPT from '$lib/components/HomeChatGPT.svelte';
  import HeroTileArtwork from '$lib/illustrations/HeroTileArtwork.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <meta
    name="description"
    content="Find practical patterns, concepts, and practices in one personal knowledge library."
  />
  <meta property="og:title" content="Patternverse" />
  <meta
    property="og:description"
    content="Find practical patterns, concepts, and practices in one personal knowledge library."
  />
</svelte:head>

<main>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="hero-inner">
      <div class="hero-stage">
        <div class="hero-art" aria-hidden="true">
          <HeroTileArtwork />
        </div>
        <div class="hero-copy">
          <div class="eyebrow">Patternverse / procedural knowledge library</div>
          <h1 id="hero-heading">Ideas worth<br /> putting<br /> to work.</h1>
          <p>
            A curated library of patterns, concepts, and practices for turning useful ideas into
            action.
          </p>
          <div class="hero-actions">
            <a class="primary" href={resolve('/library')}>Browse the library <span>↗</span></a>
            <a href="#home-about">What is the Patternverse? <span>→</span></a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <DailyPatterns candidates={data.dailyPatterns} initialDay={data.dailyPatternDay} />

  <HomeVerses verses={data.verses} />

  <HomeApps />

  <HomeChatGPT />

  <PatternverseGuide />
</main>
