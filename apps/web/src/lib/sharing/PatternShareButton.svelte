<script lang="ts">
  import { resolve } from '$app/paths';
  import { Copy, Link, PanelTop, Play, Share2, X } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';
  import { embedCode, patternShareUrl, type PatternShare } from './types';

  let { share }: { share: PatternShare } = $props();
  const uid = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let open = $state(false);
  let ready = $state(false);
  let tab = $state<'link' | 'card' | 'practice'>('link');
  let selected = $state('');
  let message = $state('');
  let error = $state('');
  let copying = $state(false);
  let field = $state<HTMLInputElement | HTMLTextAreaElement>();
  const practice = $derived(
    share.practices.find((item) => `${item.type}:${item.id}` === selected) ?? share.practices[0],
  );
  const embedPath = $derived(
    resolve('/embed/[mode]/[type=embedType]/[id]', {
      mode: tab === 'practice' ? 'practice' : 'card',
      type: tab === 'practice' && practice ? practice.type : 'pattern',
      id: tab === 'practice' && practice ? practice.id : share.pattern.id,
    }),
  );
  const value = $derived(
    tab === 'link'
      ? patternShareUrl(share.pattern.id)
      : embedCode(
          embedPath,
          tab === 'practice' && practice ? practice.title : share.pattern.title,
          tab === 'practice',
        ),
  );
  const tabs = $derived([
    { id: 'link' as const, label: 'Copy link', icon: Link },
    { id: 'card' as const, label: 'Embed card', icon: PanelTop },
    ...(share.practices.length
      ? [{ id: 'practice' as const, label: 'Embed practice', icon: Play }]
      : []),
  ]);

  function show() {
    tab = 'link';
    selected = '';
    message = '';
    error = '';
    open = true;
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
    open = false;
  }
  onMount(() => {
    ready = true;
    if (new URLSearchParams(location.search).get('share') === '1') show();
  });
  function choose(next: typeof tab) {
    tab = next;
    message = '';
    error = '';
  }
  function fitPreview(event: Event) {
    const frame = event.currentTarget;
    if (!(frame instanceof HTMLIFrameElement)) return;
    // Same-origin preview only. Published embeds need no host script or messages.
    const content = frame.contentDocument?.querySelector('.embed-shell');
    if (content)
      frame.style.height = `${Math.min(Math.ceil(content.getBoundingClientRect().height), tab === 'practice' ? 480 : 440)}px`;
  }
  function moveTab(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex((item) => item.id === tab);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    choose(tabs[index].id);
    document.getElementById(`${uid}-${tabs[index].id}`)?.focus();
  }
  async function copy() {
    if (copying) return;
    copying = true;
    message = '';
    error = '';
    const content = value;
    try {
      await navigator.clipboard.writeText(content);
      if (content === value && open)
        message = tab === 'link' ? 'Link copied.' : 'Embed code copied.';
    } catch {
      if (content === value && open) {
        error = 'Select and copy the text manually.';
        await tick();
        field?.focus();
        field?.select();
      }
    } finally {
      copying = false;
    }
  }
</script>

<button
  class="share-trigger"
  type="button"
  disabled={!ready}
  aria-haspopup="dialog"
  aria-controls={`${uid}-dialog`}
  onclick={show}><Share2 size={16} aria-hidden="true" />Share</button
>

<dialog
  bind:this={dialog}
  id={`${uid}-dialog`}
  aria-labelledby={`${uid}-heading`}
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target !== dialog || !dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      close();
  }}
