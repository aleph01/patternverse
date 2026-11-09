<script lang="ts">
  import { Plus, GripVertical, Search, X, RotateCcw } from '@lucide/svelte';
  import BearingsScopePicker from './BearingsScopePicker.svelte';
  import BearingsPromptLibrary from './BearingsPromptLibrary.svelte';
  import { useBearingsAi } from './ai.svelte';
  import type { SavedPrompt } from './ai';
  import { groupVersesByArea } from '$lib/verse-areas';
  import type { BearingsCell } from '@patternverse/workspace';
  import type { BearingsPattern } from './catalog';
  import { ratingCell } from './notebook';
  import { libraryDragType } from './library-drop';
  import { libraryGroups, filterLibrary, libraryPatternCell as patternCell } from './library';
  let {
    patterns,
    onadd,
    onread,
    onclose,
    onuseprompt = () => {},
  }: {
    patterns: readonly BearingsPattern[];
    onadd: (cell: BearingsCell) => void;
    onread: (pattern: NonNullable<BearingsCell['pattern']>, trigger: HTMLButtonElement) => void;
    onclose: () => void;
    onuseprompt?: (prompt: SavedPrompt) => void;
  } = $props();
  const ai = useBearingsAi();
  let query = $state(''),
    custom = $state(false),
    name = $state(''),
    min = $state(0),
    max = $state(10),
    low = $state(''),
    high = $state(''),
    error = $state('');
  let count = $state(30),
    withPractice = $state(false);
  let selectedVerses = $state<string[]>([]),
    selectedCollections = $state<string[]>([]);
  const verses = $derived(libraryGroups(patterns, 'verses'));
  const verseCounts = $derived(
    new Map(
      libraryGroups(filterLibrary(patterns, [], [], '', withPractice), 'verses').map((group) => [
        group.key,
        group.count,
      ]),
    ),
  );
  const verseChoices = $derived(
    groupVersesByArea(
      verses.map((group) => ({
        ...group,
        id: group.key.slice(group.sourceId.length + 1),
      })),
    ).flatMap(({ area, verses }) =>
      verses.map((group) => ({
        ...group,
        area: area.title,
        count: verseCounts.get(group.key) ?? 0,
      })),
    ),
  );
  const allCollections = $derived(libraryGroups(patterns, 'collections'));
  const scopedPatterns = $derived(filterLibrary(patterns, selectedVerses, [], '', withPractice));
  const collectionCounts = $derived(
    new Map(libraryGroups(scopedPatterns, 'collections').map((group) => [group.key, group.count])),
  );
  const collections = $derived(
    allCollections
      .filter((group) => collectionCounts.has(group.key) || selectedCollections.includes(group.key))
      .map((group) => ({ ...group, count: collectionCounts.get(group.key) ?? 0 })),
  );
  const filtered = $derived(
    filterLibrary(patterns, selectedVerses, selectedCollections, query, withPractice),
  );
  export function patternScope() {
    return {
      patterns: filterLibrary(patterns, selectedVerses, selectedCollections, '', withPractice),
      label: [
        selectedVerses.length
          ? verses
              .filter((item) => selectedVerses.includes(item.key))
              .map((item) => item.title)
              .join(', ')
          : 'All verses',
        selectedCollections.length
          ? allCollections
              .filter((item) => selectedCollections.includes(item.key))
              .map((item) => item.title)
              .join(', ')
          : 'All collections',
        withPractice ? 'With practice' : '',
      ]
        .filter(Boolean)
        .join(' · '),
      query,
    };
  }
  const scales = [
    { label: 'Tension', min: 0, max: 10, low: 'None', high: 'Very high' },
    { label: 'Confidence', min: 0, max: 10, low: 'None', high: 'Very high' },
    { label: 'Distress (SUD)', min: 0, max: 100, low: 'None', high: 'Extreme' },
  ];
  const matchesScales = $derived(
    scales.filter((s) => s.label.toLowerCase().includes(query.trim().toLowerCase())),
  );
  function drag(event: DragEvent, cell: BearingsCell) {
    event.dataTransfer?.setData(libraryDragType, JSON.stringify(cell));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }
</script>

