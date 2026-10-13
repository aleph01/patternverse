<script lang="ts">
  import type { GuidedEffect } from './guided';
  import { optionsFor } from '$lib/pattern-run/view';
  import SelectionChoices from '$lib/practice-inputs/SelectionChoices.svelte';
  import { selectionWithinBounds } from '$lib/practice-inputs/selection';
  let {
    effect: interaction,
    disabled,
    onConfirm,
  }: {
    effect: GuidedEffect;
    disabled: boolean;
    onConfirm: (kind: 'selected' | 'selected_many' | 'ranked', value: string | string[]) => void;
  } = $props();
  const options = $derived(optionsFor(interaction));
  const mode = $derived(interaction.request.payload.mode);
  let selected = $state<string[]>([]);
  let order = $state<string[]>([]);
  $effect(() => {
    order = options.map((option) => option.value);
    selected = [];
  });
  const valid = $derived(
    selectionWithinBounds(
      selected,
      Number(interaction.request.payload.min ?? 0),
      Number(interaction.request.payload.max ?? options.length),
    ),
  );
</script>

<fieldset {disabled}>
  <legend
    >{mode === 'rank'
      ? 'Put these in your preferred order'
      : mode === 'multi'
        ? 'Select any that fit (none is okay when optional)'
        : 'Choose one'}</legend
  >
  <SelectionChoices
    {options}
    {mode}
    bind:selected
    bind:order
    {disabled}
    presentation="guided"
    onChoose={(value) => onConfirm('selected', value)}
  />
  {#if mode === 'rank'}
    <button type="button" onclick={() => onConfirm('ranked', order)}>Confirm order →</button>
  {:else if mode === 'multi'}
    <button
      type="button"
      disabled={disabled || !valid}
      onclick={() => onConfirm('selected_many', selected)}>Continue →</button
    >
  {/if}
</fieldset>

<style>
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    font-size: 0.85rem;
    margin-bottom: 10px;
  }
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 8px 12px;
    margin: 4px;
    background: transparent;
    border: 1px solid #a0aaa1;
    border-radius: 6px;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
</style>
