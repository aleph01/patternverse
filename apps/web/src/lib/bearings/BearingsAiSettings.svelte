<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Connection links append a marker to the resolved auth route. */
  import { Sparkles, X, RefreshCw } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { useBearingsAi } from './ai.svelte';
  import type { AiStyle } from './ai';
  const ai = useBearingsAi()!;
  const id = $props.id();
  let menu: HTMLDivElement, trigger: HTMLButtonElement;
  let top = $state(60);
  let manage = $state(false);
  function position() {
    if (trigger)
      top = Math.min(trigger.getBoundingClientRect().bottom + 8, window.innerHeight - 100);
  }
  function toggle() {
    position();
    menu.togglePopover();
    if (menu.matches(':popover-open')) void ai.refreshConnection(true);
  }
  onMount(() => {
    const refresh = () => {
      if (ai.settingsOpen) void ai.refreshConnection(true);
      else void ai.refreshConnection();
    };
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      ai.settingsOpen = false;
    };
  });
</script>

<svelte:window onresize={position} />
<button
  bind:this={trigger}
  class="ai-settings-trigger"
  class:enabled={ai.enabled}
  aria-label="AI settings"
  title={`AI settings · ${ai.enabled ? 'On' : 'Off'}`}
  aria-expanded={ai.settingsOpen}
  aria-controls={id}
  onclick={toggle}><Sparkles size={17} aria-hidden="true" /></button
>
<div
  {id}
  bind:this={menu}
  popover="auto"
  class="ai-settings-panel"
  role="dialog"
  aria-label="AI settings"
  style:top={`${top}px`}
  ontoggle={() => (ai.settingsOpen = menu.matches(':popover-open'))}
>
  <header>
    <h2>AI settings</h2>
    <button class="icon" aria-label="Close AI settings" onclick={() => menu.hidePopover()}
      ><X size={17} /></button
    >
  </header>
  <div class="enable-row">
    <span
      ><strong>Enable AI</strong><small
        >{ai.enabled ? 'On across Bearings' : 'Off across Bearings'}</small
      ></span
    ><button
      class="switch"
      role="switch"
      aria-label="Enable AI"
      aria-checked={ai.enabled}
      onclick={() => ai.setEnabled(!ai.enabled)}><span aria-hidden="true"></span></button
    >
  </div>
  <label
    >Model<select
      aria-label="Model"
      value={ai.model}
      disabled={ai.loadingModels || (!ai.models.length && !ai.model)}
      onchange={(event) => ai.setModel(event.currentTarget.value)}
    >
      {#if !ai.model && !ai.models.length}<option value=""
          >{ai.connected ? 'Choose a model' : 'Connect a model first'}</option
        >{/if}
      {#if ai.model && !ai.models.some((model) => model.id === ai.model)}<option value={ai.model}
          >{ai.model}</option
        >{/if}
      {#each ai.models as model (model.id)}<option value={model.id}>{model.name}</option>{/each}
    </select></label
  >
  <label
    >Response style<select
      aria-label="Response style"
      value={ai.style}
      onchange={(event) => ai.setStyle(event.currentTarget.value as AiStyle)}
      ><option>Concise</option><option>Explore with me</option><option>Ask one question</option
      ></select
    ></label
  >
  <div class="connection">
    <span
      ><strong>{ai.desktop ? 'Local model' : 'OpenRouter'}</strong><small
        >{ai.connected ? (ai.desktop ? 'On this device' : 'Connected') : 'Not connected'}</small
      ></span
    ><button class="text-button" aria-expanded={manage} onclick={() => (manage = !manage)}
      >Manage</button
    >
  </div>
  {#if manage}<div class="manage">
      {#if ai.desktop}<p>
          Choose an installed model above. Models can be installed in desktop settings.
        </p>{:else}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The auth route is resolved before appending the application marker. -->
        <a
          href={`${resolve('/auth/openrouter/connect')}?app=bearings`}
          target="_blank"
          rel="noopener noreferrer"
          >{ai.connected ? 'Reconnect with OpenRouter ↗' : 'Connect with OpenRouter ↗'}</a
        >
        {#if ai.connected}<button class="text-button" onclick={() => ai.disconnect()}
            >Disconnect on this device</button
          >{/if}
        <p>Requests use your account and credits with zero-retention routing.</p>
      {/if}
      <button
        class="text-button refresh"
        disabled={ai.loadingModels}
        onclick={() => ai.refreshConnection(true)}
        ><RefreshCw size={13} />{ai.loadingModels
          ? 'Refreshing…'
          : 'Refresh connection and models'}</button
      >
    </div>{/if}
  {#if ai.connectionError}<p class="error" role="alert">{ai.connectionError}</p>{/if}
  {#if ai.storageError}<p class="error" role="alert">{ai.storageError}</p>{/if}
  <p class="hint">Applies across Bearings. Your prompts stay in the library when AI is off.</p>
</div>

<style>
  .ai-settings-trigger {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .ai-settings-trigger.enabled {
    background: var(--bearings-accent-soft);
    color: var(--bearings-accent);
  }
  .ai-settings-panel {
    position: fixed;
    inset: auto 16px auto auto;
    margin: 0;
    width: 310px;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 80px);
    overflow: auto;
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid var(--bearings-line);
    border-radius: 9px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    box-shadow: 0 12px 35px #18251b24;
    font: 13px/1.55 var(--font-sans);
  }
  header,
  .enable-row,
  .connection {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  header {
    margin-bottom: 16px;
  }
  h2 {
    font-size: 13px;
    margin: 0;
  }
  strong {
    font-size: 12px;
    font-weight: 600;
  }
  small {
    display: block;
    font-size: 11px;
    color: var(--bearings-muted);
    margin-top: 2px;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .icon {
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
  }
  .enable-row {
    margin-bottom: 20px;
  }
  .switch {
    position: relative;
    flex: none;
    width: 32px;
    height: 18px;
    border: 0;
    border-radius: 12px;
    background: var(--bearings-line);
    padding: 2px;
  }
  .switch span {
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--bearings-paper);
  }
  .switch[aria-checked='true'] {
    background: var(--bearings-accent);
  }
  .switch[aria-checked='true'] span {
    transform: translateX(14px);
  }
  label {
    display: grid;
    gap: 6px;
    color: var(--bearings-muted);
    font-size: 12px;
    margin-bottom: 14px;
  }
  select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    padding: 8px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    font: inherit;
  }
  .connection {
    padding-top: 14px;
    border-top: 1px solid var(--bearings-line);
  }
  .text-button {
    border: 0;
    background: transparent;
    color: var(--bearings-accent);
    padding: 4px 0;
    font-size: 11px;
  }
  .manage {
    margin-top: 12px;
    padding: 12px;
    border-radius: 5px;
    background: var(--bearings-surface);
    font-size: 12px;
  }
  .manage a {
    color: var(--bearings-accent);
  }
  .manage p {
    font-size: 11px;
    color: var(--bearings-muted);
  }
  .refresh {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .hint {
    font-size: 11px;
    color: var(--bearings-muted);
    margin: 18px 0 0;
  }
  .error {
    color: #a32626;
    font-size: 12px;
  }
  @media (pointer: coarse) {
    .ai-settings-trigger,
    .icon {
      min-width: 36px;
      min-height: 44px;
    }
    .switch::after {
      content: '';
      position: absolute;
      inset: -13px -6px;
    }
    select {
      min-height: 44px;
      font-size: 16px;
    }
    .text-button {
      min-height: 44px;
    }
  }
</style>
