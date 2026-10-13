<script lang="ts">
  import {
    GitBranch,
    Plus,
    X,
    ArrowUp,
    CornerDownRight,
    Merge,
    MessageSquare,
    ChevronDown,
  } from '@lucide/svelte';
  import type { Paths, SourceStatement, Structure, SourceSpan } from './types';
  import {
    blockNames,
    editableStatement,
    moveRule,
    promptText,
    removePath,
    responseOptions,
    type BlockKind,
  } from './blocks';
  import {
    addPathCase,
    editPaths,
    insertPathBlock,
    pathCasesForResponse,
    pathsDraft,
  } from './edits';
  import BlockFields from './BlockFields.svelte';
  import { onDestroy, untrack } from 'svelte';
  let {
    source,
    paths,
    structure,
    disabled = false,
    oncommit,
    onreveal,
    onpending,
  }: {
    source: string;
    paths: Paths;
    structure: Structure;
    disabled?: boolean;
    oncommit: (source: string) => Promise<boolean>;
    onreveal: (span: SourceSpan) => void;
    onpending: (pending: boolean) => void;
  } = $props();
  let response = $state(untrack(() => pathsDraft(paths).response)),
    cases = $state(untrack(() => pathsDraft(paths).cases)),
    initial = $state('');
  let expanded = $state<string | null>(null),
    menu = $state<number | null>(null),
    fieldPending = $state(false);
  const snapshot = () => JSON.stringify({ response, cases });
  const dirty = $derived(Boolean(initial) && snapshot() !== initial);
  const responses = $derived(responseOptions(structure, paths.control.start));
  const current = $derived(responses.find((r) => r.name === response));
  const exact = $derived(current ? current.type !== 'number' : paths.mode === 'match');
  const fallbackIndex = $derived(paths.arms.length - 1);
  const actionDisabled = $derived(disabled || dirty || fieldPending);
  $effect.pre(() => {
    const projection = paths;
    untrack(() => {
      const draft = pathsDraft(projection);
      response = draft.response;
      cases = draft.cases;
      initial = snapshot();
    });
  });
  $effect(() => onpending(dirty || fieldPending));
  onDestroy(() => onpending(false));
  function children(index: number): SourceStatement[] {
    const arm = paths.arms[index];
    return (structure.source_statements ?? []).filter(
      (s) =>
        s.kind !== 'label' && s.span.start >= arm.content.start && s.span.end <= arm.content.end,
    );
  }
  const idOf = (statement: SourceStatement) =>
    statement.binding?.value ?? String(statement.span.start);
  function changeResponse(value: string) {
    response = value;
    const next = responses.find((r) => r.name === value);
    if (!next) return;
    cases = pathCasesForResponse(cases, next);
  }
  async function apply() {
    const submitted = snapshot();
    if (await oncommit(editPaths(source, paths, JSON.parse(submitted), current)))
      initial = submitted;
  }
  function discard() {
    const original = JSON.parse(initial);
    response = original.response;
    cases = original.cases;
  }
  async function addCase() {
    await oncommit(addPathCase(source, paths, cases, current));
  }
  const noMoreCases = $derived(
    (exact &&
      Boolean(current?.choices.length) &&
      current!.choices.every((o) => cases.slice(0, -1).some((c) => c.value === o.value))) ||
      (exact && current?.type === 'boolean' && cases.length > 2),
  );
  async function remove(index: number) {
    if (window.confirm('Remove this case and its blocks? The other paths will stay intact.'))
      await oncommit(removePath(source, paths, index));
  }
  async function insert(index: number, kind: BlockKind) {
    if (await oncommit(insertPathBlock(source, paths, index, kind))) menu = null;
  }
</script>

