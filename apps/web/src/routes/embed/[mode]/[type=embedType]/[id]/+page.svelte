<script lang="ts">
  import PatternCard from '$lib/sharing/PatternCard.svelte';
  import PracticeWelcome from '$lib/sharing/PracticeWelcome.svelte';
  import { patternShareUrl } from '$lib/sharing/types';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let started = $state(false);
  $effect(() => {
    // Client navigation between embed definitions must open a fresh welcome screen.
    void data;
    started = false;
  });
</script>

<svelte:head>
  <title>{data.share?.pattern.title ?? data.practice?.title} — Patternverse</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="color-scheme" content="light" />
</svelte:head>

{#key `${data.mode}:${data.share?.pattern.id ?? data.practice?.type}:${data.practice?.id}`}
  {#if data.mode === 'card' && data.share}
    <main class="embed-shell"><PatternCard share={data.share} /></main>
  {:else if data.practice && data.runData}
    {#if started}
      {#await import('$lib/components/PatternRun.svelte')}
        <p class="embed-shell" role="status">Opening practice…</p>
      {:then { default: Runner }}<Runner data={data.runData} embedded />
      {:catch}<p class="embed-shell" role="alert">
          Could not open the practice. Reload this view to try again.
        </p>{/await}
    {:else}<main class="embed-shell">
        <PracticeWelcome
          practice={data.practice}
          patternUrl={data.runData.returnHref.startsWith('/pattern/')
            ? patternShareUrl(data.runData.returnHref.slice('/pattern/'.length))
            : `https://patternverse.org${data.runData.returnHref}`}
          onstart={() => (started = true)}
        />
      </main>{/if}
  {/if}
{/key}

<style>
  :global(html:has(.embed-shell)),
  :global(html:has(.pattern-run.embedded)) {
    color-scheme: light;
    font-size: 16px;
  }
  :global(body:has(.embed-shell)),
  :global(body:has(.pattern-run.embedded)) {
    min-width: 0;
    background: #fff;
  }
  .embed-shell {
    width: min(100%, 680px);
    padding: 8px;
    margin: 0 auto;
  }
</style>
