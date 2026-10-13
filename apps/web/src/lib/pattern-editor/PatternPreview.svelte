<script lang="ts">
  import { onMount } from 'svelte';
  import TextInput from '$lib/practice-inputs/TextInput.svelte';
  import RatingInput from '$lib/practice-inputs/RatingInput.svelte';
  import type { Inspection } from './types';
  import { applySourcePreview, inputValues, startSourcePreview } from './bridge';
  import type { PatternRun as StandaloneRun } from '$lib/pattern-runtime/types';
  import { answerFor, promptFor } from '$lib/pattern-run/view';
  import { createPracticeLifecycle } from '$lib/pattern-run/lifecycle';
  import GuidedSelection from '$lib/mira/GuidedSelection.svelte';
  import PatternTimer from '$lib/components/PatternTimer.svelte';
  import PracticeTimerDock from '$lib/components/PracticeTimerDock.svelte';
  import PatternForm from '$lib/components/PatternForm.svelte';
  import ShowContent from '$lib/components/ShowContent.svelte';
  import PracticeMarkdownPreview from '$lib/components/PracticeMarkdownPreview.svelte';
  import type { TimerSessionState } from '$lib/practice/timer';
  let {
    source,
    inspection,
    checking = false,
    disabled = false,
  }: {
    source: string;
    inspection: Inspection | null;
    checking?: boolean;
    disabled?: boolean;
  } = $props();
  let run = $state<StandaloneRun | null>(null),
    pinnedSource = $state(''),
    working = $state(false),
    error = $state('');
  let answer = $state(''),
    rating = $state(0),
    mock = $state('');
  let inputs = $state<Record<string, string>>({}),
    timers = $state<Record<string, TimerSessionState>>({});
  const lifecycle = createPracticeLifecycle((state) => {
    working = state.working;
    error = state.error;
  });
  let dockedTimerIds = $state<string[]>([]);
  const pending = $derived(run?.view.pending);
  const scale = $derived(
    (pending?.request.payload.rating ?? {}) as {
      min?: number;
      max?: number;
      low?: string;
      high?: string;
    },
  );
  const current = $derived(run?.view.status === 'Waiting');
  const ready = $derived(Boolean(inspection?.structure) && !checking && !disabled);
  const changed = $derived(Boolean(run) && pinnedSource !== source);
  const id = $props.id();
  onMount(() => () => {
    lifecycle.dispose();
    run = null;
    timers = {};
  });
  $effect(() => {
    if (pending) {
      answer = '';
      mock = '';
      rating = Number(scale.min ?? 0);
    }
  });
  async function start() {
    if (!ready || working) return;
    const snapshot = source;
    await lifecycle.execute(
      () => startSourcePreview(snapshot, inputValues(inspection!.structure!.inputs, inputs)),
      (next) => {
        run = next;
        pinnedSource = snapshot;
        timers = {};
      },
      { message: String },
    );
  }
  async function action(event: unknown, runId: string) {
    if (!run || working || disabled) return;
    const currentRun = run;
    await lifecycle.execute(
      () => applySourcePreview(currentRun, event, runId),
      (next) => (run = next),
      { message: String },
    );
  }
  function fulfill(kind: string, value: unknown) {
    if (pending)
      void action(
        { Fulfill: { effect_id: pending.effect_id, result: { kind, value } } },
        pending.run_id,
      );
  }
  function manualResult() {
    try {
      if (pending)
        void action(
          { Fulfill: { effect_id: pending.effect_id, result: JSON.parse(mock) } },
          pending.run_id,
        );
    } catch {
      error = 'Enter a valid, tagged JSON result. The runtime will check its contract.';
    }
  }
</script>

