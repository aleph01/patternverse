<script lang="ts">
  import { tick } from 'svelte';
  import { BookOpen, Play, ChevronRight, MessageSquareText, StickyNote } from '@lucide/svelte';
  import Lambda from './BearingsLambdaIcon.svelte';
  import type { BearingsCell, BearingsNotebook } from '@patternverse/workspace';
  import type { BearingsPattern } from './catalog';
  import BearingsPractice from './BearingsPractice.svelte';
  import { noteBody, textKinds } from './outline';
  import type { VimMode, VimStatus } from './vim';
  import BearingsRichText from './BearingsRichText.svelte';
  import BearingsAiComposer from './BearingsAiComposer.svelte';
  import { useBearingsAi } from './ai.svelte';
  import { richEditor } from './rich-text';
  import { defaultCursorSettings, type CursorSettings } from './cursor-settings';
  let {
    cell,
    patterns,
    notebook,
    onchange,
    onpractice,
    onaicomment,
    onaiundo,
    active = false,
    onkindchange,
    onnext,
    ondivider,
    onread,
    hierarchical = false,
    heading = false,
    plain = false,
    documentMode = false,
    onboundary,
    vim = false,
    cursor = defaultCursorSettings,
    vimMode = 'normal',
    onvimchange = () => {},
  }: {
    cell: BearingsCell;
    patterns: readonly BearingsPattern[];
    notebook: BearingsNotebook;
    onchange: (update: Partial<BearingsCell>) => void;
    onaicomment: (text: string) => string | null;
    onaiundo: (id: string, expected: string) => boolean;
    active?: boolean;
    hierarchical?: boolean;
    heading?: boolean;
    plain?: boolean;
    documentMode?: boolean;
    onboundary?: (direction: 'left' | 'right' | 'up' | 'down', x: number) => boolean;
    vim?: boolean;
    cursor?: CursorSettings;
    vimMode?: VimMode;
    onvimchange?: (status: VimStatus) => void;
    onkindchange: (kind: 'answer' | 'note' | 'approach') => void;
    onnext: () => void;
    ondivider: (before: string, after: string) => void;
    onread: (pattern: NonNullable<BearingsCell['pattern']>, trigger: HTMLButtonElement) => void;
    onpractice: (
      practice: NonNullable<BearingsCell['practice']>,
      responses: readonly { id: string; prompt: string; answer: string }[],
      runId: string,
    ) => void;
  } = $props();
  let writingElement = $state<HTMLDivElement>();
  const ai = useBearingsAi();
  const aiHere = $derived(ai?.target?.cellId === cell.id);
  const types = [
    { kind: 'answer', label: 'Note', icon: StickyNote },
    { kind: 'note', label: 'Comment', icon: MessageSquareText },
    { kind: 'approach', label: 'Own approach', icon: Lambda },
  ] as const;
  async function changeKind(kind: 'answer' | 'note' | 'approach') {
    const current = richEditor(writingElement?.querySelector<HTMLElement>('.cell-text') ?? null);
    const selection = current?.state.selection;
    onkindchange(kind);
    await tick();
    const field = writingElement?.querySelector<HTMLElement>('.cell-text');
    field?.focus({ preventScroll: true });
    if (selection && current)
      current.commands.setTextSelection({ from: selection.from, to: selection.to });
  }
  let choose = $state(false),
    showPractice = $state(false);
  const options = $derived(
    patterns.find((p) => p.sourceId === cell.pattern?.sourceId && p.id === cell.pattern?.entityId)
      ?.practices ?? [],
  );
  const label = $derived(
    cell.kind === 'approach'
      ? 'Own approach'
      : cell.kind === 'pattern'
        ? 'Library pattern'
        : cell.kind === 'rating'
          ? 'Rating'
          : cell.kind === 'note'
            ? 'Comment'
            : 'Note',
  );
  const instance = $props.id();
  const writing = $derived(plain ? noteBody(cell) : cell.text);
  function rate(value: number) {
    if (cell.rating) onchange({ rating: { ...cell.rating, value } });
  }
</script>

