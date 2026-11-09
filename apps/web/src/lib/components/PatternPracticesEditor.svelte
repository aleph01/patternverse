<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import type { EditorValues } from '$lib/editor';
  import { emptyEditorValues } from '$lib/editor';
  import { starterPractice } from '$lib/pattern-editor/source';
  import PracticeLanguageEditor from '$lib/pattern-editor/PracticeLanguageEditor.svelte';
  import WorksheetButton from './WorksheetButton.svelte';

  let {
    practices,
    title,
    hasEmbedded = false,
    disabled = false,
    onchange,
    onpendingchange,
  }: {
    practices: EditorValues[];
    title: string;
    hasEmbedded?: boolean;
    disabled?: boolean;
    onchange: (practices: EditorValues[]) => void;
    onpendingchange: (pending: boolean) => void;
  } = $props();
  let pending = $state<Record<string, boolean>>({});
  const anyPending = $derived(practices.some((practice) => pending[practice.id]));
  $effect(() => onpendingchange(anyPending));

  function update(id: string, change: Partial<EditorValues>) {
    onchange(
      practices.map((practice) => (practice.id === id ? { ...practice, ...change } : practice)),
    );
  }
  function add() {
    const practice = emptyEditorValues('practice');
    practice.id = `practice-${crypto.randomUUID()}`;
    practice.title = `${title.trim() || 'My pattern'} — practice ${practices.length + (hasEmbedded ? 2 : 1)}`;
    practice.languagePracticeSource = starterPractice(practice.title);
    onchange([...practices, practice]);
  }
</script>

<section class="practice-manager" aria-labelledby="practice-manager-heading">
  <header>
    <div>
      <h3 id="practice-manager-heading">{hasEmbedded ? 'More practices' : 'Practices'}</h3>
      <p>Each practice can have its own purpose, questions, and worksheet.</p>
    </div>
    <button type="button" disabled={disabled || anyPending} onclick={add}
      ><Plus size={16} />Add another practice</button
    >
  </header>
  {#each practices as practice, index (practice.id)}
    <details class="practice-draft" open={index === practices.length - 1}>
      <summary>{practice.title || 'Untitled practice'}</summary>
      <div class="practice-fields">
        <label for={`${practice.id}-title`}
          >Practice title<input
            id={`${practice.id}-title`}
            value={practice.title}
            {disabled}
            oninput={(event) => update(practice.id, { title: event.currentTarget.value })}
          /></label
        >
        <label for={`${practice.id}-summary`}
          >What is this practice for?<textarea
            id={`${practice.id}-summary`}
            rows="2"
            value={practice.summary}
            {disabled}
            oninput={(event) => update(practice.id, { summary: event.currentTarget.value })}
          ></textarea></label
        >
        <label for={`${practice.id}-duration`}
          >Minutes (optional)<input
            id={`${practice.id}-duration`}
            type="number"
            min="1"
            step="1"
            value={practice.durationMinutes}
            {disabled}
            oninput={(event) => update(practice.id, { durationMinutes: event.currentTarget.value })}
          /></label
        >
      </div>
      <div class="practice-controls">
        <button
          type="button"
          disabled={disabled || anyPending}
          onclick={() => {
            if (
              window.confirm(
                `Remove “${practice.title}” from this pattern? Saved practice records and history are kept.`,
              )
            )
              onchange(practices.filter((item) => item.id !== practice.id));
          }}>Remove from pattern</button
        >
      </div>
      {#if practice.languagePracticeSource !== undefined}
        <PracticeLanguageEditor
          source={practice.languagePracticeSource}
          {disabled}
          onchange={(source) => update(practice.id, { languagePracticeSource: source })}
          onpendingchange={(value) => (pending[practice.id] = value)}
        />
        <WorksheetButton
          definition={{ source: practice.languagePracticeSource }}
          explainUnavailable
        />
      {:else}
        <button
          type="button"
          {disabled}
          onclick={() =>
            update(practice.id, { languagePracticeSource: starterPractice(practice.title) })}
          >Add interactive steps</button
        >
      {/if}
    </details>
  {/each}
</section>

<style>
  .practice-manager {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #dfe2dc;
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  p {
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 0.85rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    border: 1px solid #dcdfd9;
    border-radius: 6px;
    color: var(--ink);
    background: var(--paper);
    font: inherit;
    font-size: 0.8rem;
    text-transform: none;
  }
  button:disabled {
    opacity: 0.45;
  }
  .practice-draft {
    margin-top: 1.2rem;
    padding-block: 1rem;
    border-top: 1px solid #dfe2dc;
  }
  summary {
    min-height: 44px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .practice-fields {
    display: grid;
    gap: 1rem;
    margin: 1rem 0;
  }
  label {
    display: grid;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
  }
  input,
  textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid #d5d9d1;
    border-radius: 5px;
    padding: 0.65rem;
    color: var(--ink);
    background: var(--paper);
    font: inherit;
  }
  .practice-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
</style>
