<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Check, Copy, Pencil, Play, RotateCcw } from '@lucide/svelte';
  import { highlightSource } from '$lib/pattern-editor/highlight';
  import type PatternPreview from '$lib/pattern-editor/PatternPreview.svelte';
  import type { Inspection } from '$lib/pattern-editor/types';
  import type { ExampleOptions } from './options';

  let {
    filename,
    source,
    options = {},
  }: { filename: string; source: string; options?: ExampleOptions } = $props();
  let draft = $state(untrack(() => source));
  let applied = $state(untrack(() => source));
  let editing = $state(false);
  let copied = $state(false);
  let copyError = $state('');
  let inputIndex = $state(0);
  let active = $state(false);
  let checking = $state(false);
  let error = $state('');
  let inspection = $state<Inspection | null>(null);
  let Preview = $state<typeof PatternPreview | null>(null);
  let root = $state<HTMLDivElement>();
  let generation = $state(0);
  let mounted = false;
  const id = $props.id();
  const dirty = $derived(draft !== applied);
  const diagnostics = $derived(inspection?.diagnostics ?? []);
  const selectedInputs = $derived(options.inputs?.[inputIndex]?.values ?? {});

  async function compile() {
    const token = ++generation;
    const snapshot = draft;
    applied = snapshot;
    inspection = null;
    error = '';
    checking = true;
    try {
      const { inspectSource } = await import('$lib/pattern-editor/bridge');
      const next = await inspectSource(snapshot, {
        isolated: true,
        widgets: options.widgets,
        data: options.data,
      });
      if (mounted && token === generation) inspection = next;
    } catch (cause) {
      if (mounted && token === generation) error = String(cause);
    } finally {
      if (mounted && token === generation) checking = false;
    }
  }

  async function activate() {
    if (!mounted || options.preview === false || active) return;
    active = true;
    try {
      const component = await import('$lib/pattern-editor/PatternPreview.svelte');
      if (!mounted) return;
      Preview = component.default;
      await compile();
    } catch (cause) {
      if (mounted) {
        active = false;
        error = String(cause);
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      copied = true;
      copyError = '';
    } catch {
      copyError = 'Select the source text to copy it.';
    }
  }

  function reset() {
    draft = source;
    editing = false;
    copied = false;
    inputIndex = 0;
    if (active) void compile();
  }

  onMount(() => {
    mounted = true;
    let observer: IntersectionObserver | undefined;
    if (options.preview !== false && !options.onDemand) {
      if (typeof IntersectionObserver === 'undefined') void activate();
      else {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer?.disconnect();
              void activate();
            }
          },
          { rootMargin: '200px' },
        );
        observer.observe(root!);
      }
    }
    return () => {
      mounted = false;
      generation++;
      observer?.disconnect();
    };
  });
</script>

