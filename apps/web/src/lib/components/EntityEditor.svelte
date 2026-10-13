<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import { Maximize2, Minimize2, LockKeyhole, ChevronDown } from '@lucide/svelte';
  import type { LocalWorkspace, RawEntity } from '@patternverse/workspace';
  import type { EntityType } from '@patternverse/schema';
  import { personalStatusLabel, type PersonalWorkspaceMetadata } from '@patternverse/workspace';
  import { legacyRelationshipIndex } from '@patternverse/workspace/library';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    editorSignature,
    editorValuesFromEntity,
    emptyEditorValues,
    parseEditorList,
    slugFromTitle,
    type EditorValues,
  } from '$lib/editor';
  import type { EntitySummary } from '$lib/server/commons';
  import { getEditorEntityType, isEditorEntityType } from '$lib/editor/entityTypes';
  import EntityLookup from './EntityLookup.svelte';
  import KeywordInput from './KeywordInput.svelte';
  import EntityTypeChooser from './EntityTypeChooser.svelte';
  import NovelMarkdownEditor from './NovelMarkdownEditor.svelte';
  import PracticeLanguageEditor from '$lib/pattern-editor/PracticeLanguageEditor.svelte';
  import WorksheetButton from './WorksheetButton.svelte';
  import { starterPractice } from '$lib/pattern-editor/source';
  import { inspectSource } from '$lib/pattern-editor/bridge';
  import WorkspaceContext from './WorkspaceContext.svelte';
  import { createEditorSaveWorkflow } from '$lib/editor/save-workflow';

  let { commonsEntities }: { commonsEntities: readonly EntitySummary[] } = $props();

  let values = $state<EditorValues>(emptyEditorValues());
  let personalEntities = $state<readonly RawEntity[]>([]);
  let workspace = $state<LocalWorkspace>();
  let workspaceMetadata = $state<PersonalWorkspaceMetadata>();
  let editingId = $state<string>();
  let ready = $state(false);
  let saving = $state(false);
  let practicePending = $state(false);
  let savedSignature = $state('');
  let errors = $state<readonly string[]>([]);
  let message = $state('');
  let idCustomized = $state(false);
  let selectedType = $state<EntityType>();
  let fullScreen = $state(false);
  let editorShell = $state<HTMLElement>();
  let fullScreenTrigger = $state<HTMLButtonElement>();
  let exitFullScreenButton = $state<HTMLButtonElement>();
  let topicsInput = $state<KeywordInput>();
  let aliasesInput = $state<KeywordInput>();
  let topicsPending = $state(false);
  let aliasesPending = $state(false);
  let scrollBeforeFocus = 0;

  const selectedTypeOption = $derived(selectedType ? getEditorEntityType(selectedType) : undefined);
  const centeredEditor = $derived(selectedType === 'pattern');
  const guidedVerseCreation = $derived(selectedType === 'verse');
  const dirty = $derived(
    ready &&
      Boolean(selectedType) &&
      (editorSignature(values) !== savedSignature || topicsPending || aliasesPending),
  );
  const editorTitle = $derived(
    !selectedType
      ? 'what would you like to create?'
      : editingId
        ? `edit ${values.title || selectedTypeOption?.label}`
        : `new ${selectedTypeOption?.label}`,
  );
  const relationshipOptions = $derived(
    [...legacyRelationshipIndex(personalEntities, commonsEntities).values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
  );
  const verseOptions = $derived(relationshipOptions.filter((option) => option.type === 'verse'));
  const patternOptions = $derived(
    relationshipOptions.filter((option) => option.type === 'pattern'),
  );
  const collectionItemOptions = $derived(
    relationshipOptions.filter((option) => option.type !== 'verse' && option.id !== values.id),
  );

  beforeNavigate(({ cancel }) => {
    if ((dirty || practicePending) && !window.confirm('Leave without saving your changes?'))
      cancel();
  });

  const toggleFullScreen = async (): Promise<void> => {
    if (!fullScreen) scrollBeforeFocus = window.scrollY;
    fullScreen = !fullScreen;
    await tick();
    if (fullScreen) exitFullScreenButton?.focus();
    else {
      fullScreenTrigger?.focus({ preventScroll: true });
      window.scrollTo({ top: scrollBeforeFocus, behavior: 'instant' });
    }
  };

  $effect(() => {
    if (!fullScreen || !editorShell) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let current: HTMLElement = editorShell;
    while (current.parentElement) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
      if (current === document.body) break;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const { element, inert } of background) element.inert = inert;
    };
  });

  const focusKeydown = (event: KeyboardEvent): void => {
    if (!fullScreen || !editorShell || event.defaultPrevented) return;
    if (event.key === 'Escape') {
      // Let editor menus consume Escape before closing the writing space.
      if (editorShell.querySelector('.novel-slash-menu, .link-editor')) return;
      event.preventDefault();
      void toggleFullScreen();
    } else if (event.key === 'Tab') {
      const controls = [
        ...editorShell.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"], a[href]',
        ),
      ].filter((element) => element.getClientRects().length && !element.closest('[inert]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (first && event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (last && !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  onMount(() => {
    let alive = true;
    const protectReload = (event: BeforeUnloadEvent): void => {
      if (!dirty && !practicePending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectReload);

    void getLocalWorkspace()
      .then(async (localWorkspace) => {
        if (!alive) return;
        const metadata = await localWorkspace.getWorkspace();
        if (!alive) return;
        const entities = await localWorkspace.listEntities();
        if (!alive) return;
        workspace = localWorkspace;
        workspaceMetadata = metadata;
        personalEntities = entities;
        const searchParams = new URL(window.location.href).searchParams;
        const requestedId = searchParams.get('id');
        if (requestedId) {
          const entity = await localWorkspace.getEntity(requestedId);
          if (!alive) return;
          if (!entity) {
            errors = [`The personal entity “${requestedId}” was not found in this browser.`];
          } else {
            editingId = entity.id;
            values = editorValuesFromEntity(entity);
            selectedType = entity.type;
          }
        } else {
          const requestedType = searchParams.get('type');
          if (isEditorEntityType(requestedType)) {
            values = emptyEditorValues(requestedType);
            selectedType = requestedType;
            if (requestedType !== 'verse') values.verses = searchParams.get('verse') ?? '';
          }
        }
        savedSignature = editorSignature(values);
        ready = true;
      })
      .catch(() => {
        if (!alive) return;
        errors = ['The local workspace is unavailable in this browser.'];
        ready = true;
      });

    return () => {
      alive = false;
      saveWorkflow.dispose();
      window.removeEventListener('beforeunload', protectReload);
    };
  });

  const updateTitle = (title: string): void => {
    values.title = title;
    if (!editingId && !idCustomized) values.id = slugFromTitle(title);
  };

  const updateId = (id: string): void => {
    values.id = id;
    idCustomized = true;
  };

  const chooseType = (type: EntityType): void => {
    if (!isEditorEntityType(type)) return;
    values = emptyEditorValues(type);
    selectedType = type;
    idCustomized = false;
    errors = [];
    message = '';
    topicsPending = false;
    aliasesPending = false;
    savedSignature = editorSignature(values);
    window.history.replaceState({}, '', `/editor?type=${encodeURIComponent(type)}`);
  };

  const saveWorkflow = createEditorSaveWorkflow({
    workspace: () => workspace,
    values: () => values,
    editingId: () => editingId,
    commons: () => commonsEntities,
    practicePending: () => practicePending,
    commitPending: () => {
      topicsInput?.commitPending();
      aliasesInput?.commitPending();
    },
    inspect: inspectSource,
    started: () => {
      errors = [];
      message = '';
    },
    busyChanged: (busy) => {
      saving = busy;
    },
    catalogChanged: (entities) => {
      personalEntities = entities;
    },
    accepted: (saved) => {
      editingId = saved.entity.id;
      // A delayed save must not replace newer writing, even if a child reports it after disabling.
      if (editorSignature(values) === saved.submittedSignature) values = saved.values;
      else values.id = saved.entity.id; // Keep the persisted identity for the next update.
      savedSignature = saved.signature;
      message = `Saved “${saved.entity.title}” as ${personalStatusLabel(saved.entity.status)}.`;
      window.history.replaceState({}, '', `/editor?id=${encodeURIComponent(saved.entity.id)}`);
    },
    failed: (messages) => {
      fullScreen = false;
      errors = messages;
    },
  });
  const save = saveWorkflow.save;
</script>

<svelte:window onkeydown={focusKeydown} />

{#snippet statusField()}
  <label class="editor-status-field">
    <span>Status</span>
    <select
      bind:value={values.status}
      aria-label="Status"
      aria-describedby="personal-status-help"
      disabled={!ready || !workspace || saving}
    >
      <option value="draft">Draft</option>
      <option value="published">Ready · still private</option>
      {#if editingId}<option value="deprecated">Archived · still private</option>{/if}
    </select>
    <small id="personal-status-help">Status organizes your work; it never publishes it.</small>
  </label>
{/snippet}

{#snippet saveButton(label = 'Save')}
  <button
    class="editor-save"
    type="button"
    disabled={!ready || !workspace || saving || practicePending}
    onclick={save}>{saving ? 'Saving…' : label}</button
  >
{/snippet}

<section
  class="editor-shell"
  class:editor-centered={centeredEditor}
  class:editor-fullscreen={fullScreen}
  bind:this={editorShell}
  role={fullScreen ? 'dialog' : undefined}
  aria-modal={fullScreen ? true : undefined}
  aria-labelledby={fullScreen ? undefined : 'editor-heading'}
  aria-label={fullScreen ? `Writing space — ${values.title || 'Untitled'}` : undefined}
>
  {#if fullScreen}
    <div class="focus-toolbar">
      <button type="button" bind:this={exitFullScreenButton} onclick={toggleFullScreen}
        ><Minimize2 size={16} aria-hidden="true" />Back to details</button
      >
      <span>{values.title || 'Your writing space'}</span>
      {@render saveButton(centeredEditor ? 'Save pattern' : 'Save')}
    </div>
  {/if}
  <header class="editor-heading">
    <div>
      {#if selectedTypeOption}
        <p>{selectedTypeOption.label} details</p>
      {/if}
      <h1 id="editor-heading">{editorTitle}</h1>
    </div>
    {#if centeredEditor}
      <div class="editor-header-actions">
        <span class="editor-private"><LockKeyhole size={13} aria-hidden="true" />Private</span>
        {@render statusField()}
        {@render saveButton('Save pattern')}
      </div>
    {/if}
  </header>

  <WorkspaceContext name={workspaceMetadata?.name} />

  {#if errors.length > 0}
    <div class="editor-errors" role="alert">
      <strong>Check these fields:</strong>
      <ul>
        {#each errors as error (error)}<li>{error}</li>{/each}
      </ul>
    </div>
  {/if}
  {#if message}<p class="editor-message" aria-live="polite">{message}</p>{/if}

  {#if ready && !selectedType && !editingId}
    <EntityTypeChooser onchange={chooseType} />
  {:else if selectedType}
    <form class="editor-form" onsubmit={(event) => event.preventDefault()}>
      <fieldset disabled={!ready || !workspace || saving}>
        <legend>{selectedTypeOption?.label} details</legend>
        <div class="editor-fields">
          {#if !guidedVerseCreation && !centeredEditor}
            {@render statusField()}
          {/if}

          <label class="wide-field">
            <span>Title</span>
            <input
              value={values.title}
              autocomplete="off"
              placeholder="A useful name"
              oninput={(event) => updateTitle(event.currentTarget.value)}
            />
          </label>

          <label class="wide-field">
            <span>{centeredEditor ? 'In one sentence' : 'Summary'}</span>
            <textarea bind:value={values.summary} rows="3" placeholder="One clear sentence"
            ></textarea>
          </label>

          {#if values.type !== 'verse'}
            <EntityLookup
              id="verse-lookup"
              label="Verses"
              description={centeredEditor
                ? 'Choose a verse home. Required; you can choose more than one.'
                : 'Choose a verse home. Required for patterns and collections; a collection is optional.'}
              options={verseOptions}
              selected={parseEditorList(values.verses)}
              compact={centeredEditor}
              onchange={(ids) => (values.verses = ids.join('\n'))}
            />
          {/if}

          {#if values.type === 'practice'}
            <EntityLookup
              id="pattern-lookup"
              label="Patterns implemented"
              description="Choose the Patterns this Practice puts into action."
              options={patternOptions}
              selected={parseEditorList(values.implements)}
              onchange={(ids) => (values.implements = ids.join('\n'))}
            />
            <label>
              <span>Duration in minutes</span>
              <input bind:value={values.durationMinutes} type="number" min="1" step="1" />
            </label>
          {/if}
        </div>

        {#if values.type === 'collection'}
          <EntityLookup
            id="collection-item-lookup"
            label="Collection items"
            description="Add or remove library references. Removing an item here never deletes its article."
            options={collectionItemOptions}
            selected={values.items}
            onchange={(ids) => (values.items = ids)}
          />
        {/if}

        {#if !guidedVerseCreation}
          <div class="body-editor">
            <header class="body-editor-heading">
              <div>
                <p>{centeredEditor ? 'Article' : 'Writing space'}</p>
                <span>Type / to add headings, lists, quotes, tables, and more</span>
              </div>
              <button
                class="editor-expand"
                type="button"
                bind:this={fullScreenTrigger}
                aria-pressed={fullScreen}
                disabled={!ready || !workspace || saving}
                onclick={toggleFullScreen}
                ><Maximize2 size={16} aria-hidden="true" />Full screen</button
              >
            </header>

            {#if ready}
              <NovelMarkdownEditor
                value={values.body}
                comfortable={centeredEditor || fullScreen}
                disabled={!workspace || saving}
                onchange={(markdown) => (values.body = markdown)}
              />
            {:else}
              <p class="body-editor-loading">Opening your local draft…</p>
            {/if}
          </div>
        {/if}
        {#snippet optionalFields()}
          {#if !guidedVerseCreation}
            <details class="editor-optional-fields">
              <summary
                ><span>Topics &amp; other names<small>Optional</small></span><ChevronDown
                  size={16}
                  aria-hidden="true"
                /></summary
              >
              <div class="editor-optional-grid">
                <KeywordInput
                  bind:this={topicsInput}
                  id="pattern-topics"
                  label="Topics"
                  description="A few keywords to help you find this later."
                  placeholder="e.g. decisions, learning"
                  values={parseEditorList(values.tags)}
                  disabled={!ready || !workspace || saving}
                  onchange={(items) => (values.tags = items.join('\n'))}
                  onpendingchange={(pending) => (topicsPending = pending)}
                />
                <KeywordInput
                  bind:this={aliasesInput}
                  id="pattern-aliases"
                  label="Also known as"
                  description="Other names someone might search for. Leave empty if there aren't any."
                  placeholder="e.g. small test"
                  values={parseEditorList(values.aliases)}
                  disabled={!ready || !workspace || saving}
                  onchange={(items) => (values.aliases = items.join('\n'))}
                  onpendingchange={(pending) => (aliasesPending = pending)}
                />
              </div>
            </details>
            <details class="editor-optional-fields">
              <summary
                ><span>Credits &amp; technical details<small>Optional</small></span><ChevronDown
                  size={16}
                  aria-hidden="true"
                /></summary
              >
              <div class="editor-optional-grid editor-fields">
                <label
                  ><span>Source or inspiration</span><textarea
                    bind:value={values.attribution}
                    rows="3"
                    placeholder="A book, person, or link"></textarea></label
                >
                <div class="id-field">
                  <label for="entity-id">Pattern ID</label>
                  <input
                    id="entity-id"
                    value={values.id}
                    autocomplete="off"
                    disabled={Boolean(editingId)}
                    oninput={(event) => updateId(event.currentTarget.value)}
                  />
                  <small>Generated from the title. Usually no need to change it.</small>
                </div>
              </div>
            </details>
          {/if}
        {/snippet}
        {#if values.type === 'pattern' || (values.type === 'practice' && (values.practice || values.languagePracticeSource !== undefined))}
          <details
            class="editor-practice-disclosure"
            open={Boolean(values.practice) || values.languagePracticeSource !== undefined}
          >
            <summary>
              <span class="editor-practice-summary-copy">
                <strong>Interactive practice</strong>
                <small>
                  {values.practice || values.languagePracticeSource !== undefined
                    ? 'A guided practice is attached to this pattern.'
                    : 'Add an optional step-by-step practice to this pattern.'}
                </small>
              </span>
              <span
                class:enabled={Boolean(values.practice) ||
                  values.languagePracticeSource !== undefined}
                class="editor-practice-status"
              >
                {values.practice || values.languagePracticeSource !== undefined
                  ? 'enabled'
                  : 'optional'}
              </span>
              <span class="editor-practice-chevron" aria-hidden="true"></span>
            </summary>
            {#if values.languagePracticeSource !== undefined}
              <div class="language-practice-toolbar">
                <span>Source is the practice. Test responses are never saved.</span><button
                  type="button"
                  disabled={!ready || saving}
                  onclick={() => {
                    if (
                      window.confirm(
                        'Remove the interactive practice? Unsaved source will be removed from this draft.',
                      )
                    )
                      values.languagePracticeSource = undefined;
                  }}>Remove practice</button
                >
              </div>
              <PracticeLanguageEditor
                source={values.languagePracticeSource}
                disabled={!ready || !workspace || saving}
                onchange={(source) => (values.languagePracticeSource = source)}
                onpendingchange={(pending) => (practicePending = pending)}
              />
              <WorksheetButton
                definition={{ source: values.languagePracticeSource }}
                explainUnavailable
              />
            {:else}
              <div class="language-practice-toolbar">
                <span
                  >Write questions, choices, ratings, timers, and displays in Pattern Language.</span
                ><button
                  type="button"
                  disabled={!ready || !workspace || saving}
                  onclick={() => (values.languagePracticeSource = starterPractice(values.title))}
                  >Add practice</button
                >
              </div>
            {/if}
          </details>
        {/if}
        {@render optionalFields()}
      </fieldset>
    </form>

    <div class="editor-footer">
      <span>{dirty ? 'Unsaved changes' : editingId ? 'Saved on this device' : 'Not saved yet'}</span
      >
      {@render saveButton()}
    </div>
  {/if}
</section>

<style>
  .editor-centered {
    max-width: 900px;
    margin: 0 auto;
    padding: clamp(2rem, 4vw, 3.5rem) clamp(1rem, 4vw, 2.5rem);
  }
  .editor-centered .editor-heading {
    align-items: center;
    flex-wrap: wrap;
    padding-bottom: 1.5rem;
    border: 0;
    gap: 1rem;
  }
  .editor-centered .editor-heading h1 {
    max-width: none;
    font-size: 1.6rem;
    line-height: 1.2;
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }
  .editor-centered .editor-heading p + h1 {
    margin-top: 0.4rem;
  }
  .editor-header-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .editor-private {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    color: var(--green-dark);
    font-size: 0.75rem;
  }
  .editor-status-field {
    display: grid;
    gap: 0.4rem;
  }
  .editor-status-field small {
    color: var(--muted);
    font-size: 0.78rem;
  }
  .editor-header-actions .editor-status-field > span,
  .editor-header-actions .editor-status-field small {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .editor-header-actions select {
    max-width: 170px;
    min-height: 44px;
    border: 1px solid #d5d9d1;
    border-radius: 6px;
    background: white;
    color: var(--ink);
    padding: 0.5rem;
    font: inherit;
    font-size: 0.8rem;
  }
  .editor-shell .editor-save {
    background: var(--ink);
    color: white;
    border-radius: 6px;
    text-transform: none;
    min-width: 100px;
  }
  .editor-shell .editor-save:hover:not(:disabled) {
    background: var(--green-dark);
    color: white;
  }
  .editor-centered :global(.workspace-context) {
    margin: 0 0 2rem;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .editor-centered :global(.workspace-context p) {
    font-size: 0.75rem;
  }
  .editor-centered .editor-form > fieldset {
    margin-top: 0;
  }
  .editor-centered .editor-form > fieldset > legend {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    border: 0;
  }
  .editor-centered .editor-form > fieldset > .editor-fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
  .editor-centered .editor-fields input {
    font-size: 1rem;
  }
  .editor-centered .editor-form > fieldset > .editor-fields > label:first-child input {
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 750;
    letter-spacing: -0.035em;
    padding: 0.6rem 0;
    border: 0;
    border-bottom: 1px solid #d5d9d1;
    border-radius: 0;
  }
  .editor-centered .editor-form > fieldset > .editor-fields > label textarea {
    padding: 0.6rem 0;
    border: 0;
    border-bottom: 1px solid #d5d9d1;
    font-size: 1rem;
    border-radius: 0;
  }
  .editor-centered .body-editor {
    margin-top: 2rem;
    border: 0;
    border-top: 1px solid #d5d9d1;
    overflow: visible;
  }
  .editor-centered .body-editor-heading {
    flex-direction: row;
    padding: 0.6rem 0;
    background: white;
    gap: 0.75rem;
  }
  .editor-centered .body-editor-heading > div {
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
  }
  .editor-shell .editor-expand {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
    padding: 0.6rem;
    border: 0;
    font-size: 0.8rem;
    color: var(--muted);
    text-transform: none;
  }
  .editor-optional-fields {
    margin-top: 0;
    border-top: 1px solid #d5d9d1;
  }
  .editor-optional-fields > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 0;
    list-style: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .editor-optional-fields > summary::-webkit-details-marker {
    display: none;
  }
  .editor-optional-fields small {
    display: block;
    margin-top: 0.35rem;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 400;
  }
  .editor-optional-fields[open] > summary :global(svg) {
    transform: rotate(180deg);
  }
  .editor-optional-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    padding: 0.5rem 0 1.5rem;
  }
  .editor-centered .editor-optional-grid input,
  .editor-centered .editor-optional-grid textarea {
    border: 1px solid #d5d9d1;
    border-radius: 6px;
    padding: 0.65rem;
    font-size: 1rem;
  }
  .editor-centered .editor-practice-disclosure {
    margin: 1.5rem 0 0;
    border-top: 1px solid #d5d9d1;
    border-bottom: 0;
  }
  .editor-centered .editor-practice-summary-copy strong {
    font-size: 0.85rem;
    letter-spacing: 0;
    text-transform: none;
  }
  .editor-centered .editor-footer {
    position: static;
    justify-content: space-between;
    flex-wrap: wrap;
    border: 0;
    background: white;
    backdrop-filter: none;
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid #d5d9d1;
  }
  .editor-shell.editor-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 0 clamp(1rem, 4vw, 3rem) 2rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: white;
  }
  .focus-toolbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    max-width: 900px;
    margin: 0 auto;
    padding: 0.75rem 0;
    border-bottom: 1px solid #d5d9d1;
    background: white;
  }
  .focus-toolbar > span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .focus-toolbar button:first-child {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    border: 0;
    padding: 0.6rem;
    text-transform: none;
  }
  .editor-fullscreen > .editor-heading {
    display: none;
  }
  .editor-fullscreen :global(.workspace-context),
  .editor-fullscreen > .editor-footer {
    display: none;
  }
  .editor-fullscreen .editor-form {
    max-width: 820px;
    margin: 0 auto;
  }
  .editor-fullscreen .editor-form > fieldset {
    margin-top: 0;
  }
  .editor-fullscreen .editor-form > fieldset > :not(.body-editor),
  .editor-fullscreen .body-editor-heading {
    display: none;
  }
  .editor-fullscreen .body-editor {
    margin: 1rem 0 0;
    border: 0;
    overflow: visible;
  }
  .editor-fullscreen .editor-message {
    max-width: 820px;
    margin: 1rem auto;
  }
  .editor-fullscreen :global(.novel-formatting-toolbar) {
    position: sticky;
    bottom: 0;
    z-index: 25;
    flex-wrap: wrap;
  }
  @media (max-width: 600px) {
    .editor-optional-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .editor-centered .editor-heading {
      align-items: start;
    }
    .editor-header-actions {
      width: 100%;
    }
    .editor-private {
      margin-right: auto;
    }
    .editor-header-actions select {
      max-width: 145px;
    }
    .editor-centered .body-editor-heading > div > span {
      display: none;
    }
    .focus-toolbar {
      gap: 0.5rem;
    }
    .focus-toolbar > span {
      display: none;
    }
  }
  .language-practice-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0;
    font-size: 12px;
    color: var(--ink-muted, #62655f);
  }
  .language-practice-toolbar button {
    flex-shrink: 0;
    border: 1px solid #dedfd8;
    background: var(--paper);
    color: var(--ink);
    padding: 9px 12px;
    border-radius: 3px;
    font: 700 12px inherit;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .language-practice-toolbar {
      align-items: start;
      flex-direction: column;
    }
    .language-practice-toolbar button {
      min-height: 44px;
    }
  }
</style>
