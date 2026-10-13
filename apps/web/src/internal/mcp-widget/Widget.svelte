<!-- Standalone MCP App: absolute public links, no SvelteKit navigation adapter. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { App } from '@modelcontextprotocol/ext-apps';
  import PracticeEmbed from '$lib/pattern-embed/PracticeEmbed.svelte';
  import definition from '../../../../mcp/dist/widget-practice.json';
  import { matchesPracticeResult } from './contract';
  import type { PatternRun } from '$lib/pattern-runtime/types';
  import { practiceSnapshot } from '$lib/pattern-run/history';
  import { serializePracticeArchive } from '@patternverse/workspace/practice-history';

  let ready = $state(false);
  let error = $state('');
  let run = $state<PatternRun | null>(null);
  let exporting = $state(false);
  let runTitle = $state('Define the Decision');
  let exportError = $state('');
  let copied = $state(false);
  let exportText = $state('');
  function prepareExport() {
    if (!run) return;
    try {
      exportText = serializePracticeArchive({
        ...practiceSnapshot(
          run,
          {
            patternRef: { sourceId: 'commons', entityId: definition.entry.id },
            patternTitle: 'Define the Decision',
            patternType: 'pattern',
            verseIds: ['decision-making'],
          },
          { origin: 'chatgpt', resumable: true },
        ),
        title: runTitle.trim() || 'Define the Decision',
      });
      exportError = '';
      copied = false;
    } catch {
      exportError = 'This run could not be exported. Keep the view open and try again.';
    }
  }
  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      copied = true;
    } catch {
      exportError =
        'Select the export below and copy it manually. This host does not allow clipboard access.';
    }
  }
  onMount(() => {
    const app = new App(
      { name: 'Patternverse practice', version: '0.1.0' },
      { availableDisplayModes: ['inline'] },
      { autoResize: true },
    );
    // Register before connecting. Never request the opener again, or send answers,
    // checkpoints, outputs, or model context through this bridge.
    app.ontoolresult = (result) => {
      if (ready) return; // Replayed notifications must not reset an in-progress run.
      if (!matchesPracticeResult(result, definition.entry.id, definition.revision)) {
        error = 'This practice could not be opened. Try opening it again from the chat.';
        return;
      }
      error = '';
      ready = true;
    };
    app.ontoolcancelled = () => {
      if (!ready) error = 'Opening was cancelled.';
    };
    void app.connect(undefined, { timeout: 10000 }).catch(() => {
      if (!ready)
        error =
          'The chat host could not connect. You can use this practice on Patternverse instead.';
    });
    return () => {
      void app.close();
    };
  });
</script>

{#if ready}
  <PracticeEmbed
    source={definition.source}
    title="Define the Decision"
    failureMessage="This chat host could not run the worksheet. You can use it on Patternverse instead."
    onchange={(next) => {
      run = next;
      exporting = false;
      exportText = '';
      copied = false;
    }}
  />
  <footer>
    {#if run}<section class="export-run" aria-label="Keep your practice responses">
        <strong>Keep your responses.</strong>
        <p>Export this run to keep a private copy. Nothing is uploaded automatically.</p>
        <button
          type="button"
          onclick={() => {
            exporting = !exporting;
            if (exporting) prepareExport();
          }}>Export responses</button
        >
        {#if exporting}<label
            >Run title<input
              maxlength="120"
              value={runTitle}
              oninput={(event) => {
                runTitle = event.currentTarget.value;
                prepareExport();
              }}
            /></label
          >
          <p>
            Copy the export below and keep it in your own files. Individual response imports into
            the Patternverse workspace are not available.
          </p>
          <label
            >Practice export<textarea
              readonly
              rows="5"
              value={exportText}
              onfocus={(event) => event.currentTarget.select()}></textarea></label
          >
          <button type="button" onclick={copyExport} disabled={!exportText}>Copy export</button>
          {#if copied}<p role="status">Export copied. It contains your private responses.</p>{/if}
          {#if exportError}<p role="alert">{exportError}</p>{/if}
        {/if}
      </section>{/if}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href={definition.entry.url} target="_blank" rel="noopener noreferrer"
      >Open on Patternverse ↗</a
    >
  </footer>
{:else}
  <section class="waiting">
    <h1>Define the Decision</h1>
    {#if error}<p role="alert">{error}</p>{:else}<p role="status">Connecting to your chat…</p>{/if}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href={definition.entry.url} target="_blank" rel="noopener noreferrer"
      >Open on Patternverse ↗</a
    >
  </section>
{/if}

<style>
  :global(html) {
    color-scheme: light;
    background: #fff;
  }
  :global(body) {
    margin: 0;
    color: #181814;
    font-family: ui-sans-serif, system-ui, sans-serif;
  }
  :global(*) {
    box-sizing: border-box;
  }
  .waiting {
    padding: 24px;
    font-size: 14px;
  }
  h1 {
    font-size: 24px;
  }
  a {
    color: #008653;
  }
  footer {
    padding: 0 24px 20px;
    max-width: 760px;
    margin: auto;
    font-size: 13px;
  }
  .export-run {
    padding: 18px 0;
    margin-bottom: 14px;
    border-block: 1px solid #d7dfd9;
  }
  .export-run p {
    line-height: 1.6;
    color: #58625b;
  }
  .export-run label {
    display: grid;
    gap: 8px;
    margin: 14px 0;
  }
  .export-run input,
  .export-run textarea {
    width: 100%;
    min-width: 0;
    font: inherit;
    padding: 10px;
    color: #181814;
    background: white;
    border: 1px solid #b8c3bc;
    border-radius: 4px;
  }
  .export-run button {
    font: inherit;
    min-height: 44px;
    padding: 8px 12px;
    color: white;
    background: #181814;
    border: 1px solid #181814;
    border-radius: 4px;
    cursor: pointer;
  }
  .export-run [role='alert'] {
    color: #9c2d20;
  }
  :global(.markdown-body) {
    line-height: 1.65;
  }
  :global(.markdown-body p:first-child) {
    margin-top: 0;
  }
</style>
