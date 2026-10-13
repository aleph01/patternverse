<script lang="ts">
  import { tick } from 'svelte';
  import { X, Copy, Download } from '@lucide/svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import { renderMarkdownPreview } from '$lib/client/markdown-preview';
  import { downloadText } from '$lib/client/download';
  import {
    exportWorksheet,
    worksheetPlainText,
    worksheetFilename,
    type Worksheet,
    type WorksheetDefinition,
  } from '$lib/worksheet/export';

  let { definition, open = $bindable(false) }: { definition: WorksheetDefinition; open?: boolean } =
    $props();
  const id = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let worksheet = $state<Worksheet>();
  let html = $state('');
  let loading = $state(false);
  let error = $state('');
  let status = $state('');
  let copying = $state(false);
  let tab = $state<'preview' | 'markdown' | 'plain'>('preview');
  const plain = $derived(worksheet ? worksheetPlainText(worksheet.markdown) : '');
  const fidelity = $derived(
    worksheet?.fidelity === 'complete'
      ? 'Complete workbook'
      : worksheet?.fidelity === 'adapted'
        ? 'Workbook with manual instructions'
        : 'Workbook with manual calculations',
  );

  $effect(() => {
    if (!dialog) return;
    if (!open) {
      dialog.close();
      return;
    }
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let active = true;
    loading = true;
    error = '';
    status = '';
    worksheet = undefined;
    html = '';
    tab = 'preview';
    void exportWorksheet(definition)
      .then(async (result) => {
        const rendered = await renderMarkdownPreview(result.markdown);
        if (active) {
          worksheet = result;
          html = rendered;
        }
      })
      .catch(() => {
        if (active)
          error =
            'A workbook is unavailable for this definition. AI-dependent or ambiguous practices must be used interactively; nothing has been copied.';
      })
      .finally(() => {
        if (active) loading = false;
      });
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
    };
  });
  async function copy(format: 'markdown' | 'plain') {
    if (!worksheet || copying) return;
    copying = true;
    status = '';
    error = '';
    try {
      await navigator.clipboard.writeText(format === 'plain' ? plain : worksheet.markdown);
      status = format === 'plain' ? 'Plain text copied.' : 'Markdown copied.';
    } catch {
      tab = format;
      await tick();
      error = 'Clipboard access is unavailable. Select and copy the text below, or download it.';
    } finally {
      copying = false;
    }
  }
  function download(format: 'md' | 'txt') {
    if (!worksheet) return;
    downloadText(
      format === 'md' ? worksheet.markdown : plain,
      worksheetFilename(worksheet.title, format),
      'text/plain;charset=utf-8',
    );
    status = `${format === 'md' ? 'Markdown' : 'Plain text'} download started.`;
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby={`${id}-title`}
  aria-describedby={`${id}-description`}
  onclose={() => (open = false)}
>
  <div class="worksheet-shell">
    <header>
      <span class="eyebrow">Take it with you</span>
      <button
        type="button"
        class="close"
        aria-label="Close worksheet"
        onclick={() => (open = false)}><X size={20} /></button
      >
      <h2 class="worksheet-title" id={`${id}-title`}>copy worksheet</h2>
      <p id={`${id}-description`}>Use this pattern in Notion, a document, or your own editor.</p>
      {#if worksheet}
        <div class="fidelity">
          <span class:partial={worksheet.fidelity === 'partial'}>{fidelity}</span
          >{#if worksheet.fidelity === 'complete'}<small>No runtime or AI steps required.</small
            >{/if}
        </div>
      {/if}
    </header>
    {#if loading}<p class="loading" role="status">Preparing your blank worksheet…</p>{/if}
    {#if worksheet}
      <div class="tabs" role="group" aria-label="Worksheet format">
        <button type="button" aria-pressed={tab === 'preview'} onclick={() => (tab = 'preview')}
          >Preview</button
        >
        <button type="button" aria-pressed={tab === 'markdown'} onclick={() => (tab = 'markdown')}
          >Markdown</button
        >
        <button type="button" aria-pressed={tab === 'plain'} onclick={() => (tab = 'plain')}
          >Plain text</button
        >
      </div>
      <!-- Keyboard users must be able to focus and scroll the preview. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="worksheet-document" tabindex="0" role="region" aria-label="Worksheet content">
        {#if tab === 'preview'}<MarkdownRenderer {html} />{:else}<pre>{tab === 'markdown'
              ? worksheet.markdown
              : plain}</pre>{/if}
      </div>
    {/if}
    <div class="feedback" aria-live="polite">
      {status}{#if error}<p role="alert">{error}</p>{/if}
    </div>
    <footer>
      <small>Blank worksheet · no saved answers</small>
      <div class="copy-actions">
        <button type="button" disabled={!worksheet || copying} onclick={() => copy('markdown')}
          ><Copy size={16} />Copy Markdown</button
        >
        <button
          type="button"
          class="primary-copy"
          disabled={!worksheet || copying}
          onclick={() => copy('plain')}><Copy size={16} />Copy plain text</button
        >
      </div>
      <div class="downloads">
        <button type="button" disabled={!worksheet} onclick={() => download('md')}
          ><Download size={15} />Download .md</button
        >
        <button type="button" disabled={!worksheet} onclick={() => download('txt')}
          >Download .txt</button
        >
      </div>
    </footer>
  </div>
</dialog>

<style>
  dialog {
    width: min(740px, calc(100vw - 48px));
    max-height: calc(100dvh - 48px);
    padding: 0;
    border: 1px solid #dfe2dc;
    border-radius: 8px;
    color: #191a17;
    background: white;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    box-shadow: 0 20px 80px #191a1730;
  }
  dialog::backdrop {
    background: #191a1745;
  }
  .worksheet-shell {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 50px);
    padding: 26px 28px 18px;
  }
  header {
    position: relative;
    flex-shrink: 0;
  }
  header .worksheet-title {
    margin: 12px 40px 8px 0;
    font-size: 30px;
    letter-spacing: -0.04em;
    line-height: 1.15;
    font-weight: 750;
  }
  header p {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
  }
  .eyebrow {
    font-size: 11px;
    color: #62665f;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 10px 15px;
    border: 1px solid #dcdfd9;
    border-radius: 5px;
    background: white;
    color: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  button:hover {
    background: #eff7f2;
  }
  button:focus-visible,
  .worksheet-document:focus-visible {
    outline: 2px solid #007a4d;
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .close {
    position: absolute;
    right: -8px;
    top: -10px;
    width: 44px;
    border: 0;
    padding: 0;
  }
  .fidelity {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin: 16px 0;
  }
  .fidelity span {
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid #007a4d;
    border-radius: 4px;
    color: #007a4d;
  }
  .fidelity .partial {
    color: #725013;
    border-color: #a58952;
    background: #fff9ed;
  }
  small {
    font-size: 12px;
    color: #62665f;
  }
  .tabs {
    display: flex;
    width: fit-content;
    margin: 0 0 14px;
    flex-shrink: 0;
  }
  .tabs button {
    min-width: 105px;
    border-radius: 0;
  }
  .tabs button:first-child {
    border-radius: 5px 0 0 5px;
  }
  .tabs button:last-child {
    border-radius: 0 5px 5px 0;
  }
  .tabs button + button {
    margin-left: -1px;
  }
  .tabs [aria-pressed='true'] {
    color: white;
    background: #191a17;
  }
  .worksheet-document {
    min-height: 120px;
    overflow: auto;
    overscroll-behavior: contain;
    border: 1px solid #dfe2dc;
    border-radius: 5px;
    padding: 24px;
  }
  pre {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :global(.worksheet-document .markdown-body) {
    font-size: 15px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  :global(.worksheet-document .markdown-body h1) {
    font-size: 24px;
    line-height: 1.2;
    margin: 0 0 24px;
  }
  :global(.worksheet-document .markdown-body h2) {
    font-size: 20px;
    line-height: 1.3;
    margin: 24px 0 12px;
  }
  :global(.worksheet-document .markdown-body h3) {
    font-size: 17px;
    line-height: 1.4;
    margin: 20px 0 10px;
  }
  :global(.worksheet-document .markdown-body p) {
    font-size: 15px;
    margin: 10px 0;
  }
  :global(.worksheet-document .markdown-body code) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :global(.worksheet-document .markdown-body blockquote) {
    margin: 0 0 20px;
    padding: 12px 16px;
    border-left: 3px solid #a58952;
    background: #fff9ed;
    font-size: 13px;
  }
  .loading {
    min-height: 120px;
  }
  .feedback {
    color: #007a4d;
    font-size: 13px;
    flex-shrink: 0;
  }
  .feedback:not(:empty) {
    padding-top: 10px;
  }
  .feedback p {
    margin: 0;
    color: #725013;
  }
  footer {
    display: block;
    width: auto;
    flex-shrink: 0;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid #e4e5e1;
  }
  .copy-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
  .copy-actions button {
    font-weight: 600;
  }
  .primary-copy {
    background: #007a4d;
    color: white;
    border-color: #007a4d;
  }
  .primary-copy:hover {
    background: #00653f;
  }
  .downloads {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
  }
  .downloads button {
    border: 0;
    min-height: 36px;
    font-size: 12px;
  }
  @media (max-width: 640px) {
    dialog {
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      margin: 0;
      border: 0;
      border-radius: 0;
    }
    .worksheet-shell {
      height: 100dvh;
      max-height: 100dvh;
      box-sizing: border-box;
      padding: 20px 20px calc(12px + env(safe-area-inset-bottom));
    }
    header .worksheet-title {
      font-size: 28px;
    }
    .tabs {
      width: 100%;
    }
    .tabs button {
      min-width: 0;
      flex: 1;
    }
    .worksheet-document {
      flex: 1;
      min-height: 0;
      padding: 18px;
    }
    .copy-actions {
      flex-direction: column-reverse;
      gap: 6px;
    }
    .copy-actions button {
      width: 100%;
    }
    .downloads {
      justify-content: center;
    }
    .downloads button {
      min-height: 44px;
    }
    .fidelity {
      margin: 12px 0;
    }
  }
</style>
