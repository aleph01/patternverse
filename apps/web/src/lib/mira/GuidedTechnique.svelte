<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Play, X } from '@lucide/svelte';
  import { focusPicker } from './dialog-focus';
  import { searchVoiceChoices } from './voice-commands';
  import {
    listTechniques,
    loadGuidedRun,
    startGuidedRun,
    applyGuidedAction,
    type GuidedRun,
    type Technique,
    type GuidedEffect,
  } from './guided';
  import type { MiraPatternSummary } from './context';
  import { modalityById } from './modalities';
  import type { PrivateMiraStore } from './private-store';

  let {
    sessionId,
    modalityId,
    store,
    patterns = [],
    onPatternSelect,
    voiceFeedback,
    selecting = $bindable(false),
  }: {
    sessionId: string;
    modalityId: string;
    store: PrivateMiraStore;
    patterns?: readonly MiraPatternSummary[];
    onPatternSelect?: (pattern: MiraPatternSummary) => void | Promise<void>;
    voiceFeedback?: Snippet;
    selecting?: boolean;
  } = $props();
  let run = $state<GuidedRun | null>(null);
  let techniques = $state<readonly Technique[]>([]);
  let working = $state(false);
  let answerDraft = $state('');
  let error = $state('');
  let search = $state('');
  let selectedId = $state<string | null>(null);
  const pickerChoices = $derived([
    ...techniques.map((item) => ({
      id: `technique:${item.id}`,
      label: item.title,
      description: item.needs_ai ? 'AI wording not connected yet' : 'Guided reflection',
      disabled: working || active || item.needs_ai,
    })),
    ...patterns.map((item) => ({
      id: `pattern:${item.sourceId}:${item.id}`,
      label: item.title,
      description: item.summary || 'Use as conversation context',
      disabled: working,
    })),
  ]);
  const visibleChoices = $derived(searchVoiceChoices(pickerChoices, search));
  const selected = $derived(pickerChoices.find((item) => item.id === selectedId));

  /** Voice navigation uses exactly the numbered options shown in the picker. */
  export function voiceChoices() {
    return visibleChoices;
  }
  export function searchPatterns(query: string) {
    search = query;
    selecting = true;
  }
  export function selectPattern(id: string): string {
    const choice = visibleChoices.find((item) => item.id === id && !item.disabled);
    if (!choice) return 'That pattern is not available.';
    selectedId = id;
    return `${choice.label} selected. Say “start” when ready, or “dismiss”.`;
  }
  export function describeSelection(): string {
    return selected
      ? `${selected.label}. ${selected.description}`
      : 'Select a numbered pattern first.';
  }
  export function hasSelection(): boolean {
    return Boolean(selected);
  }
  export function dismissSelection() {
    selectedId = null;
    selecting = false;
  }
  export async function startSelection(): Promise<string> {
    if (!selected || selected.disabled) return 'Select an available pattern first.';
    const id = selected.id;
    if (id.startsWith('technique:')) await start(id.slice('technique:'.length));
    else {
      const pattern = patterns.find((item) => `pattern:${item.sourceId}:${item.id}` === id);
      if (!pattern) return 'That pattern is no longer available.';
      await onPatternSelect?.(pattern);
      selecting = false;
    }
    if (error) return error;
    selectedId = null;
    return id.startsWith('technique:')
      ? 'Exercise started.'
      : 'Pattern added to this conversation.';
  }

  $effect(() => {
    const id = sessionId;
    const modality = modalityId;
    let live = true;
    run = null;
    techniques = [];
    error = '';
    selectedId = null;
    search = '';
    void Promise.all([loadGuidedRun(store, id), listTechniques(modality)])
      .then(([saved, available]) => {
        if (live) {
          run = saved;
          techniques = available;
        }
      })
      .catch((cause) => {
        if (live) error = messageOf(cause);
      });
    return () => {
      live = false;
    };
  });

  const pending = $derived(run?.view.pending ?? null);
  const active = $derived(run?.view.status === 'Waiting' || run?.view.status === 'Paused');

  function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'The guided exercise could not continue.';
  }
  function prompt(effect: GuidedEffect): string {
    const value = effect.request.payload.prompt ?? effect.request.payload.markdown;
    return typeof value === 'string' ? value : '';
  }
  function choices(effect: GuidedEffect): readonly { value: string; label: string }[] {
    const value = effect.request.payload.options;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (option) => typeof option?.value === 'string' && typeof option?.label === 'string',
    );
  }
  function answerText(result: unknown, effect: GuidedEffect): string {
    if (!result || typeof result !== 'object' || !('value' in result)) return '';
    const value = result.value;
    if (typeof value !== 'string') return '';
    return choices(effect).find((option) => option.value === value)?.label ?? value;
  }
  async function start(id: string) {
    if (working) return;
    working = true;
    error = '';
    try {
      run = await startGuidedRun(store, sessionId, id);
      selecting = false;
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      working = false;
    }
  }
  async function apply(event: unknown, runId: string) {
    if (!run || working) return;
    working = true;
    error = '';
    try {
      run = await applyGuidedAction(store, sessionId, run, event, runId);
      answerDraft = '';
    } catch (cause) {
      error = messageOf(cause);
      try {
        run = await loadGuidedRun(store, sessionId);
      } catch {
        /* Keep the error visible. */
      }
    } finally {
      working = false;
    }
  }
  function fulfill(kind: 'selected' | 'text', value: string) {
    if (!pending || !value.trim()) return;
    void apply(
      { Fulfill: { effect_id: pending.effect_id, result: { kind, value: value.trim() } } },
      pending.run_id,
    );
  }
