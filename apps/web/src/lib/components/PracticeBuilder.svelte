<script lang="ts">
  import type { PracticeBlock, PracticeDefinition, PracticeStep } from '@patternverse/schema';
  import {
    addBlock,
    addStep,
    duplicateBlock,
    duplicateStep,
    moveBlock,
    moveStep,
    removeBlock,
    removeStep,
    updateBlock,
  } from '$lib/practice/builder';
  import { slugFromTitle } from '$lib/editor';
  import PracticeMarkdownPreview from './PracticeMarkdownPreview.svelte';

  let {
    definition,
    entityTitle,
    disabled = false,
    onchange,
  }: {
    definition?: PracticeDefinition;
    entityTitle: string;
    disabled?: boolean;
    onchange: (definition: PracticeDefinition | undefined) => void;
  } = $props();

  let previewBlockIds = $state<readonly string[]>([]);

  const setDefinition = (next: PracticeDefinition): void => onchange(next);

  const idFactory = (): ((sourceId: string) => string) => {
    const ids = [
      ...(definition?.steps.map((step) => step.id) ?? []),
      ...(definition?.steps.flatMap((step) => step.blocks.map((block) => block.id)) ?? []),
    ];
    return (sourceId: string): string => {
      const base = slugFromTitle(sourceId) || 'item';
      let candidate = `${base}-copy`;
      let suffix = 2;
      while (ids.includes(candidate)) candidate = `${base}-copy-${suffix++}`;
      ids.push(candidate);
      return candidate;
    };
  };

  const freshId = (base: string): string => {
    const create = idFactory();
    const candidate = slugFromTitle(base) || 'item';
    const existing = [
      ...(definition?.steps.map((step) => step.id) ?? []),
      ...(definition?.steps.flatMap((step) => step.blocks.map((block) => block.id)) ?? []),
    ];
    return existing.includes(candidate) ? create(candidate.replace(/-copy$/, '')) : candidate;
  };

  const enable = (): void => {
    const stepId = 'first-step';
    onchange({
      title: `${entityTitle.trim() || 'Untitled'} Practice`,
      introduction: 'A focused, step-by-step Practice.',
      steps: [
        {
          id: stepId,
          title: 'First step',
          blocks: [
            { id: `${stepId}-instructions`, type: 'markdown', content: 'Add instructions.' },
          ],
        },
      ],
    });
  };

  const changeStep = (stepId: string, update: (step: PracticeStep) => PracticeStep): void => {
    if (!definition) return;
    setDefinition({
      ...definition,
      steps: definition.steps.map((step) => (step.id === stepId ? update(step) : step)),
    });
  };

  const addNewStep = (): void => {
    if (!definition) return;
    const stepId = freshId(`step-${definition.steps.length + 1}`);
    setDefinition(
      addStep(definition, {
        id: stepId,
        title: `Step ${definition.steps.length + 1}`,
        blocks: [
          { id: freshId(`${stepId}-instructions`), type: 'markdown', content: 'Add instructions.' },
        ],
      }),
    );
  };

  const addNewBlock = (stepId: string, type: PracticeBlock['type']): void => {
    if (!definition) return;
    const id = freshId(`${stepId}-${type}`);
    const block: PracticeBlock =
      type === 'markdown'
        ? { id, type, content: 'Add instructions.' }
        : type === 'text-input'
          ? { id, type, label: 'Your response', multiline: true, required: false }
          : { id, type, label: 'Timer', defaultDurationSeconds: 600, userAdjustable: true };
    setDefinition(addBlock(definition, stepId, block));
  };

  const changeBlock = (
    stepId: string,
    blockId: string,
    update: (block: PracticeBlock) => PracticeBlock,
  ): void => {
    if (definition) setDefinition(updateBlock(definition, stepId, blockId, update));
  };

  const togglePreview = (blockId: string): void => {
    previewBlockIds = previewBlockIds.includes(blockId)
      ? previewBlockIds.filter((id) => id !== blockId)
      : [...previewBlockIds, blockId];
  };

  const actionLabel = (action: string, subject: string): string => `${action} ${subject}`;
</script>

