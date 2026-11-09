<script lang="ts">
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { Play, RotateCcw } from '@lucide/svelte';
  import type { ArticleWidget } from '@patternverse/compiler';
  import { loadWidgetSource } from './assets';

  let { widget }: { widget: ArticleWidget } = $props();
  let source = $state<string>();
  let loading = $state(false);
  let error = $state('');
  let generation = $state(0);
  let frame = $state<HTMLIFrameElement>();
  let frameHeight = $state<number>();
  const isML = $derived(widget.src.startsWith('ml-'));
  const isDataVisualization = $derived(widget.src.startsWith('dataviz-'));
  const isBowen = $derived(widget.src.startsWith('bowen-'));
  const isReferenceBrowser = $derived(
    [
      'identify-limiting-beliefs.html',
      'explore-what-feels-wrong.html',
      'identify-needs.html',
    ].includes(widget.src),
  );
  const autoResize = $derived(isML || isDataVisualization || isReferenceBrowser || isBowen);
  let active = true;

  onMount(() => {
    const ready = (event: MessageEvent) => {
      if (event.source !== frame?.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.type === 'article-widget-ready' && source) {
        frame.contentWindow?.postMessage(
          { type: 'article-widget-source', source, title: widget.title, autoResize },
          window.location.origin,
        );
      }
      if (
        autoResize &&
        event.data?.type === 'article-widget-size' &&
        Number.isFinite(event.data.height)
      ) {
        frameHeight = Math.max(240, Math.min(20_000, Math.ceil(event.data.height)));
      }
    };
    window.addEventListener('message', ready);
    // Reference browsers and visual lessons lead with their bundled content.
    if (isDataVisualization || isReferenceBrowser || isBowen) void start();
    return () => {
      active = false;
      window.removeEventListener('message', ready);
    };
  });

  async function start() {
    loading = true;
    error = '';
    try {
      const loaded = await loadWidgetSource(widget.src);
      if (!active) return;
      source = loaded;
      frameHeight = undefined;
      generation += 1;
    } catch {
      if (active)
        error = isReferenceBrowser
          ? 'The library could not be loaded. Try again when you are online.'
          : 'This example could not be loaded. Try again when you are online.';
    } finally {
      if (active) loading = false;
    }
  }
</script>

<section
  class="article-widget"
  class:reference-browser={isReferenceBrowser}
  aria-label={widget.title}
>
  <div class="widget-heading">
    <strong>{widget.title}</strong>
    {#if !isReferenceBrowser || error}
      <button type="button" onclick={start} disabled={loading}>
        {#if source}<RotateCcw size={14} strokeWidth={1.7} />{:else}<Play
            size={14}
            strokeWidth={1.7}
          />{/if}
        {loading
          ? 'Loading…'
          : isReferenceBrowser
            ? 'Retry library'
            : source
              ? 'Reset example'
              : 'Run example'}
      </button>
    {/if}
  </div>
  {#if !source || !autoResize}<p>{widget.fallback}</p>{/if}
  {#if error}<p role="status">{error}</p>{/if}
  {#if source}
    {#key generation}
      <!-- This fixed, trusted host needs its origin for service-worker offline access.
           It places authored HTML in its own allow-scripts-only sandbox. -->
      <iframe
        bind:this={frame}
        src={`${base}/widget-host/frame.htm`}
        title={widget.title}
        height={frameHeight ?? widget.height}
        allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; clipboard-read 'none'; clipboard-write 'none'"
        referrerpolicy="no-referrer"
      ></iframe>
    {/key}
  {/if}
</section>

<style>
  .article-widget {
    margin: 1.5rem 0;
    padding: 1rem;
    border: 1px solid var(--ink, #181814);
    border-radius: 6px;
  }
  .widget-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .reference-browser {
    padding: 0;
    border: 0;
    border-radius: 0;
  }
  .reference-browser .widget-heading {
    margin-bottom: 1rem;
  }
  p {
    font-size: 0.9rem;
    line-height: 1.6;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 36px;
    padding: 0.4rem 0.7rem;
    border: 1px solid color-mix(in srgb, var(--ink, #181814) 20%, transparent);
    border-radius: 6px;
    color: var(--ink, #181814);
    background: transparent;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.3;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    border-color: var(--green-dark, #007a4d);
    background: color-mix(in srgb, var(--green-dark, #007a4d) 7%, transparent);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark, #007a4d);
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  iframe {
    display: block;
    width: 100%;
    border: 0;
    background: #fff;
    color-scheme: light;
  }
</style>