<section class="paths-editor" aria-label="Paths block">
  <header>
    <GitBranch size={17} /><strong>Paths</strong><button
      type="button"
      class="quiet"
      disabled={actionDisabled}
      onclick={() => onreveal(paths.control)}>View language</button
    >
  </header>
  <div class="paths-content">
    <label class="based-on"
      ><span>Based on an earlier response</span><select
        disabled={disabled || fieldPending}
        value={response}
        onchange={(event) => changeResponse(event.currentTarget.value)}
        ><option value="" disabled>Select a response…</option
        >{#each responses as option (option.name)}<option value={option.name}
            >{option.title} · {option.type === 'number'
              ? 'Rating'
              : option.type === 'choice'
                ? 'Choice'
                : String(option.type)}</option
          >{/each}</select
      ></label
    >
    <p class="caption">
      {exact
        ? 'Follow the path matching the selected answer.'
        : 'Check paths from top to bottom. Follow the first matching rule.'}
    </p>
    <div class="cases">
      {#each paths.arms as arm, index (arm.target)}
        <section
          class="case"
          aria-label={index === fallbackIndex ? 'Otherwise path' : `Case ${index + 1}`}
        >
          <div class="case-heading" class:exact>
            {#if index === fallbackIndex}<strong>Otherwise</strong><span class="caption"
                >Any other answer</span
              >
            {:else if exact}<strong>When answer is</strong>
              {#if current?.choices.length}<select
                  aria-label={`Answer for case ${index + 1}`}
                  disabled={disabled || fieldPending}
                  bind:value={cases[index].value}
                  >{#if !current.choices.some((o) => o.value === cases[index].value)}<option
                      value={cases[index].value}
                      >{cases[index].value} · not in current options</option
                    >{/if}{#each current.choices.filter((o) => o.value === cases[index].value || !cases
                        .slice(0, -1)
                        .some((c, j) => j !== index && c.value === o.value)) as option (option.value)}<option
                      value={option.value}>{option.label}</option
                    >{/each}</select
                >
              {:else if current?.type === 'boolean'}<select
                  aria-label={`Answer for case ${index + 1}`}
                  disabled={disabled || fieldPending}
                  bind:value={cases[index].value}
                  ><option>true</option><option>false</option></select
                >
              {:else}<input
                  aria-label={`Answer for case ${index + 1}`}
                  disabled={disabled || fieldPending}
                  bind:value={cases[index].value}
                />{/if}
            {:else if arm.rule || current?.type === 'number'}<strong>When {response}</strong><select
                aria-label={`Comparison for rule ${index + 1}`}
                disabled={disabled || fieldPending}
                bind:value={cases[index].operator}
                ><option value=">=">is at least</option><option value="<">is below</option><option
                  value=">">is above</option
                ><option value="<=">is at most</option><option value="==">equals</option><option
                  value="!=">does not equal</option
                ></select
              ><input
                class="threshold"
                aria-label={`Threshold for rule ${index + 1}`}
                inputmode="decimal"
                disabled={disabled || fieldPending}
                bind:value={cases[index].number}
              />
            {:else}<label class="advanced"
                ><span>Advanced condition</span><input
                  aria-label={`Condition for rule ${index + 1}`}
                  disabled={disabled || fieldPending}
                  bind:value={cases[index].value}
                /></label
              >{/if}
            {#if index !== fallbackIndex}<div class="case-actions">
                {#if !exact}<button
                    type="button"
                    class="quiet"
                    aria-label={`Move rule ${index + 1} up`}
                    disabled={actionDisabled || index === 0}
                    onclick={() => oncommit(moveRule(source, paths, index))}
                    ><ArrowUp size={15} /></button
                  >{/if}<button
                  type="button"
                  class="quiet"
                  aria-label={`Remove case ${index + 1}`}
                  disabled={actionDisabled}
                  onclick={() => remove(index)}><X size={15} /></button
                >
              </div>{/if}
          </div>
          <div class="case-content">
            {#each children(index) as statement (idOf(statement))}
              <div class="child-block">
                <button
                  type="button"
                  class="child-toggle"
                  aria-expanded={expanded === idOf(statement)}
                  disabled={actionDisabled}
                  onclick={() => (expanded = expanded === idOf(statement) ? null : idOf(statement))}
                  ><MessageSquare size={15} /><span
                    ><small>{blockNames[statement.kind] ?? 'Source block'}</small><b
                      >{editableStatement(statement)
                        ? promptText(statement).split('\n')[0] || 'Untitled block'
                        : statement.kind}</b
                    ></span
                  ><ChevronDown size={15} /></button
                >
                {#if expanded === idOf(statement)}{#if editableStatement(statement)}<BlockFields
                      {source}
                      {statement}
                      {structure}
                      {disabled}
                      {oncommit}
                      onpending={(pending) => (fieldPending = pending)}
                    />{:else}<button
                      type="button"
                      disabled={actionDisabled}
                      onclick={() => onreveal(statement.span)}>Edit this block in Source</button
                    >{/if}{/if}
              </div>
            {:else}<p class="empty">No blocks. Go straight to the destination below.</p>{/each}
            <button
              type="button"
              class="add-block"
              disabled={actionDisabled}
              aria-expanded={menu === index}
              onclick={() => (menu = menu === index ? null : index)}
              ><Plus size={14} /> Add block to this path</button
            >
            {#if menu === index}<div class="block-menu">
                {#each ['ask', 'show', 'choose', 'rate', 'timer'] as kind (kind)}<button
                    type="button"
                    disabled={actionDisabled}
                    onclick={() => insert(index, kind as BlockKind)}>{blockNames[kind]}</button
                  >{/each}
              </div>{/if}
          </div>
          <label class="then"
            ><CornerDownRight size={15} /><span>Then</span><select
              aria-label={`Destination for ${index === fallbackIndex ? 'Otherwise' : `case ${index + 1}`}`}
              disabled={disabled || fieldPending}
              bind:value={cases[index].destination}
              >{#if paths.continuation}<option value={paths.continuation}
                  >Continue after Paths</option
                >{/if}<option value="end">Finish practice</option></select
            ></label
          >
        </section>
      {/each}
    </div>
    <button
      type="button"
      class="add-case"
      disabled={actionDisabled || noMoreCases}
      onclick={addCase}><Plus size={15} /> {exact ? 'Add case' : 'Add rule'}</button
    >
    {#if dirty}<div class="draft-actions">
        <span>Unapplied path changes</span><button type="button" {disabled} onclick={discard}
          >Discard</button
        ><button type="button" class="apply" {disabled} onclick={apply}>Apply path changes</button>
      </div>{/if}
  </div>
  {#if paths.continuation}<div class="after-paths">
      <Merge size={16} /><strong>After Paths</strong><span
        >Only paths set to “Continue after Paths” reach the following blocks.</span
      >
    </div>{/if}
</section>

<style>
  .paths-editor {
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 5px;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px;
    border-bottom: 1px solid var(--block-line, #dbe1d7);
    font-size: 16px;
  }
  header :global(svg) {
    color: var(--block-green, #08784b);
  }
  header .quiet {
    margin-left: auto;
  }
  strong {
    font-weight: 700;
  }
  button,
  select,
  input {
    font: inherit;
    text-transform: none;
    min-width: 0;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 3px;
    padding: 7px 9px;
    font-size: 13px;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }
  button:hover {
    background: var(--block-soft, #f5f7f2);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .quiet {
    border: 0;
    background: transparent;
    padding: 5px;
    font-size: 12px;
  }
  .paths-content {
    padding: 14px;
  }
  .based-on {
    display: block;
  }
  .based-on > span,
  .advanced > span {
    display: block;
    font-size: 12px;
    margin-bottom: 5px;
    color: var(--ink-muted, #626a60);
  }
  .based-on select {
    width: 100%;
  }
  .caption {
    font-size: 12px;
    color: var(--ink-muted, #626a60);
    margin: 8px 0 14px;
  }
  .cases {
    display: grid;
    gap: 12px;
  }
  .case {
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 4px;
    overflow: hidden;
  }
  .case-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    padding: 9px 10px;
    background: var(--block-soft, #f5f7f2);
    font-size: 12px;
  }
  .case-heading .caption {
    margin: 0;
  }
  .case-heading select {
    max-width: 100%;
    font-size: 12px;
  }
  .case-heading input {
    max-width: 100%;
  }
  .threshold {
    width: 62px;
  }
  .case-actions {
    margin-left: auto;
    display: flex;
  }
  .case-content {
    margin: 12px 10px 0 14px;
    padding-left: 10px;
    border-left: 2px solid var(--block-line, #dbe1d7);
  }
  .child-block {
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 3px;
    margin: 0 0 8px;
  }
  .child-toggle {
    width: 100%;
    border: 0;
    padding: 9px 10px;
    text-align: left;
    justify-content: flex-start;
  }
  .child-toggle span {
    flex: 1;
    min-width: 0;
  }
  .child-toggle small {
    display: block;
    font-size: 11px;
    color: var(--ink-muted, #626a60);
  }
  .child-toggle b {
    display: block;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .add-block {
    border-style: dashed;
    font-size: 12px;
    margin-bottom: 10px;
  }
  .empty {
    font-size: 12px;
    color: var(--ink-muted, #626a60);
    margin: 0 0 9px;
  }
  .then {
    display: flex;
    align-items: center;
    gap: 6px;
    border-top: 1px solid var(--block-line, #dbe1d7);
    padding: 7px 10px;
    font-size: 12px;
  }
  .then select {
    flex: 1;
    border: 0;
    font-size: 12px;
  }
  .add-case {
    margin-top: 12px;
  }
  .block-menu {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    padding-bottom: 10px;
  }
  .block-menu button {
    font-size: 12px;
  }
  .after-paths {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    border-top: 1px solid var(--block-line, #dbe1d7);
    padding: 12px 14px;
    font-size: 13px;
  }
  .after-paths :global(svg) {
    color: var(--block-green, #08784b);
  }
  .after-paths span {
    display: block;
    width: 100%;
    color: var(--ink-muted, #626a60);
    font-size: 12px;
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
    margin-right: auto;
    font-size: 12px;
    color: var(--ink-muted, #626a60);
  }
  .apply {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  @media (max-width: 800px) {
    .paths-content {
      padding: 12px 10px;
    }
    button,
    select {
      min-height: 44px;
    }
    input,
    select {
      font-size: 16px !important;
    }
    .then {
      flex-wrap: wrap;
    }
    .then select {
      flex: 0 0 100%;
      width: 100%;
    }
    .case-heading.exact > strong {
      flex: 1;
    }
    .case-heading.exact .case-actions {
      order: 1;
    }
    .case-heading.exact > select,
    .case-heading.exact > input {
      order: 2;
      flex: 0 0 100%;
      width: 100%;
    }
    .case-heading .quiet {
      min-width: 36px;
    }
    .child-toggle :global(svg) {
      flex-shrink: 0;
    }
    .child-block :global(.block-fields) {
      padding-left: 10px;
      padding-right: 10px;
    }
  }
</style>
