<script lang="ts">
  import { BookmarkCheck, BookmarkPlus } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { setLibrarySaved } from '$lib/client/library-saves';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';

  let {
    sourceId,
    entityId,
    compact = false,
  }: { sourceId: string; entityId: string; compact?: boolean } = $props();
  const uid = $props.id();
  let isSaved = $state(false);
  let ready = $state(false);
  let saving = $state(false);
  let menuOpen = $state(false);
  let message = $state('');
  let error = $state('');
  let control: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let removeButton = $state<HTMLButtonElement>();
  const label = $derived(isSaved ? 'In my library' : 'Add to my library');

  // Article routes reuse this component: discard old UI state and stale storage reads.
  $effect(() => {
    const ref = { sourceId, entityId };
    isSaved = false;
    ready = false;
    saving = false;
    menuOpen = false;
    message = '';
    error = '';
    const reader = createWorkspaceRefresh({
      read: async () => (await getLocalWorkspace()).getSavedEntry(ref),
      apply: (stored) => {
        isSaved = Boolean(stored);
        if (!isSaved) menuOpen = false;
        error = '';
        ready = true;
      },
      failed: () => {
        error = 'Your saved library is unavailable in this browser.';
      },
    });
    const reload = () => {
      void reader.refresh();
    };
    reload();
    const unsubscribe = subscribeWorkspaceChanges(['saved'], reload);
    window.addEventListener('focus', reload);
    return () => {
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', reload);
    };
  });

  async function setSaved(next: boolean) {
    if (!ready || saving) return;
    const ref = { sourceId, entityId };
    saving = true;
    try {
      await setLibrarySaved(ref, next);
      if (sourceId === ref.sourceId && entityId === ref.entityId) {
        isSaved = next;
        menuOpen = false;
        message = next ? 'Added to my library · saved on this device' : 'Removed from my library';
        error = '';
        saving = false;
        await tick();
        if (sourceId === ref.sourceId && entityId === ref.entityId)
          trigger.focus({ preventScroll: true });
      }
    } catch {
      if (sourceId === ref.sourceId && entityId === ref.entityId)
        error = 'Could not update your library. Please try again.';
    } finally {
      if (sourceId === ref.sourceId && entityId === ref.entityId) saving = false;
    }
  }

  async function activate() {
    if (!isSaved) return setSaved(true);
    menuOpen = !menuOpen;
    if (menuOpen) {
      await tick();
      removeButton?.focus();
    }
  }

  function closeMenu(event: KeyboardEvent) {
    if (event.key === 'Escape' && menuOpen) {
      menuOpen = false;
      trigger.focus({ preventScroll: true });
    }
  }
</script>

<svelte:window
  onkeydown={closeMenu}
  onpointerdown={(event) => {
    if (event.target instanceof Node && !control.contains(event.target)) menuOpen = false;
  }}
/>

<div
  class="save-control"
  class:compact
  bind:this={control}
  onfocusout={(event) => {
    if (event.relatedTarget instanceof Node && !control.contains(event.relatedTarget))
      menuOpen = false;
  }}
>
  <button
    bind:this={trigger}
    class="bookmark-button"
    class:saved={isSaved}
    type="button"
    aria-label={label}
    aria-describedby={uid + '-privacy'}
    aria-pressed={isSaved}
    aria-expanded={isSaved ? menuOpen : undefined}
    aria-controls={menuOpen ? uid + '-options' : undefined}
    aria-busy={saving}
    disabled={!ready || saving}
    onclick={activate}
  >
    {#if isSaved}<BookmarkCheck size={20} aria-hidden="true" />{:else}<BookmarkPlus
        size={20}
        aria-hidden="true"
      />{/if}
  </button>
  {#if !menuOpen}<span class="save-tooltip" aria-hidden="true">{label}</span>{/if}
  <span id={uid + '-privacy'} class="sr-only">Private · saved on this device</span>
  {#if menuOpen}
    <div class="save-options" id={uid + '-options'}>
      <p>Private · saved on this device</p>
      <button
        bind:this={removeButton}
        type="button"
        disabled={saving}
        onclick={() => setSaved(false)}>Remove from my library</button
      >
      {#if error}<small class="menu-error" role="alert">{error}</small>{/if}
    </div>
  {/if}
  {#if error && !menuOpen}<small class="save-error" role="alert">{error}</small>{/if}
  <span class="sr-only" role="status" aria-live="polite">{message}</span>
</div>

<style>
  .save-control {
    position: relative;
    flex: 0 0 44px;
    align-self: center;
    width: 44px;
    height: 44px;
    z-index: 2;
  }
  .bookmark-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #bfc2ba;
    border-radius: 5px;
    color: var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .bookmark-button:hover:not(:disabled),
  .bookmark-button:focus-visible {
    color: var(--paper);
    background: var(--ink);
    border-color: var(--ink);
  }
  .compact .bookmark-button {
    border: 0;
    background: transparent;
    color: var(--muted);
  }
  .compact .bookmark-button.saved,
  .compact .bookmark-button:hover:not(:disabled),
  .compact .bookmark-button:focus-visible {
    background: transparent;
    color: var(--green-dark);
  }
  .bookmark-button.saved {
    color: var(--green-dark);
    background: var(--mint, #dff5eb);
    border-color: transparent;
  }
  .bookmark-button.saved:hover:not(:disabled),
  .bookmark-button.saved:focus-visible {
    color: var(--green-dark);
    background: var(--mint, #dff5eb);
    border-color: var(--green-dark);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .save-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    padding: 0.5rem 0.65rem;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    white-space: nowrap;
    font-size: 0.75rem;
    line-height: 1.4;
    visibility: hidden;
    pointer-events: none;
  }
  .bookmark-button:focus-visible + .save-tooltip {
    visibility: visible;
  }
  @media (hover: hover) {
    .bookmark-button:hover:not(:disabled) + .save-tooltip {
      visibility: visible;
    }
  }
  .save-options,
  .save-error {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 245px;
    max-width: calc(100vw - 2rem);
    padding: 0.75rem;
    border: 1px solid #deded8;
    border-radius: 5px;
    color: var(--ink);
    background: var(--paper);
    box-shadow: 0 4px 16px #0000000d;
  }
  .save-options p {
    margin: 0 0 0.4rem;
    font-size: 0.72rem;
    color: var(--muted, #55564e);
  }
  .save-options button {
    width: 100%;
    min-height: 44px;
    padding: 0.5rem;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }
  .save-options button:hover {
    background: #f0f1ee;
  }
  .save-error {
    top: calc(100% + 58px);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .menu-error {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    line-height: 1.5;
  }
</style>
