<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { ArrowLeft, ArrowRight } from '@lucide/svelte';

  let {
    id,
    eyebrow,
    heading,
    trackClass = '',
    children,
  }: {
    id: string;
    eyebrow: string;
    heading: string;
    trackClass?: string;
    children: Snippet;
  } = $props();
  let track: HTMLDivElement;
  let overflow = $state(false);
  let atStart = $state(true);
  let atEnd = $state(false);
  const trackId = $props.id();

  function measure() {
    overflow = track.scrollWidth > track.clientWidth + 2;
    atStart = track.scrollLeft < 2;
    atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }
  function move(direction: number) {
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  onMount(() => {
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    measure();
    return () => observer.disconnect();
  });
</script>

<section class="home-shelf" {id} aria-labelledby={`${id}-heading`}>
  <div class="shelf-heading">
    <div>
      <p>{eyebrow}</p>
      <h2 id={`${id}-heading`}>{heading}</h2>
    </div>
    {#if overflow}
      <div class="shelf-controls" role="group" aria-label={`${heading} navigation`}>
        <button
          type="button"
          aria-label={`Previous ${heading}`}
          aria-controls={trackId}
          disabled={atStart}
          onclick={() => move(-1)}><ArrowLeft size={20} aria-hidden="true" /></button
        >
        <button
          type="button"
          aria-label={`Next ${heading}`}
          aria-controls={trackId}
          disabled={atEnd}
          onclick={() => move(1)}><ArrowRight size={20} aria-hidden="true" /></button
        >
      </div>
    {/if}
  </div>
  <div class="shelf-track {trackClass}" id={trackId} bind:this={track} onscroll={measure}>
    {@render children()}
  </div>
</section>

<style>
  .home-shelf {
    padding: clamp(2.5rem, 5vw, 5rem) max(3vw, calc((100vw - 1440px) / 2));
    border-bottom: 1px solid var(--ink);
    scroll-margin-top: 1.5rem;
    min-width: 0;
  }
  .shelf-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }
  .shelf-heading p {
    margin: 0 0 0.65rem;
    color: var(--green-dark);
    font-size: 0.78rem;
    font-weight: 750;
    text-transform: lowercase;
  }
  .shelf-heading h2 {
    margin: 0;
    font-size: clamp(2rem, 3.4vw, 3.25rem);
    line-height: 1.08;
    letter-spacing: -0.055em;
    font-weight: 850;
    text-transform: lowercase;
  }
  .shelf-controls {
    display: flex;
    gap: 0.5rem;
  }
  button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--ink);
    border-radius: 50%;
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    color: var(--paper);
    background: var(--ink);
  }
  button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .shelf-track {
    display: grid;
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: var(--shelf-card-width, min(74vw, 280px));
    gap: 1rem;
    margin: 0;
    padding: 4px 4px 1rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 4px;
    scrollbar-width: thin;
    scrollbar-color: var(--ink) transparent;
    background: transparent;
  }
  .shelf-track > :global(*) {
    scroll-snap-align: start;
    min-width: 0;
  }
  @media (max-width: 760px) {
    .home-shelf {
      padding: 2.5rem 24px;
    }
  }
</style>
