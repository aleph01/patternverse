<script lang="ts">
  import { Plus, X } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { parseEditorList } from '$lib/editor';

  let {
    id,
    label,
    description,
    placeholder,
    values,
    disabled = false,
    onchange,
    onpendingchange = () => {},
  }: {
    id: string;
    label: string;
    description: string;
    placeholder: string;
    values: readonly string[];
    disabled?: boolean;
    onchange: (values: string[]) => void;
    onpendingchange?: (pending: boolean) => void;
  } = $props();

  let draft = $state('');

  export function commitPending(): void {
    if (disabled || !draft.trim()) return;
    const known = new SvelteSet(values.map((value) => value.toLocaleLowerCase()));
    const additions = parseEditorList(draft).filter((value) => {
      const key = value.toLocaleLowerCase();
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    if (additions.length) onchange([...values, ...additions]);
    draft = '';
    onpendingchange(false);
  }
</script>

<div class="keyword-field">
  <label for={id}>{label}</label>
  <p id={`${id}-help`}>{description}</p>
  {#if values.length}
    <ul aria-label={`Selected ${label}`}>
      {#each values as value, index (index)}
        <li>
          <span>{value}</span><button
            type="button"
            {disabled}
            aria-label={`Remove ${label.toLocaleLowerCase()}: ${value}`}
            onclick={() => onchange(values.filter((_, itemIndex) => itemIndex !== index))}
            ><X size={14} aria-hidden="true" /></button
          >
        </li>
      {/each}
    </ul>
  {/if}
  <div class="keyword-entry">
    <input
      {id}
      {disabled}
      {placeholder}
      value={draft}
      aria-describedby={`${id}-help ${id}-hint`}
      autocomplete="off"
      oninput={(event) => {
        draft = event.currentTarget.value;
        onpendingchange(Boolean(draft.trim()));
      }}
      onblur={commitPending}
      onpaste={(event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text?.includes('\n')) return;
        event.preventDefault();
        const input = event.currentTarget;
        draft =
          draft.slice(0, input.selectionStart ?? draft.length) +
          text +
          draft.slice(input.selectionEnd ?? draft.length);
        commitPending();
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault();
          commitPending();
        }
      }}
    />
    <button
      type="button"
      {disabled}
      aria-label={`Add ${label.toLocaleLowerCase()}`}
      onclick={commitPending}><Plus size={16} aria-hidden="true" /></button
    >
  </div>
  <small id={`${id}-hint`}>Press Enter or + to add. Optional; you can leave this empty.</small>
</div>

<style>
  .keyword-field {
    display: grid;
    gap: 0.6rem;
    min-width: 0;
  }
  label {
    font-size: 0.85rem;
    font-weight: 700;
  }
  p,
  small {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    max-width: 100%;
    padding-left: 0.65rem;
    background: #f1f3ee;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  li span {
    overflow-wrap: anywhere;
  }
  .keyword-entry {
    display: flex;
    gap: 0.45rem;
  }
  input {
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.65rem 0.75rem;
    border: 1px solid #d5d9d1;
    border-radius: 6px;
    background: white;
    color: var(--ink);
    font: inherit;
    font-size: 1rem;
  }
  .keyword-field button {
    display: grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 1px solid #d5d9d1;
    border-radius: 6px;
    background: transparent;
    color: var(--ink);
  }
  li button {
    border: 0;
  }
</style>
