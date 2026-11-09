<script lang="ts">
  import { tick } from 'svelte';
  import { X } from '@lucide/svelte';
  let { onclose = () => {} }: { onclose?: () => void } = $props();
  let dialog: HTMLDialogElement;
  let trigger: HTMLElement | null = null;
  const groups = [
    {
      title: 'Edit notes',
      rows: [
        ['Edit', ['Enter']],
        ['Edit in fullscreen', ['Shift', 'Enter']],
      ],
    },
    { title: 'Navigate', rows: [['Navigate notes', ['↑', '↓', '←', '→']]] },
    {
      title: 'Add new notes',
      rows: [
        ['Add child', ['⌘', '→']],
        ['Add below', ['⌘', '↓']],
        ['Add above', ['⌘', '↑']],
      ],
    },
    {
      title: 'Move & delete notes',
      rows: [
        ['Move', ['Alt', '↑ ↓ ← →']],
        ['Delete', ['⌘', '⌫']],
      ],
    },
    {
      title: 'Merge notes',
      rows: [
        ['Merge into next', ['⌘', 'Shift', '↓']],
        ['Merge into previous', ['⌘', 'Shift', '↑']],
      ],
    },
  ] as const;
  export async function open(element: HTMLElement) {
    trigger = element;
    await tick();
    dialog.showModal();
  }
</script>

<dialog
  class="shortcuts"
  bind:this={dialog}
  aria-labelledby="bearings-shortcuts-title"
  onclose={() => {
    trigger?.focus({ preventScroll: true });
    onclose();
  }}
>
  <header>
    <h2 id="bearings-shortcuts-title">Keyboard shortcuts</h2>
    <button aria-label="Close keyboard shortcuts" onclick={() => dialog.close()}
      ><X size={18} /></button
    >
  </header>
  <div class="content">
    {#each groups as group (group.title)}<section>
        <h3>{group.title}</h3>
        {#each group.rows as [label, keys] (label)}<div class="shortcut">
            <span>{label}</span><span class="keys"
              >{#each keys as key (key)}<kbd>{key}</kbd>{/each}</span
            >
          </div>{/each}
      </section>{/each}
    <p>
      In Tree view, ⌘ and Alt card commands also work while writing. Plain Enter and arrows edit
      text; Escape returns to card navigation. Shift Enter opens fullscreen.
    </p>
    <p>In either view, type --- on a line of its own and press Enter to start a new cell.</p>
    <p>
      With AI enabled, start an empty cell with ~, ~+, or ~++ and press Space for cell, branch, or
      whole-situation context. Escape returns to writing. AI is managed from the top-bar sparkle
      button.
    </p>
    <p>
      Press @ to find and add a pattern using the sidebar filters. While writing, use @ at the start
      of a word; email addresses stay as text.
    </p>
    <p>
      For Vim keys while writing, enable Basic Vim mode in Notebook actions → Settings. The command
      guide is available there.
    </p>
    <p>
      ⌘ Delete (Backspace) also deletes the focused cell in Notebook, with Undo. Use Ctrl instead of
      ⌘ on Windows or Linux.
    </p>
  </div>
</dialog>

<style>
  .shortcuts {
    width: 395px;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 10px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    overflow: auto;
  }
  .shortcuts::backdrop {
    background: #17221755;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 22px;
    border-bottom: 1px solid var(--bearings-line);
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.04em;
  }
  button {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  button:hover {
    background: var(--bearings-accent-soft);
  }
  .content {
    padding: 8px 22px 24px;
  }
  section {
    padding-top: 19px;
  }
  h3 {
    margin: 0 0 9px;
    font-size: 13px;
    font-weight: 750;
  }
  .shortcut {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 35px;
    gap: 8px;
    font-size: 12px;
    color: var(--bearings-muted);
  }
  .keys {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  kbd {
    min-width: 24px;
    padding: 4px 6px;
    font: 11px/1.4 var(--font-sans);
    color: var(--bearings-ink);
    background: var(--bearings-surface);
    border: 1px solid var(--bearings-line);
    border-bottom-width: 2px;
    border-radius: 4px;
    text-align: center;
  }
  p {
    margin: 18px 0 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--bearings-muted);
  }
</style>
