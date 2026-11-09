<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { AtSign, ArrowDownLeft, X } from '@lucide/svelte';
  import type { BearingsPattern } from './catalog';
  import { patternSuggestions } from './library';
  import { textareaCaretRect } from './textarea-caret';
  import { richCaretRect, richEditor } from './rich-text';
  let {
    patterns,
    scope,
    onselect,
  }: {
    patterns: readonly BearingsPattern[];
    scope: string;
    onselect: (pattern: BearingsPattern, trigger: HTMLElement | null) => void;
  } = $props();
  const uid = $props.id();
  let panel: HTMLDivElement;
  let search = $state<HTMLInputElement>(),
    results = $state<HTMLDivElement>();
  let query = $state(''),
    highlighted = $state(0),
    opened = $state(false);
  let trigger: HTMLElement | null = null;
  let restoreFocus = true;
  let anchorIsCaret = $state(false);
  let origin: Comment;
  let left = $state(0),
    top = $state(0),
    maxHeight = $state(350);
  let frame = 0;
  function position() {
    if (!opened || !trigger?.isConnected) return;
    const anchor =
      trigger instanceof HTMLTextAreaElement
        ? textareaCaretRect(trigger)
        : (richCaretRect(trigger) ?? trigger.getBoundingClientRect());
    const viewport = window.visualViewport;
    const x = viewport?.offsetLeft ?? 0,
      y = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth,
      height = viewport?.height ?? innerHeight;
    const above = Math.max(0, anchor.top - y - 14);
    const below = Math.max(0, y + height - anchor.bottom - 14);
    const flip = below < Math.min(panel.scrollHeight, 260) && above > below;
    maxHeight = Math.max(80, Math.min(350, flip ? above : below));
    const actualHeight = Math.min(panel.scrollHeight + 2, maxHeight);
    left = Math.max(x + 10, Math.min(anchor.left, x + width - panel.offsetWidth - 10));
    top = Math.max(
      y + 10,
      Math.min(
        flip ? anchor.top - actualHeight - 4 : anchor.bottom + 4,
        y + height - actualHeight - 10,
      ),
    );
  }
  function schedule() {
    if (opened && !frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        position();
      });
  }
  function mountPanel(node: HTMLDivElement) {
    origin = document.createComment('pattern picker');
    node.before(origin);
    return {
      destroy() {
        origin.remove();
        node.remove();
      },
    };
  }
  function close(restore = true) {
    restoreFocus = restore;
    if (panel.matches(':popover-open')) panel.hidePopover();
  }
  function closed() {
    opened = false;
    if (origin.parentNode) origin.after(panel);
    if (restoreFocus && trigger?.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  }
  onMount(() => {
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  });
  const matches = $derived(patternSuggestions(patterns, query));
  const visible = $derived(matches.slice(0, 30));
  export async function open(element: HTMLElement | null, initialQuery = '') {
    if (opened) return;
    trigger = element;
    anchorIsCaret = element instanceof HTMLTextAreaElement || !!richEditor(element);
    restoreFocus = false;
    query = initialQuery;
    highlighted = 0;
    opened = true;
    // A popover launched from fullscreen belongs to that editor's focus scope.
    const fullscreen = element?.closest('dialog[open]');
    if (fullscreen) fullscreen.append(panel);
    else if (origin.parentNode) origin.after(panel);
    await tick();
    panel.showPopover();
    position();
    await tick();
    search?.focus();
    search?.select();
  }
  function choose(pattern: BearingsPattern) {
    close(false);
    onselect(pattern, trigger);
  }
  async function navigate(direction: number) {
    if (!visible.length) return;
    highlighted = (highlighted + direction + visible.length) % visible.length;
    await tick();
    results
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }
</script>

<div
  class="pattern-picker"
  bind:this={panel}
  use:mountPanel
  popover="auto"
  role="dialog"
  tabindex="-1"
  aria-modal="false"
  aria-label="Find a pattern"
  style:left={`${left}px`}
  style:top={`${top}px`}
  style:max-height={`${maxHeight}px`}
  data-anchor={anchorIsCaret ? 'caret' : 'control'}
  ontoggle={() => {
    if (!panel.matches(':popover-open')) closed();
  }}
  onfocusout={(event) => {
    if (opened && event.relatedTarget instanceof Node && !panel.contains(event.relatedTarget))
      close(false);
  }}
  onkeydown={(event) => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }}