<div class="example-widget" bind:this={root} data-example={filename}>
  <div class="example-grid" class:source-only={options.preview === false}>
    <figure class="source-example" data-runnable={options.preview !== false}>
      <figcaption>
        <span>{filename}</span>
        <div class="source-actions">
          <button type="button" aria-label={`Copy ${filename}`} onclick={copy}>
            {#if copied}<Check size={14} aria-hidden="true" />{:else}<Copy
                size={14}
                aria-hidden="true"
              />{/if}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            aria-label={`Edit ${filename}`}
            aria-pressed={editing}
            onclick={() => (editing = !editing)}
            ><Pencil size={14} aria-hidden="true" />{editing ? 'View code' : 'Edit'}</button
          >
          {#if draft !== source || inputIndex !== 0}
            <button type="button" aria-label={`Reset ${filename}`} onclick={reset}
              ><RotateCcw size={14} aria-hidden="true" />Reset</button
            >
          {/if}
        </div>
      </figcaption>
      {#if editing}
        <label class="sr-only" for={`${id}-source`}>Edit {filename} source</label>
        <textarea
          id={`${id}-source`}
          class="source-input"
          value={draft}
          rows={Math.min(24, Math.max(8, draft.split('\n').length))}
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          oninput={(event) => {
            draft = event.currentTarget.value;
            copied = false;
          }}></textarea>
      {:else}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable examples need keyboard focus.) -->
        <pre tabindex="0" role="region" aria-label={`${filename} source`}><code
            >{#each highlightSource(draft) as token, index (index)}<span
                class={`token-${token.kind}`}>{token.text}</span
              >{/each}</code
          ></pre>
      {/if}
      {#if dirty && options.preview !== false}
        <div class="source-update">
          <span>Edits are waiting to run.</span>
          <button
            type="button"
            disabled={checking}
            onclick={() => (active ? compile() : activate())}
            ><Play size={14} aria-hidden="true" />Run changes</button
          >
        </div>
      {/if}
      {#if copyError}<p class="source-message" role="status">{copyError}</p>{/if}
    </figure>
    {#if options.preview !== false}
      <section class="live-result" aria-label={`${filename} live result`}>
        {#if options.inputs?.length}
          <label class="input-preset"
            >Example input
            <select
              value={inputIndex}
              onchange={(event) => (inputIndex = Number(event.currentTarget.value))}
            >
              {#each options.inputs as input, index (input.label)}<option value={index}
                  >{input.label}</option
                >{/each}
            </select>
          </label>
        {/if}
        {#if error}
          <p class="error" role="alert">{error}</p>
          <button
            class="load-example"
            type="button"
            onclick={() => (active ? compile() : activate())}>Try again</button
          >
        {:else if diagnostics.some(({ severity }) => severity === 'Error')}
          <div class="diagnostics" role="alert">
            <strong>Check the source</strong>
            <ul>
              {#each diagnostics as diagnostic, index (index)}<li>
                  {diagnostic.message}{diagnostic.help ? ` ${diagnostic.help}` : ''}
                </li>{/each}
            </ul>
            <p>Edit the source, then run your changes.</p>
          </div>
        {:else if Preview && inspection?.structure}
          {#key `${generation}:${inputIndex}`}
            <Preview
              source={applied}
              {inspection}
              autoStart
              initialInputs={selectedInputs}
              mockResults={options.mockResults}
              heading="Live result"
              isolated
              widgets={options.widgets}
              data={options.data}
            />
          {/key}
        {:else}
          <div class="preview-placeholder">
            <strong>Live result</strong>
            <p>
              {checking || active
                ? 'Preparing the example…'
                : options.onDemand
                  ? 'Run the example to see it rendered here.'
                  : 'The interactive example loads as you reach it.'}
            </p>
            {#if !active}<button class="load-example" type="button" onclick={activate}
                ><Play size={15} aria-hidden="true" />Run example</button
              >{/if}
          </div>
        {/if}
      </section>
    {/if}
  </div>
  {#if options.note}<p class="example-note">{options.note}</p>{/if}
  <noscript
    ><p class="example-note">
      Enable JavaScript to try the interactive result. The source remains readable above.
    </p></noscript
  >
</div>

<style>
  .example-widget {
    container-type: inline-size;
    margin: 24px 0;
    min-width: 0;
  }
  .example-grid {
    display: grid;
    border: 1px solid #d7dbd0;
    border-radius: 7px;
    overflow: hidden;
    background: var(--paper, #fff);
  }
  .source-example {
    min-width: 0;
    margin: 0;
    background: var(--ink, #181814);
    color: #fff;
  }
  figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid #45473e;
    font-size: 12px;
    line-height: 1.5;
  }
  figcaption > span {
    overflow-wrap: anywhere;
  }
  .source-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 36px;
    border: 1px solid #53554d;
    border-radius: 4px;
    padding: 6px 9px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    text-transform: none;
  }
  button:hover {
    background: #ffffff18;
  }
  button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  pre,
  .source-input {
    margin: 0;
    padding: 20px;
    overflow: auto;
    max-height: 640px;
    tab-size: 4;
    font:
      12px/1.8 ui-monospace,
      SFMono-Regular,
      Consolas,
      monospace;
  }
  pre code {
    font: inherit;
    background: transparent;
    padding: 0;
    white-space: pre;
  }
  .source-input {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #fff;
    resize: vertical;
    min-height: 240px;
    white-space: pre;
  }
  .source-input:focus-visible,
  pre:focus-visible,
  button:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--green, #05ce78);
    outline-offset: -3px;
  }
  .token-directive {
    color: #77e6b1;
    font-weight: 700;
  }
  .token-metadata {
    color: #c5b4f5;
  }
  .token-reference {
    color: #9cc6ff;
  }
  .token-string {
    color: #f0b98d;
  }
  .token-comment {
    color: #acb5a9;
  }
  .source-update {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-top: 1px solid #45473e;
    font-size: 12px;
  }
  .source-message {
    padding: 0 14px 14px;
    font-size: 12px;
  }
  .live-result {
    min-width: 0;
    border-top: 1px solid #d7dbd0;
    color: var(--ink, #181814);
    background: var(--paper, #fff);
  }
  .live-result :global(.pattern-show dl) {
    display: grid;
    gap: 4px;
  }
  .live-result :global(.pattern-show dl div) {
    display: grid;
    grid-template-columns: minmax(80px, 1fr) minmax(0, 2fr);
    gap: 8px;
  }
  .live-result :global(.pattern-show dt) {
    max-width: none;
  }
  .preview-placeholder,
  .diagnostics {
    padding: 20px;
    font-size: 14px;
    line-height: 1.65;
  }
  .preview-placeholder p {
    color: var(--muted, #62655f);
  }
  .load-example {
    color: var(--ink, #181814);
    border-color: #bfc2ba;
    margin: 12px;
  }
  .preview-placeholder .load-example {
    margin: 0;
  }
  .load-example:hover {
    background: #f0f3ec;
  }
  .input-preset {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 16px;
    font-size: 12px;
    border-bottom: 1px solid #d7dbd0;
  }
  select {
    flex: 1;
    min-width: 0;
    padding: 8px;
    border: 1px solid #d7dbd0;
    background: var(--paper, #fff);
    color: inherit;
    font: inherit;
  }
  .error {
    padding: 16px;
    color: #a43229;
    overflow-wrap: anywhere;
  }
  .example-note {
    margin: 12px 0 0;
    color: var(--muted, #62655f);
    font-size: 13px;
    line-height: 1.6;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @container (min-width: 780px) {
    .example-grid:not(.source-only) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .live-result {
      border-top: 0;
      border-left: 1px solid #d7dbd0;
    }
  }
  @media (max-width: 740px) {
    button {
      min-height: 44px;
    }
    .source-input {
      font-size: 16px;
    }
    pre {
      padding: 16px;
    }
    select {
      font-size: 16px;
    }
  }
</style>
