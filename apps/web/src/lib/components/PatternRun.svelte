<script lang="ts">
  import { onMount, tick } from 'svelte';
  import TextInput from '$lib/practice-inputs/TextInput.svelte';
  import RatingInput from '$lib/practice-inputs/RatingInput.svelte';
  import SelectionChoices from '$lib/practice-inputs/SelectionChoices.svelte';
  import { selectionWithinBounds } from '$lib/practice-inputs/selection';
  import { executionStepKey, supportsStepEditing } from '$lib/pattern-run/revisit';
  import {
    createPracticeRunController,
    initialPracticeRunState,
    modelKinds,
    type PracticeRunState,
  } from '$lib/pattern-run/controller';
  import { practiceRunPorts } from '$lib/pattern-run/run-adapters';
  import PatternStepEditor from '$lib/components/PatternStepEditor.svelte';
  import WorksheetStep from '$lib/components/WorksheetStep.svelte';
  import PatternTimer from '$lib/components/PatternTimer.svelte';
  import PracticeTimerDock from '$lib/components/PracticeTimerDock.svelte';
  import PatternForm from '$lib/components/PatternForm.svelte';
  import PracticeResponse from '$lib/components/PracticeResponse.svelte';
  import PracticeHistorySave from '$lib/components/PracticeHistorySave.svelte';
  import GuidedAiConnection from '$lib/components/GuidedAiConnection.svelte';
  import GuidedAiChoice from '$lib/components/GuidedAiChoice.svelte';
  import ShowContent from '$lib/components/ShowContent.svelte';
  import type { TimerSessionState } from '$lib/practice/timer';
  import type { PatternTimerResult } from '$lib/pattern-run/timer';
  import type { FormAnswers } from '$lib/pattern-run/form';
  import { focusWorksheetStep } from '$lib/practice/worksheet-focus';
  import { resolve } from '$app/paths';
  import PatternverseLogo from '$lib/components/PatternverseLogo.svelte';
  import LegalLinks from '$lib/legal/LegalLinks.svelte';
  import { worksheetSteps, lastShownContent, optionsFor, promptParts } from '$lib/pattern-run/view';
  import { canRunStandalonePattern, resolveReleaseFeatures } from '$lib/release-features';
  import '$lib/pattern-run/pattern-run.css';

  let {
    data,
  }: {
    data: {
      pattern: {
        id: string;
        title: string;
        summary: string;
        sourceId?: string;
        type?: 'pattern' | 'practice';
        verseIds?: readonly string[];
      };
      techniqueId: string;
      modality: string;
      languagePracticeSource: string | null;
      isTherapy: boolean;
      needsAi: boolean;
      aiReason: string | null;
      inputNames: readonly string[];
      returnHref?: `/pattern/${string}` | `/practice/${string}`;
    };
  } = $props();
  const returnHref = $derived(data.returnHref ?? (`/pattern/${data.pattern.id}` as const));
  let desktop = $state(false);
  // Controller snapshots are immutable. Preserve run/effect identity across
  // busy/connection updates so an unrelated refresh never resets typed drafts.
  let runState = $state.raw<PracticeRunState>(initialPracticeRunState());
  const run = $derived(runState.run);
  const savedRunId = $derived(runState.savedRunId);
  const working = $derived(runState.working);
  const error = $derived(runState.error);
  const unavailable = $derived(runState.unavailable);
  const editing = $derived(runState.editing);
  const reviewIds = $derived(runState.reviewIds);
  const retained = $derived(runState.retained);
  const aiBusy = $derived(runState.aiBusy);
  const connectionChecked = $derived(runState.connectionChecked);
  const connectionReady = $derived(runState.connectionReady);
  const connectionBusy = $derived(runState.connectionBusy);
  const connectionError = $derived(runState.connectionError);
  const connectionIssue = $derived(runState.connectionIssue);
  const freeAvailable = $derived(runState.freeAvailable);
  const aiProvider = $derived(runState.aiProvider);
  const practiceIdentity = $derived({
    patternRef: { sourceId: data.pattern.sourceId ?? 'commons', entityId: data.pattern.id },
    patternTitle: data.pattern.title,
    patternType: data.pattern.type ?? 'pattern',
    verseIds: data.pattern.verseIds ?? (data.isTherapy ? ['therapy'] : []),
  });
  let answer = $state('');
  let rating = $state<number | null>(null);
  let selected = $state<string[]>([]);
  let order = $state<string[]>([]);
  let timers = $state<Record<string, TimerSessionState>>({});
  let dockedTimerIds = $state<string[]>([]);
  let lastFocusedStep = '';
  let inputDraft = $state<Record<string, string>>({});
  const controller = createPracticeRunController({
    definition: () => ({
      patternId: data.pattern.id,
      sourceId: practiceIdentity.patternRef.sourceId,
      patternType: practiceIdentity.patternType,
      techniqueId: data.techniqueId,
      modality: data.modality,
      source: data.languagePracticeSource,
      inputNames: data.inputNames,
      needsAi: data.needsAi,
      desktop,
    }),
    ports: practiceRunPorts,
    onstate: (next) => (runState = next),
    onrestart: () => {
      lastFocusedStep = '';
      timers = {};
    },
    onleaveedit: (effectId) => {
      // Keep focus at the edited step rather than jumping to the next question.
      lastFocusedStep = finished
        ? 'pattern-run-complete'
        : pending
          ? `pattern-step-${pending.effect_id}`
          : '';
      void tick().then(() =>
        focusWorksheetStep(document.getElementById(`pattern-step-${effectId}`)),
      );
    },
  });
  // Drafts are read only when the pending effect changes, not on each keystroke.
  const drafts = controller.drafts;
  const features = $derived(resolveReleaseFeatures(desktop));
  const available = $derived(canRunStandalonePattern(features, data.isTherapy, data.needsAi));
  const pending = $derived(run?.view.pending ?? null);
  const history = $derived(run ? worksheetSteps(run.view) : []);
  const completedCount = $derived(history.filter((step) => step.number > 0).length);
  const choices = $derived(pending ? optionsFor(pending) : []);
  const mode = $derived(pending?.request.payload.mode);
  const min = $derived(Number(pending?.request.payload.min ?? 0));
  const max = $derived(Number(pending?.request.payload.max ?? choices.length));
  const active = $derived(run?.view.status === 'Waiting');
  const finished = $derived(run && ['Completed', 'Cancelled', 'Failed'].includes(run.view.status));

  $effect(() => {
    const target = editing
      ? `pattern-step-${editing.effectId}`
      : finished
        ? 'pattern-run-complete'
        : pending
          ? `pattern-step-${pending.effect_id}`
          : '';
    if (working || !target || target === lastFocusedStep) return;
    lastFocusedStep = target;
    void tick().then(() => focusWorksheetStep(document.getElementById(target)));
  });

  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
    const enabled = resolveReleaseFeatures(desktop);
    if (!canRunStandalonePattern(enabled, data.isTherapy, data.needsAi))
      return () => controller.dispose();
    const refreshOnReturn = () => {
      if (!desktop && (data.needsAi || connectionIssue)) void controller.checkConnection();
    };
    window.addEventListener('focus', refreshOnReturn);
    void controller.initialize(new URLSearchParams(location.search).get('history'));
    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      controller.dispose();
    };
  });

  $effect(() => {
    if (pending?.effect_id) {
      const draft = drafts.get(executionStepKey(pending)) as
        { kind?: string; value?: unknown } | undefined;
      answer = draft?.kind === 'text' && typeof draft.value === 'string' ? draft.value : '';
      rating = draft?.kind === 'rating' && typeof draft.value === 'number' ? draft.value : null;
      const recalled =
        typeof draft?.value === 'string'
          ? [draft.value]
          : Array.isArray(draft?.value)
            ? draft.value.filter((value): value is string => typeof value === 'string')
            : [];
      const validRecalled = recalled.filter((value) =>
        choices.some((option) => option.value === value),
      );
      selected = validRecalled;
      order = [
        ...validRecalled,
        ...choices.map((option) => option.value).filter((value) => !validRecalled.includes(value)),
      ];
    }
  });

  function keepCurrentDraft() {
    if (!pending) return;
    if (pending.request.kind === 'interaction.ask')
      drafts.set(executionStepKey(pending), { kind: 'text', value: answer });
    else if (pending.request.kind === 'interaction.rate')
      drafts.set(executionStepKey(pending), { kind: 'rating', value: rating });
    else if (['interaction.choose', 'interaction.select'].includes(pending.request.kind))
      drafts.set(executionStepKey(pending), {
        kind: mode === 'rank' ? 'ranked' : mode === 'single' ? 'selected' : 'selected_many',
        value: mode === 'rank' ? order : mode === 'single' ? selected[0] : selected,
      });
  }

  const begin = () => controller.begin(inputDraft);
  const chooseAi = controller.chooseAi;
  const useOpenRouter = controller.useOpenRouter;
  const checkConnection = () => controller.checkConnection();
  const cancelEdit = controller.cancelEdit;
  const retryAi = controller.retryAi;
  const stopRun = controller.stopRun;
  const stopLoop = controller.stopLoop;

  function editStep(effectId: string) {
    if (!working) keepCurrentDraft();
    return controller.editStep(effectId);
  }

  function saveEdit(result: unknown) {
    if (!working) keepCurrentDraft();
    return controller.saveEdit(result);
  }

  function fulfill(
    kind: 'text' | 'selected' | 'selected_many' | 'ranked' | 'rating' | 'timer' | 'form',
    value: string | string[] | number | PatternTimerResult | FormAnswers,
  ) {
    if (editing || !pending || (typeof value === 'string' && !value.trim())) return;
    void controller.apply(
      { Fulfill: { effect_id: pending.effect_id, result: { kind, value } } },
      pending.run_id,
    );
  }