<div class="preview">
  <header>
    <strong>Preview</strong>
    <div>
      {#if run && current}<button
          type="button"
          disabled={working || disabled}
          onclick={() => action('Pause', run!.view.root_id)}>Pause</button
        >{:else if run?.view.status === 'Paused'}<button
          type="button"
          disabled={working || disabled}
          onclick={() => action('Resume', run!.view.root_id)}>Resume</button
        >{/if}<button type="button" disabled={!ready || working} onclick={start}
        >{run ? 'Restart' : 'Run preview'}</button
      >
    </div>
  </header>
  <div
    class="preview-body"
    style:--practice-timer-space={dockedTimerIds.length
      ? `min(30dvh, ${dockedTimerIds.length * 90 + 24}px)`
      : '0px'}
  >
    <p class="privacy">Temporary test run · no saved responses · no AI calls</p>
    {#if changed}<p class="changed" role="status">
        Source changed. Restart to try the latest version; this run keeps its original source.
      </p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if !run}
      <h3>{inspection?.structure?.title ?? 'Try your practice'}</h3>
      <p>Test the same prompts and controls your reader will see.</p>
      {#if inspection?.structure}
        {#each Object.entries(inspection.structure.inputs) as [name, type] (name)}
          <label class="starting-input"
            ><span>{name} <small>({typeof type === 'string' ? type : 'typed JSON'})</small></span
            ><input
              value={inputs[name] ?? ''}
              oninput={(event) => (inputs[name] = event.currentTarget.value)}
            /></label
          >
        {/each}
      {:else}<p class="quiet">
          {checking ? 'Checking your source…' : 'Resolve the source errors before starting.'}
        </p>{/if}
    {:else}
      <PracticeTimerDock
        view={run.view}
        {timers}
        bind:dockedIds={dockedTimerIds}
        disabled={working || disabled}
        runningAllowed={current || run.view.status === 'Completed'}
        onchange={(id, state) => (timers[id] = state)}
      />
      {#each run.view.items as item (`${item.effect.run_id}:${item.effect.effect_id}`)}
        {#if ['content.show', 'content.video', 'content.image'].includes(item.effect.request.kind)}
          <div class="shown">
            {#if item.effect.request.payload.view || ['content.video', 'content.image'].includes(item.effect.request.kind)}<ShowContent
                effect={item.effect}
                runningAllowed={current || run.view.status === 'Completed'}
              />{:else}<PracticeMarkdownPreview markdown={promptFor(item.effect)} />{/if}
          </div>
        {:else if item.result !== null}
          <section class="step completed">
            <span class="eyebrow">completed</span><PracticeMarkdownPreview
              markdown={promptFor(item.effect)}
            />
            {#if item.effect.request.kind === 'interaction.form'}
              <PatternForm
                effect={item.effect}
                result={item.result}
                {timers}
                {dockedTimerIds}
                onTimerChange={(id, state) => (timers[id] = state)}
                runningAllowed={current || run.view.status === 'Completed'}
              />
            {:else}<p class="previous">
                {answerFor(item.effect, item.result) || 'Step completed'}
              </p>{/if}
            {#if item.effect.request.kind === 'interaction.timer'}<PatternTimer
                docked={dockedTimerIds.includes(item.effect.effect_id)}
                effect={item.effect}
                state={timers[item.effect.effect_id]}
                active={false}
                runningAllowed={current || run.view.status === 'Completed'}
                onchange={(state) => (timers[item.effect.effect_id] = state)}
              />{/if}
          </section>
        {/if}
      {/each}
      {#if pending && (current || run.view.status === 'Paused')}
        <section class="step" aria-label="Current preview step">
          <span class="eyebrow">{run.view.status === 'Paused' ? 'paused' : 'current step'}</span>
          <PracticeMarkdownPreview markdown={promptFor(pending)} />
          {#key pending.effect_id}
            {#if pending.request.kind === 'interaction.form'}
              <PatternForm
                effect={pending}
                {timers}
                {dockedTimerIds}
                disabled={!current || working || disabled}
                onTimerChange={(id, state) => (timers[id] = state)}
                runningAllowed={current}
                onConfirm={fulfill}
              />
            {:else if pending.request.kind === 'interaction.ask'}
              <div class="response-controls">
                <TextInput
                  id={`${id}-response`}
                  label="Your preview response"
                  labelClass="visually-hidden"
                  bind:value={answer}
                  disabled={!current || working || disabled}
                  placeholder="Write a test response…"
                /><button
                  class="primary"
                  type="button"
                  onclick={() => fulfill('text', answer)}
                  disabled={!current || working || disabled}>Continue →</button
                >
              </div>
            {:else if pending.request.kind === 'interaction.choose' || pending.request.kind === 'interaction.select'}
              <GuidedSelection
                effect={pending}
                disabled={!current || working || disabled}
                onConfirm={fulfill}
              />
            {:else if pending.request.kind === 'interaction.rate'}
              <div class="response-controls">
                <RatingInput
                  id={`${id}-rating`}
                  {scale}
                  presentation="range"
                  bind:value={rating}
                  disabled={!current || working || disabled}
                /><button
                  class="primary"
                  type="button"
                  onclick={() => fulfill('rating', rating)}
                  disabled={!current || working || disabled}>Continue →</button
                >
              </div>
            {:else if pending.request.kind === 'interaction.timer'}
              <PatternTimer
                docked={dockedTimerIds.includes(pending.effect_id)}
                effect={pending}
                state={timers[pending.effect_id]}
                disabled={!current || working || disabled}
                runningAllowed={current}
                onchange={(state) => (timers[pending!.effect_id] = state)}
                onconfirm={(result) => fulfill('timer', result)}
              />
            {:else}
              <p class="quiet">
                This step requests <code>{pending.request.kind}</code>. Supply a mock result below;
                no model or external action will run.
              </p>
              <label for={`${id}-mock`}>Mock result (tagged JSON)</label><textarea
                id={`${id}-mock`}
                rows="4"
                bind:value={mock}
                disabled={!current || working || disabled}
                placeholder={'{"kind":"generated","value":{"type":"text","value":"Test reply"}}'}
              ></textarea><button
                type="button"
                disabled={!current || working || disabled}
                onclick={manualResult}>Submit mock result</button
              >
            {/if}
          {/key}
          {#if pending.loop_context}<button
              type="button"
              disabled={working || disabled || !current}
              onclick={() => action({ StopLoop: { effect_id: pending.effect_id } }, pending.run_id)}
              >Leave loop</button
            >{/if}
        </section>
      {/if}
      <p class="run-status" role="status">
        {run.view.status === 'Completed'
          ? 'Practice complete. Your test answers remain visible until you restart or leave.'
          : run.view.status}
      </p>
    {/if}
  </div>
</div>

<style>
  .preview {
    min-width: 0;
  }
  header {
    min-height: 48px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid #dedfd8;
    font-size: 13px;
  }
  header div {
    display: flex;
    gap: 6px;
  }
  .preview button {
    text-transform: none;
    border: 1px solid #dedfd8;
    background: var(--paper);
    color: var(--ink);
    border-radius: 3px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .preview-body {
    padding: 20px;
  }
  h3 {
    font-size: 20px;
    letter-spacing: -0.4px;
    margin: 20px 0 8px;
  }
  p {
    font-size: 14px;
    line-height: 1.55;
    margin: 12px 0;
  }
  .privacy,
  .quiet {
    color: var(--ink-muted, #62655f);
    font-size: 12px;
  }
  .privacy {
    margin: 0 0 18px;
  }
  .step,
  .shown {
    scroll-margin-top: calc(var(--practice-timer-space, 0px) + 1rem);
    margin: 18px 0 0;
    padding: 18px 0 0;
    border-top: 1px solid #dedfd8;
    overflow-wrap: anywhere;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #397454;
    font-weight: 750;
  }
  .previous {
    white-space: pre-wrap;
    background: #f7f8f4;
    color: #181814;
    padding: 12px;
  }
  .step :global(.markdown-body) {
    font-size: 15px;
  }
  .preview textarea,
  .preview :global(textarea.practice-text-input) {
    width: 100%;
    min-height: 90px;
    resize: vertical;
    padding: 12px;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid #dedfd8;
    border-radius: 3px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.6;
  }
  .response-controls {
    display: grid;
    gap: 10px;
  }
  .response-controls button {
    justify-self: end;
  }
  .preview button.primary {
    background: var(--green);
    color: #181814;
    border-color: var(--green);
    padding: 10px 16px;
  }
  .error {
    color: #a43229;
  }
  .changed {
    background: #f6f1e6;
    color: #584419;
    padding: 12px;
    font-size: 12px;
  }
  .starting-input {
    display: grid;
    gap: 8px;
    margin: 16px 0;
  }
  .starting-input input {
    padding: 10px;
    border: 1px solid #dedfd8;
    background: var(--paper);
    color: var(--ink);
  }
  .response-controls :global(input[type='range']) {
    width: 100%;
  }
  .run-status {
    font-size: 12px;
    color: #397454;
    margin-top: 22px;
  }

  @media (max-width: 700px) {
    .preview-body {
      padding: 18px 14px;
    }
    textarea,
    .preview :global(textarea.practice-text-input),
    .starting-input input {
      font-size: 16px;
    }
    button {
      min-height: 42px;
    }
  }
</style>
