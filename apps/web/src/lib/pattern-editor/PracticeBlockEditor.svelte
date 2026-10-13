<script lang="ts">
  import { Plus, MessageSquare, ChevronDown, Code } from '@lucide/svelte';
  import { onDestroy, untrack } from 'svelte';
  import { inspectSource } from './bridge';
  import ImageFields from './ImageFields.svelte';
  import VideoFields from './VideoFields.svelte';
  import BlockFields from './BlockFields.svelte';
  import PathsEditor from './PathsEditor.svelte';
  import type { Inspection, SourceSpan, SourceStatement } from './types';
  import {
    blockNames,
    editableStatement,
    endInsertion,
    newBlock,
    newPaths,
    patchSource,
    promptText,
    responseOptions,
    type BlockKind,
  } from './blocks';
  let {
    source,
    inspection,
    checking = false,
    disabled = false,
    onchange,
    onreveal,
    onpendingchange,
  }: {
    source: string;
    inspection: Inspection | null;
    checking?: boolean;
    disabled?: boolean;
    onchange: (source: string) => void;
    onreveal: (span: SourceSpan) => void;
    onpendingchange: (pending: boolean) => void;
  } = $props();
  let busy = $state(false),
    error = $state(''),
    selected = $state<string | null>(null),
    menu = $state(false),
    addingPaths = $state(false),
    response = $state('');
  let pending = $state<Record<string, boolean>>({});
  let disposed = false;
  const anyPending = $derived(Object.values(pending).some(Boolean));
  const locked = $derived(disabled || checking || busy);
  const structure = $derived(inspection?.structure);
  const paths = $derived(structure?.paths ?? []);
  const statements = $derived(
    (structure?.source_statements ?? []).filter(
      (s) =>
        s.kind !== 'label' &&
        !paths.some((p) => s.span.start > p.control.start && s.span.end <= p.span.end),
    ),
  );
  const insertion = $derived(structure ? endInsertion(structure) : undefined);
  const responses = $derived(
    structure && insertion
      ? responseOptions(structure, insertion.start).filter(
          (r) => r.type !== 'choice' || r.choices.length,
        )
      : [],
  );
  const key = (statement: SourceStatement) =>
    `${statement.kind}:${statement.binding?.value ?? statement.span.start}`;
  function setPending(key: string, value: boolean) {
    untrack(() => {
      if (pending[key] !== value) pending = { ...pending, [key]: value };
    });
  }
  $effect(() => onpendingchange(anyPending || busy));
  onDestroy(() => {
    disposed = true;
    onpendingchange(false);
  });
  async function commit(candidate: string): Promise<boolean> {
    if (locked) return false;
    const original = source;
    busy = true;
    error = '';
    try {
      const result = await inspectSource(candidate);
      if (disposed) return false;
      if (source !== original) {
        error = 'The source changed while checking this edit. Try again with the current version.';
        return false;
      }
      if (!result.structure) {
        error = result.diagnostics.map((d) => d.message).join('\n');
        return false;
      }
      onchange(candidate);
      return true;
    } catch (cause) {
      if (!disposed) error = String(cause);
      return false;
    } finally {
      if (!disposed) busy = false;
    }
  }
  async function add(kind: BlockKind) {
    if (!insertion) return;
    if (
      await commit(
        patchSource(source, [{ span: insertion, replacement: newBlock(source, kind) + '\n' }]),
      )
    )
      menu = false;
  }
  async function addPaths() {
    if (!insertion) return;
    const selectedResponse = responses.find((r) => r.name === response);
    if (!selectedResponse) return;
    if (
      await commit(
        patchSource(source, [{ span: insertion, replacement: newPaths(source, selectedResponse) }]),
      )
    ) {
      addingPaths = false;
      menu = false;
    }
  }
  const id = $props.id();
</script>