</script>

<svelte:head>
  <title>Run {data.pattern.title} — Patternverse</title>
  <meta
    name="description"
    content={`A focused Pattern Markdown exercise: ${data.pattern.title}.`}
  />
</svelte:head>

<main class="pattern-run">
  <header class="pattern-run-header">
    <a class="pattern-run-brand" href={resolve('/')} aria-label="Patternverse home"
      ><PatternverseLogo /></a
    >
    <span class="pattern-run-breadcrumb" aria-hidden="true">/</span>
    <a class="pattern-run-parent" href={resolve(returnHref)}>Guided practice</a>
    <a class="pattern-run-exit" href={resolve(returnHref)} title="Leave this practice">Close ×</a>
  </header>

  {#if !available}
    <section class="pattern-run-notice">
      <h1>Pattern runs are unavailable in this release.</h1>
      <a href={resolve(returnHref)}>Return to {data.pattern.title}</a>
    </section>
  {:else}
    <div class="pattern-run-layout">
      <section
        class="pattern-run-stage"
        style:--practice-timer-space={dockedTimerIds.length
          ? `min(30dvh, ${dockedTimerIds.length * 90 + 24}px)`
          : '0px'}
      >
        <header class="pattern-run-worksheet-heading">
          <h1>{data.pattern.title}</h1>
          <p>{data.pattern.summary}</p>
          {#if run}<p class="pattern-run-step-count" role="status">
              {`${completedCount} ${completedCount === 1 ? 'step' : 'steps'} complete${active && pending ? ` · step ${completedCount + 1}` : ''}`}
            </p>{/if}
        </header>
        <PracticeTimerDock
          view={run?.view}
          {timers}
          bind:dockedIds={dockedTimerIds}
          disabled={Boolean(editing) || (working && !aiBusy)}
          runningAllowed={run?.view.status === 'Waiting' || run?.view.status === 'Completed'}
          onchange={(id, state) => (timers[id] = state)}
        />
        {#if !connectionChecked}<p class="pattern-run-eyebrow">Preparing pattern…</p>{/if}
        {#if !run && connectionChecked && !desktop && freeAvailable && !aiProvider}
          <GuidedAiChoice
            onFree={() => void chooseAi('free')}
            onOpenRouter={() => void chooseAi('openrouter')}
          />
        {/if}
        {#if !run && connectionChecked && !desktop && (aiProvider || !freeAvailable) && ((!connectionReady && data.needsAi) || connectionIssue)}
          <GuidedAiConnection
            reason={connectionIssue ?? 'connection'}
            checking={connectionBusy}
            error={connectionError}
            onCheck={() => void checkConnection()}
          />
        {/if}
        {#if working && !run}<p class="pattern-run-eyebrow">Preparing pattern…</p>{/if}
        {#if unavailable}<div class="pattern-run-message" role="status">
            <h2>Not available yet</h2>
            <p>{unavailable}</p>
          </div>{/if}
        {#if error}<p class="pattern-run-error" role="alert">{error}</p>{/if}

        {#if connectionReady && !run && !working && !unavailable && data.inputNames.length > 0}
          <div class="pattern-run-progress">
            <span>BEFORE YOU BEGIN</span><span class="pattern-run-progress-line"></span>
          </div>
          <form
            onsubmit={(event) => {
              event.preventDefault();
              void begin();
            }}
          >
            {#each data.inputNames as name (name)}
              <label class="pattern-run-input-label" for={`pattern-run-input-${name}`}
                >{name === 'problem'
                  ? 'What feels stuck?'
                  : name === 'observations'
                    ? 'Other clues or perspectives'
                    : 'Your current problem frame'}</label
              >
              <textarea
                id={`pattern-run-input-${name}`}
                rows="4"
                maxlength="30000"
                value={inputDraft[name] ?? ''}
                oninput={(event) => (inputDraft[name] = event.currentTarget.value)}
                placeholder={name === 'observations'
                  ? 'What else have you noticed?'
                  : 'Describe the situation in your own words…'}></textarea>
            {/each}
            <div class="pattern-run-actions">
              <button type="submit" class="pattern-run-primary">Begin →</button>
            </div>
          </form>
          <p class="pattern-run-privacy">
            {data.needsAi
              ? desktop
                ? 'AI steps use your selected local model. This run stays on your device.'
                : aiProvider === 'free'
                  ? 'Free AI validates your practice progress on the backend and sends relevant step context to Cloudflare Workers AI. Saving responses is optional.'
                  : 'AI steps send the pattern instruction and relevant answers to your selected OpenRouter model with zero-retention routing. Saving responses is optional.'
              : 'No AI is needed. Choose Save to workspace to keep your confirmed responses.'}
          </p>
        {/if}

        {#if run && data.inputNames.length > 0}
          <section class="pattern-run-starting-context" aria-label="Starting context">
            <h2>Your starting point</h2>
            {#each data.inputNames as name (name)}
              <p class="pattern-run-answer-label">
                {name === 'problem'
                  ? 'What feels stuck?'
                  : name === 'observations'
                    ? 'Other clues or perspectives'
                    : 'Your current problem frame'}
              </p>
              <p class="pattern-run-previous-answer">{inputDraft[name]}</p>
            {/each}
          </section>
        {/if}
        <div class="pattern-run-steps">
          {#each history as step (step.effect.effect_id)}
            {#if step.number === 0}<ShowContent
                effect={step.effect}
                runningAllowed={run?.view.status === 'Waiting' || run?.view.status === 'Completed'}
              />{:else}
              <WorksheetStep
                id={`pattern-step-${step.effect.effect_id}`}
                number={step.number}
                heading={promptParts(step.effect).heading || `Step ${step.number}`}
                completed
                editing={editing?.effectId === step.effect.effect_id}
                reviewSuggested={reviewIds.includes(step.effect.effect_id)}
                onEdit={supportsStepEditing(step.effect)
                  ? () => void editStep(step.effect.effect_id)
                  : undefined}
                editDisabled={working}
              >
                {#if editing?.effectId === step.effect.effect_id && editing.preview.view.pending}
                  {#key editing.effectId}<PatternStepEditor
                      effect={editing.preview.view.pending}
                      initialResult={editing.initialResult}
                      disabled={working}
                      {timers}
                      {dockedTimerIds}
                      onTimerChange={(id, state) => (timers[id] = state)}
                      onDraftChange={(result) => drafts.set(executionStepKey(step.effect), result)}
                      onSave={(result) => void saveEdit(result)}
                      onCancel={cancelEdit}
                    />{/key}
                {:else}
                  {#if promptParts(step.effect).body}<p class="pattern-run-intro">
                      {promptParts(step.effect).body}
                    </p>{/if}
                  {#if step.effect.request.kind === 'interaction.form'}
                    <PatternForm
                      effect={step.effect}
                      result={step.result}
                      {timers}
                      {dockedTimerIds}
                      onTimerChange={(id, state) => (timers[id] = state)}
                      runningAllowed={Boolean(active || finished)}
                    />
                  {:else}
                    <PracticeResponse text={step.answer} />
                  {/if}
                  {#if step.effect.request.kind === 'interaction.timer'}
                    <PatternTimer
                      docked={dockedTimerIds.includes(step.effect.effect_id)}
                      effect={step.effect}
                      state={timers[step.effect.effect_id]}
                      active={false}
                      runningAllowed={run?.view.status === 'Waiting' ||
                        run?.view.status === 'Completed'}
                      onchange={(state) => (timers[step.effect.effect_id] = state)}
                    />
                  {/if}
                  {#if reviewIds.includes(step.effect.effect_id)}
                    <div class="pattern-run-review">
                      <span>An earlier response changed.</span><button
                        type="button"
                        disabled={working}
                        onclick={() => controller.keepResponse(step.effect.effect_id)}
                        >Keep this response ✓</button
                      >
                    </div>
                  {/if}
                {/if}
              </WorksheetStep>
            {/if}
          {/each}
          {#if pending && active}
            <WorksheetStep
              id={`pattern-step-${pending.effect_id}`}
              number={completedCount + 1}
              heading={modelKinds.has(pending.request.kind)
                ? 'Preparing your next step…'
                : promptParts(pending).heading || 'Your next step'}
            >
              {#if !modelKinds.has(pending.request.kind) && promptParts(pending).body}<p
                  class="pattern-run-intro"
                >
                  {promptParts(pending).body}
                </p>{/if}
              {#if modelKinds.has(pending.request.kind)}
                {#if !desktop && freeAvailable && !aiProvider}
                  <GuidedAiChoice
                    onFree={() => void chooseAi('free')}
                    onOpenRouter={() => void chooseAi('openrouter')}
                  />
                {/if}
                <p class="pattern-run-intro">
                  {aiBusy
                    ? desktop
                      ? 'Preparing the next step locally…'
                      : aiProvider === 'free'
                        ? 'Preparing the next step with free AI…'
                        : 'Preparing the next step with OpenRouter…'
                    : 'The next step needs AI-written wording.'}
                </p>
                {#if connectionIssue && !desktop}
                  <GuidedAiConnection
                    reason={connectionIssue}
                    checking={connectionBusy}
                    error={connectionError}
                    checkLabel={connectionIssue === 'free-limit'
                      ? 'Use OpenRouter for this practice'
                      : undefined}
                    onCheck={() =>
                      connectionIssue === 'free-limit'
                        ? void useOpenRouter()
                        : void checkConnection()}
                  />
                {/if}
                {#if aiProvider === 'free' && error && connectionIssue !== 'free-limit'}
                  <button
                    type="button"
                    class="pattern-run-secondary"
                    onclick={() => void useOpenRouter()}>Use OpenRouter instead</button
                  >
                {/if}
                {#if !aiBusy && (desktop || aiProvider || !freeAvailable)}<button
                    type="button"
                    class="pattern-run-primary"
                    onclick={retryAi}>Try this step →</button
                  >{/if}
              {:else if pending.request.kind === 'interaction.form'}
                {#key pending.effect_id}<PatternForm
                    effect={pending}
                    initialAnswers={drafts.get(executionStepKey(pending))}
                    onDraftChange={(value) =>
                      drafts.set(executionStepKey(pending!), { kind: 'form', value })}
                    {timers}
                    {dockedTimerIds}
                    disabled={working || Boolean(editing)}
                    onTimerChange={(id, state) => (timers[id] = state)}
                    onConfirm={fulfill}
                  />{/key}
              {:else if pending.request.kind === 'interaction.timer'}
                {#key pending.effect_id}<PatternTimer
                    docked={dockedTimerIds.includes(pending.effect_id)}
                    effect={pending}
                    state={timers[pending.effect_id]}
                    disabled={working || Boolean(editing)}
                    onchange={(state) => (timers[pending!.effect_id] = state)}
                    onconfirm={(result) => fulfill('timer', result)}
                  />{/key}
              {:else if pending.request.kind === 'interaction.ask'}
                <form
                  onsubmit={(event) => {
                    event.preventDefault();
                    fulfill('text', answer);
                  }}
                >
                  <TextInput
                    id="pattern-run-answer"
                    label="Your response"
                    labelClass="pattern-run-visually-hidden"
                    bind:value={answer}
                    placeholder="Write what you noticed…"
                  />
                  <div class="pattern-run-actions">
                    <button
                      type="submit"
                      class="pattern-run-primary"
                      disabled={working || Boolean(editing) || !answer.trim()}>Continue ↓</button
                    >
                  </div>
                </form>
              {:else if pending.request.kind === 'interaction.choose' || (pending.request.kind === 'interaction.select' && ['single', 'multi', 'rank'].includes(String(mode)))}
                <SelectionChoices
                  options={choices}
                  mode={pending.request.kind === 'interaction.choose' ? 'single' : mode}
                  bind:selected
                  bind:order
                  disabled={working || Boolean(editing)}
                  onChoose={(value) => fulfill('selected', value)}
                />
                {#if mode === 'multi' || mode === 'rank'}
                  <div class="pattern-run-actions">
                    <button
                      type="button"
                      class="pattern-run-primary"
                      disabled={working ||
                        Boolean(editing) ||
                        (mode === 'multi' && !selectionWithinBounds(selected, min, max))}
                      onclick={() =>
                        mode === 'rank'
                          ? fulfill('ranked', order)
                          : fulfill('selected_many', selected)}>Continue ↓</button
                    >
                  </div>
                {/if}
              {:else if pending.request.kind === 'interaction.rate'}
                <div class="pattern-run-rating">
                  <RatingInput
                    id="pattern-run-rating"
                    scale={pending.request.payload.rating ?? {}}
                    bind:value={rating}
                  />
                </div>
                <div class="pattern-run-actions">
                  <button
                    type="button"
                    class="pattern-run-primary"
                    disabled={working ||
                      Boolean(editing) ||
                      rating === null ||
                      !Number.isFinite(rating)}
                    onclick={() => rating !== null && fulfill('rating', rating)}>Continue ↓</button
                  >
                </div>
              {:else}
                <p class="pattern-run-unavailable">
                  This step needs a capability that is not connected to standalone practice yet. You
                  can stop safely.
                </p>
              {/if}
              {#if pending.loop_context && (!working || aiBusy)}
                <button type="button" class="pattern-run-secondary" onclick={stopLoop}
                  >Stop this loop</button
                >
              {/if}
              <p class="pattern-run-next-hint">The next step will appear below.</p>
            </WorksheetStep>
          {:else if finished && run && !editing}
            <section
              id="pattern-run-complete"
              class="pattern-run-completion"
              aria-labelledby="pattern-run-completion-heading"
            >
              <div class="pattern-run-progress">
                <span>REFLECTION COMPLETE</span><span class="pattern-run-progress-line"></span>
              </div>
              <h2 id="pattern-run-completion-heading" tabindex="-1">
                {run.view.status === 'Completed'
                  ? 'A moment to review.'
                  : 'We can leave this here.'}
              </h2>
              {#if lastShownContent(run.view)}<p class="pattern-run-closing">
                  {lastShownContent(run.view)}
                </p>{/if}
              <p class="pattern-run-privacy">
                This reflection was not saved to Mira.{#if !desktop && data.needsAi}
                  AI-written steps used your selected OpenRouter model with zero-retention routing.{/if}
              </p>
              <div class="pattern-run-actions">
                <a class="pattern-run-secondary" href={resolve(returnHref)}>Return to pattern</a
                ><button type="button" class="pattern-run-primary" onclick={begin}
                  >Run again →</button
                >
              </div>
            </section>
          {/if}
          {#each retained.filter((step) => (!pending || executionStepKey(step.effect) !== executionStepKey(pending)) && !history.some((accepted) => executionStepKey(accepted.effect) === executionStepKey(step.effect))) as step (executionStepKey(step.effect))}
            <WorksheetStep
              id={`pattern-retained-${step.effect.effect_id}-${step.effect.node_id ?? ''}`}
              number={step.number}
              heading={promptParts(step.effect).heading || `Step ${step.number}`}
              completed
              reviewSuggested
            >
              <p class="pattern-run-retained-note">
                Earlier response · kept here while you revisit the next step.
              </p>
              {#if step.effect.request.kind === 'interaction.form'}<PatternForm
                  effect={step.effect}
                  result={step.result}
                  disabled
                  runningAllowed={false}
                />
              {:else}<PracticeResponse text={step.answer} />{/if}
            </WorksheetStep>
          {/each}
        </div>
        {#if run}{#key run.view.root_id}<PracticeHistorySave
              {run}
              identity={practiceIdentity}
              retainedSteps={retained}
              resumable={Boolean(data.languagePracticeSource)}
              recordId={savedRunId}
              restored={Boolean(savedRunId)}
              context={inputDraft}
            />{/key}{/if}
        {#if run}<p class="pattern-run-privacy">
            {#if desktop}Saving is optional. Choose Save to workspace to keep your confirmed
              responses on this device.{:else if data.needsAi}AI-written steps send the pattern
              instruction and relevant answers to your selected OpenRouter model with zero-retention
              routing. Choose Save to workspace to keep confirmed responses.{:else}Your answers stay
              in this view unless you choose Save to workspace. Saved responses remain on this
              device.{/if}
          </p>{/if}
        {#if active && run}<button
            type="button"
            class="pattern-run-stop"
            disabled={Boolean(editing) || (working && !aiBusy)}
            onclick={stopRun}>Stop pattern</button
          >{/if}
      </section>
    </div>
  {/if}
  <div class="pattern-run-legal">
    <p>Reflection and self-help, not medical advice or emergency care.</p>
    <LegalLinks />
  </div>
</main>

<style>
  .pattern-run-legal {
    max-width: 800px;
    margin: 2rem auto 0;
    padding: 1rem;
    color: #575750;
  }
  .pattern-run-legal p {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.6;
  }
</style>
