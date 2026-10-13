<script lang="ts">
  import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
  import {
    formBlocks,
    formAnswers,
    formTimerEffect,
    type FormAnswers,
  } from '$lib/pattern-run/form';
  import { createTimer, type TimerSessionState } from '$lib/practice/timer';
  import { timerResult } from '$lib/pattern-run/timer';
  import PatternTimer from './PatternTimer.svelte';
  import PracticeMarkdownPreview from './PracticeMarkdownPreview.svelte';
  import PracticeResponse from './PracticeResponse.svelte';

  let {
    effect: formEffect,
    result,
    initialAnswers,
    onDraftChange,
    disabled = false,
    confirmLabel = 'Continue ↓',
    timers = {},
    onTimerChange = () => {},
    onConfirm,
    runningAllowed = true,
    dockedTimerIds = [],
  }: {
    effect: GuidedEffect;
    result?: unknown;
    initialAnswers?: unknown;
    onDraftChange?: (value: FormAnswers) => void;
    disabled?: boolean;
    confirmLabel?: string;
    timers?: Record<string, TimerSessionState>;
    onTimerChange?: (id: string, state: TimerSessionState) => void;
    onConfirm?: (kind: 'form', value: FormAnswers) => void;
    runningAllowed?: boolean;
    dockedTimerIds?: readonly string[];
  } = $props();
  const blocks = $derived(formBlocks(formEffect));
  const saved = $derived(formAnswers(result));
  const completed = $derived(result !== undefined && result !== null);
  const instance = $props.id();
  let values = $derived<Record<string, string>>(
    Object.fromEntries(
      Object.entries(formAnswers(initialAnswers))
        .filter(([, value]) => value.type === 'text')
        .map(([id, value]) => [id, value.value as string]),
    ),
  );
  $effect(() => {
    onDraftChange?.(
      Object.fromEntries(
        Object.entries(values).map(([id, value]) => [id, { type: 'text' as const, value }]),
      ),
    );
  });
  let error = $state('');
  let now = $state(Date.now());
  $effect(() => {
    if (!blocks.some((block) => block.type === 'timer') || completed) return;
    const interval = window.setInterval(() => {
      now = Date.now();
    }, 250);
    return () => window.clearInterval(interval);
  });
  function submit() {
    if (disabled || completed) return;
    const answer = Object.create(null) as FormAnswers;
    for (const block of blocks) {
      if (block.type === 'ask') {
        const value = values[block.id] ?? '';
        if (block.required && !value.trim()) {
          error = `Please answer “${block.prompt}”.`;
          return;
        }
        answer[block.id] = { type: 'text', value };
      } else if (block.type === 'timer') {
        const timer =
          timers[`${formEffect.effect_id}:${block.id}`] ??
          createTimer(block.timer.duration_seconds);
        const value = timerResult(timer, Date.now());
        if (block.timer.blocking && !value.completed) {
          error = 'Wait for the timer to finish.';
          return;
        }
        answer[block.id] = {
          type: 'record',
          value: {
            duration_seconds: { type: 'number', value: value.duration_seconds },
            elapsed_seconds: { type: 'number', value: value.elapsed_seconds },
            completed: { type: 'boolean', value: value.completed },
          },
        };
      }
    }
    error = '';
    onConfirm?.('form', answer);
  }
  const blocked = $derived(
    blocks.some(
      (block) =>
        block.type === 'timer' &&
        block.timer.blocking &&
        !timerResult(
          timers[`${formEffect.effect_id}:${block.id}`] ??
            createTimer(block.timer.duration_seconds),
          now,
        ).completed,
    ),
  );
</script>

<form
  class="pattern-form"
  onsubmit={(event) => {
    event.preventDefault();
    submit();
  }}
>
  {#each blocks as block, index (index)}
    {#if block.type === 'show'}
      <PracticeMarkdownPreview markdown={block.content} />
    {:else if block.type === 'ask'}
      <div class="field">
        <label for={`${instance}-${block.id}`}
          ><span>{block.prompt}</span>
          {#if !block.required && !completed}<small>optional</small>{/if}
        </label>
        {#if completed}
          <PracticeResponse
            text={saved[block.id]?.type === 'text'
              ? String(saved[block.id]?.value || 'Not answered')
              : 'Not answered'}
          />
        {:else if block.multiline}
          <textarea
            id={`${instance}-${block.id}`}
            rows="4"
            required={block.required}
            maxlength="30000"
            placeholder={block.placeholder ?? 'Write your response…'}
            {disabled}
            value={values[block.id] ?? ''}
            oninput={(event) => {
              values = { ...values, [block.id]: event.currentTarget.value };
              error = '';
            }}></textarea>
        {:else}
          <input
            id={`${instance}-${block.id}`}
            onkeydown={(event) => {
              // No native form submission permission needed in embedded hosts.
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            required={block.required}
            maxlength="30000"
            placeholder={block.placeholder ?? ''}
            {disabled}
            value={values[block.id] ?? ''}
            oninput={(event) => {
              values = { ...values, [block.id]: event.currentTarget.value };
              error = '';
            }}
          />
        {/if}
      </div>
    {:else}
      <div class="field">
        <PracticeMarkdownPreview markdown={block.prompt} />
        <PatternTimer
          docked={dockedTimerIds.includes(`${formEffect.effect_id}:${block.id}`)}
          effect={formTimerEffect(formEffect, block)}
          state={timers[`${formEffect.effect_id}:${block.id}`]}
          active={!completed || block.persistent}
          showContinue={false}
          {disabled}
          {runningAllowed}
          onchange={(state) => onTimerChange(`${formEffect.effect_id}:${block.id}`, state)}
        />
      </div>
    {/if}
  {/each}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if !completed}<button type="button" onclick={submit} disabled={disabled || blocked}
      >{confirmLabel}</button
    >{/if}
</form>

<style>
  .pattern-form {
    display: grid;
    gap: 1.5rem;
  }
  .field {
    display: grid;
    gap: 0.65rem;
  }
  label {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    justify-content: space-between;
    font-weight: 650;
    line-height: 1.5;
  }
  small {
    font-size: 0.75rem;
    color: var(--muted, #686860);
    font-weight: 400;
  }
  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border, #deded9);
    border-radius: 0.4rem;
    background: var(--paper, #fff);
    color: inherit;
    padding: 0.8rem;
    font: inherit;
  }
  textarea {
    resize: vertical;
    min-height: 7rem;
  }
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--accent, #008653);
    outline-offset: 3px;
  }
  button {
    justify-self: start;
    border: 1px solid var(--foreground, #181a16);
    border-radius: 0.4rem;
    background: var(--foreground, #181a16);
    color: var(--background, #fff);
    padding: 0.75rem 1.25rem;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .error {
    color: #a32626;
  }
  @media (max-width: 600px) {
    .pattern-form {
      gap: 1.75rem;
    }
    button {
      width: 100%;
    }
  }
</style>
