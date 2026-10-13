<script lang="ts">
  import { untrack } from 'svelte';
  import type { PatternEffect } from '$lib/pattern-runtime/types';
  import { optionsFor } from '$lib/pattern-run/view';
  import TextInput from '$lib/practice-inputs/TextInput.svelte';
  import RatingInput from '$lib/practice-inputs/RatingInput.svelte';
  import { moveSelection, selectionWithinBounds } from '$lib/practice-inputs/selection';
  import PatternForm from './PatternForm.svelte';
  import PatternTimer from './PatternTimer.svelte';
  import type { TimerSessionState } from '$lib/practice/timer';

  let {
    effect: interaction,
    initialResult,
    disabled = false,
    timers = {},
    dockedTimerIds = [],
    onTimerChange,
    onSave,
    onCancel,
    onDraftChange,
  }: {
    effect: PatternEffect;
    initialResult: unknown;
    disabled?: boolean;
    timers?: Record<string, TimerSessionState>;
    dockedTimerIds?: readonly string[];
    onTimerChange: (id: string, state: TimerSessionState) => void;
    onSave: (result: unknown) => void;
    onCancel: () => void;
    onDraftChange: (result: unknown) => void;
  } = $props();
  const initial = untrack(() => initialResult) as { kind?: string; value?: unknown } | null;
  let text = $state(typeof initial?.value === 'string' ? initial.value : '');
  let rating = $state<number | null>(typeof initial?.value === 'number' ? initial.value : null);
  const choices = $derived(optionsFor(interaction));
  const mode = $derived(
    interaction.request.kind === 'interaction.choose' ? 'single' : interaction.request.payload.mode,
  );
  const initialValues =
    typeof initial?.value === 'string'
      ? [initial.value]
      : Array.isArray(initial?.value)
        ? initial.value.filter((value): value is string => typeof value === 'string')
        : [];
  let selected = $state(initialValues);
  let order = $state<string[]>(
    untrack(() => [
      ...initialValues,
      ...optionsFor(interaction)
        .map(({ value }) => value)
        .filter((value) => !initialValues.includes(value)),
    ]),
  );
  const instance = $props.id();
  function move(index: number, delta: -1 | 1) {
    order = moveSelection(order, index, delta);
  }
  function selection() {
    return {
      kind: mode === 'rank' ? 'ranked' : mode === 'multi' ? 'selected_many' : 'selected',
      value: mode === 'rank' ? order : mode === 'multi' ? selected : selected[0],
    };
  }
  $effect(() => {
    if (interaction.request.kind === 'interaction.ask')
      onDraftChange({ kind: 'text', value: text });
    else if (interaction.request.kind === 'interaction.rate')
      onDraftChange({ kind: 'rating', value: rating });
    else if (['interaction.choose', 'interaction.select'].includes(interaction.request.kind))
      onDraftChange(selection());
  });
</script>

{#if interaction.request.kind === 'interaction.form'}
  <PatternForm
    effect={interaction}
    initialAnswers={initialResult}
    {disabled}
    {timers}
    {dockedTimerIds}
    confirmLabel="Save changes"
    {onTimerChange}
    onConfirm={(_, value) => onSave({ kind: 'form', value })}
    onDraftChange={(value) => onDraftChange({ kind: 'form', value })}
  />
{:else if interaction.request.kind === 'interaction.ask'}
  <form
    onsubmit={(event) => {
      event.preventDefault();
      onSave({ kind: 'text', value: text });
    }}
  >
    <TextInput
      id={`${instance}-response`}
      label="Edit your response"
      labelClass="pattern-run-visually-hidden"
      bind:value={text}
      {disabled}
    />
    <div class="pattern-run-actions">
      <button class="pattern-run-primary" type="submit" disabled={disabled || !text.trim()}
        >Save changes</button
      >
    </div>
  </form>
{:else if interaction.request.kind === 'interaction.rate'}
  <div class="pattern-run-rating">
    <RatingInput
      id={`${instance}-rating`}
      bind:value={rating}
      {disabled}
      scale={interaction.request.payload.rating ?? {}}
    />
  </div>
  <div class="pattern-run-actions">
    <button
      class="pattern-run-primary"
      type="button"
      disabled={disabled || rating === null || !Number.isFinite(rating)}
      onclick={() => onSave({ kind: 'rating', value: rating })}>Save changes</button
    >
  </div>
{:else if interaction.request.kind === 'interaction.choose' || interaction.request.kind === 'interaction.select'}
  {#if mode === 'rank'}<ol class="pattern-run-ranking">
      {#each order as value, index (value)}<li>
          <span>{choices.find((option) => option.value === value)?.label}</span><button
            type="button"
            aria-label={`Move ${value} up`}
            disabled={disabled || index === 0}
            onclick={() => move(index, -1)}>↑</button
          ><button
            type="button"
            aria-label={`Move ${value} down`}
            disabled={disabled || index === order.length - 1}
            onclick={() => move(index, 1)}>↓</button
          >
        </li>{/each}
    </ol>
  {:else}<fieldset class="pattern-run-selections" {disabled}>
      <legend>{mode === 'multi' ? 'Choose any that fit' : 'Choose one'}</legend
      >{#each choices as option (option.value)}<label
          >{#if mode === 'multi'}<input
              type="checkbox"
              value={option.value}
              bind:group={selected}
            />{:else}<input
              type="radio"
              name={`${instance}-choice`}
              value={option.value}
              checked={selected[0] === option.value}
              onchange={() => (selected = [option.value])}
            />{/if}{option.label}</label
        >{/each}
    </fieldset>{/if}
  <div class="pattern-run-actions">
    <button
      class="pattern-run-primary"
      type="button"
      disabled={disabled ||
        (mode === 'single' && selected.length !== 1) ||
        (mode === 'multi' &&
          !selectionWithinBounds(
            selected,
            Number(interaction.request.payload.min ?? 0),
            Number(interaction.request.payload.max ?? choices.length),
          ))}
      onclick={() => onSave(selection())}>Save changes</button
    >
  </div>
{:else if interaction.request.kind === 'interaction.timer'}
  <PatternTimer
    effect={interaction}
    state={timers[interaction.effect_id]}
    {disabled}
    docked={dockedTimerIds.includes(interaction.effect_id)}
    onchange={(state) => onTimerChange(interaction.effect_id, state)}
    onconfirm={(value) => onSave({ kind: 'timer', value })}
  />
{/if}
<div class="edit-footer">
  <button class="cancel" type="button" {disabled} onclick={onCancel}>Cancel</button>
  <p>Your later answers will stay where they are.</p>
</div>

<style>
  .edit-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-top: 0.875rem;
  }
  .edit-footer p {
    margin: 0;
    color: #59675c;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .cancel {
    min-height: 44px;
    padding: 0 0.5rem;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
</style>
