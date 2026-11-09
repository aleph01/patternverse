<script lang="ts">
  import { tick } from 'svelte';
  import { X } from '@lucide/svelte';
  import { defaultCursorSettings, type CursorSettings } from './cursor-settings';
  let {
    vim,
    cursor,
    onchange,
    oncursorchange,
  }: {
    vim: boolean;
    cursor: CursorSettings;
    onchange: (enabled: boolean) => void;
    oncursorchange: (settings: CursorSettings) => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let trigger: HTMLElement | null = null;
  export async function open(element: HTMLElement) {
    trigger = element;
    await tick();
    dialog.showModal();
  }
  const commands = [
    ['Insert / Normal mode', 'i / Esc'],
    ['Move / move by word', 'h j k l / w b e'],
    ['Start / end of line', '0 ^ / $'],
    ['First / last line', 'gg / G'],
    ['Append / insert at line edges', 'a / I A'],
    ['New line below / above', 'o / O'],
    ['Delete character / word / line', 'x / dw / dd'],
    ['Change word / line', 'cw / cc'],
    ['Yank line / paste after or before', 'yy / p P'],
    ['Undo / redo', 'u / Ctrl r'],
    ['Open / close library', '/'],
    ['Quick select a pattern', '@'],
    ['Cycle Note / Comment / Own approach', 'Shift Tab'],
  ];
</script>

<dialog
  class="settings"
  bind:this={dialog}
  aria-labelledby="bearings-settings-title"
  onclose={() => trigger?.focus({ preventScroll: true })}
  onclick={(event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  }}
>
  <header>
    <h2 id="bearings-settings-title">Settings</h2>
    <button aria-label="Close settings" onclick={() => dialog.close()}><X size={18} /></button>
  </header>
  <div class="content">
    <section class="cursor-settings" aria-label="Cursor settings">
      <div class="cursor-heading">
        <h3>Writing cursor</h3>
        <button class="reset-cursor" onclick={() => oncursorchange({ ...defaultCursorSettings })}
          >Reset cursor</button
        >
      </div>
      <div
        class="cursor-preview"
        role="img"
        aria-label="Cursor preview"
        style:--cursor-color={cursor.color ?? 'var(--bearings-ink)'}
      >
        <span>Room to&nbsp;</span><span
          class="preview-mark"
          class:horizontal={cursor.shape === 'horizontal'}
          style:width={cursor.shape === 'vertical' ? `${cursor.thickness}px` : '0.8em'}
          style:height={cursor.shape === 'horizontal' ? `${cursor.thickness}px` : '1.2em'}
        ></span><span>think.</span>
      </div>
      <div class="shape-options" role="group" aria-label="Cursor shape">
        {#each ['horizontal', 'vertical'] as shape (shape)}<button
            type="button"
            aria-pressed={cursor.shape === shape}
            onclick={() => oncursorchange({ ...cursor, shape: shape as CursorSettings['shape'] })}
          >
            <span class="shape-mark" class:vertical={shape === 'vertical'} aria-hidden="true"
            ></span>{shape === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </button>{/each}
      </div>
      <label class="cursor-thickness" for="bearings-cursor-thickness"
        ><span>Thickness</span><output for="bearings-cursor-thickness">{cursor.thickness} px</output
        >
        <input
          id="bearings-cursor-thickness"
          aria-label="Cursor thickness"
          type="range"
          min="1"
          max="6"
          step="1"
          value={cursor.thickness}
          oninput={(event) =>
            oncursorchange({ ...cursor, thickness: event.currentTarget.valueAsNumber })}
        />
      </label>
      <div class="cursor-color">
        <span id="bearings-cursor-color-label">Color</span>
        <div class="color-options" role="group" aria-labelledby="bearings-cursor-color-label">
          <button
            class="automatic-color"
            aria-pressed={cursor.color === null}
            onclick={() => oncursorchange({ ...cursor, color: null })}>Automatic</button
          >
          {#each [{ label: 'Green', value: '#007a4d' }, { label: 'Blue', value: '#2563eb' }, { label: 'Grey', value: '#6b7280' }] as color (color.value)}
            <button
              class="color-swatch"
              style:--swatch={color.value}
              aria-label={`${color.label} cursor`}
              title={color.label}
              aria-pressed={cursor.color === color.value}
              onclick={() => oncursorchange({ ...cursor, color: color.value })}
            ></button>
          {/each}
          <input
            type="color"
            aria-label="Custom cursor color"
            title="Custom cursor color"
            value={cursor.color ?? '#181c18'}
            oninput={(event) => oncursorchange({ ...cursor, color: event.currentTarget.value })}
          />
        </div>
      </div>
      <p class="cursor-note">
        Saved on this device. Shape and thickness apply on desktop. Vim Normal mode keeps its block
        cursor.
      </p>
    </section>
    <div class="preference">
      <div>
        <h3 id="vim-label">Basic Vim mode</h3>
        <p id="vim-description">Modal editing for text cells in Notebook and Tree view.</p>
      </div>
      <button
        class="switch"
        role="switch"
        aria-checked={vim}
        aria-labelledby="vim-label"
        aria-describedby="vim-description"
        onclick={() => onchange(!vim)}><span></span></button
      >
    </div>
    <p class="device-note">Saved on this device. Off by default.</p>
    {#if vim}
      <section aria-label="Vim commands">
        <h3>Writing with Vim</h3>
        <p>
          Vim starts in Normal mode. Press <kbd>i</kbd> to write and <kbd>Esc</kbd> to return. A second
          Escape returns to card navigation or closes fullscreen.
        </p>
        <dl>
          {#each commands as [label, keys] (label)}<div>
              <dt>{label}</dt>
              <dd><kbd>{keys}</kbd></dd>
            </div>{/each}
        </dl>
        <p>
          Use <kbd>Shift Tab</kbd> in Normal mode to cycle cell types without moving focus. In
          Insert mode it keeps normal backward focus navigation. Counts work too, such as
          <kbd>3w</kbd>
          or <kbd>2dd</kbd>. Existing card shortcuts still work. In Insert mode, <kbd>---</kbd> then Enter
          starts a new cell.
        </p>
        <p>This is a basic subset: visual mode, search, and colon commands aren’t included.</p>
      </section>
    {/if}
  </div>
</dialog>

<style>
  .settings {
    width: 470px;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 14px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    overflow: auto;
    box-shadow: 0 24px 80px #17221722;
  }
  .settings::backdrop {
    background: #17221755;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--bearings-line);
  }
  h2 {
    font-family: inherit;
    font-size: 1rem;
    margin: 0;
  }
  header button {
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
  }
  header button:hover {
    background: var(--bearings-surface);
  }
  .content {
    padding: 1.25rem;
  }
  .preference {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
  }
  .cursor-settings {
    margin: 0 0 1.25rem;
    padding: 0 0 1.25rem;
    border-top: 0;
    border-bottom: 1px solid var(--bearings-line);
  }
  .cursor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 0.8rem;
  }
  .cursor-heading h3 {
    margin: 0;
  }
  .reset-cursor {
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 0.72rem;
    padding: 4px 0;
    cursor: pointer;
  }
  .cursor-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    margin-bottom: 1rem;
    border-radius: 8px;
    background: var(--bearings-surface);
    font-size: 1.1rem;
  }
  .preview-mark {
    display: inline-block;
    flex: none;
    background: var(--cursor-color);
  }
  .preview-mark.horizontal {
    transform: translateY(0.5em);
  }
  .shape-options {
    display: flex;
    gap: 5px;
    padding: 4px;
    border: 1px solid var(--bearings-line);
    border-radius: 7px;
    margin-bottom: 1rem;
  }
  .shape-options button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    flex: 1;
    min-height: 36px;
    border: 0;
    border-radius: 4px;
    font: inherit;
    font-size: 0.78rem;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .shape-options button[aria-pressed='true'] {
    background: var(--bearings-accent-soft);
    color: var(--bearings-accent);
  }
  .shape-mark {
    width: 12px;
    height: 2px;
    background: currentColor;
  }
  .shape-mark.vertical {
    width: 2px;
    height: 14px;
  }
  .cursor-thickness {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    margin-bottom: 1rem;
    font-size: 0.78rem;
  }
  .cursor-thickness output {
    color: var(--bearings-muted);
    font-variant-numeric: tabular-nums;
  }
  .cursor-thickness input {
    grid-column: 1 / -1;
    width: 100%;
    margin: 0;
    accent-color: var(--bearings-accent);
  }
  .cursor-color {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.78rem;
  }
  .color-options {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .automatic-color {
    min-height: 32px;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 0.7rem;
    padding: 4px 7px;
    cursor: pointer;
  }
  .automatic-color[aria-pressed='true'] {
    color: var(--bearings-accent);
    border-color: var(--bearings-accent);
  }
  .color-swatch {
    width: 28px;
    height: 28px;
    padding: 5px;
    border: 1px solid transparent;
    border-radius: 50%;
    background: var(--swatch);
    background-clip: content-box;
    cursor: pointer;
  }
  .color-swatch[aria-pressed='true'] {
    border-color: var(--bearings-ink);
  }
  .color-options input {
    width: 32px;
    height: 32px;
    padding: 3px;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
  }
  .cursor-note {
    margin-top: 0.8rem;
    font-size: 0.7rem;
  }
  .settings button:focus-visible,
  .settings input:focus-visible {
    outline: 2px solid var(--bearings-accent);
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    .shape-options button,
    .reset-cursor,
    .automatic-color {
      min-height: 44px;
    }
    .color-swatch {
      width: 36px;
      height: 36px;
    }
    .color-options {
      gap: 3px;
    }
  }
  h3 {
    font-family: inherit;
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 0.25rem;
  }
  p {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--bearings-muted);
    margin: 0;
  }
  .device-note {
    margin-top: 0.75rem;
    font-size: 0.72rem;
  }
  .switch {
    flex-shrink: 0;
    width: 40px;
    height: 24px;
    border: 0;
    border-radius: 20px;
    padding: 3px;
    background: var(--bearings-line);
    cursor: pointer;
  }
  .switch span {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px #0002;
    transition: transform 0.15s;
  }
  .switch[aria-checked='true'] {
    background: var(--bearings-accent);
  }
  .switch[aria-checked='true'] span {
    transform: translateX(16px);
  }
  section {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--bearings-line);
  }
  section p + p {
    margin-top: 0.65rem;
  }
  dl {
    margin: 1rem 0;
  }
  dl div {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0;
    font-size: 0.75rem;
  }
  dd {
    margin: 0;
    white-space: nowrap;
  }
  kbd {
    font:
      0.75rem / 1.5 ui-monospace,
      monospace;
    background: var(--bearings-surface);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    color: var(--bearings-ink);
  }
</style>