>
  {#if opened}
    <div class="search">
      <AtSign size={16} /><input
        bind:this={search}
        bind:value={query}
        type="text"
        role="combobox"
        aria-label="Find a pattern"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={`${uid}-results`}
        aria-activedescendant={visible[highlighted] ? `${uid}-pattern-${highlighted}` : undefined}
        placeholder="Search patterns…"
        autocomplete="off"
        spellcheck="false"
        maxlength="200"
        oninput={() => {
          highlighted = 0;
          if (results) results.scrollTop = 0;
        }}
        onkeydown={(event) => {
          if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            void navigate(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat && visible[highlighted]) choose(visible[highlighted]);
          }
        }}
      />
      <button class="close" aria-label="Close pattern picker" onclick={() => close()}
        ><X size={15} /></button
      >
    </div>
    <p class="scope">{scope}</p>
    <div
      class="results"
      bind:this={results}
      id={`${uid}-results`}
      role="listbox"
      aria-label="Pattern suggestions"
    >
      {#each visible as pattern, index (`${pattern.sourceId}:${pattern.id}`)}
        <button
          type="button"
          role="option"
          aria-selected={highlighted === index}
          id={`${uid}-pattern-${index}`}
          tabindex="-1"
          onpointerdown={(event) => {
            if (event.pointerType === 'mouse') event.preventDefault();
          }}
          onclick={() => choose(pattern)}
        >
          <div class="title">
            <strong>{pattern.title}</strong>{#if highlighted === index}<ArrowDownLeft
                size={15}
                aria-hidden="true"
              />{/if}
          </div>
          <small
            >{pattern.sourceId === 'personal' ? 'Your pattern · ' : ''}{pattern.collections
              .map((item) => item.title)
              .slice(0, 2)
              .join(' · ')}</small
          >
          <span class="summary">{pattern.summary}</span>
        </button>
      {/each}
    </div>
    {#if !matches.length}<p class="empty" role="status">
        No matching patterns in these filters. Try another search or change the sidebar filters.
      </p>{/if}
    <div class="picker-help">
      <span>↑ ↓ browse · Enter select · Esc close</span>{#if matches.length > 30}<span
          >30 of {matches.length} · type to narrow</span
        >{/if}
    </div>
  {/if}
</div>

<style>
  .pattern-picker {
    box-sizing: border-box;
    position: fixed;
    inset: unset;
    margin: 0;
    width: 360px;
    max-width: calc(100vw - 20px);
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 9px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    box-shadow: 0 8px 28px #17221725;
    overflow: hidden;
  }
  .pattern-picker:popover-open {
    display: flex;
    flex-direction: column;
  }
  .close {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex: none;
    color: var(--bearings-muted);
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  }
  .close:hover {
    background: var(--bearings-surface);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: none;
    margin: 0;
    padding: 0.45rem 0.6rem;
    color: var(--bearings-accent);
  }
  input {
    min-width: 0;
    width: 100%;
    font: inherit;
    font-size: 0.85rem;
    color: var(--bearings-ink);
    border: 0;
    outline: none;
    background: transparent;
  }
  input:focus-visible {
    outline: none;
  }
  .scope {
    flex: none;
    margin: 0 0.65rem 0.4rem;
    font-size: 0.65rem;
    color: var(--bearings-muted);
  }
  .results {
    min-height: 0;
    max-height: 260px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 0.3rem;
  }
  .results button {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.2rem;
    text-align: left;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  .results button[aria-selected='true'],
  .results button:hover {
    background: var(--bearings-accent-soft);
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    font-size: 0.8rem;
  }
  strong {
    font-weight: 600;
  }
  small {
    font-size: 0.62rem;
    color: var(--bearings-muted);
  }
  .summary {
    font-size: 0.7rem;
    line-height: 1.5;
    color: var(--bearings-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .picker-help {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: 0;
    flex: none;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: space-between;
    border-top: 1px solid var(--bearings-line);
    border-bottom: 0;
    padding: 0.45rem 0.65rem;
    margin-top: 0.25rem;
    font-size: 0.6rem;
    color: var(--bearings-muted);
  }
  .empty {
    padding: 1.5rem;
    margin: 0;
    color: var(--bearings-muted);
    font-size: 0.85rem;
    line-height: 1.6;
  }
  @media (max-width: 600px) {
    input {
      font-size: 16px;
    }
    .picker-help {
      font-size: 0.62rem;
    }
  }
</style>
