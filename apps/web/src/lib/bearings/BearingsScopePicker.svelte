<script lang="ts" module>
  export type ScopeChoice = {
    key: string;
    title: string;
    sourceId: string;
    count: number;
    area?: string;
  };
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Orbit, Layers, ChevronDown, Search, X } from '@lucide/svelte';
  let {
    kind,
    choices,
    selected,
    total,
    onchange,
  }: {
    kind: 'verses' | 'collections';
    choices: readonly ScopeChoice[];
    selected: readonly string[];
    total: number;
    onchange: (keys: string[]) => void;
  } = $props();
  const uid = $props.id();
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let search = $state<HTMLInputElement>();
  let query = $state('');
  let open = $state(false);
  let left = $state(8),
    top = $state(8),
    height = $state(440);
  const chosen = $derived(choices.filter((choice) => selected.includes(choice.key)));
  const matching = $derived(
    choices.filter((choice) =>
      `${choice.title} ${choice.area ?? ''} ${choice.sourceId === 'personal' ? 'mine personal' : ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ),
  );
  const groups = $derived(
    [...new Set(matching.map((choice) => choice.area ?? ''))].map((area) => ({
      area,
      choices: matching.filter((choice) => (choice.area ?? '') === area),
    })),
  );
  function position() {
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const width = Math.min(330, innerWidth - 24);
    left = Math.max(12, Math.min(box.left, innerWidth - width - 12));
    const below = innerHeight - box.bottom - 20,
      above = box.top - 20;
    height = Math.min(460, Math.max(below, above));
    top =
      below >= Math.min(460, above)
        ? box.bottom + 8
        : Math.max(
            12,
            box.top - Math.min(height, panel?.getBoundingClientRect().height || height) - 8,
          );
  }
  function toggle(key: string) {
    onchange(
      selected.includes(key) ? selected.filter((value) => value !== key) : [...selected, key],
    );
  }
  function close() {
    panel?.hidePopover();
    trigger?.focus({ preventScroll: true });
  }
  $effect(() => {
    void matching.length;
    if (open) void tick().then(position);
  });
  onMount(() => {
    const followTrigger = () => {
      if (open) position();
    };
    document.addEventListener('scroll', followTrigger, true);
    return () => document.removeEventListener('scroll', followTrigger, true);
  });
</script>

<svelte:window onresize={position} />

<section
  class="scope-picker"
  aria-label={kind === 'verses' ? 'Verse filters' : 'Collection filters'}
>
  <div class="section-label">
    <span>{kind}</span>
    <button
      class="clear"
      disabled={!selected.length}
      aria-label={`Clear ${kind}`}
      onclick={() => onchange([])}>Clear</button
    >
  </div>
  <button
    class="scope-trigger"
    bind:this={trigger}
    popovertarget={`${uid}-panel`}
    aria-label={`Choose ${kind}`}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls={`${uid}-panel`}
  >
    <span class="scope-icon" aria-hidden="true"
      >{#if kind === 'verses'}<Orbit size={16} />{:else}<Layers size={16} />{/if}</span
    >
    <span class="scope-summary"
      ><strong
        >{selected.length
          ? `${selected.length} ${selected.length === 1 ? kind.slice(0, -1) : kind}`
          : `All ${kind}`}</strong
      >
      <small
        >{selected.length
          ? `Choose across ${kind === 'verses' ? 'areas' : 'verses'}`
          : 'Explore the whole library'}</small
      ></span
    >
    {#if selected.length}<span class="quantity" aria-hidden="true">{selected.length}</span>{/if}
    <ChevronDown size={15} aria-hidden="true" />
  </button>
  {#if chosen.length}<div class="chips" aria-label={`Selected ${kind}`}>
      {#each chosen as choice (choice.key)}<span class="chip" data-selected-scope={choice.key}>
          <span title={choice.title}
            >{choice.title}{choice.sourceId === 'personal' ? ' · Mine' : ''}</span
          >
          <button
            aria-label={`Remove ${choice.title}${choice.sourceId === 'personal' ? ' · Mine' : ''}`}
            onclick={() => toggle(choice.key)}><X size={12} aria-hidden="true" /></button
          >
        </span>{/each}
    </div>{/if}
</section>
<div
  class="scope-panel"
  id={`${uid}-panel`}
  popover="auto"
  role="dialog"
  tabindex="-1"
  aria-label={`Choose ${kind}`}
  bind:this={panel}
  style:left={`${left}px`}
  style:top={`${top}px`}
  style:max-height={`${height}px`}
  onbeforetoggle={(event) => {
    if (event.newState === 'open') {
      query = '';
      position();
    }
  }}
  ontoggle={(event) => {
    open = event.newState === 'open';
    if (open)
      void tick().then(() => {
        position();
        search?.focus({ preventScroll: true });
      });
  }}
  onkeydown={(event) => event.stopPropagation()}
>
  <header>
    <h3>Choose {kind}</h3>
    <span aria-live="polite"
      >{selected.length ? `${selected.length} selected` : 'All selected'}</span
    >
  </header>
  <label class="picker-search"
    ><Search size={15} aria-hidden="true" /><input
      type="search"
      bind:this={search}
      bind:value={query}
      aria-label={`Search ${kind}`}
      placeholder={`Search ${kind}…`}
      onkeydown={(event) => {
        if (event.isComposing) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          panel?.querySelector<HTMLInputElement>('.choices input')?.focus();
        } else if (event.key === 'Enter' && query.trim() && matching[0]) {
          event.preventDefault();
          toggle(matching[0].key);
        }
      }}
    /></label
  >
  <div class="choices" role="group" aria-label={`Available ${kind}`}>
    <label class="choice"
      ><input type="checkbox" checked={!selected.length} onchange={() => onchange([])} /><span
        >All {kind}</span
      ><small>{total}</small></label
    >
    {#each groups as group (group.area)}
      {#if group.area}<h4>{group.area}</h4>{/if}
      {#each group.choices as choice (choice.key)}<label class="choice">
          <input
            type="checkbox"
            checked={selected.includes(choice.key)}
            onchange={() => toggle(choice.key)}
            data-scope-choice={choice.key}
          />
          <span>{choice.title}{choice.sourceId === 'personal' ? ' · Mine' : ''}</span><small
            >{choice.count}</small
          >
        </label>{/each}
    {/each}
    {#if !matching.length}<p class="empty">No matching {kind}.</p>{/if}
  </div>
  <div class="picker-footer">
    <span>Select as many as you like</span><button class="done" onclick={close}>Done</button>
  </div>
</div>

<style>
  .scope-picker {
    min-width: 0;
  }
  .section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 7px;
    color: var(--bearings-muted);
    font-size: 0.7rem;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .clear {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    font-size: 0.7rem;
  }
  .clear:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .scope-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--bearings-line);
    border-radius: 8px;
    text-align: left;
    color: var(--bearings-ink);
    background: var(--bearings-paper);
  }
  .scope-trigger:hover {
    background: var(--bearings-surface);
  }
  .scope-trigger[aria-expanded='true'] {
    border-color: var(--bearings-accent);
  }
  .scope-icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex: none;
    border-radius: 5px;
    color: var(--bearings-accent);
    background: var(--bearings-accent-soft);
  }
  .scope-summary {
    flex: 1;
    min-width: 0;
  }
  .scope-summary strong {
    font-size: 0.78rem;
    font-weight: 600;
  }
  .scope-summary small {
    display: block;
    font-size: 0.67rem;
    color: var(--bearings-muted);
    margin-top: 2px;
  }
  .quantity {
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    border-radius: 4px;
    color: var(--bearings-accent);
    background: var(--bearings-accent-soft);
    font-size: 0.7rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 7px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    padding: 4px 6px;
    border-radius: 5px;
    background: var(--bearings-surface);
    color: var(--bearings-ink);
    font-size: 0.68rem;
  }
  .chip > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip button {
    display: grid;
    place-items: center;
    flex: none;
    padding: 0;
    border: 0;
    color: var(--bearings-muted);
    background: transparent;
  }
  .scope-panel {
    position: fixed;
    margin: 0;
    inset: auto;
    width: min(330px, calc(100vw - 24px));
    box-sizing: border-box;
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 10px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    box-shadow: 0 12px 36px #1635221c;
    overflow: hidden;
  }
  .scope-panel:popover-open {
    display: flex;
    flex-direction: column;
  }
  header,
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px;
    flex: none;
  }
  header {
    border-bottom: 1px solid var(--bearings-line);
  }
  h3 {
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    margin: 0;
  }
  header > span,
  .picker-footer {
    font-size: 0.68rem;
    color: var(--bearings-muted);
  }
  .picker-search {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 10px 10px 4px;
    padding: 0 8px;
    min-height: 36px;
    border-radius: 5px;
    background: var(--bearings-surface);
    color: var(--bearings-muted);
    flex: none;
  }
  .picker-search input {
    width: 100%;
    min-width: 0;
    min-height: 36px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bearings-ink);
    font: inherit;
    font-size: 0.75rem;
  }
  .choices {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 5px 7px 9px;
    scrollbar-width: thin;
  }
  .choice {
    display: flex;
    align-items: center;
    gap: 9px;
    border-radius: 5px;
    padding: 9px 7px;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .choice:hover {
    background: var(--bearings-surface);
  }
  .choice:has(input:checked) {
    background: var(--bearings-accent-soft);
  }
  .choice input {
    margin: 0;
    width: 14px;
    height: 14px;
    accent-color: var(--bearings-accent);
    flex: none;
  }
  .choice > span {
    flex: 1;
    overflow-wrap: anywhere;
  }
  .choice small {
    color: var(--bearings-muted);
    font-size: 0.68rem;
  }
  h4 {
    margin: 0;
    padding: 10px 7px 3px;
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--bearings-muted);
  }
  .empty {
    font-size: 0.75rem;
    color: var(--bearings-muted);
    padding: 8px;
  }
  .picker-footer {
    border-top: 1px solid var(--bearings-line);
    padding: 9px 12px;
  }
  .done {
    padding: 5px 13px;
    border: 0;
    border-radius: 5px;
    color: var(--bearings-paper);
    background: var(--bearings-accent);
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--bearings-accent);
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    .choice {
      min-height: 44px;
      box-sizing: border-box;
    }
    .picker-search input {
      font-size: 16px;
    }
    .chip button {
      min-width: 32px;
      min-height: 32px;
      margin: -4px;
    }
    .clear,
    .done {
      min-height: 44px;
    }
  }
</style>