<aside class="bearings-library" aria-label="Patterns and ratings">
  <header>
    <h2>Library</h2>
    <div class="library-header-tools">
      <kbd aria-hidden="true">/</kbd>
      <button class="icon" aria-label="Close library" title="Close library (/)" onclick={onclose}
        ><X size={17} /></button
      >
    </div>
  </header>
  {#if ai}<nav class="library-tabs" aria-label="Library sections">
      <button aria-pressed={ai.tab === 'patterns'} onclick={() => (ai.tab = 'patterns')}
        >Patterns</button
      ><button aria-pressed={ai.tab === 'prompts'} onclick={() => (ai.tab = 'prompts')}
        >My prompts</button
      >
    </nav>{/if}
  <div class="patterns-panel" hidden={ai?.tab === 'prompts'}>
    <label class="sr-only" for="bearings-library-search">Search patterns and ratings</label>
    <div class="search">
      <Search size={16} aria-hidden="true" /><input
        id="bearings-library-search"
        type="search"
        placeholder="Search patterns or ratings…"
        bind:value={query}
        oninput={() => (count = 30)}
      />
    </div>
    <div class="library-scroll">
      <div class="scope-selectors">
        <BearingsScopePicker
          kind="verses"
          choices={verseChoices}
          selected={selectedVerses}
          total={filterLibrary(patterns, [], [], '', withPractice).length}
          onchange={(keys) => {
            selectedVerses = keys;
            count = 30;
          }}
        />
        <BearingsScopePicker
          kind="collections"
          choices={collections}
          selected={selectedCollections}
          total={scopedPatterns.length}
          onchange={(keys) => {
            selectedCollections = keys;
            count = 30;
          }}
        />
        {#if selectedVerses.length || selectedCollections.length}<div class="scope-status">
            <span aria-live="polite">{filtered.length} patterns</span><button
              class="icon"
              aria-label="Clear verse and collection filters"
              title="All verses and collections"
              onclick={() => {
                selectedVerses = [];
                selectedCollections = [];
                count = 30;
              }}><RotateCcw size={14} /></button
            >
          </div>{/if}
      </div>
      <details class="rating-tools" open={!!query.trim() && matchesScales.length > 0}>
        <summary>Ratings <span>{matchesScales.length}</span></summary>
        {#if matchesScales.length}
          {#each matchesScales as scale (scale.label)}<article
              class="library-item"
              draggable="true"
              data-library-kind="rating"
              ondragstart={(event) =>
                drag(event, ratingCell(scale.label, scale.min, scale.max, scale.low, scale.high))}
            >
              <div class="item-title">
                <span class="grip" aria-hidden="true"><GripVertical size={15} /></span><strong
                  >{scale.label}</strong
                ><button
                  class="icon add-item"
                  aria-label={`Add ${scale.label} rating`}
                  title={`Add ${scale.label} rating`}
                  onclick={() =>
                    onadd(ratingCell(scale.label, scale.min, scale.max, scale.low, scale.high))}
                  ><Plus size={17} /></button
                >
              </div>
              <p>{scale.min} · {scale.low} — {scale.max} · {scale.high}</p>
            </article>{/each}{/if}
        <button class="custom-toggle" aria-expanded={custom} onclick={() => (custom = !custom)}
          >Create a rating scale</button
        >
        {#if custom}<form
            class="custom-scale"
            onsubmit={(e) => {
              e.preventDefault();
              if (
                !name.trim() ||
                !Number.isFinite(min) ||
                !Number.isFinite(max) ||
                min >= max ||
                max - min > 10000
              ) {
                error = 'Give the scale a name and a maximum greater than its minimum.';
                return;
              }
              onadd(ratingCell(name.trim(), min, max, low, high));
              custom = false;
              name = '';
              error = '';
            }}
          >
            <label>Name<input bind:value={name} maxlength="120" required /></label>
            <div class="scale-bounds">
              <label>Minimum<input type="number" bind:value={min} required /></label><label
                >Maximum<input type="number" bind:value={max} required /></label
              >
            </div>
            <label>Low label<input bind:value={low} maxlength="180" /></label><label
              >High label<input bind:value={high} maxlength="180" /></label
            >
            {#if error}<p role="alert">{error}</p>{/if}<button
              type="submit"
              class="icon"
              aria-label="Add custom rating"
              title="Add custom rating"><Plus size={17} /></button
            >
          </form>{/if}
      </details>
      <button
        class="practice-filter"
        type="button"
        role="switch"
        aria-checked={withPractice}
        onclick={() => {
          withPractice = !withPractice;
          count = 30;
        }}
      >
        <span>With practice</span>
        <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
      </button>
      <h3>Patterns <span>{filtered.length}</span></h3>
      {#each filtered.slice(0, count) as pattern (`${pattern.sourceId}:${pattern.id}`)}<article
          class="library-item pattern-item"
          draggable="true"
          data-library-kind="pattern"
          ondragstart={(event) => drag(event, patternCell(pattern))}
        >
          <button
            class="preview-pattern"
            type="button"
            aria-label={`Preview pattern: ${pattern.title}`}
            title="Preview pattern"
            onclick={(event) =>
              onread(
                {
                  sourceId: pattern.sourceId,
                  entityId: pattern.id,
                  title: pattern.title,
                  summary: pattern.summary,
                },
                event.currentTarget,
              )}
          >
            <span class="item-title">
              <span class="grip" aria-hidden="true"><GripVertical size={15} /></span><strong
                >{pattern.title}</strong
              >
            </span>
            <span class="item-summary">{pattern.summary}</span>
            {#if pattern.sourceId === 'personal'}<small>Your pattern</small>{/if}
          </button>
          <button
            class="icon add-item"
            type="button"
            aria-label={`Add pattern: ${pattern.title}`}
            title={`Add ${pattern.title}`}
            onclick={() => onadd(patternCell(pattern))}><Plus size={17} /></button
          >
        </article>{/each}
      {#if !filtered.length}<p class="empty">
          {withPractice
            ? 'No matching patterns with a practice. Try changing your search or turning off the filter.'
            : 'No matching patterns. You can always write your own approach.'}
        </p>{:else if filtered.length > count}<button class="more" onclick={() => (count += 30)}
          >Show more patterns</button
        >{/if}
    </div>
  </div>
  {#if ai}<div class="prompts-panel" hidden={ai.tab !== 'prompts'}>
      <BearingsPromptLibrary onuse={onuseprompt} />
    </div>{/if}
</aside>

<style>
  .patterns-panel,
  .prompts-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .patterns-panel[hidden],
  .prompts-panel[hidden] {
    display: none;
  }
  .library-tabs {
    display: flex;
    gap: 4px;
    margin: 0 1rem 1rem;
    border-bottom: 1px solid var(--bearings-line);
    flex: none;
  }
  .library-tabs button {
    flex: 1;
    padding: 8px 4px;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .library-tabs button[aria-pressed='true'] {
    color: var(--bearings-ink);
    box-shadow: inset 0 -2px var(--bearings-accent);
  }
  aside {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: var(--bearings-paper);
    padding: 1rem 0 0;
    height: 100%;
    overflow: hidden;
    min-width: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 1rem 0.75rem;
    flex: none;
  }
  h2 {
    font-size: 1rem;
    margin: 0;
    font-weight: 850;
    letter-spacing: -0.04em;
    text-transform: lowercase;
  }
  .library-header-tools {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--bearings-muted);
  }
  kbd {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--bearings-line);
    border-bottom-width: 2px;
    border-radius: 4px;
    font: 0.75rem var(--font-sans);
  }
  .practice-filter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: none;
    min-height: 36px;
    width: 100%;
    margin: 0.75rem 0 0;
    padding: 2px 0;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .practice-filter + h3 {
    margin-top: 0.5rem;
  }
  .practice-filter[aria-checked='true'] {
    color: var(--bearings-accent);
  }
  .practice-filter:focus-visible {
    outline: 2px solid var(--bearings-accent);
    outline-offset: 3px;
    border-radius: 3px;
  }
  .switch-track {
    position: relative;
    display: block;
    flex: none;
    width: 32px;
    height: 18px;
    border-radius: 999px;
    background: var(--bearings-line);
    transition: background 120ms;
  }
  .switch-thumb {
    position: absolute;
    left: 2px;
    top: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--bearings-paper);
    box-shadow: 0 1px 2px #18251b26;
    transition: transform 120ms;
  }
  .practice-filter[aria-checked='true'] .switch-track {
    background: var(--bearings-accent);
  }
  .practice-filter[aria-checked='true'] .switch-thumb {
    transform: translateX(14px);
  }
  @media (prefers-reduced-motion: reduce) {
    .switch-track,
    .switch-thumb {
      transition: none;
    }
  }
  .library-scroll {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 0.2rem 1rem 1rem;
  }
  .patterns-panel > .search {
    flex: none;
    margin: 0 1rem 1rem;
    background: var(--bearings-surface);
  }
  h3 {
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: lowercase;
    color: var(--bearings-ink);
    margin: 1.4rem 0 0.5rem;
    display: flex;
    justify-content: space-between;
  }
  .scope-selectors {
    display: grid;
    gap: 1.15rem;
    margin-bottom: 1rem;
  }
  .scope-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--bearings-muted);
  }
  .search {
    margin-bottom: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    border-radius: 6px;
    padding: 0 0.65rem;
  }
  .rating-tools summary {
    cursor: pointer;
    padding: 0.65rem 0;
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: lowercase;
    color: var(--bearings-ink);
  }
  .rating-tools summary span {
    float: right;
  }
  .search input {
    border: 0;
    background: transparent;
    min-width: 0;
    width: 100%;
    min-height: 42px;
    font: inherit;
    font-size: 0.8rem;
    color: inherit;
  }
  .search:has(input:focus-visible) {
    border-color: color-mix(in srgb, var(--bearings-accent) 40%, var(--bearings-line));
  }
  .search input:focus {
    outline: none;
    box-shadow: none;
  }
  @media (forced-colors: active) {
    .search input:focus-visible {
      outline: 1px solid Highlight;
      outline-offset: 2px;
    }
  }
  .library-item {
    cursor: grab;
    border: 0;
    border-bottom: 1px solid var(--bearings-line);
    border-radius: 0;
    background: transparent;
    padding: 0.7rem 0.15rem;
  }
  .library-item:hover,
  .library-item:focus-within {
    background: var(--bearings-surface);
  }
  .pattern-item {
    position: relative;
    padding: 0;
  }
  .preview-pattern {
    display: block;
    width: 100%;
    padding: 0.7rem 0.15rem;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }
  .preview-pattern:focus-visible {
    outline: 2px solid var(--bearings-accent);
    outline-offset: -2px;
    border-radius: 4px;
  }
  .preview-pattern .item-title {
    min-height: 32px;
    padding-right: 36px;
  }
  .preview-pattern small {
    display: block;
    margin-left: 1.3rem;
  }
  .pattern-item > .add-item {
    position: absolute;
    top: 0.7rem;
    right: 0.15rem;
  }
  .library-item p,
  .library-item .item-summary {
    margin-left: 1.3rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .library-item .add-item {
    opacity: 0;
    transition: opacity 120ms;
  }
  .library-item:hover .add-item,
  .library-item:focus-within .add-item {
    opacity: 1;
    pointer-events: auto;
  }
  @media (hover: none), (pointer: coarse) {
    .library-item .add-item {
      opacity: 1;
      pointer-events: auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .library-item .add-item {
      transition: none;
    }
  }
  .library-item .icon {
    color: var(--bearings-accent);
    background: var(--bearings-accent-soft);
  }
  .item-title {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  strong {
    font-size: 0.8rem;
    font-weight: 650;
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .grip {
    cursor: grab;
    color: var(--bearings-muted);
    display: flex;
  }
  p,
  .item-summary {
    font-size: 0.72rem;
    line-height: 1.6;
    color: var(--bearings-muted);
    margin: 0.4rem 0.2rem 0.2rem;
  }
  small {
    color: var(--bearings-accent);
    font-size: 0.65rem;
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .icon:hover {
    background: var(--bearings-surface);
  }
  .custom-toggle,
  .more {
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    color: var(--bearings-accent);
    font: inherit;
    font-size: 0.72rem;
    padding: 0.5rem 0;
    min-height: 36px;
    cursor: pointer;
  }
  .custom-scale {
    display: grid;
    gap: 0.6rem;
    padding: 0.7rem 0;
  }
  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.72rem;
    color: var(--bearings-muted);
  }
  label input {
    min-width: 0;
    width: 100%;
    border: 1px solid var(--bearings-line);
    border-radius: 4px;
    background: var(--bearings-paper);
    padding: 0.5rem;
    font: inherit;
    color: var(--bearings-ink);
  }
  .scale-bounds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  @media (hover: hover) and (pointer: fine) {
    .library-item .grip {
      opacity: 0.35;
    }
    .library-item:hover .grip,
    .library-item:focus-within .grip {
      opacity: 1;
    }
  }
  @media (pointer: coarse) {
    .practice-filter {
      min-height: 44px;
    }
    .preview-pattern .item-title {
      min-height: 44px;
      padding-right: 48px;
    }
    .icon {
      width: 44px;
      height: 44px;
    }
    .search input,
    label input {
      font-size: 16px;
    }
  }
</style>
