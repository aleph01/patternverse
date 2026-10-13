<script lang="ts">
  import type { PatternOption } from '$lib/pattern-run/view';
  import { moveSelection } from './selection';
  let {
    options,
    mode,
    selected = $bindable<string[]>([]),
    order = $bindable<string[]>([]),
    disabled = false,
    presentation = 'worksheet',
    legend = 'Choose any that fit',
    onChoose,
  }: {
    options: readonly PatternOption[];
    mode: unknown;
    selected?: string[];
    order?: string[];
    disabled?: boolean;
    presentation?: 'worksheet' | 'guided';
    legend?: string;
    onChoose: (value: string) => void;
  } = $props();
</script>

{#snippet checkboxes()}
  {#each options as option (option.value)}
    <label class:guided={presentation === 'guided'}>
      <input type="checkbox" bind:group={selected} value={option.value} {disabled} />{option.label}
    </label>
  {/each}
{/snippet}

{#if mode === 'rank'}
  <ol class={presentation === 'worksheet' ? 'pattern-run-ranking' : 'guided'}>
    {#each order as value, index (value)}
      <li>
        <span>{options.find((option) => option.value === value)?.label}</span><button
          type="button"
          aria-label={`Move ${presentation === 'worksheet' ? value : options.find((option) => option.value === value)?.label} up`}
          disabled={disabled || index === 0}
          onclick={() => (order = moveSelection(order, index, -1))}>↑</button
        ><button
          type="button"
          aria-label={`Move ${presentation === 'worksheet' ? value : options.find((option) => option.value === value)?.label} down`}
          disabled={disabled || index === order.length - 1}
          onclick={() => (order = moveSelection(order, index, 1))}>↓</button
        >
      </li>
    {/each}
  </ol>
{:else if mode === 'multi'}
  {#if presentation === 'worksheet'}
    <fieldset class="pattern-run-selections" {disabled}>
      <legend>{legend}</legend>
      {@render checkboxes()}
    </fieldset>
  {:else}{@render checkboxes()}{/if}
{:else if presentation === 'worksheet'}
  <div class="pattern-run-options">
    {#each options as option (option.value)}
      <button type="button" {disabled} onclick={() => onChoose(option.value)}
        >{option.label}<span aria-hidden="true">→</span></button
      >
    {/each}
  </div>
{:else}
  {#each options as option (option.value)}
    <button class="guided" type="button" {disabled} onclick={() => onChoose(option.value)}
      >{option.label}</button
    >
  {/each}
{/if}

<style>
  label.guided {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
  }
  label.guided input {
    width: 18px;
    height: 18px;
  }
  button.guided,
  ol.guided button {
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
  ol.guided {
    padding-left: 20px;
  }
  ol.guided li {
    padding: 4px 0;
  }
  ol.guided li span {
    display: inline-block;
    min-width: 8ch;
  }
</style>
