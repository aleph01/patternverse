<script lang="ts">
  import ShowContent from '$lib/components/ShowContent.svelte';
  import { onMount } from 'svelte';
  import PatternForm from '$lib/components/PatternForm.svelte';
  import PracticeMarkdownPreview from '$lib/components/PracticeMarkdownPreview.svelte';
  import { promptFor } from '$lib/pattern-run/view';
  import { createPracticeLifecycle } from '$lib/pattern-run/lifecycle';
  import type { FormAnswers } from '$lib/pattern-run/form';
  import type { TimerSessionState } from '$lib/practice/timer';
  import type { PatternRun } from '$lib/pattern-runtime/types';
  import {
    startSourceRun,
    applySourceAction,
    serializeSourceRun,
    restoreSourceRun,
  } from '$lib/pattern-runtime/source';

  let {
    source,
    title,
    checkpoint,
    oncheckpoint,
    failureMessage,
    onchange,
  }: {
    source: string;
    title: string;
    /** Explicit handoff from the caller only; never read from storage or a URL. */
    checkpoint?: string;
    oncheckpoint?: (checkpoint: string) => void;
    /** Optional host-specific fallback wording; does not change runtime behavior. */
    failureMessage?: string;
    /** Host-owned persistence/export adapter; the renderer never writes storage. */
    onchange?: (run: PatternRun) => void;
  } = $props();

  let run = $state<PatternRun | null>(null);
  let timers = $state<Record<string, TimerSessionState>>({});
  let working = $state(true);
  let error = $state('');
  const lifecycle = createPracticeLifecycle((state) => {
    working = state.working;
    error = state.error;
  });
  const pending = $derived(run?.view.pending);
  const active = $derived(run?.view.status === 'Waiting');
  const completed = $derived(run?.view.status === 'Completed');

  function accept(next: PatternRun) {
    run = next;
    if (oncheckpoint) oncheckpoint(serializeSourceRun(next));
    onchange?.(next);
  }

  async function begin(saved?: string) {
    await lifecycle.execute(
      () => (saved === undefined ? startSourceRun(source) : restoreSourceRun(source, saved)),
      (next) => {
        timers = {};
        accept(next);
      },
      {
        replace: true,
        message: (cause) =>
          failureMessage ??
          (cause instanceof Error ? cause.message : 'Could not open this practice.'),
      },
    );
  }

  onMount(() => {
    void begin(checkpoint);
    return () => {
      lifecycle.dispose();
    };
  });

  async function confirm(kind: 'form', value: FormAnswers) {
    if (!run || !pending || working || !active) return;
    const current = run;
    const effect = pending;
    await lifecycle.execute(
      () =>
        applySourceAction(
          current,
          {
            Fulfill: { effect_id: effect.effect_id, result: { kind, value } },
          },
          effect.run_id,
        ),
      accept,
      {
        message: (cause) =>
          failureMessage ??
          (cause instanceof Error ? cause.message : 'Could not continue this practice.'),
      },
    );
  }
</script>

<section class="practice-embed" aria-label={title}>
  <header>
    <div>
      <p class="eyebrow">guided practice</p>
      <h1>{title}</h1>
    </div>
    <button type="button" disabled={working} onclick={() => begin()}>Restart</button>
  </header>
  <p class="privacy">Answers stay in this open view. Nothing is saved automatically.</p>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if !run && working}<p role="status">Opening practice…</p>{/if}
  {#if run}
    {#each run.view.items as item (`${item.effect.run_id}:${item.effect.effect_id}`)}
      {#if ['content.video', 'content.image'].includes(item.effect.request.kind)}
        <ShowContent effect={item.effect} runningAllowed={active || completed} />
      {:else if item.effect.request.kind === 'content.show'}
        <PracticeMarkdownPreview markdown={promptFor(item.effect)} />
      {:else if item.result !== null && item.effect.request.kind === 'interaction.form'}
        <section class="step complete">
          <h2>{promptFor(item.effect)}</h2>
          <PatternForm
            effect={item.effect}
            result={item.result}
            {timers}
            onTimerChange={(id, state) => (timers[id] = state)}
            runningAllowed={active || completed}
          />
        </section>
      {/if}
    {/each}
    {#if pending && active}
      <section class="step current" aria-label="Current practice step" aria-busy={working}>
        <h2>{promptFor(pending)}</h2>
        {#key pending.effect_id}
          {#if pending.request.kind === 'interaction.form'}
            <PatternForm
              effect={pending}
              {timers}
              disabled={working}
              onTimerChange={(id, state) => (timers[id] = state)}
              onConfirm={confirm}
            />
          {:else}
            <p role="status">
              This prototype supports worksheet forms only. This interaction needs another
              presentation adapter.
            </p>
          {/if}
        {/key}
      </section>
    {/if}
    {#if completed}<p class="completion" role="status">
        Practice complete. Your answers remain visible until you restart or close this view.
      </p>{/if}
  {/if}
</section>

<style>
  .practice-embed {
    color: #181814;
    background: #fff;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    padding: clamp(16px, 4vw, 36px);
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    overflow-wrap: anywhere;
  }
  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 16px;
  }
  h1 {
    font-size: clamp(24px, 4vw, 34px);
    line-height: 1.15;
    margin: 6px 0 12px;
    letter-spacing: -0.03em;
  }
  h2 {
    font-size: 19px;
    line-height: 1.35;
    margin: 0 0 20px;
    letter-spacing: -0.02em;
  }
  .eyebrow {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: #486353;
  }
  button {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 8px 12px;
    background: #fff;
    border: 1px solid #b8c3bc;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 3px solid #1557ff;
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .privacy {
    font-size: 13px;
    line-height: 1.5;
    color: #58625b;
    margin: 0 0 28px;
  }
  .step {
    padding: 24px 0;
    border-top: 1px solid #d7dfd9;
  }
  .current {
    padding: 24px;
    background: #edf8f1;
    border: 1px solid #d7dfd9;
  }
  .completion {
    margin: 24px 0 0;
    line-height: 1.5;
    font-weight: 600;
  }
  [role='alert'] {
    color: #9c2d20;
  }
  @media (max-width: 520px) {
    header {
      flex-wrap: wrap;
    }
    .current {
      padding: 20px 16px;
    }
    .step {
      margin-top: 16px;
    }
  }
</style>