>
  <header>
    <h2 id={`${uid}-heading`}>Share pattern</h2>
    <button type="button" class="close" aria-label="Close share panel" onclick={close}
      ><X size={20} /></button
    >
  </header>
  <div class="tabs" role="tablist" tabindex="-1" aria-label="Sharing options" onkeydown={moveTab}>
    {#each tabs as item (item.id)}<button
        type="button"
        role="tab"
        id={`${uid}-${item.id}`}
        aria-selected={tab === item.id}
        aria-controls={`${uid}-panel`}
        tabindex={tab === item.id ? 0 : -1}
        onclick={() => choose(item.id)}
        ><item.icon size={16} aria-hidden="true" /><span>{item.label}</span></button
      >{/each}
  </div>
  <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-${tab}`} tabindex="0">
    {#if tab === 'link'}
      <p class="link-title">{share.pattern.title}</p>
      <p class="hint">Share the full pattern page.</p>
    {:else}
      {#if tab === 'practice' && share.practices.length > 1}
        <label class="practice-picker"
          >Practice<select
            value={practice ? `${practice.type}:${practice.id}` : ''}
            onchange={(event) => {
              selected = event.currentTarget.value;
              message = '';
              error = '';
            }}
            >{#each share.practices as option (`${option.type}:${option.id}`)}<option
                value={`${option.type}:${option.id}`}>{option.title}</option
              >{/each}</select
          ></label
        >
      {/if}
      {#if open}
        {#key embedPath}<iframe
            class="preview"
            class:practice-preview={tab === 'practice'}
            title={tab === 'practice' ? 'Practice embed preview' : 'Pattern card preview'}
            src={embedPath}
            onload={fitPreview}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer"
          ></iframe>{/key}
      {/if}
    {/if}
    <div class="copy-row">
      {#if tab === 'link'}<input
          bind:this={field}
          aria-label="Pattern link"
          readonly
          {value}
          onfocus={(event) => event.currentTarget.select()}
        />
      {:else}<textarea
          bind:this={field}
          aria-label="Embed code"
          readonly
          {value}
          rows="2"
          onfocus={(event) => event.currentTarget.select()}></textarea>{/if}
      <button type="button" class="copy" disabled={copying} onclick={copy}
        ><Copy size={16} aria-hidden="true" />{tab === 'link' ? 'Copy link' : 'Copy code'}</button
      >
    </div>
    {#if message}<p class="feedback" role="status">{message}</p>{/if}
    {#if error}<p class="feedback error" role="alert">{error}</p>{/if}
  </div>
</dialog>

<style>
  .share-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    padding: 0 12px;
    color: #181814;
    background: #fff;
    border: 1px solid #dcdfd9;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .share-trigger:hover {
    background: #dff8ea;
    border-color: #007a4d;
  }
  dialog {
    color-scheme: light;
    color: #181814;
    background: #fff;
    width: min(560px, calc(100% - 24px));
    max-width: none;
    max-height: calc(100dvh - 32px);
    padding: 20px;
    border: 1px solid #d5d8d1;
    border-radius: 10px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  dialog::backdrop {
    background: rgb(24 24 20 / 35%);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 22px;
    line-height: 1.2;
    letter-spacing: -0.035em;
  }
  button {
    cursor: pointer;
    font: inherit;
  }
  .close {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border: 0;
    background: #fff;
    border-radius: 6px;
    color: #62655f;
  }
  .close:hover {
    background: #f1f4ef;
  }
  .tabs {
    display: flex;
    border: 1px solid #d5d8d1;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .tabs button {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 7px;
    min-width: 0;
    min-height: 44px;
    padding: 8px 5px;
    border: 0;
    border-bottom: 3px solid transparent;
    background: #fff;
    color: #62655f;
    font-size: 12px;
    font-weight: 700;
  }
  .tabs button + button {
    border-left: 1px solid #d5d8d1;
  }
  .tabs button[aria-selected='true'] {
    background: #dff8ea;
    color: #007a4d;
    border-bottom-color: #007a4d;
  }
  .tabs button:focus-visible {
    outline-offset: -4px;
  }
  .preview {
    display: block;
    width: 100%;
    height: 330px;
    border: 0;
    background: #fff;
  }
  .practice-preview {
    height: 380px;
  }
  .practice-picker {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 700;
  }
  select {
    min-width: 0;
    flex: 1;
    width: 100%;
    padding: 8px;
    border: 1px solid #c9cdc7;
    border-radius: 6px;
    color: #181814;
    background: #fff;
    min-height: 40px;
    font-size: 13px;
  }
  .link-title {
    font-size: 16px;
    line-height: 1.4;
    font-weight: 750;
    margin: 16px 0 6px;
  }
  .hint {
    margin: 0 0 16px;
    color: #62655f;
    font-size: 13px;
  }
  .copy-row {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin-top: 12px;
  }
  input,
  textarea {
    flex: 1;
    min-width: 0;
    width: 100%;
    color: #62655f;
    background: #f8f9f6;
    border: 1px solid #d5d8d1;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.4;
    padding: 10px;
  }
  textarea {
    resize: none;
    font-family: ui-monospace, monospace;
  }
  .copy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex-shrink: 0;
    padding: 0 12px;
    min-height: 44px;
    border: 0;
    border-radius: 6px;
    color: #fff;
    background: #007a4d;
    font-size: 12px;
    font-weight: 750;
  }
  .copy:hover {
    background: #005c3a;
  }
  .copy:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .feedback {
    margin: 10px 0 0;
    font-size: 12px;
    color: #007a4d;
  }
  .error {
    color: #a12a21;
  }
  @media (max-width: 420px) {
    dialog {
      padding: 14px;
    }
    .tabs button {
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
    }
    .preview {
      height: 370px;
    }
    .practice-preview {
      height: 430px;
    }
    .copy-row {
      flex-wrap: wrap;
    }
    .copy {
      flex: 1;
    }
  }
</style>