</script>

{#if run}<div class="mira-guided">
    <div class="mira-guided-heading">
      <div>
        <p class="mira-eyebrow">Guided reflection · on this device</p>
        {#if active}<h3>
            {techniques.find((item) => item.id === run?.view.technique_id)?.title ??
              run?.view.technique_id}
          </h3>
        {:else}<h3>Therapy techniques</h3>{/if}
      </div>
      <div class="mira-guided-actions">
        {#if active && run}<button
            type="button"
            class="mira-guided-stop"
            aria-label="End exercise"
            title="End exercise"
            disabled={working}
            onclick={() => apply('Cancel', run!.view.root_id)}>■</button
          >{/if}
        <button type="button" onclick={() => (selecting = true)} disabled={working || active}
          >Choose technique</button
        >
      </div>
    </div>
    {#if error}<p role="alert" class="mira-guided-error">{error}</p>{/if}
    {#if run}
      <div class="mira-guided-history">
        {#each run.view.items.filter((item) => item.effect.effect_id !== pending?.effect_id) as item (item.effect.effect_id)}
          {#if prompt(item.effect)}<p>{prompt(item.effect)}</p>{/if}
          {#if item.result && answerText(item.result, item.effect)}<p class="mira-guided-answer">
              {answerText(item.result, item.effect)}
            </p>{/if}
        {/each}
      </div>
      {#if pending && active}
        <div class="mira-guided-step">
          <p>{prompt(pending)}</p>
          {#if pending.request.kind === 'interaction.choose'}
            <div class="mira-guided-options">
              {#each choices(pending) as option (option.value)}
                <button
                  type="button"
                  disabled={working}
                  onclick={() => fulfill('selected', option.value)}>{option.label}</button
                >
              {/each}
            </div>
          {:else if pending.request.kind === 'interaction.ask'}
            <form
              onsubmit={(event) => {
                event.preventDefault();
                fulfill('text', answerDraft);
              }}
            >
              <label class="visually-hidden" for="mira-guided-answer">Exercise response</label>
              <textarea
                id="mira-guided-answer"
                bind:value={answerDraft}
                rows="3"
                maxlength="30000"
                placeholder="Your response…"></textarea>
              <button type="submit" disabled={working || !answerDraft.trim()}>Continue →</button>
            </form>
          {:else}<p>
              This exercise step needs a capability that is not available here. You can end the
              exercise safely.
            </p>{/if}
        </div>
      {:else}<p class="mira-guided-finished">
          Exercise {run.view.status.toLowerCase()}. You can choose another whenever you wish.
        </p>{/if}
    {/if}
  </div>{/if}

{#if selecting}
  <div
    class="mira-technique-overlay"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) selecting = false;
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mira-techniques-title"
      class="mira-technique-dialog"
      tabindex="-1"
      use:focusPicker={() => (selecting = false)}
    >
      <div class="mira-guided-heading">
        <h2 id="mira-techniques-title">Patterns &amp; therapy techniques</h2>
        <button
          type="button"
          aria-label="Close pattern and technique selector"
          onclick={() => (selecting = false)}>×</button
        >
      </div>
      <p>
        Choose a guided technique for {modalityById(modalityId).name}, or bring a library pattern
        into this conversation.
      </p>
      <label class="visually-hidden" for="mira-pattern-search">Search patterns and techniques</label
      >
      <input
        id="mira-pattern-search"
        type="search"
        bind:value={search}
        placeholder="Search patterns and techniques…"
      />
      {#if voiceFeedback}{@render voiceFeedback()}{/if}
      {#if selected}<section class="mira-pattern-preview" aria-label="Selected pattern">
          <div>
            <h3>{selected.label}</h3>
            <p>{selected.description}</p>
          </div>
          <button
            type="button"
            aria-label={selected.id.startsWith('technique:')
              ? 'Start selected exercise'
              : 'Use selected pattern'}
            title="Start"
            disabled={selected.disabled}
            onclick={() => startSelection()}><Play size={17} /></button
          >
          <button
            type="button"
            aria-label="Dismiss selected pattern"
            onclick={() => (selectedId = null)}><X size={17} /></button
          >
        </section>{/if}
      {#if error}<p role="alert">{error}</p>{/if}
      {#if visibleChoices.length === 0}<p>No matching patterns or techniques.</p>{/if}
      <div class="mira-technique-list">
        {#each visibleChoices as choice, index (choice.id)}
          <button
            type="button"
            disabled={choice.disabled}
            aria-pressed={selectedId === choice.id}
            onclick={() => selectPattern(choice.id)}
          >
            <span><span class="mira-choice-number">{index + 1}</span> {choice.label}</span>
            <small
              >{choice.id.startsWith('technique:')
                ? choice.description
                : 'Library pattern · conversation context'}</small
            >
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}
