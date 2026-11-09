<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
  import {
    formBlocks,
    formAnswers,
    formTimerEffect,
    formSelected,
    formAnswerText,
    type FormAnswers,
  } from '$lib/pattern-run/form';
  import { createTimer, type TimerSessionState } from '$lib/practice/timer';
  import { timerResult } from '$lib/pattern-run/timer';
  import PatternTimer from './PatternTimer.svelte';
  import PracticeMarkdownPreview from './PracticeMarkdownPreview.svelte';
  import PracticeResponse from './PracticeResponse.svelte';
  import RatingInput from '$lib/practice-inputs/RatingInput.svelte';
  import ChoiceInput from '$lib/practice-inputs/ChoiceInput.svelte';
  import { selectionWithinBounds } from '$lib/practice-inputs/selection';

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
    assistance,
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
    assistance?: Snippet<[string, string]>;
  } = $props();
  const blocks = $derived(formBlocks(formEffect));
  const saved = $derived(formAnswers(result));
  const completed = $derived(result !== undefined && result !== null);
  const instance = $props.id();
  let values = $derived<FormAnswers>({ ...formAnswers(initialAnswers) });
  $effect(() => {
    onDraftChange?.(values);
  });
  let error = $state('');
  export function getDraft() {
    return { kind: 'form', value: values };
  }
  export function setTextAnswer(id: string, text: string, expected = '') {
    if (disabled || completed || !blocks.some((block) => block.type === 'ask' && block.id === id))
      return false;
    const current = values[id];
    const value = current?.type === 'text' ? current.value : '';
    if (expected === '' ? value.trim() !== '' : value !== expected) return false;
    values = { ...values, [id]: { type: 'text', value: text } };
    return true;
  }
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
        const field = values[block.id];
        const value = field?.type === 'text' ? field.value : '';
        if (block.required && !value.trim()) {
          error = `Please answer “${block.prompt}”.`;
          return;
        }
        answer[block.id] = { type: 'text', value };
      } else if (block.type === 'rate') {
        const field = values[block.id];
        if (
          field?.type !== 'number' ||
          !Number.isFinite(field.value) ||
          field.value < block.rating.min ||
          field.value > block.rating.max
        ) {
          error = `Enter a number from ${block.rating.min} to ${block.rating.max} for “${block.prompt}”.`;
          return;
        }
        answer[block.id] = field;
      } else if (block.type === 'select') {
        const selected = formSelected(values[block.id]);
        if (!selectionWithinBounds(selected, block.selection.min, block.selection.max)) {
          error = `Choose ${block.selection.min === block.selection.max ? block.selection.min : `${block.selection.min}–${block.selection.max}`} for “${block.prompt}”.`;
          return;
        }
        const choices = block.options
          .filter((option) => selected.includes(option.value))
          .map((value) => ({ type: 'choice' as const, value }));
        answer[block.id] =
          block.selection.mode === 'single'
            ? choices[0]
            : { type: 'list', value: { element_type: 'choice', items: choices } };
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

<div class="pattern-form">
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
          <PracticeResponse text={formAnswerText(block, saved[block.id]) || 'Not answered'} />
        {:else if block.multiline}
          <textarea
            id={`${instance}-${block.id}`}
            rows="4"
            required={block.required}
            maxlength="30000"
            placeholder={block.placeholder ?? 'Write your response…'}
            {disabled}
            value={formAnswerText(block, values[block.id])}
            oninput={(event) => {
              values = {
                ...values,
                [block.id]: { type: 'text', value: event.currentTarget.value },
              };
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
            value={formAnswerText(block, values[block.id])}
            oninput={(event) => {
              values = {
                ...values,
                [block.id]: { type: 'text', value: event.currentTarget.value },
              };
              error = '';
            }}
          />
        {/if}
        {#if !completed && assistance}{@render assistance(
            block.id,
            formAnswerText(block, values[block.id]),
          )}{/if}
      </div>
    {:else if block.type === 'rate'}
      <div class="field rating-field">
        {#if completed}
          <p>{block.prompt}</p>
          <PracticeResponse text={formAnswerText(block, saved[block.id])} />
        {:else}
          <RatingInput
            id={`${instance}-${block.id}`}
            label={block.prompt}
            value={values[block.id]?.type === 'number' ? (values[block.id].value as number) : null}
            scale={{
              min: block.rating.min,
              max: block.rating.max,
              low: block.rating.low ?? undefined,
              high: block.rating.high ?? undefined,
            }}
            {disabled}
            onchange={(value) => {
              if (value === null) {
                const next = { ...values };
                delete next[block.id];
                values = next;
              } else values = { ...values, [block.id]: { type: 'number', value } };
              error = '';
            }}
          />
          <small
            >{block.rating.min}{block.rating.low ? ` — ${block.rating.low}` : ''} · {block.rating
              .max}{block.rating.high ? ` — ${block.rating.high}` : ''}</small
          >
        {/if}
      </div>
    {:else if block.type === 'select'}
      <div class="field">
        {#if completed}
          <p>{block.prompt}</p>
          <PracticeResponse text={formAnswerText(block, saved[block.id]) || 'None selected'} />
        {:else}
          <ChoiceInput
            id={`${instance}-${block.id}`}
            prompt={block.prompt}
            options={block.options}
            mode={block.selection.mode}
            selected={formSelected(values[block.id])}
            {disabled}
            onchange={(selected) => {
              const items = block.options
                .filter((option) => selected.includes(option.value))
                .map((value) => ({ type: 'choice' as const, value }));
              values = {
                ...values,
                [block.id]:
                  block.selection.mode === 'single'
                    ? items[0]
                    : { type: 'list', value: { element_type: 'choice', items } },
              };
              error = '';
            }}
          />
          {#if block.selection.mode === 'multi'}<small
              >Choose {block.selection.min}–{block.selection.max}.</small
            >{/if}
        {/if}
      </div>
    {:else if block.type === 'timer'}
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
</div>

<style>
  .pattern-form {
    display: grid;
    gap: 1.5rem;
  }
  .field {
    display: grid;
    gap: 0.65rem;
  }
  label,
  .rating-field :global(label) {
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
  textarea,
  .rating-field :global(input) {
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
  textarea:focus-visible,
  .rating-field :global(input:focus-visible) {
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
