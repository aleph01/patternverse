<script lang="ts">
  import PatternSource from './PatternSource.svelte';
  import PatternPreview from './PatternPreview.svelte';
  import PracticeBlockEditor from './PracticeBlockEditor.svelte';
  import { inspectSource } from './bridge';
  import { sourceSelection, type Inspection } from './types';
  let {
    source,
    disabled = false,
    onchange,
    onpendingchange = () => {},
  }: {
    source: string;
    disabled?: boolean;
    onchange: (source: string) => void;
    onpendingchange?: (pending: boolean) => void;
  } = $props();
  let inspection = $state<Inspection | null>(null),
    checking = $state(true),
    error = $state(''),
    help = $state(false);
  let mode = $state<'blocks' | 'source' | 'preview'>('blocks');
  let blockPending = $state(false);
  let inspectionSource = $state('');
  let field = $state<ReturnType<typeof PatternSource>>();
  let checked = $state<import('./completion').CheckedSource>();
  $effect(() => {
    const text = source;
    checking = true;
    error = '';
    let live = true;
    const timer = setTimeout(() => {
      void inspectSource(text)
        .then((result) => {
          if (live) {
            inspection = result;
            inspectionSource = text;
            checking = false;
            if (result.structure) checked = { source: text, structure: result.structure };
          }
        })
        .catch((cause) => {
          if (live) {
            error = String(cause);
            checking = false;
          }
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  });
  $effect(() => onpendingchange(blockPending));
  async function reveal(span: import('./types').SourceSpan) {
    mode = 'source';
    const { tick } = await import('svelte');
    await tick();
    field?.reveal({ severity: 'Warning', message: '', primary: span });
  }
</script>

<div class="language-editor">
  <div class="mode-tabs" role="tablist" aria-label="Practice editing mode">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'blocks'}
      disabled={blockPending}
      onclick={() => (mode = 'blocks')}>Blocks</button
    ><button
      type="button"
      role="tab"
      aria-selected={mode === 'source'}
      disabled={blockPending}
      onclick={() => (mode = 'source')}>Source</button
    ><button
      type="button"
      role="tab"
      aria-selected={mode === 'preview'}
      disabled={blockPending}
      onclick={() => (mode = 'preview')}>Preview</button
    >
  </div>
  <div class="panes" class:preview-only={mode === 'preview'}>
    <section class="source-pane" hidden={mode === 'preview'} aria-label="Practice editing">
      <div hidden={mode !== 'blocks'}>
        <PracticeBlockEditor
          {source}
          {inspection}
          checking={checking || inspectionSource !== source}
          {disabled}
          {onchange}
          onreveal={reveal}
          onpendingchange={(pending) => (blockPending = pending)}
        />
      </div>
      <div hidden={mode !== 'source'}>
        <header>
          <strong>Pattern Language</strong><button
            type="button"
            aria-expanded={help}
            onclick={() => (help = !help)}>Syntax help</button
          >
        </header>
        <div class="insert">
          <span>insert</span
          >{#each ['!ask', '!choose', '!rate', '!timer', '!show', '!video', '!image'] as command (command)}<button
              type="button"
              {disabled}
              onclick={() => field?.insert(command)}>{command}</button
            >{/each}
        </div>
        {#if help}<p class="help">
            Bind a response with <code>answer = !ask &#123; … &#125;</code>. Refer to it with
            <code>&#123;&#123;answer&#125;&#125;</code>. End every path with <code>-> end</code>.
            Ctrl+Space opens suggestions. Preview never calls AI; model effects accept mock results.
          </p>{/if}
        <PatternSource
          bind:this={field}
          {source}
          {disabled}
          diagnostics={inspection?.diagnostics ?? []}
          {checked}
          {onchange}
        />
      </div>
      <div class="diagnostics" role="status">
        {#if checking}Checking source…{:else if error}<p class="error">
            Compiler unavailable: {error}
          </p>{:else if inspection?.diagnostics.length}
          {#each inspection.diagnostics as diagnostic, index (index)}<button
              type="button"
              class:error={diagnostic.severity === 'Error'}
              disabled={blockPending}
              onclick={() => reveal(diagnostic.primary)}
              >{diagnostic.severity} · line {source
                .slice(0, sourceSelection(source, diagnostic.primary)[0])
                .split('\n').length}: {diagnostic.message}{diagnostic.help
                ? ` — ${diagnostic.help}`
                : ''}</button
            >{/each}
        {:else}✓ No issues{/if}
      </div>
    </section>
    <section
      class="preview-pane"
      class:inactive={mode !== 'preview'}
      aria-label="Interactive practice preview"
    >
      <PatternPreview {source} {inspection} {checking} {disabled} />
    </section>
  </div>
</div>

<style>
  .language-editor {
    min-width: 0;
  }
  .panes {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .source-pane,
  .preview-pane {
    min-width: 0;
    border: 1px solid #dedfd8;
    border-radius: 4px;
    background: var(--paper);
  }
  header {
    height: 49px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid #dedfd8;
    font-size: 13px;
  }
  .language-editor button {
    text-transform: none;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid #dedfd8;
    border-radius: 3px;
    padding: 7px 9px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  header button {
    border: 0;
    font-weight: 700;
  }
  .insert {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    padding: 10px 14px;
    border-bottom: 1px solid #dedfd8;
    background: #f7f8f4;
    color: #181814;
    font-size: 11px;
  }
  .insert button {
    font-family: ui-monospace, monospace;
    font-weight: 700;
  }
  .insert span {
    margin-right: 3px;
  }
  .diagnostics {
    padding: 11px 14px;
    background: #e8f7ec;
    color: #397454;
    font-size: 12px;
    border-top: 1px solid #dedfd8;
    overflow-wrap: anywhere;
  }
  .diagnostics button {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 4px 0;
    font-size: 12px;
  }
  .error {
    color: #a43229;
  }
  .help {
    margin: 0;
    padding: 14px;
    font-size: 12px;
    line-height: 1.6;
    border-bottom: 1px solid #dedfd8;
  }
  .mode-tabs {
    display: flex;
    gap: 4px;
    margin: 0 0 14px;
  }
  .mode-tabs button[aria-selected='true'] {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }
  [hidden] {
    display: none !important;
  }
  .panes.preview-only {
    grid-template-columns: 1fr;
  }
  button:disabled {
    opacity: 0.45;
  }
  @media (max-width: 800px) {
    .panes {
      display: block;
    }
    .inactive {
      display: none;
    }
    .mode-tabs {
      display: flex;
      margin: 0 0 14px;
    }
    .mode-tabs button {
      flex: 1;
      min-height: 44px;
      border-radius: 0;
      font-size: 14px;
      font-weight: 700;
    }
    .mode-tabs button[aria-selected='true'] {
      background: var(--ink);
      border-color: var(--ink);
      color: var(--paper);
    }
  }
</style>
