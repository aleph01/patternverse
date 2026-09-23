<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PracticeDefinition, TimerPracticeBlock } from '@patternverse/schema';
  import {
    advancePractice,
    backPractice,
    createPracticeSession,
    updatePracticeResponse,
    updatePracticeTimer,
    type PracticeSession,
  } from '$lib/practice/session';
  import { createTimer, type TimerSessionState } from '$lib/practice/timer';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import PracticeTimer from './PracticeTimer.svelte';

  let {
    practiceId,
    practice,
    markdownHtml,
    returnHref,
    returnLabel,
  }: {
    practiceId: string;
    practice: PracticeDefinition;
    markdownHtml: Readonly<Record<string, string>>;
    returnHref: `/${string}/${string}`;
    returnLabel: string;
  } = $props();

  let session = $state<PracticeSession>(createPracticeSession(''));
  let errors = $state<Readonly<Record<string, string>>>({});
  const currentStep = $derived(practice.steps[session.currentStepIndex]);
  const persistentTimers = $derived(
    practice.steps.flatMap((step) =>
      step.blocks.filter(
        (block): block is TimerPracticeBlock => block.type === 'timer' && block.persistent === true,
      ),
    ),
  );

  $effect(() => {
    if (session.practiceId !== practiceId) session = createPracticeSession(practiceId);
  });

  const next = (): void => {
    const result = advancePractice(practice, session);
    session = result.session;
    errors = result.errors;
  };

  const back = (): void => {
    session = backPractice(session);
    errors = {};
  };

  const changeTimer = (block: TimerPracticeBlock, timer: TimerSessionState): void => {
    session = updatePracticeTimer(session, block.id, timer);
  };
</script>

<section class="practice-runner" aria-live="off">
  {#if session.phase === 'completed'}
    <div class="practice-complete">
      <p>Finished</p>
      <h2>Practice complete</h2>
      <span>Your responses were not saved.</span>
      <a href={resolve(returnHref)}>Return to {returnLabel}</a>
    </div>
  {:else if currentStep}
    {#if persistentTimers.length > 0}
      <div class="practice-persistent-timers" aria-label="Practice timers">
        {#each persistentTimers as block (block.id)}
          <PracticeTimer
            {block}
            state={session.timers[block.id] ?? createTimer(block.defaultDurationSeconds)}
            onchange={(timer) => changeTimer(block, timer)}
          />
        {/each}
      </div>
    {/if}

    <section class="practice-current-step" aria-labelledby={`runner-step-${currentStep.id}`}>
      <h2 id={`runner-step-${currentStep.id}`}>
        {currentStep.title ?? `Step ${session.currentStepIndex + 1}`}
      </h2>

      <div class="practice-blocks">
        {#each currentStep.blocks as block (block.id)}
          {#if block.type === 'markdown'}
            <MarkdownRenderer html={markdownHtml[block.id] ?? ''} />
          {:else if block.type === 'text-input'}
            <label class="practice-response-field" for={`practice-response-${block.id}`}>
              <span>{block.label}{block.required ? ' *' : ''}</span>
              {#if block.multiline}
                <textarea
                  id={`practice-response-${block.id}`}
                  value={session.responses[block.id] ?? ''}
                  placeholder={block.placeholder}
                  rows="7"
                  aria-invalid={errors[block.id] ? 'true' : undefined}
                  aria-describedby={errors[block.id] ? `practice-error-${block.id}` : undefined}
                  oninput={(event) => {
                    session = updatePracticeResponse(session, block.id, event.currentTarget.value);
                    errors = { ...errors, [block.id]: '' };
                  }}></textarea>
              {:else}
                <input
                  id={`practice-response-${block.id}`}
                  value={session.responses[block.id] ?? ''}
                  placeholder={block.placeholder}
                  aria-invalid={errors[block.id] ? 'true' : undefined}
                  aria-describedby={errors[block.id] ? `practice-error-${block.id}` : undefined}
                  oninput={(event) => {
                    session = updatePracticeResponse(session, block.id, event.currentTarget.value);
                    errors = { ...errors, [block.id]: '' };
                  }}
                />
              {/if}
            </label>
            {#if errors[block.id]}
              <p class="practice-field-error" id={`practice-error-${block.id}`}>
                {errors[block.id]}
              </p>
            {/if}
          {:else if !block.persistent}
            <PracticeTimer
              {block}
              state={session.timers[block.id] ?? createTimer(block.defaultDurationSeconds)}
              onchange={(timer) => changeTimer(block, timer)}
            />
          {/if}
        {/each}
      </div>
    </section>

    <nav class="practice-navigation" aria-label="Practice steps">
      <span
        class="practice-step-position"
        aria-label={`Step ${session.currentStepIndex + 1} of ${practice.steps.length}`}
      >
        <strong>{String(session.currentStepIndex + 1).padStart(2, '0')}</strong>
        <span aria-hidden="true">/</span>
        <span>{String(practice.steps.length).padStart(2, '0')}</span>
      </span>

      <div class="practice-navigation-actions">
        {#if session.currentStepIndex > 0}
          <button
            type="button"
            class="practice-step-button practice-back-button"
            aria-label="Back"
            title="Previous step"
            onclick={back}
          >
            <span
              class="practice-navigation-chevron practice-navigation-chevron--left"
              aria-hidden="true"
            ></span>
          </button>
        {/if}
        {#if session.currentStepIndex === practice.steps.length - 1}
          <button type="button" class="practice-finish-button" onclick={next}>Finish</button>
        {:else}
          <button
            type="button"
            class="practice-step-button practice-next-button"
            aria-label="Next"
            title="Next step"
            onclick={next}
          >
            <span
              class="practice-navigation-chevron practice-navigation-chevron--right"
              aria-hidden="true"
            ></span>
          </button>
        {/if}
      </div>
    </nav>
  {/if}
</section>
