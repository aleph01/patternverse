<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { BearingsPractice, BearingsNotebook } from '@patternverse/workspace';
  import { Sparkles, X } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import { requestModelText } from '$lib/pattern-run/local-model';
  import { useBearingsAi } from './ai.svelte';
  import { OpenRouterConnectionError } from '$lib/mira/openrouter';
  import {
    suggestionSources,
    suggestionFields,
    suggestionMessages,
    parseSuggestions,
    type SuggestedAnswer,
    type SuggestionSource,
  } from './suggestions';
  import BearingsSuggestion from './BearingsSuggestion.svelte';
  import type { PatternRun } from '$lib/pattern-runtime/types';
  import { startSourceRun, restoreSourceRun, applySourceAction } from '$lib/pattern-runtime/source';
  import { createPracticeLifecycle } from '$lib/pattern-run/lifecycle';
  import { practiceSnapshot } from '$lib/pattern-run/history';
  import { promptFor } from '$lib/pattern-run/view';
  import PatternStepEditor from '$lib/components/PatternStepEditor.svelte';
  import ShowContent from '$lib/components/ShowContent.svelte';
  import type { TimerSessionState } from '$lib/practice/timer';

  let {
    practice,
    notebook,
    cellId,
    onchange,
  }: {
    practice: BearingsPractice;
    notebook: BearingsNotebook;
    cellId: string;
    onchange: (
      practice: BearingsPractice,
      responses: readonly { id: string; prompt: string; answer: string }[],
      runId: string,
    ) => void;
  } = $props();
  let run = $state.raw<PatternRun | null>(null);
  let working = $state(true),
    error = $state('');
  let timers = $state<Record<string, TimerSessionState>>({});
  const initial = untrack(() => practice);
  let latestDraft = initial.draft ?? '';
  const lifecycle = createPracticeLifecycle((state) => {
    working = state.working;
    error = state.error;
  });
  const pending = $derived(run?.view.pending);
  const ai = useBearingsAi();
  $effect(() => {
    if (ai && !ai.enabled) {
      request?.abort();
      request = undefined;
      suggesting = false;
    }
  });
  let editor = $state<PatternStepEditor>();
  let scope = $state<'branch' | 'situation'>(
    untrack(() =>
      notebook.chapters.flatMap((chapter) => chapter.cells).find((cell) => cell.id === cellId)
        ?.parentId
        ? 'branch'
        : 'situation',
    ),
  );
  let suggestions = $state<SuggestedAnswer[]>([]);
  let used = $state<Record<string, { text: string; before: string }>>({});
  let sourceSnapshot = $state<SuggestionSource[]>([]);
  let suggesting = $state(false),
    suggestionError = $state(''),
    suggestionNotice = $state('');
  let connectionIssue = $state(false);
  let request: AbortController | undefined;
  const sources = $derived(suggestionSources(notebook, cellId, scope));
  const fields = $derived(pending ? suggestionFields(pending, editor?.getDraft()) : []);
  const available = $derived(
    suggestions.filter(
      (suggestion) =>
        suggestion.text.trim() &&
        fields.some((field) => field.id === suggestion.fieldId && !field.answer.trim()),
    ),
  );
  function clearSuggestions() {
    request?.abort();
    request = undefined;
    suggesting = false;
    suggestions = [];
    used = {};
    suggestionError = '';
    suggestionNotice = '';
    connectionIssue = false;
  }
  $effect(() => {
    if (pending?.effect_id) untrack(clearSuggestions);
  });
  function useSuggestion(id: string) {
    const suggestion = suggestions.find((item) => item.fieldId === id);
    const before = fields.find((field) => field.id === id)?.answer ?? '';
    if (!suggestion || !suggestion.text.trim() || !editor?.setTextAnswer(id, suggestion.text))
      return;
    used = { ...used, [id]: { text: suggestion.text, before } };
    suggestions = suggestions.filter((item) => item.fieldId !== id);
  }
  function undoSuggestion(id: string) {
    const applied = used[id];
    if (applied && editor?.setTextAnswer(id, applied.before, applied.text)) {
      const next = { ...used };
      delete next[id];
      used = next;
    }
  }
  async function suggest() {
    if (!pending || !run || working || suggesting || (ai && !ai.enabled)) return;
    const controller = new AbortController();
    request = controller;
    suggesting = true;
    suggestionError = '';
    suggestionNotice = '';
    connectionIssue = false;
    const requestedFields = suggestionFields(pending, editor?.getDraft());
    const requestedSources = sources.map((source) => ({ ...source }));
    try {
      const messages = suggestionMessages({
        title: practice.title,
        fields: requestedFields,
        sources: requestedSources,
        exercise: {
          instruction: pending.request.payload,
          context: run.view.items
            .filter((item) => item.effect.request.kind.startsWith('content.'))
            .slice(-3)
            .map((item) => item.effect.request.payload),
          confirmed: practiceSnapshot(run, {
            patternRef: practice.ref,
            patternTitle: practice.title,
            patternType: 'practice',
            verseIds: [],
          }).responses,
        },
      });
      const reply = ai
        ? await ai.request(
            messages.map((message, index) =>
              index === 0
                ? { ...message, content: `${message.content}\nResponse style: ${ai.style}.` }
                : message,
            ),
            controller.signal,
          )
        : await requestModelText(
            messages,
            '__TAURI_INTERNALS__' in window,
            AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)]),
          );
      if (request !== controller || controller.signal.aborted) return;
      suggestions = parseSuggestions(reply, requestedFields, requestedSources);
      sourceSnapshot = requestedSources;
      if (!suggestions.length)
        suggestionNotice = 'Your notes do not yet give enough context for an answer to this step.';
    } catch (cause) {
      if (request !== controller || controller.signal.aborted) return;
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      connectionIssue = cause instanceof OpenRouterConnectionError;
      suggestionError =
        cause instanceof Error
          ? cause.message
          : 'Suggestions could not be created. Please try again.';
    } finally {
      if (request === controller) {
        suggesting = false;
        request = undefined;
      }
    }
  }
  function accept(next: PatternRun, restoring = false) {
    const snapshot = practiceSnapshot(
      next,
      {
        patternRef: practice.ref,
        patternTitle: practice.title,
        patternType: 'practice',
        verseIds: [],
      },
      { resumable: true },
    );
    run = next;
    latestDraft = restoring ? (initial.draft ?? '') : '';
    onchange(
      {
        ...practice,
        checkpoint: snapshot.checkpoint,
        status: snapshot.status,
        draft: restoring ? initial.draft : undefined,
      },
      snapshot.responses,
      next.view.root_id,
    );
  }
  async function begin() {
    await lifecycle.execute(
      () =>
        initial.checkpoint
          ? restoreSourceRun(initial.source, initial.checkpoint)
          : startSourceRun(initial.source),
      (next) => accept(next, true),
      {
        replace: true,
        message: (cause) =>
          cause instanceof Error ? cause.message : 'This practice could not be opened.',
      },
    );
    // Restore an unfinished field draft after validating its exact source/checkpoint.
    if (initial.draft && run) latestDraft = initial.draft;
  }
  onMount(() => {
    void begin();
    return () => {
      lifecycle.dispose();
      request?.abort();
    };
  });
  function draftFor(effectId: string): unknown {
    try {
      const draft = JSON.parse(initial.draft ?? 'null');
      return draft?.effectId === effectId ? draft.result : null;
    } catch {
      return null;
    }
  }
  function saveDraft(result: unknown) {
    if (!pending || !run) return;
    const draft = JSON.stringify({ effectId: pending.effect_id, result });
    if (draft === latestDraft) return;
    latestDraft = draft;
    onchange({ ...practice, draft }, [], run.view.root_id);
  }
  async function confirm(result: unknown) {
    if (!run || !pending || working) return;
    const current = run,
      effect = pending;
    clearSuggestions();
    await lifecycle.execute(
      () =>
        applySourceAction(
          current,
          { Fulfill: { effect_id: effect.effect_id, result } },
          effect.run_id,
        ),
      accept,
      {
        message: (cause) =>
          cause instanceof Error ? cause.message : 'This response could not be confirmed.',
      },
    );
  }
