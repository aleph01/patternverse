<script lang="ts">
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import { THERAPY_LIBRARY } from './therapy-library';
  import { therapeuticPatternForMethod } from './pattern-eligibility';
  import GuidedSelection from './GuidedSelection.svelte';
  import PatternTimer from '$lib/components/PatternTimer.svelte';
  import PracticeTimerDock from '$lib/components/PracticeTimerDock.svelte';
  import PatternForm from '$lib/components/PatternForm.svelte';
  import PracticeResponse from '$lib/components/PracticeResponse.svelte';
  import ShowContent from '$lib/components/ShowContent.svelte';
  import { answerFor, promptFor, optionsFor } from '$lib/pattern-run/view';
  import type { TimerSessionState } from '$lib/practice/timer';
  import type { PatternTimerResult } from '$lib/pattern-run/timer';
  import type { FormAnswers } from '$lib/pattern-run/form';
  import { ChevronRight, Play, Search, X } from '@lucide/svelte';
  import { focusPicker } from './dialog-focus';
  import { searchVoiceChoices } from './voice-commands';
  import {
    listTechniques,
    loadGuidedRun,
    startGuidedRun,
    applyGuidedAction,
    type GuidedRun,
    type Technique,
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
    restoreFocus = true,
    requestedTechnique,
  }: {
    sessionId: string;
    modalityId: string;
    store: PrivateMiraStore;
    patterns?: readonly MiraPatternSummary[];
    onPatternSelect?: (pattern: MiraPatternSummary) => void | Promise<void>;
    voiceFeedback?: Snippet;
    selecting?: boolean;
    restoreFocus?: boolean;
    requestedTechnique?: string | null;
  } = $props();
  let run = $state<GuidedRun | null>(null);
  let techniques = $state<readonly Technique[]>([]);
  let working = $state(false);
  let answerDraft = $state('');
  let timers = $state<Record<string, TimerSessionState>>({});
  let dockedTimerIds = $state<string[]>([]);
  let error = $state('');
  let search = $state('');
  let selectedId = $state<string | null>(null);
  const pickerChoices = $derived(
    [
      ...techniques.map((item) => ({
        id: `technique:${item.id}`,
        label: item.title,
        description: `Guided practice · ${modalityById(item.modality).name}${item.needs_ai ? ' · AI wording not connected yet' : ''}`,
        disabled: working || active || item.needs_ai,
      })),
      ...patterns
        .filter(
          (item) =>
            therapeuticPatternForMethod(item, modalityId) &&
            (item.sourceId !== 'commons' || !THERAPY_LIBRARY.some((t) => t.slug === item.id)),
        )
        .map((item) => ({
          id: `pattern:${item.sourceId}:${item.id}`,
          label: item.title,
          description: item.summary || 'Explore in conversation',
          disabled: working,
        })),
    ].sort(
      (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
    ),
  );
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
    if (id.startsWith('technique:')) {
      const techniqueId = id.slice('technique:'.length);
      const slug = THERAPY_LIBRARY.find((item) => item.id === techniqueId)?.slug;
      const pattern = patterns.find((item) => item.sourceId === 'commons' && item.id === slug);
      if (pattern) await onPatternSelect?.(pattern);
      await start(techniqueId);
    } else {
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
    const requested = requestedTechnique;
    let live = true;
    run = null;
    timers = {};
    techniques = [];
    error = '';
    selectedId = null;
    search = '';
    void Promise.all([loadGuidedRun(store, id), listTechniques(modality)])
      .then(([saved, available]) => {
        if (live) {
          run = saved;
          techniques = available;
          if (requested && available.some((t) => t.id === requested)) {
            selectedId = `technique:${requested}`;
            selecting = true;
          }
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
  async function start(id: string) {
    if (working) return;
    working = true;
    error = '';
    timers = {};
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
  function fulfill(
    kind: 'selected' | 'text' | 'selected_many' | 'ranked' | 'timer' | 'form',
    value: string | string[] | PatternTimerResult | FormAnswers,
  ) {
    if (!pending || (typeof value === 'string' && !value.trim())) return;
    void apply(
      {
        Fulfill: {
          effect_id: pending.effect_id,
          result: { kind, value: typeof value === 'string' ? value.trim() : value },
        },
      },
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
    <PracticeTimerDock
      view={run?.view}
      {timers}
      bind:dockedIds={dockedTimerIds}
      disabled={working || run?.view.status === 'Paused'}
      runningAllowed={run?.view.status === 'Waiting' || run?.view.status === 'Completed'}
      onchange={(id, state) => (timers[id] = state)}
    />
    {#if run}
      <div class="mira-guided-history">
        {#each run.view.items.filter((item) => item.effect.effect_id !== pending?.effect_id) as item (item.effect.effect_id)}
          {#if ['content.show', 'content.video', 'content.image'].includes(item.effect.request.kind)}<ShowContent
              effect={item.effect}
              runningAllowed={run.view.status === 'Waiting' || run.view.status === 'Completed'}
            />
          {:else if promptFor(item.effect)}<p>{promptFor(item.effect)}</p>{/if}
          {#if item.result && answerFor(item.effect, item.result)}<PracticeResponse
              text={answerFor(item.effect, item.result)}
            />{/if}
          {#if item.effect.request.kind === 'interaction.timer'}
            <PatternTimer
              docked={dockedTimerIds.includes(item.effect.effect_id)}
              effect={item.effect}
              state={timers[item.effect.effect_id]}
              active={false}
              runningAllowed={run.view.status === 'Waiting' || run.view.status === 'Completed'}
              onchange={(state) => (timers[item.effect.effect_id] = state)}
            />
          {/if}
          {#if item.effect.request.kind === 'interaction.form' && item.result}
            <PatternForm
              effect={item.effect}
              result={item.result}
              {timers}
              {dockedTimerIds}
              onTimerChange={(id, state) => (timers[id] = state)}
              runningAllowed={run.view.status === 'Waiting' || run.view.status === 'Completed'}
            />
          {/if}
        {/each}
      </div>
      {#if pending && active}
        <div class="mira-guided-step">
          <p>{promptFor(pending)}</p>
          {#if pending.request.kind === 'interaction.form'}
            {#key pending.effect_id}<PatternForm
                effect={pending}
                {timers}
                {dockedTimerIds}
                disabled={working || run.view.status === 'Paused'}
                runningAllowed={run.view.status === 'Waiting'}
                onTimerChange={(id, state) => (timers[id] = state)}
                onConfirm={fulfill}
              />{/key}
          {:else if pending.request.kind === 'interaction.timer'}
            {#key pending.effect_id}<PatternTimer
                docked={dockedTimerIds.includes(pending.effect_id)}
                effect={pending}
                state={timers[pending.effect_id]}
                disabled={working || run.view.status === 'Paused'}
                runningAllowed={run.view.status === 'Waiting'}
                onchange={(state) => (timers[pending!.effect_id] = state)}
                onconfirm={(result) => fulfill('timer', result)}
              />{/key}
          {:else if pending.request.kind === 'interaction.choose'}
            <div class="mira-guided-options">
              {#each optionsFor(pending) as option (option.value)}
                <button
                  type="button"
                  disabled={working}
                  onclick={() => fulfill('selected', option.value)}>{option.label}</button
                >
              {/each}
            </div>
          {:else if pending.request.kind === 'interaction.select'}
            {#key pending.effect_id}<GuidedSelection
                effect={pending}
                disabled={working}
                onConfirm={fulfill}
              />{/key}
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
      class="mira-technique-dialog mira-pattern-picker"
      tabindex="-1"
      use:focusPicker={{ close: () => (selecting = false), restoreFocus }}
    >
      <div class="mira-guided-heading">
        <h2 id="mira-techniques-title">Patterns &amp; practices</h2>
        <button
          type="button"
          aria-label="Close pattern and practice selector"
          onclick={() => (selecting = false)}><X size={20} /></button
        >
      </div>
      <label class="visually-hidden" for="mira-pattern-search">Search patterns and practices</label>
      <div class="mira-picker-search">
        <Search size={18} aria-hidden="true" /><input
          id="mira-pattern-search"
          type="search"
          bind:value={search}
          placeholder="Search therapeutic patterns…"
        />
      </div>
      <p class="mira-picker-hint">
        Therapeutic patterns for {modalityById(modalityId).name}, plus method-neutral reflections.
        Explore in conversation or try a guided practice.
      </p>
      {#if voiceFeedback}{@render voiceFeedback()}{/if}
      {#if selected}<section class="mira-pattern-preview" aria-label="Selected pattern">
          <div>
            <h3>{selected.label}</h3>
            <p>{selected.description}</p>
            {#each THERAPY_LIBRARY.filter((t) => `technique:${t.id}` === selected.id) as technique (technique.id)}
              <a href={resolve('/[type=entityType]/[id]', { type: 'pattern', id: technique.slug })}
                >Read technique & source →</a
              >
            {/each}
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
      <div class="mira-picker-results">
        {#if error}<p role="alert">{error}</p>{/if}
        {#if visibleChoices.length === 0}<p>
            No matching therapeutic patterns for {modalityById(modalityId).name}. Try another search
            or choose a different therapy approach.
          </p>{/if}
        <div class="mira-technique-list">
          {#each visibleChoices as choice, index (choice.id)}
            <button
              type="button"
              disabled={choice.disabled}
              aria-pressed={selectedId === choice.id}
              onclick={() => selectPattern(choice.id)}
            >
              <span class="mira-picker-choice-title"
                ><span><span class="mira-choice-number">{index + 1}</span> {choice.label}</span
                ><ChevronRight size={18} aria-hidden="true" /></span
              >
              <small
                >{choice.id.startsWith('technique:')
                  ? choice.description
                  : 'Explore in conversation'}</small
              >
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
