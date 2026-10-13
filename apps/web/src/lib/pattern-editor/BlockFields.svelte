<script lang="ts">
  import type { SourceStatement, Structure } from './types';
  import { freshName, responseOptions } from './blocks';
  import { blockFieldsDraft, editBlockFields } from './edits';
  import { onDestroy, untrack } from 'svelte';
  let {
    source,
    statement,
    structure,
    disabled = false,
    oncommit,
    onpending,
  }: {
    source: string;
    statement: SourceStatement;
    structure: Structure;
    disabled?: boolean;
    oncommit: (source: string) => Promise<boolean>;
    onpending: (pending: boolean) => void;
  } = $props();
  let prompt = $state(''),
    range = $state(''),
    options = $state<{ value: string; label: string }[]>([]),
    duration = $state('1'),
    adjustable = $state(false),
    blocking = $state(true),
    sticky = $state(true),
    min = $state('0.5'),
    max = $state('5');
  let durationError = $state('');
  let initial = $state('');
  const snapshot = () =>
    JSON.stringify({ prompt, range, options, duration, adjustable, blocking, sticky, min, max });
  const dirty = $derived(Boolean(initial) && snapshot() !== initial);
  $effect(() => {
    const item = statement;
    untrack(() => {
      const values = blockFieldsDraft(item);
      prompt = values.prompt;
      range = values.range;
      options = values.options;
      duration = String(values.duration);
      adjustable = values.adjustable;
      blocking = values.blocking;
      sticky = values.sticky;
      min = String(values.min);
      max = String(values.max);
      durationError = '';
      initial = snapshot();
    });
  });
  $effect(() => onpending(dirty));
  onDestroy(() => onpending(false));
  function discard() {
    durationError = '';
    const values = JSON.parse(initial);
    prompt = values.prompt;
    range = values.range;
    options = values.options;
    duration = values.duration;
    adjustable = values.adjustable;
    blocking = values.blocking;
    sticky = values.sticky;
    min = values.min;
    max = values.max;
  }
  async function apply() {
    durationError = '';
    const submitted = snapshot();
    const edit = editBlockFields(source, statement, JSON.parse(initial), JSON.parse(submitted));
    if (edit.error !== undefined) {
      durationError = edit.error;
      return;
    }
    if (await oncommit(edit.source)) initial = submitted;
  }
</script>

<form
  class="block-fields"
  onsubmit={(event) => {
    event.preventDefault();
    void apply();
  }}
>
  <label
    ><span>{statement.kind === 'show' ? 'Display content' : 'Prompt'}</span><textarea
      rows="3"
      bind:value={prompt}
      {disabled}
      aria-label={statement.kind === 'show' ? 'Display content' : 'Block prompt'}></textarea></label
  >
  {#if statement.binding}<p class="binding">
      Response name <code>{statement.binding.value}</code> <small>Rename in Source</small>
    </p>{/if}
  {#if statement.kind === 'rate'}<label
      ><span>Rating range</span><input bind:value={range} {disabled} placeholder="0..10" /></label
    >{/if}
  {#if statement.kind === 'choose'}
    <fieldset {disabled}>
      <legend>Answer options</legend>{#each options as option, index (option.value)}<label
          ><span><code>{option.value}</code></span><input
            aria-label={`Option ${index + 1} label`}
            bind:value={option.label}
          /></label
        >{/each}
      <button
        type="button"
        onclick={() => {
          const value = freshName(source + ' ' + options.map((o) => o.value).join(' '), 'option');
          options = [...options, { value, label: 'New option' }];
        }}>+ Add option</button
      >
    </fieldset>
  {/if}
  {#if statement.kind === 'timer'}
    <label
      ><span>Duration (minutes)</span><input
        type="number"
        min={1 / 60}
        max="1440"
        step="any"
        bind:value={duration}
        {disabled}
      /></label
    >
    <label class="check"
      ><input type="checkbox" bind:checked={adjustable} {disabled} /> User can adjust the duration</label
    >
    {#if adjustable}<div class="bounds">
        <label
          ><span>Minimum minutes</span><input
            type="number"
            min={1 / 60}
            max="1440"
            step="any"
            bind:value={min}
            {disabled}
          /></label
        ><label
          ><span>Maximum minutes</span><input
            type="number"
            min={1 / 60}
            max="1440"
            step="any"
            bind:value={max}
            {disabled}
          /></label
        >
      </div>{/if}
    <label class="check"
      ><input type="checkbox" bind:checked={blocking} {disabled} /> Wait until the timer finishes</label
    >
    <label class="check"
      ><input type="checkbox" bind:checked={sticky} {disabled} /> Keep the timer visible above the steps
      after starting</label
    >
  {/if}
  {#if responseOptions(structure, statement.span.start).length}
    <label
      ><span>Insert an earlier response</span><select
        {disabled}
        value=""
        onchange={(event) => {
          if (event.currentTarget.value) prompt += ` {{${event.currentTarget.value}}}`;
          event.currentTarget.value = '';
        }}
        ><option value="">Choose a response…</option
        >{#each responseOptions(structure, statement.span.start) as response (response.name)}<option
            value={response.name}>{response.title} · {response.name}</option
          >{/each}</select
      ></label
    >
  {/if}
  {#if dirty}<div class="draft-actions">
      <span>Unapplied block changes</span><button type="button" {disabled} onclick={discard}
        >Discard</button
      ><button type="submit" class="apply" {disabled}>Apply changes</button>
    </div>{/if}
  {#if durationError}<p class="duration-error" role="alert">{durationError}</p>{/if}
</form>

<style>
  .block-fields {
    padding: 2px 14px 14px;
    font-size: 13px;
  }
  label {
    display: block;
    margin: 10px 0;
  }
  label > span,
  legend {
    display: block;
    font-size: 12px;
    color: var(--ink-muted, #626a60);
    margin-bottom: 5px;
  }
  input,
  textarea,
  select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 3px;
    padding: 9px 10px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }
  textarea {
    resize: vertical;
  }
  .binding {
    display: flex;
    gap: 7px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 12px;
    margin: 10px 0;
    color: var(--ink-muted, #626a60);
  }
  code {
    background: var(--block-soft, #f5f7f2);
    padding: 2px 5px;
    border-radius: 3px;
    color: var(--block-green, #08784b);
    font-size: 12px;
  }
  small {
    font-size: 11px;
  }
  fieldset {
    padding: 0;
    border: 0;
    margin: 12px 0;
  }
  .bounds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .check input {
    width: auto;
  }
  button {
    font: inherit;
    font-size: 12px;
    text-transform: none;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--block-line, #dbe1d7);
    padding: 7px 10px;
    border-radius: 3px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .draft-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
  }
  .draft-actions span {
    font-size: 12px;
    margin-right: auto;
    color: var(--ink-muted, #626a60);
  }
  .apply {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  .duration-error {
    color: #a43229;
    font-size: 12px;
  }
  @media (max-width: 800px) {
    input,
    textarea,
    select {
      font-size: 16px;
    }
    button {
      min-height: 44px;
    }
    .bounds {
      grid-template-columns: 1fr;
    }
  }
</style>
