<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { PatternImage } from '$lib/pattern-run/image';
  import PracticeMarkdownPreview from './PracticeMarkdownPreview.svelte';
  let { image, markdown = '' }: { image: PatternImage; markdown?: string } = $props();
  let failed = $state(false);
  let expanded = $state(false);
  let dialog = $state<HTMLDialogElement>();
  const id = $props.id();
  $effect(() => {
    if (image.url) {
      failed = false;
      expanded = false;
    }
  });
  $effect(() => {
    if (!dialog) return;
    if (expanded && !dialog.open) dialog.showModal();
    else if (!expanded && dialog.open) dialog.close();
  });
  onDestroy(() => dialog?.close());
</script>

<figure class="pattern-image">
  {#if image.title}<h3>{image.title}</h3>{/if}
  {#if failed}
    <p role="status">This image could not be loaded.</p>
    {#if image.alt}<p>{image.alt}</p>{/if}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- External image source validated by the compiler. -->
    <a href={image.url} target="_blank" rel="noopener noreferrer">Open image source</a>
  {:else if image.alt}
    <button
      type="button"
      class="enlarge"
      aria-label={`Enlarge image: ${image.title ?? image.alt}`}
      aria-haspopup="dialog"
      aria-controls={`${id}-enlarged`}
      onclick={() => {
        expanded = true;
      }}
    >
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        onerror={() => {
          failed = true;
        }}
      />
    </button>
  {:else}
    <img
      src={image.url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      onerror={() => {
        failed = true;
      }}
    />
  {/if}
  {#if markdown}<figcaption><PracticeMarkdownPreview {markdown} /></figcaption>{/if}
</figure>

<dialog
  bind:this={dialog}
  id={`${id}-enlarged`}
  aria-label={image.title ?? 'Enlarged image'}
  onclose={() => {
    expanded = false;
  }}
>
  {#if expanded}
    <div class="enlarged-image">
      <button
        type="button"
        class="close"
        onclick={() => {
          expanded = false;
        }}>Close enlarged image</button
      >
      <img
        src={image.url}
        alt={image.alt}
        referrerpolicy="no-referrer"
        onerror={() => {
          failed = true;
          expanded = false;
        }}
      />
    </div>
  {/if}
</dialog>

<style>
  .pattern-image {
    margin: 1rem 0;
  }
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    margin-inline: auto;
  }
  .enlarge {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
  }
  .enlarge:focus-visible {
    outline: 2px solid var(--ink, #213c31);
    outline-offset: 4px;
  }
  figcaption {
    margin-top: 0.6rem;
  }
  dialog {
    max-width: calc(100vw - 2rem);
    max-height: calc(100dvh - 2rem);
    padding: 1rem;
    border: 1px solid var(--line, #dbe1d7);
    border-radius: 8px;
    background: var(--paper, #fff);
    color: var(--ink, #213c31);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 65%);
  }
  .enlarged-image img {
    max-height: 80dvh;
    object-fit: contain;
  }
  .close {
    display: block;
    margin: 0 0 0.75rem auto;
    padding: 0.6rem 0.8rem;
    min-height: 44px;
    font: inherit;
    border: 1px solid var(--line, #dbe1d7);
    border-radius: 4px;
    background: var(--paper, #fff);
    color: var(--ink, #213c31);
    cursor: pointer;
  }
</style>