</script>

<section class="bearings-practice" aria-label={practice.title}>
  <h4>{practice.title}</h4>
  <p class="hint">Responses are saved in this notebook as you continue.</p>
  {#if error}<p role="alert">{error} <button type="button" onclick={begin}>Retry</button></p>{/if}
  {#if !run && working}<p role="status">Opening practice…</p>{/if}
  {#if run}
    {#each run.view.items
      .filter((item) => item.effect.request.kind.startsWith('content.'))
      .slice(-3) as item (item.effect.effect_id)}
      <ShowContent effect={item.effect} runningAllowed={true} />
    {/each}
    {#if pending && run.view.status === 'Waiting'}
      <p class="prompt">{promptFor(pending)}</p>
      {#if fields.length}
        <div class="suggest-tools">
          <button
            class="suggest-button"
            type="button"
            disabled={working ||
              suggesting ||
              (ai && !ai.enabled) ||
              !fields.some((field) => !field.answer.trim())}
            onclick={suggest}
            ><Sparkles size={14} aria-hidden="true" />{suggesting
              ? 'Reading your notes…'
              : 'Suggest from my notes'}</button
          >
          {#if suggesting}<button
              class="cancel-suggestion"
              type="button"
              aria-label="Cancel suggestions"
              onclick={clearSuggestions}><X size={14} aria-hidden="true" /></button
            >{/if}
          <select
            aria-label="Suggestion context"
            value={scope}
            disabled={suggesting || working}
            onchange={(event) => {
              clearSuggestions();
              scope = event.currentTarget.value as typeof scope;
            }}
          >
            <option value="branch">This branch</option><option value="situation"
              >Whole situation</option
            >
          </select>
          <details class="context-notes">
            <summary
              >{sources.length} {sources.length === 1 ? 'note' : 'notes'} + this exercise</summary
            >
            {#each sources as source (source.id)}<p>
                <strong>Cell {source.number}</strong>{source.text}
              </p>{/each}
          </details>
        </div>
        <p class="ai-hint">
          {ai && !ai.enabled
            ? 'AI is off. Enable it from the top bar to suggest answers.'
            : typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
              ? 'Uses your selected local model.'
              : 'Sends this context to your selected OpenRouter model.'} Review each draft before using
          it.
        </p>
        {#if suggestionError}<p class="ai-error" role="alert">
            {suggestionError}
            {#if connectionIssue}<a
                href={resolve('/auth/openrouter/connect')}
                target="_blank"
                rel="noopener noreferrer">Connect with OpenRouter ↗</a
              >{/if}
          </p>{/if}
        {#if suggestionNotice}<p class="ai-hint" role="status">{suggestionNotice}</p>{/if}
        {#if available.length > 1}<button
            class="use-all"
            type="button"
            disabled={working || suggesting}
            onclick={() => {
              for (const suggestion of [...available]) useSuggestion(suggestion.fieldId);
            }}>Use {available.length} suggestions</button
          >{/if}
      {/if}
      {#if ['interaction.form', 'interaction.ask', 'interaction.rate', 'interaction.choose', 'interaction.select', 'interaction.timer'].includes(pending.request.kind)}
        {#key pending.effect_id}<PatternStepEditor
            bind:this={editor}
            effect={pending}
            initialResult={draftFor(pending.effect_id)}
            intent="respond"
            disabled={working}
            {timers}
            onTimerChange={(id, state) => (timers = { ...timers, [id]: state })}
            onSave={confirm}
            onCancel={() => {}}
            onDraftChange={saveDraft}
          >
            {#snippet assistance(id: string, answer: string)}
              <BearingsSuggestion
                suggestion={suggestions.find((suggestion) => suggestion.fieldId === id)}
                sources={sourceSnapshot}
                {answer}
                applied={used[id]?.text}
                disabled={working || suggesting}
                onedit={(text) => {
                  suggestions = suggestions.map((suggestion) =>
                    suggestion.fieldId === id ? { ...suggestion, text } : suggestion,
                  );
                }}
                onuse={() => useSuggestion(id)}
                ondismiss={() => {
                  suggestions = suggestions.filter((suggestion) => suggestion.fieldId !== id);
                }}
                onundo={() => undoSuggestion(id)}
              />
            {/snippet}
          </PatternStepEditor>{/key}
      {:else}<p>
          This step needs a capability available in the full practice view. Your confirmed responses
          are kept here.
        </p>{/if}
    {:else if run.view.status === 'Completed'}<p class="complete" role="status">
        Practice complete. Your responses are in the notebook.
      </p>{/if}
  {/if}
</section>

<style>
  .bearings-practice {
    margin-top: 1rem;
    padding: 1.2rem;
    background: var(--bearings-surface);
    border-radius: 8px;
  }
  h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }
  .hint {
    font-size: 0.76rem;
    color: var(--bearings-muted);
    margin: 0.5rem 0 1.2rem;
  }
  .prompt {
    white-space: pre-wrap;
    line-height: 1.6;
  }
  .complete {
    color: var(--bearings-accent);
  }
  .suggest-tools {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.85rem 0 0.35rem;
  }
  .suggest-tools button,
  .suggest-tools select,
  .use-all {
    min-height: 36px;
    border: 0;
    border-radius: 5px;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.4rem 0.65rem;
  }
  .suggest-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bearings-accent-soft, #dff5eb);
    color: var(--bearings-accent);
    font-weight: 600 !important;
  }
  .suggest-tools select,
  .cancel-suggestion {
    background: transparent;
    color: var(--bearings-muted);
    max-width: 100%;
  }
  .suggest-tools button:disabled,
  .use-all:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .context-notes {
    font-size: 0.72rem;
    color: var(--bearings-muted);
  }
  .context-notes summary {
    cursor: pointer;
  }
  .context-notes[open] {
    flex-basis: 100%;
    max-height: 15rem;
    overflow: auto;
  }
  .context-notes p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.5;
  }
  .context-notes strong {
    display: block;
    margin-bottom: 0.2rem;
  }
  .ai-hint {
    font-size: 0.7rem;
    line-height: 1.5;
    color: var(--bearings-muted);
    margin: 0.35rem 0 1rem;
  }
  .ai-error {
    font-size: 0.78rem;
    line-height: 1.5;
    color: #a32626;
  }
  .ai-error a {
    color: var(--bearings-accent);
  }
  .use-all {
    background: transparent;
    color: var(--bearings-accent);
    margin-bottom: 0.75rem;
    padding-left: 0;
  }
  @media (pointer: coarse) {
    .suggest-tools button,
    .suggest-tools select,
    .use-all {
      min-height: 44px;
    }
  }
  :global(.bearings-practice .pattern-run-actions button) {
    min-height: 40px;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    padding: 0.6rem 0.9rem;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    font: inherit;
  }
  :global(.bearings-practice .pattern-run-selections) {
    display: grid;
    gap: 0.5rem;
    border: 0;
    padding: 0;
  }
  :global(.bearings-practice .pattern-run-selections label) {
    display: flex;
    gap: 0.6rem;
  }
</style>
