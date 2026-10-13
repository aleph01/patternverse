<script lang="ts">
  import { ArrowUp, AtSign, AudioLines, Mic, Plus, Square, X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { articleReferenceKey } from './article-reference';
  import type { MiraPatternSummary } from './context';
  import {
    mentionAtCaret,
    therapySuggestions,
    type MentionQuery,
    type TherapyCollection,
  } from './pattern-mentions';
  import type { DictationPhase } from './dictation';
  import type { VoiceState } from './voice-controller';

  let {
    draft,
    interim,
    desktop,
    dictationPhase,
    voiceControlPhase,
    sending,
    voiceEnabled,
    patternsEnabled,
    approachName,
    mentionPatterns = [],
    therapyCollections = [],
    draftPatterns = [],
    onDraftPatternsChange = () => {},
    element = $bindable(),
    onDraftChange,
    onSend,
    onPatterns,
    onApproach,
    onDictation,
    onVoiceControl,
  }: {
    draft: string;
    interim: string;
    desktop: boolean;
    dictationPhase: DictationPhase;
    voiceControlPhase: VoiceState['phase'];
    sending: boolean;
    voiceEnabled: boolean;
    patternsEnabled: boolean;
    approachName: string;
    mentionPatterns?: readonly MiraPatternSummary[];
    therapyCollections?: readonly TherapyCollection[];
    draftPatterns?: readonly MiraPatternSummary[];
    onDraftPatternsChange?: (patterns: readonly MiraPatternSummary[]) => void;
    element?: HTMLTextAreaElement;
    onDraftChange: (value: string) => void;
    onSend: () => void;
    onPatterns: (trigger: HTMLElement) => void;
    onApproach: (trigger: HTMLElement) => void;
    onDictation: () => void;
    onVoiceControl: () => void;
  } = $props();

  let mention = $state<MentionQuery | null>(null);
  let collection = $state('');
  let highlighted = $state(0);
  let dismissed = '';
  const locked = $derived(Boolean(interim) || (!desktop && dictationPhase !== 'idle'));
  const suggestions = $derived(
    therapySuggestions(
      mentionPatterns,
      therapyCollections,
      mention?.query ?? '',
      collection,
      draftPatterns,
    ),
  );
  const pickerOpen = $derived(
    Boolean(mention && patternsEnabled && therapyCollections.length && !locked),
  );
  const listId = 'mira-mention-suggestions';

  function updateMention(input: HTMLTextAreaElement) {
    const next =
      input.selectionStart === input.selectionEnd
        ? mentionAtCaret(input.value, input.selectionStart)
        : null;
    const key = next ? `${next.start}:${next.end}:${next.query}` : '';
    if (!next) dismissed = '';
    mention = key && key === dismissed ? null : next;
    highlighted = 0;
  }
  async function chooseMention(pattern: MiraPatternSummary) {
    if (!mention || !element || draftPatterns.length >= 100) return;
    const { start, end } = mention;
    const value = element.value;
    onDraftPatternsChange([...draftPatterns, pattern]);
    onDraftChange(value.slice(0, start) + value.slice(end));
    mention = null;
    dismissed = '';
    await tick();
    element?.focus();
    element?.setSelectionRange(start, start);
  }
  async function openMentions() {
    if (!element || locked) return;
    collection = '';
    const caret = element.selectionStart;
    const prefix = draft.slice(0, caret);
    const insert = `${prefix && !/\s$/.test(prefix) ? ' ' : ''}@`;
    if (draft.length + insert.length > 30000) return;
    onDraftChange(prefix + insert + draft.slice(element.selectionEnd));
    dismissed = '';
    await tick();
    element?.focus();
    element?.setSelectionRange(caret + insert.length, caret + insert.length);
    if (element) updateMention(element);
  }
</script>

<form
  class="mira-composer"
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) mention = null;
  }}
  onsubmit={(event) => {
    event.preventDefault();
    onSend();
  }}
