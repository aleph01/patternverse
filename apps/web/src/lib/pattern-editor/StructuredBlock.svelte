<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import StructuredBlock from './StructuredBlock.svelte';
  import BlockFields from './BlockFields.svelte';
  import { blockNames, editableStatement, promptText, sliceSource, type BlockKind } from './blocks';
  import { insertLocalBlock, replaceLocalCondition } from './structured-edits';
  import type { SourceSpan, SourceStatement, Structure } from './types';

  let {
    source,
    statement,
    structure,
    insideForm = false,
    disabled = false,
    oncommit,
    onreveal,
    onpending,
  }: {
    source: string;
    statement: SourceStatement;
    structure: Structure;
    insideForm?: boolean;
    disabled?: boolean;
    oncommit: (source: string) => Promise<boolean>;
    onreveal: (span: SourceSpan) => void;
    onpending: (pending: boolean) => void;
  } = $props();
  let condition = $state('');
  let pending = $state<Record<string, boolean>>({});
  const arm = $derived(statement.kind.startsWith('arm_'));
  const conditionChanged = $derived(arm && condition !== (statement.argument?.value ?? ''));
  const childPending = $derived(Object.values(pending).some(Boolean));
  const children = $derived(statement.children ?? []);
  const container = $derived(statement.kind === 'form' || arm);
  const optional = $derived(
    statement.attributes.some((a) => a.name === 'required' && a.args[0]?.value === 'false'),
  );
  const title = $derived(
    statement.kind === 'form'
      ? (statement.attributes.find((a) => a.name === 'title')?.args[0]?.value ??
          'Grouped questions')
      : arm
        ? statement.kind === 'arm_else'
          ? 'Otherwise'
          : `${statement.kind === 'arm_case' ? 'When answer is' : 'When'} ${statement.argument?.value}`
        : statement.kind === '?match'
          ? `Paths based on ${statement.argument?.value}`
          : statement.kind === '?branch'
            ? 'Paths in priority order'
            : `${blockNames[statement.kind] ?? statement.kind}${optional ? ' · optional' : ''}: ${promptText(statement).split('\n')[0] || statement.binding?.value || ''}`,
  );
  $effect(() => {
    const current = statement;
    untrack(() => {
      condition = current.argument?.value ?? '';
    });
  });
  $effect(() => onpending(conditionChanged || childPending));
  onDestroy(() => onpending(false));
  function childState(key: string, value: boolean) {
    untrack(() => {
      if (pending[key] !== value) pending = { ...pending, [key]: value };
    });
  }
  async function applyCondition() {
    await oncommit(replaceLocalCondition(source, statement, condition));
  }
</script>

<section
  aria-label={statement.kind === '?match' || statement.kind === '?branch'
    ? 'Paths block'
    : undefined}
>
  <details class="local-block" open={statement.kind === '?match' || statement.kind === '?branch'}>
    <summary>{title}</summary>
    <div class="content">
      {#if arm && statement.kind !== 'arm_else'}
        <label>
          <span>{statement.kind === 'arm_case' ? 'Exact answer ID or literal' : 'Condition'}</span>
          <input
            aria-label="Local path condition"
            bind:value={condition}
            disabled={disabled || childPending}
          />
        </label>
        {#if conditionChanged}
          <button type="button" {disabled} onclick={applyCondition}>Apply condition</button>
          <button
            type="button"
            {disabled}
            onclick={() => (condition = statement.argument?.value ?? '')}>Discard</button
          >
        {/if}
      {/if}
      {#if children.length || container || ['?match', '?branch'].includes(statement.kind)}
        {#each children as child (child.span.start)}
          <StructuredBlock
            {source}
            statement={child}
            {structure}
            insideForm={statement.kind === 'form'}
            disabled={disabled ||
              conditionChanged ||
              (childPending && !pending[String(child.span.start)])}
            {oncommit}
            {onreveal}
            onpending={(value) => childState(String(child.span.start), value)}
          />
        {/each}
        {#if container}
          <div class="add-controls">
            {#each statement.kind === 'form' ? ['ask', 'show', 'timer'] : ['ask', 'show', 'choose', 'rate', 'timer'] as kind (kind)}
              <button
                type="button"
                disabled={disabled || conditionChanged || childPending}
                onclick={() => oncommit(insertLocalBlock(source, statement, kind as BlockKind))}
                >Add {blockNames[kind]?.toLowerCase()}</button
              >
            {/each}
          </div>
        {/if}
      {:else if editableStatement(statement)}
        <BlockFields
          {source}
          {statement}
          {structure}
          {insideForm}
          {disabled}
          {oncommit}
          onpending={(value) => childState('fields', value)}
        />
      {:else if statement.kind === 'jump' && statement.argument?.value === 'end'}
        <p>This path finishes the practice.</p>
      {:else}
        <pre>{sliceSource(source, statement.span)}</pre>
      {/if}
      <button
        class="source"
        type="button"
        disabled={disabled || conditionChanged || childPending}
        onclick={() => onreveal(statement.span)}>View language</button
      >
    </div>
  </details>
</section>

<style>
  .local-block {
    margin: 10px 0;
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 5px;
    background: var(--paper);
  }
  summary {
    padding: 12px;
    cursor: pointer;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .content {
    padding: 0 12px 12px;
  }
  label,
  label span {
    display: block;
    margin: 8px 0;
    font-size: 12px;
  }
  input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--block-line, #dbe1d7);
    background: var(--paper);
    color: var(--ink);
  }
  button {
    padding: 7px 9px;
    margin: 4px;
    border: 1px solid var(--block-line, #dbe1d7);
    background: var(--paper);
    color: var(--ink);
    border-radius: 3px;
    font: inherit;
    font-size: 12px;
    text-transform: none;
  }
  button:disabled {
    opacity: 0.45;
  }
  .source {
    margin-top: 10px;
  }
  .add-controls {
    display: flex;
    flex-wrap: wrap;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 12px;
  }
</style>