<div class="practice-block-editor" aria-label="Practice block editor" aria-busy={locked}>
  <div class="block-editor-heading">
    <strong>Practice sequence</strong><span>One Pattern Language source</span>
  </div>
  {#if error}<p class="edit-error" role="alert">{error}</p>{/if}
  {#if anyPending}<p class="pending-note" role="status">
      Apply or discard the block changes before switching views or saving.
    </p>{/if}
  {#if !structure}<div class="source-fallback">
      <Code size={18} />
      <p>
        {checking
          ? 'Checking Pattern Language…'
          : 'The source has errors or could not be inspected. It has not been changed.'}
      </p>
      <button type="button" {disabled} onclick={() => onreveal({ start: 0, end: 0 })}
        >Open Source</button
      >
    </div>
  {:else if structure.source_statements === undefined}<p class="source-fallback">
      Block editing needs the current language engine. Reload the application, or use Source.
    </p>
  {:else}
    <div class="sequence">
      {#each statements as statement (key(statement))}
        {@const itemKey = key(statement)}
        {@const group = paths.find((p) => p.control.start === statement.span.start)}
        {#if group}<PathsEditor
            {source}
            paths={group}
            {structure}
            disabled={locked || (anyPending && !pending[itemKey])}
            oncommit={commit}
            {onreveal}
            onpending={(value) => setPending(itemKey, value)}
          />
        {:else if statement.kind === 'jump' && statement.argument?.value === 'end'}<p
            class="completion"
          >
            Practice finishes here
          </p>
        {:else}<section
            class="sequence-block"
            aria-label={blockNames[statement.kind] ?? 'Source block'}
          >
            <button
              type="button"
              class="block-toggle"
              aria-expanded={selected === itemKey}
              disabled={locked || anyPending}
              onclick={() => (selected = selected === itemKey ? null : itemKey)}
              ><MessageSquare size={15} /><span
                ><small>{blockNames[statement.kind] ?? 'Source block'}</small><b
                  >{editableStatement(statement)
                    ? promptText(statement).split('\n')[0] || 'Untitled block'
                    : statement.kind === 'jump'
                      ? `Go to ${statement.argument?.value}`
                      : `${['video', 'image'].includes(statement.kind) ? (statement.attributes.find((a) => a.name === 'title')?.args[0]?.value ?? statement.attributes.find((a) => a.name === 'url')?.args[0]?.value ?? blockNames[statement.kind]) : statement.kind + ' · edit in Source'}`}</b
                ></span
              ><ChevronDown size={15} /></button
            >
            {#if selected === itemKey}{#if statement.kind === 'image' && statement.body}<ImageFields
                  {source}
                  {statement}
                  disabled={locked}
                  oncommit={commit}
                  onpending={(value) => setPending(itemKey, value)}
                />{:else if statement.kind === 'video' && statement.body}<VideoFields
                  {source}
                  {statement}
                  disabled={locked}
                  oncommit={commit}
                  onpending={(value) => setPending(itemKey, value)}
                />{:else if editableStatement(statement)}<BlockFields
                  {source}
                  {statement}
                  {structure}
                  disabled={locked}
                  oncommit={commit}
                  onpending={(value) => setPending(itemKey, value)}
                />{:else}<div class="unsupported">
                  <p>
                    This construct stays intact in Pattern Language. No simplified block replaces
                    it.
                  </p>
                  <button
                    type="button"
                    disabled={locked || anyPending}
                    onclick={() => onreveal(statement.span)}>Edit in Source</button
                  >
                </div>{/if}{/if}
          </section>{/if}
      {/each}
    </div>
    {#if insertion}<button
        type="button"
        class="add-main"
        disabled={locked || anyPending}
        aria-expanded={menu}
        onclick={() => (menu = !menu)}><Plus size={15} /> Add block before completion</button
      >
      {#if menu}<div class="insert-menu">
          {#each ['ask', 'show', 'video', 'image', 'choose', 'rate', 'timer'] as kind (kind)}<button
              type="button"
              disabled={locked || anyPending}
              onclick={() => add(kind as BlockKind)}>{blockNames[kind]}</button
            >{/each}<button
            type="button"
            disabled={locked || anyPending || !responses.length}
            onclick={() => {
              addingPaths = !addingPaths;
              response = responses[0]?.name ?? '';
            }}>Paths</button
          >
        </div>{/if}
      {#if addingPaths}<div class="new-paths">
          <label for={`${id}-response`}>Route based on an earlier response</label><select
            id={`${id}-response`}
            bind:value={response}
            disabled={locked || anyPending}
            >{#each responses as option (option.name)}<option value={option.name}
                >{option.title} · {option.name}</option
              >{/each}</select
          ><button type="button" disabled={locked || anyPending || !response} onclick={addPaths}
            >Add Paths</button
          >
        </div>{/if}
      {#if menu && !responses.length}<p class="source-note">
          Add a choice or rating first to route based on its response.
        </p>{/if}
    {:else}<p class="source-note">
        Add new blocks in Source for this flow. Existing constructs are preserved.
      </p>{/if}
  {/if}
</div>

<style>
  .practice-block-editor {
    --block-line: #dbe1d7;
    --block-soft: #f5f7f2;
    --block-green: #08784b;
    padding: 14px;
    min-width: 0;
    background: var(--paper);
    color: var(--ink);
  }
  .block-editor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
    font-size: 13px;
  }
  .block-editor-heading span {
    font-size: 11px;
    color: var(--ink-muted, #626a60);
  }
  .sequence {
    display: grid;
    gap: 10px;
  }
  .sequence-block {
    border: 1px solid var(--block-line);
    border-radius: 4px;
    min-width: 0;
    overflow: hidden;
  }
  button,
  select {
    font: inherit;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--block-line);
    border-radius: 3px;
    padding: 8px 10px;
    text-transform: none;
    font-size: 13px;
    min-width: 0;
  }
  button {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  button:hover {
    background: var(--block-soft);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .block-toggle {
    width: 100%;
    padding: 10px 12px;
    justify-content: flex-start;
    text-align: left;
    border: 0;
  }
  .block-toggle span {
    flex: 1;
    min-width: 0;
  }
  .block-toggle small {
    font-size: 11px;
    color: var(--ink-muted, #626a60);
    display: block;
  }
  .block-toggle b {
    display: block;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .block-toggle :global(svg) {
    flex-shrink: 0;
  }
  .completion {
    font-size: 12px;
    margin: 0;
    color: var(--ink-muted, #626a60);
  }
  .add-main {
    width: 100%;
    margin-top: 14px;
    border-style: dashed;
    background: var(--block-soft);
  }
  .insert-menu {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .new-paths {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 0;
    font-size: 12px;
  }
  .new-paths label {
    width: 100%;
  }
  .new-paths select {
    flex: 1;
    max-width: 100%;
  }
  .edit-error {
    color: #9c3029;
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin: 0 0 12px;
    padding: 10px;
    background: #fff1ec;
  }
  .pending-note {
    font-size: 12px;
    background: var(--block-soft);
    padding: 10px;
    margin: 0 0 12px;
  }
  .source-fallback,
  .unsupported {
    font-size: 13px;
    padding: 12px;
  }
  .source-fallback p,
  .unsupported p {
    margin: 0 0 10px;
  }
  .source-note {
    font-size: 12px;
    color: var(--ink-muted, #626a60);
    margin: 10px 0 0;
  }
  @media (prefers-color-scheme: dark) {
    .practice-block-editor {
      --block-line: #484f43;
      --block-soft: #252a21;
      --block-green: #83d5aa;
    }
    .edit-error {
      background: #381f19;
      color: #ffbeb0;
    }
  }
  @media (max-width: 800px) {
    .practice-block-editor {
      padding: 12px 10px;
    }
    button,
    select {
      min-height: 44px;
    }
    select {
      font-size: 16px;
    }
    .block-editor-heading {
      align-items: flex-start;
    }
    .block-editor-heading span {
      width: 100%;
    }
  }
</style>