{#if !documentMode && textKinds.has(cell.kind)}<div
    class="cell-kind"
    data-kind={cell.kind}
    class:plain
    class:is-active={active}
    role="group"
    aria-label="Cell type"
  >
    {#each types as type (type.kind)}<button
        type="button"
        aria-label={type.label}
        title={type.label}
        aria-pressed={cell.kind === type.kind}
        onclick={() => changeKind(type.kind)}><type.icon size={15} aria-hidden="true" /></button
      >{/each}
  </div>{/if}
{#if cell.prompt}<p class="answer-prompt">{cell.prompt}</p>{/if}
{#snippet patternContent()}
  <p class="pattern-summary">{cell.pattern?.summary}</p>
  <div class="pattern-actions">
    <button
      class="quiet"
      type="button"
      onclick={(event) => cell.pattern && onread(cell.pattern, event.currentTarget)}
      >Read pattern</button
    >
    {#if cell.practice}<button
        type="button"
        class="quiet"
        aria-expanded={showPractice}
        onclick={() => (showPractice = !showPractice)}
        >{cell.practice.status === 'completed'
          ? 'Review practice'
          : 'Continue practice'}<ChevronRight size={14} aria-hidden="true" /></button
      >
    {:else if options.length}<button
        type="button"
        class="quiet"
        aria-expanded={choose}
        onclick={() => (choose = !choose)}
        >Choose a practice<ChevronRight size={14} aria-hidden="true" /></button
      >{/if}
  </div>
  {#if choose && !cell.practice}<div class="practice-options">
      {#each options as option (`${option.sourceId}:${option.id}`)}<button
          type="button"
          onclick={() => {
            onchange({
              practice: {
                ref: { sourceId: option.sourceId, entityId: option.id },
                title: option.title,
                source: option.source,
                status: 'in-progress',
              },
            });
            choose = false;
            showPractice = true;
          }}><span>{option.title}</span><Play size={15} aria-hidden="true" /></button
        >{/each}
    </div>{/if}
  {#if cell.practice}<div hidden={!showPractice}>
      <BearingsPractice
        practice={cell.practice}
        {notebook}
        cellId={cell.id}
        onchange={onpractice}
      />
    </div>{/if}
{/snippet}
{#if cell.kind === 'pattern' && cell.pattern}
  {#if documentMode}<details class="document-pattern">
      <summary
        ><BookOpen size={17} aria-hidden="true" /><span
          >{cell.pattern.title}<small>{cell.practice ? 'Pattern · with practice' : 'Pattern'}</small
          ></span
        ><ChevronRight class="pattern-chevron" size={15} aria-hidden="true" /></summary
      >
      {@render patternContent()}
    </details>
  {:else}
    <div class="pattern-heading">
      <BookOpen size={17} aria-hidden="true" />
      <h3>{cell.pattern.title}</h3>
    </div>
    {@render patternContent()}
  {/if}
{:else if cell.kind === 'rating' && cell.rating}
  <div class="rating-head">
    <label class="sr-only" for={`${instance}-label`}>Rating name</label><input
      id={`${instance}-label`}
      class="rating-name"
      value={cell.rating.label}
      maxlength="120"
      oninput={(e) =>
        cell.rating && onchange({ rating: { ...cell.rating, label: e.currentTarget.value } })}
    /><output for={`${instance}-range`}
      >{cell.rating.value === null
        ? 'Unanswered'
        : `${cell.rating.value} / ${cell.rating.max}`}</output
    >
  </div>
  <input
    id={`${instance}-range`}
    type="range"
    aria-label={cell.rating.label}
    min={cell.rating.min}
    max={cell.rating.max}
    step="1"
    value={cell.rating.value ?? cell.rating.min}
    class:unanswered={cell.rating.value === null}
    aria-valuetext={cell.rating.value === null ? 'Unanswered' : String(cell.rating.value)}
    oninput={(e) => rate(e.currentTarget.valueAsNumber)}
    onpointerup={(e) => rate(e.currentTarget.valueAsNumber)}
    onkeyup={(e) => {
      if (
        [
          'Home',
          'End',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'PageUp',
          'PageDown',
        ].includes(e.key)
      )
        rate(e.currentTarget.valueAsNumber);
    }}
  />
  <div class="rating-ends">
    <span>{cell.rating.min} · {cell.rating.low}</span><span
      >{cell.rating.max} · {cell.rating.high}</span
    >
  </div>
{:else}
  {#if !plain && (heading || cell.title !== undefined)}<label
      class="sr-only"
      for={`${instance}-title`}>Note title</label
    ><input
      id={`${instance}-title`}
      class="cell-title"
      value={cell.title ?? ''}
      maxlength="300"
      placeholder="Untitled note"
      oninput={(event) => onchange({ title: event.currentTarget.value })}
    />{/if}
  <div class="writing-input" class:plain hidden={aiHere && ai?.enabled} bind:this={writingElement}>
    <BearingsRichText
      value={writing}
      {label}
      cellId={cell.id}
      {plain}
      {hierarchical}
      {vim}
      {vimMode}
      {cursor}
      placeholder={documentMode
        ? ''
        : cell.kind === 'approach'
          ? 'What are you trying?'
          : cell.kind === 'note'
            ? 'Add a comment…'
            : ''}
      onchange={(text) => onchange({ text, ...(plain ? { title: undefined } : {}) })}
      oncycle={() => {
        const current = types.findIndex((type) => type.kind === cell.kind);
        void changeKind(types[(current + 1) % types.length]!.kind);
      }}
      {onnext}
      {ondivider}
      {onboundary}
      {onvimchange}
    />
  </div>
{/if}
{#if aiHere}<div hidden={!ai?.enabled}>
    <BearingsAiComposer
      {notebook}
      cellId={cell.id}
      oninsert={onaicomment}
      onundo={onaiundo}
      onclose={() => {
        ai?.close();
        void tick().then(() => writingElement?.querySelector<HTMLElement>('.cell-text')?.focus());
      }}
    />
  </div>{/if}

<style>
  .document-pattern summary {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    list-style: none;
    cursor: pointer;
    min-height: 44px;
    padding-right: 40px;
    font-size: 0.85rem;
  }
  .document-pattern summary::-webkit-details-marker {
    display: none;
  }
  .document-pattern summary > :global(svg) {
    color: var(--bearings-accent);
    flex: none;
  }
  .document-pattern small {
    display: block;
    font-size: 0.7rem;
    color: var(--bearings-muted);
  }
  .document-pattern summary > :global(.pattern-chevron) {
    margin-left: auto;
    color: var(--bearings-muted);
  }
  .document-pattern[open] summary > :global(.pattern-chevron) {
    transform: rotate(90deg);
  }
  .cell-kind {
    position: absolute;
    top: 0;
    right: 12px;
    transform: translateY(-50%);
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    color: var(--bearings-muted);
    background: var(--bearings-paper);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms;
  }
  .cell-kind.plain {
    left: 10px;
    right: auto;
  }
  .cell-kind.is-active,
  .cell-kind:focus-within,
  :global(.notebook-cell:hover) .cell-kind,
  :global(.notebook-cell:focus-within) .cell-kind {
    opacity: 1;
    pointer-events: auto;
  }
  .cell-kind button {
    display: grid;
    place-items: center;
    width: 26px;
    height: 24px;
    border: 0;
    border-radius: 3px;
    padding: 0;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }
  .cell-kind button:hover,
  .cell-kind button[aria-pressed='true'] {
    color: var(--cell-accent, var(--bearings-accent));
    background: var(--cell-tint, var(--bearings-accent-soft));
  }
  @media (pointer: coarse) {
    .cell-kind {
      gap: 0;
      padding: 0;
    }
    .cell-kind button {
      width: 44px;
      height: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cell-kind {
      transition: none;
    }
  }
  .cell-title {
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    margin: 0 0 0.7rem;
    font: inherit;
    font-size: 1.1rem;
    font-weight: 750;
    letter-spacing: -0.035em;
    background: transparent;
    color: inherit;
  }
  .writing-input {
    position: relative;
    min-width: 0;
  }
  @media (hover: hover) and (pointer: fine) {
    .cell-title:focus {
      outline: none;
    }
  }
  .answer-prompt {
    color: var(--bearings-muted);
    font-size: 0.8rem;
    margin: 0 0 0.7rem;
    white-space: pre-wrap;
  }
  .pattern-heading {
    padding-right: 40px;
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  @media (pointer: coarse) {
    .pattern-heading {
      padding-right: 52px;
    }
  }
  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }
  .pattern-summary {
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--bearings-muted);
    margin: 0.6rem 0;
  }
  .pattern-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .quiet {
    color: var(--bearings-accent);
    font-size: 0.76rem;
    text-decoration: none;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .quiet {
    background: transparent;
    border: 0;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
  }
  .practice-options {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }
  .practice-options button {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    color: inherit;
    border-radius: 6px;
    text-align: left;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .rating-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .rating-name {
    min-width: 0;
    flex: 1;
    max-width: 70%;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    padding: 0;
  }
  output {
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    color: var(--bearings-muted);
    white-space: nowrap;
  }
  input[type='range'] {
    display: block;
    width: 100%;
    min-height: 36px;
    accent-color: var(--bearings-accent);
    padding: 0;
    margin: 0.5rem 0;
  }
  .unanswered {
    opacity: 0.55;
  }
  .rating-ends {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.7rem;
    color: var(--bearings-muted);
  }
  .rating-ends span:last-child {
    text-align: right;
  }
</style>
