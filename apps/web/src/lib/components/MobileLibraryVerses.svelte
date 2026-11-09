<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Grid2X2, X } from '@lucide/svelte';
  import { verseAccentClass } from '$lib/verse-accent';
  import type { LibraryVerse } from '$lib/client/workspace-library-view';
  import VerseSelector from './VerseSelector.svelte';

  type Verse = LibraryVerse & { key: string };
  let {
    verses,
    selected,
    onselect,
  }: {
    verses: readonly Verse[];
    selected: string;
    onselect: (key: string, fromPicker?: boolean) => void;
  } = $props();
  const uid = $props.id();
  let mosaic: HTMLElement;
  let dialog: HTMLDialogElement;
  let picker = $state<VerseSelector>();
  let pickerChoice: string | undefined;
  let trigger = $state<HTMLButtonElement>();
  let stuck = $state(false);
  let sheetOpen = $state(false);
  const current = $derived(verses.find((verse) => verse.key === selected));
  const title = (verse: Verse) => verse.title + (verse.sourceId === 'personal' ? ' · Mine' : '');

  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        stuck = !entry.isIntersecting && entry.boundingClientRect.bottom <= 64;
      },
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(mosaic);
    return () => observer.disconnect();
  });
  $effect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });
  async function openPicker() {
    pickerChoice = undefined;
    sheetOpen = true;
    await tick();
    dialog.showModal();
    await picker?.open();
  }
  function closePicker() {
    dialog.close();
    sheetOpen = false;
    trigger?.focus({ preventScroll: true });
  }
  function finishPicker() {
    const choice = pickerChoice;
    closePicker();
    if (choice !== undefined) onselect(choice, true);
  }
</script>

<section class="mobile-verse-mosaic" bind:this={mosaic} aria-label="Choose a Verse">
  <VerseSelector {verses} {selected} onselect={(key) => onselect(key, false)} />
</section>

{#if stuck}
  <button
    bind:this={trigger}
    type="button"
    class="sticky-verse {current ? verseAccentClass(current.id) : 'all-verses'}"
    aria-label="Change Verse"
    aria-haspopup="dialog"
    aria-expanded={sheetOpen}
    aria-controls={`${uid}-picker`}
    onclick={openPicker}
  >
    <span class="verse-swatch" aria-hidden="true"></span><span class="verse-current"
      ><small>Verse</small><strong>{current ? title(current) : 'All verses'}</strong></span
    >
    <span class="verse-change">Change Verse <Grid2X2 size={16} aria-hidden="true" /></span>
  </button>
{/if}

<dialog
  bind:this={dialog}
  id={`${uid}-picker`}
  class="verse-picker"
  aria-labelledby={`${uid}-picker-heading`}
  onclose={() => {
    sheetOpen = false;
  }}
  onclick={(event) => {
    if (event.target === dialog) closePicker();
  }}
>
  <div class="picker-content">
    <div class="picker-heading">
      <h2 id={`${uid}-picker-heading`}>Choose a Verse</h2>
      <button
        type="button"
        class="close-picker"
        aria-label="Close Verse picker"
        onclick={closePicker}><X size={20} aria-hidden="true" /></button
      >
    </div>
    {#if sheetOpen}
      <VerseSelector
        bind:this={picker}
        {verses}
        {selected}
        startOpen
        onselect={(key) => {
          pickerChoice = key;
        }}
        oncollapse={finishPicker}
      />
    {/if}
  </div>
</dialog>

<style>
  .mobile-verse-mosaic {
    margin: 1rem 0 1.5rem;
    min-width: 0;
  }
  .all-verses {
    --verse-rest: #f3f4ef;
  }
  .sticky-verse {
    position: fixed;
    z-index: 10;
    inset: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    min-height: 64px;
    padding: calc(10px + env(safe-area-inset-top)) 20px 10px;
    border: 0;
    border-bottom: 1px solid #deded8;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    text-align: left;
    box-shadow: 0 3px 8px #1818140a;
    cursor: pointer;
  }
  .verse-swatch {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    background: var(--verse-rest);
  }
  .all-verses .verse-swatch {
    background: var(--ink);
  }
  .verse-current {
    flex: 1;
    min-width: 0;
  }
  .verse-current small {
    display: block;
    font-size: 0.68rem;
    color: var(--muted);
  }
  .verse-current strong {
    display: block;
    font-size: 1rem;
    line-height: 1.2;
    font-weight: 650;
  }
  .verse-change {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .verse-picker {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    max-width: 600px;
    max-height: calc(90dvh - env(safe-area-inset-top));
    margin: 0 auto;
    padding: 0;
    border: 1px solid #deded8;
    border-bottom: 0;
    border-radius: 12px 12px 0 0;
    background: var(--paper);
    color: var(--ink);
    overscroll-behavior: contain;
    overflow-y: auto;
  }
  .verse-picker::backdrop {
    background: #18181466;
  }
  .picker-content {
    padding: 12px 20px calc(24px + env(safe-area-inset-bottom));
  }
  .picker-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 16px;
  }
  .picker-heading h2 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 650;
    letter-spacing: -0.03em;
  }
  .close-picker {
    display: grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    margin-right: -10px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  button:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: -3px;
  }
  @media (max-width: 360px) {
    .sticky-verse {
      padding-inline: 16px;
    }
    .verse-change {
      font-size: 0.68rem;
    }
    .picker-content {
      padding-inline: 14px;
    }
  }
</style>