>
  {#if pickerOpen}
    <div class="mira-mention-picker">
      <div class="mira-mention-heading">
        <span>Therapy patterns</span>
        <select
          aria-label="Therapy collection"
          value={collection}
          onchange={(event) => {
            collection = event.currentTarget.value;
            highlighted = 0;
          }}
        >
          <option value="">All Therapy</option>
          {#each therapyCollections as item (articleReferenceKey(item))}
            <option value={articleReferenceKey(item)}>{item.title}</option>
          {/each}
        </select>
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label="Therapy pattern suggestions"
        class="mira-mention-results"
      >
        {#each suggestions as pattern, index (articleReferenceKey(pattern))}
          <div id={`mira-mention-${index}`} role="option" aria-selected={highlighted === index}>
            <button
              type="button"
              class:highlighted={highlighted === index}
              onpointerdown={(event) => {
                if (event.pointerType === 'mouse') event.preventDefault();
              }}
              onclick={() => void chooseMention(pattern)}
            >
              <span class="mira-mention-title">{pattern.title}</span>
              <span class="mira-mention-collection"
                >{pattern.collections.map((item) => item.title).join(' · ')}</span
              >
              {#if pattern.summary}<span class="mira-mention-summary">{pattern.summary}</span>{/if}
            </button>
          </div>
        {/each}
      </div>
      {#if !suggestions.length}<p class="mira-mention-empty" role="status">
          No matching patterns in {collection ? 'this collection' : 'Therapy'}.
        </p>{/if}
      <div class="mira-mention-help">↑ ↓ to browse · Enter to select · Esc to close</div>
    </div>
  {/if}
  {#if draftPatterns.length}
    <div
      class="mira-draft-patterns"
      aria-label="Patterns attached to this draft"
      aria-live="polite"
    >
      {#each draftPatterns as pattern (articleReferenceKey(pattern))}
        <span class="mira-draft-pattern">
          <AtSign size={14} aria-hidden="true" /><span>{pattern.title}</span>
          <button
            type="button"
            aria-label={`Remove ${pattern.title} from draft`}
            onclick={() => {
              onDraftPatternsChange(
                draftPatterns.filter(
                  (item) => articleReferenceKey(item) !== articleReferenceKey(pattern),
                ),
              );
              element?.focus();
            }}><X size={14} /></button
          >
        </span>
      {/each}
    </div>
  {/if}
  <label class="visually-hidden" for="mira-message">Message mira</label><textarea
    id="mira-message"
    bind:this={element}
    value={interim ? `${draft.trimEnd()}${draft.trim() ? ' ' : ''}${interim}` : draft}
    oninput={(event) => {
      onDraftChange(event.currentTarget.value);
      updateMention(event.currentTarget);
    }}
    onclick={(event) => updateMention(event.currentTarget)}
    onkeyup={(event) => {
      if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key))
        updateMention(event.currentTarget);
    }}
    role={pickerOpen ? 'combobox' : undefined}
    aria-autocomplete={pickerOpen ? 'list' : undefined}
    aria-expanded={pickerOpen ? true : undefined}
    aria-controls={pickerOpen ? listId : undefined}
    aria-activedescendant={pickerOpen && suggestions[highlighted]
      ? `mira-mention-${highlighted}`
      : undefined}
    readonly={locked}
    rows="1"
    maxlength="30000"
    placeholder="Message mira…"
    onkeydown={(event) => {
      if (event.isComposing) return;
      if (pickerOpen && !event.shiftKey) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          dismissed = mention ? `${mention.start}:${mention.end}:${mention.query}` : '';
          mention = null;
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          highlighted = suggestions.length
            ? (highlighted + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
              suggestions.length
            : 0;
          void tick().then(() =>
            document
              .getElementById(`mira-mention-${highlighted}`)
              ?.scrollIntoView?.({ block: 'nearest' }),
          );
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (suggestions[highlighted]) void chooseMention(suggestions[highlighted]);
          return;
        }
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onSend();
      }
    }}></textarea>
  <div class="mira-composer-footer">
    <div class="mira-composer-tools">
      {#if patternsEnabled}<button
          type="button"
          class="mira-icon-button"
          aria-label="Choose a pattern or practice"
          aria-keyshortcuts="Shift+Space"
          title="Patterns &amp; practices · Shift+Space"
          onclick={(event) => onPatterns(event.currentTarget)}><Plus size={20} /></button
        >{/if}
      {#if patternsEnabled && therapyCollections.length}<button
          type="button"
          class="mira-icon-button mira-mention-trigger"
          aria-label="Mention a Therapy pattern"
          title="Mention a Therapy pattern · @"
          disabled={locked}
          onclick={() => void openMentions()}><AtSign size={19} /></button
        >{/if}
      <button
        type="button"
        class="mira-modality-chip"
        aria-label="Choose therapy approach"
        onclick={(event) => onApproach(event.currentTarget)}>{approachName}</button
      >
      {#if voiceEnabled && dictationPhase !== 'idle'}<span class="mira-voice-state" role="status"
          >{dictationPhase === 'recording'
            ? '● Recording…'
            : dictationPhase === 'transcribing'
              ? desktop
                ? 'Transcribing locally…'
                : 'Finishing dictation…'
              : 'Opening microphone…'}</span
        >{/if}
    </div>
    <div class="mira-composer-tools">
      {#if voiceEnabled}<button
          type="button"
          class="mira-icon-button"
          aria-label={dictationPhase === 'recording' ? 'Stop dictation' : 'Start voice input'}
          class:mira-dictation-active={dictationPhase === 'recording'}
          aria-pressed={dictationPhase === 'recording'}
          title={dictationPhase === 'recording' ? 'Stop dictation' : 'Dictate a message'}
          disabled={voiceControlPhase !== 'off' ||
            dictationPhase === 'requesting' ||
            dictationPhase === 'transcribing'}
          onclick={onDictation}
          >{#if dictationPhase === 'recording'}<Square size={17} />{:else}<Mic
              size={19}
            />{/if}</button
        >
        <button
          type="button"
          class="mira-icon-button"
          aria-label={voiceControlPhase === 'off' ? 'Start voice control' : 'Stop voice control'}
          aria-pressed={voiceControlPhase !== 'off'}
          title="Voice control · speak commands and draft messages"
          disabled={dictationPhase !== 'idle'}
          onclick={onVoiceControl}><AudioLines size={20} /></button
        >{/if}
      <button
        type="submit"
        class="mira-send-button"
        aria-label="Send message"
        title="Send"
        disabled={(!draft.trim() && !draftPatterns.length) || sending}><ArrowUp size={19} /></button
      >
    </div>
  </div>
</form>

<style>
  .mira-composer {
    position: relative;
  }
  .mira-composer-footer > .mira-composer-tools:first-child > button.mira-mention-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .mira-mention-picker {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    z-index: 20;
    background: #fff;
    color: #293b30;
    border: 1px solid #d7ded9;
    border-radius: 12px;
    box-shadow: 0 8px 24px #20362918;
    overflow: hidden;
  }
  .mira-mention-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.65rem 0.8rem;
    border-bottom: 1px solid #d7ded9;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .mira-mention-heading select {
    min-width: 0;
    max-width: 55%;
    border: 1px solid #d7ded9;
    border-radius: 6px;
    padding: 0.35rem;
    background: #fff;
    color: #526357;
    font: inherit;
  }
  .mira-mention-results {
    max-height: min(36dvh, 280px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.25rem;
  }
  .mira-mention-results button {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.15rem;
    min-height: 44px;
    padding: 0.6rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    text-align: left;
  }
  .mira-mention-results button.highlighted,
  .mira-mention-results button:hover {
    background: #e9f2ec;
  }
  .mira-mention-title {
    font-size: 0.85rem;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .mira-mention-collection,
  .mira-mention-summary {
    font-size: 0.75rem;
    color: #59665e;
  }
  .mira-mention-summary {
    display: block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mira-mention-help,
  .mira-mention-empty {
    padding: 0.5rem 0.8rem;
    font-size: 0.75rem;
    color: #59665e;
  }
  .mira-mention-help {
    border-top: 1px solid #d7ded9;
  }
  .mira-draft-patterns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
  }
  .mira-draft-pattern {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    max-width: 100%;
    padding: 0.1rem 0.3rem 0.1rem 0.5rem;
    background: #e9f2ec;
    border-radius: 8px;
    color: #293b30;
    font-size: 0.8rem;
  }
  .mira-draft-pattern > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .mira-draft-pattern button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border: 0;
    background: transparent;
    color: inherit;
  }
  @media (pointer: coarse) {
    .mira-draft-pattern button {
      width: 44px;
      height: 44px;
    }
    .mira-mention-heading select {
      min-height: 44px;
    }
  }
</style>