<section class="practice-builder" aria-label="Interactive practice builder">
  {#if !definition}
    <div class="practice-builder-empty">
      <div>
        <strong>Add a guided practice</strong>
        <p>Combine instructions, written responses, and timers in a focused sequence.</p>
      </div>
      <button type="button" {disabled} onclick={enable}>Add practice</button>
    </div>
  {:else}
    <div class="practice-builder-toolbar">
      <span>Practice details</span>
      <button type="button" class="quiet-danger" {disabled} onclick={() => onchange(undefined)}>
        Remove practice
      </button>
    </div>
    <div class="practice-builder-metadata">
      <label>
        <span>Practice title</span>
        <input
          value={definition.title}
          {disabled}
          oninput={(event) => setDefinition({ ...definition, title: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Introduction <small>optional</small></span>
        <textarea
          rows="3"
          value={definition.introduction ?? ''}
          {disabled}
          oninput={(event) =>
            setDefinition({
              ...definition,
              introduction: event.currentTarget.value || undefined,
            })}></textarea>
      </label>
    </div>

    <ol class="practice-builder-steps">
      {#each definition.steps as step, stepIndex (step.id)}
        <li class="practice-builder-step">
          <header>
            <span>{String(stepIndex + 1).padStart(2, '0')}</span>
            <strong>{step.title || 'Untitled step'}</strong>
            <div class="practice-builder-actions">
              <button
                type="button"
                aria-label={`Move ${step.title || step.id} up`}
                disabled={disabled || stepIndex === 0}
                onclick={() => setDefinition(moveStep(definition, stepIndex, stepIndex - 1))}
                >↑</button
              >
              <button
                type="button"
                aria-label={`Move ${step.title || step.id} down`}
                disabled={disabled || stepIndex === definition.steps.length - 1}
                onclick={() => setDefinition(moveStep(definition, stepIndex, stepIndex + 1))}
                >↓</button
              >
              <button
                type="button"
                class="practice-icon-button"
                {disabled}
                aria-label={actionLabel('Duplicate', step.title || step.id)}
                title="Duplicate step"
                onclick={() => setDefinition(duplicateStep(definition, step.id, idFactory()))}
                ><svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="6.5" y="6.5" width="9" height="9" rx="1"></rect>
                  <path d="M13.5 6.5v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2"></path>
                </svg></button
              >
              <button
                type="button"
                class="quiet-danger practice-icon-button"
                {disabled}
                aria-label={actionLabel('Delete', step.title || step.id)}
                title="Delete step"
                onclick={() => setDefinition(removeStep(definition, step.id))}
                ><svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 6h12M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5"></path>
                </svg></button
              >
            </div>
          </header>

          <label class="practice-step-title">
            <span>Step title <small>optional</small></span>
            <input
              value={step.title ?? ''}
              {disabled}
              oninput={(event) =>
                changeStep(step.id, (current) => ({
                  ...current,
                  title: event.currentTarget.value || undefined,
                }))}
            />
          </label>

          <ol class="practice-builder-blocks">
            {#each step.blocks as block, blockIndex (block.id)}
              <li>
                <header>
                  <span
                    >{block.type === 'markdown'
                      ? 'Markdown'
                      : block.type === 'text-input'
                        ? 'Text input'
                        : 'Timer'}</span
                  >
                  <div class="practice-builder-actions">
                    <button
                      type="button"
                      aria-label={`Move ${block.id} up`}
                      disabled={disabled || blockIndex === 0}
                      onclick={() =>
                        setDefinition(moveBlock(definition, step.id, blockIndex, blockIndex - 1))}
                      >↑</button
                    >
                    <button
                      type="button"
                      aria-label={`Move ${block.id} down`}
                      disabled={disabled || blockIndex === step.blocks.length - 1}
                      onclick={() =>
                        setDefinition(moveBlock(definition, step.id, blockIndex, blockIndex + 1))}
                      >↓</button
                    >
                    <button
                      type="button"
                      class="practice-icon-button"
                      {disabled}
                      aria-label={actionLabel('Duplicate', block.id)}
                      title="Duplicate block"
                      onclick={() =>
                        setDefinition(duplicateBlock(definition, step.id, block.id, idFactory()))}
                      ><svg viewBox="0 0 20 20" aria-hidden="true">
                        <rect x="6.5" y="6.5" width="9" height="9" rx="1"></rect>
                        <path d="M13.5 6.5v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2"
                        ></path>
                      </svg></button
                    >
                    <button
                      type="button"
                      class="quiet-danger practice-icon-button"
                      {disabled}
                      aria-label={actionLabel('Delete', block.id)}
                      title="Delete block"
                      onclick={() => setDefinition(removeBlock(definition, step.id, block.id))}
                      ><svg viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M4 6h12M8 3.5h4M6 6l.7 10h6.6L14 6M8.5 9v4.5M11.5 9v4.5"></path>
                      </svg></button
                    >
                  </div>
                </header>

                {#if block.type === 'markdown'}
                  <label>
                    <span>Markdown content</span>
                    <textarea
                      rows="8"
                      value={block.content}
                      {disabled}
                      oninput={(event) =>
                        changeBlock(step.id, block.id, (current) =>
                          current.type === 'markdown'
                            ? { ...current, content: event.currentTarget.value }
                            : current,
                        )}></textarea>
                  </label>
                  <button type="button" {disabled} onclick={() => togglePreview(block.id)}>
                    {previewBlockIds.includes(block.id) ? 'Hide preview' : 'Preview'}
                  </button>
                  {#if previewBlockIds.includes(block.id)}
                    <div class="practice-block-preview">
                      <PracticeMarkdownPreview markdown={block.content} />
                    </div>
                  {/if}
                {:else if block.type === 'text-input'}
                  <div class="practice-builder-fields">
                    <label>
                      <span>Label</span>
                      <input
                        value={block.label}
                        {disabled}
                        oninput={(event) =>
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'text-input'
                              ? { ...current, label: event.currentTarget.value }
                              : current,
                          )}
                      />
                    </label>
                    <label>
                      <span>Placeholder <small>optional</small></span>
                      <input
                        value={block.placeholder ?? ''}
                        {disabled}
                        oninput={(event) =>
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'text-input'
                              ? { ...current, placeholder: event.currentTarget.value || undefined }
                              : current,
                          )}
                      />
                    </label>
                  </div>
                  <fieldset class="practice-inline-choice">
                    <legend>Input size</legend>
                    <label>
                      <input
                        type="radio"
                        name={`input-size-${block.id}`}
                        checked={!block.multiline}
                        {disabled}
                        onchange={() =>
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'text-input'
                              ? { ...current, multiline: false }
                              : current,
                          )}
                      /> Single line
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`input-size-${block.id}`}
                        checked={block.multiline}
                        {disabled}
                        onchange={() =>
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'text-input'
                              ? { ...current, multiline: true }
                              : current,
                          )}
                      /> Multiple lines
                    </label>
                  </fieldset>
                  <label class="practice-checkbox">
                    <input
                      type="checkbox"
                      checked={block.required}
                      {disabled}
                      onchange={(event) =>
                        changeBlock(step.id, block.id, (current) =>
                          current.type === 'text-input'
                            ? { ...current, required: event.currentTarget.checked }
                            : current,
                        )}
                    /> Required
                  </label>
                {:else}
                  <div class="practice-builder-fields">
                    <label>
                      <span>Label <small>optional</small></span>
                      <input
                        value={block.label ?? ''}
                        {disabled}
                        oninput={(event) =>
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'timer'
                              ? { ...current, label: event.currentTarget.value || undefined }
                              : current,
                          )}
                      />
                    </label>
                    <label>
                      <span>Default duration in minutes</span>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        step="1"
                        value={block.defaultDurationSeconds / 60}
                        {disabled}
                        oninput={(event) => {
                          const minutes = Number(event.currentTarget.value);
                          if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return;
                          changeBlock(step.id, block.id, (current) =>
                            current.type === 'timer'
                              ? { ...current, defaultDurationSeconds: minutes * 60 }
                              : current,
                          );
                        }}
                      />
                    </label>
                  </div>
                  <label class="practice-checkbox">
                    <input
                      type="checkbox"
                      checked={block.userAdjustable}
                      {disabled}
                      onchange={(event) =>
                        changeBlock(step.id, block.id, (current) =>
                          current.type === 'timer'
                            ? { ...current, userAdjustable: event.currentTarget.checked }
                            : current,
                        )}
                    /> User may change the duration
                  </label>
                  <label class="practice-checkbox">
                    <input
                      type="checkbox"
                      checked={block.persistent ?? false}
                      {disabled}
                      onchange={(event) =>
                        changeBlock(step.id, block.id, (current) =>
                          current.type === 'timer'
                            ? { ...current, persistent: event.currentTarget.checked || undefined }
                            : current,
                        )}
                    /> Keep above every step
                  </label>
                {/if}
              </li>
            {/each}
          </ol>

          <div class="practice-add-block" aria-label={`Add a block to ${step.title || step.id}`}>
            <span>Add block</span>
            <button type="button" {disabled} onclick={() => addNewBlock(step.id, 'markdown')}
              >Markdown</button
            >
            <button type="button" {disabled} onclick={() => addNewBlock(step.id, 'text-input')}
              >Text input</button
            >
            <button type="button" {disabled} onclick={() => addNewBlock(step.id, 'timer')}
              >Timer</button
            >
          </div>
        </li>
      {/each}
    </ol>

    <button type="button" class="practice-add-step" {disabled} onclick={addNewStep}
      >+ Add step</button
    >

    <details class="practice-builder-complete-preview">
      <summary>Preview complete Practice</summary>
      <div>
        <h2>{definition.title || 'Untitled Practice'}</h2>
        {#if definition.introduction}<p>{definition.introduction}</p>{/if}
        {#each definition.steps as step, index (step.id)}
          <section>
            <span>Step {index + 1}</span>
            <h3>{step.title || `Step ${index + 1}`}</h3>
            {#each step.blocks as block (block.id)}
              {#if block.type === 'markdown'}
                <PracticeMarkdownPreview markdown={block.content} />
              {:else if block.type === 'text-input'}
                <div class="practice-field-preview">
                  <strong>{block.label || 'Unlabelled response'}</strong>
                  <span
                    >{block.multiline ? 'Multiple lines' : 'Single line'}{block.required
                      ? ' · required'
                      : ''}</span
                  >
                </div>
              {:else}
                <div class="practice-timer-preview">
                  <strong>{block.label || 'Timer'}</strong>
                  <span
                    >{block.defaultDurationSeconds / 60} minutes{block.userAdjustable
                      ? ' · adjustable'
                      : ''}{block.persistent ? ' · above every step' : ''}</span
                  >
                </div>
              {/if}
            {/each}
          </section>
        {/each}
      </div>
    </details>
  {/if}
</section>
