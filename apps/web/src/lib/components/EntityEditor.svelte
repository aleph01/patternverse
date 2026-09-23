<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import type {
    CreatePersonalEntityInput,
    LocalWorkspace,
    RawEntity,
  } from '@patternverse/workspace';
  import type { EntityType } from '@patternverse/schema';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    editorSignature,
    editorValuesFromEntity,
    emptyEditorValues,
    parseEditorList,
    slugFromTitle,
    validateEditorValues,
    type EditorValues,
  } from '$lib/editor';
  import type { EntitySummary } from '$lib/server/commons';
  import { getEditorEntityType, isEditorEntityType } from '$lib/editor/entityTypes';
  import EntityLookup from './EntityLookup.svelte';
  import EntityTypeChooser from './EntityTypeChooser.svelte';
  import NovelMarkdownEditor from './NovelMarkdownEditor.svelte';
  import PracticeBuilder from './PracticeBuilder.svelte';

  let { commonsEntities }: { commonsEntities: readonly EntitySummary[] } = $props();

  let values = $state<EditorValues>(emptyEditorValues());
  let personalEntities = $state<readonly RawEntity[]>([]);
  let workspace = $state<LocalWorkspace>();
  let editingId = $state<string>();
  let ready = $state(false);
  let saving = $state(false);
  let savedSignature = $state('');
  let errors = $state<readonly string[]>([]);
  let message = $state('');
  let idCustomized = $state(false);
  let selectedType = $state<EntityType>();

  const selectedTypeOption = $derived(selectedType ? getEditorEntityType(selectedType) : undefined);
  const guidedVerseCreation = $derived(selectedType === 'verse');
  const dirty = $derived(
    ready && Boolean(selectedType) && editorSignature(values) !== savedSignature,
  );
  const editorTitle = $derived(
    !selectedType
      ? 'what would you like to create?'
      : editingId
        ? `edit ${values.title || selectedTypeOption?.label}`
        : `new ${selectedTypeOption?.label}`,
  );
  const relationshipOptions = $derived.by(() => {
    const byId = new SvelteMap<
      string,
      Pick<RawEntity, 'id' | 'sourceId' | 'type' | 'title' | 'summary'>
    >();
    for (const entity of [...commonsEntities, ...personalEntities]) byId.set(entity.id, entity);
    return [...byId.values()].sort((left, right) => left.title.localeCompare(right.title));
  });
  const verseOptions = $derived(relationshipOptions.filter((option) => option.type === 'verse'));
  const patternOptions = $derived(
    relationshipOptions.filter((option) => option.type === 'pattern'),
  );
  const collectionItemOptions = $derived(
    relationshipOptions.filter((option) => option.type !== 'verse' && option.id !== values.id),
  );

  beforeNavigate(({ cancel }) => {
    if (dirty && !window.confirm('Leave without saving your changes?')) cancel();
  });

  onMount(() => {
    const protectReload = (event: BeforeUnloadEvent): void => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectReload);

    void getLocalWorkspace()
      .then(async (localWorkspace) => {
        workspace = localWorkspace;
        personalEntities = await localWorkspace.listEntities();
        const searchParams = new URL(window.location.href).searchParams;
        const requestedId = searchParams.get('id');
        if (requestedId) {
          const entity = await localWorkspace.getEntity(requestedId);
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
          }
        }
        savedSignature = editorSignature(values);
        ready = true;
      })
      .catch(() => {
        errors = ['The local workspace is unavailable in this browser.'];
        ready = true;
      });

    return () => window.removeEventListener('beforeunload', protectReload);
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
    values = emptyEditorValues(type);
    selectedType = type;
    idCustomized = false;
    errors = [];
    message = '';
    savedSignature = editorSignature(values);
    window.history.replaceState({}, '', `/editor?type=${encodeURIComponent(type)}`);
  };

  const save = async (): Promise<void> => {
    if (!workspace || saving) return;
    errors = [];
    message = '';
    const validation = validateEditorValues(values);
    if (!validation.success) {
      errors = validation.errors;
      return;
    }

    saving = true;
    try {
      const entity = validation.entity;
      const saved = editingId
        ? await workspace.updateEntity(editingId, () => entity)
        : await workspace.createEntity(
            (({ sourceId, sourcePath, ...input }) => {
              void sourceId;
              void sourcePath;
              return input;
            })(entity) as CreatePersonalEntityInput,
          );

      editingId = saved.id;
      values = editorValuesFromEntity(saved);
      personalEntities = await workspace.listEntities();
      savedSignature = editorSignature(values);
      message = `Saved “${saved.title}” as ${saved.status}.`;
      window.history.replaceState({}, '', `/editor?id=${encodeURIComponent(saved.id)}`);
    } catch (error) {
      errors = [error instanceof Error ? error.message : 'The entity could not be saved.'];
    } finally {
      saving = false;
    }
  };
</script>

<section class="editor-shell" aria-labelledby="editor-heading">
  <header class="editor-heading">
    <div>
      {#if selectedTypeOption}
        <p>{selectedTypeOption.label} details · private to this browser</p>
      {/if}
      <h1 id="editor-heading">{editorTitle}</h1>
    </div>
  </header>

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
          {#if !guidedVerseCreation}
            <label>
              <span>Status</span>
              <select bind:value={values.status}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </label>
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

          {#if !guidedVerseCreation}
            <div class="wide-field id-field">
              <label for="entity-id">ID · lowercase kebab-case</label>
              <input
                id="entity-id"
                value={values.id}
                autocomplete="off"
                disabled={Boolean(editingId)}
                oninput={(event) => updateId(event.currentTarget.value)}
              />
            </div>
          {/if}

          <label class="wide-field">
            <span>Summary</span>
            <textarea bind:value={values.summary} rows="3" placeholder="One clear sentence"
            ></textarea>
          </label>

          {#if !guidedVerseCreation}
            <label>
              <span>Aliases · one per line</span>
              <textarea bind:value={values.aliases} rows="4"></textarea>
            </label>

            <label>
              <span>Attribution</span>
              <textarea bind:value={values.attribution} rows="4"></textarea>
            </label>
          {/if}

          {#if values.type !== 'verse'}
            <EntityLookup
              id="verse-lookup"
              label="Verses"
              description="Choose the broad lenses this entity belongs to."
              options={verseOptions}
              selected={parseEditorList(values.verses)}
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
            description="Search the Library, select entities, and arrange them in authored order."
            options={collectionItemOptions}
            selected={values.items}
            onchange={(ids) => (values.items = ids)}
            ordered
          />
        {/if}

        {#if !guidedVerseCreation}
          <div class="body-editor">
            <header class="body-editor-heading">
              <div>
                <p>Writing space</p>
                <span>Type / to add headings, lists, quotes, tables, and more</span>
              </div>
            </header>

            {#if ready}
              <NovelMarkdownEditor
                value={values.body}
                disabled={!workspace || saving}
                onchange={(markdown) => (values.body = markdown)}
              />
            {:else}
              <p class="body-editor-loading">Opening your local draft…</p>
            {/if}
          </div>
        {/if}

        {#if values.type === 'pattern'}
          <details class="editor-practice-disclosure" open={Boolean(values.practice)}>
            <summary>
              <span class="editor-practice-summary-copy">
                <strong>Interactive practice</strong>
                <small>
                  {values.practice
                    ? 'A guided practice is attached to this pattern.'
                    : 'Optionally add a guided, step-by-step experience.'}
                </small>
              </span>
              <span class:enabled={Boolean(values.practice)} class="editor-practice-status">
                {values.practice ? 'enabled' : 'optional'}
              </span>
              <span class="editor-practice-chevron" aria-hidden="true"></span>
            </summary>
            <PracticeBuilder
              definition={values.practice}
              entityTitle={values.title}
              disabled={!ready || !workspace || saving}
              onchange={(practice) => (values.practice = practice)}
            />
          </details>
        {/if}
      </fieldset>
    </form>

    <div class="editor-footer">
      <span>{dirty ? 'Unsaved changes' : 'Saved locally'}</span>
      <button type="button" disabled={!ready || !workspace || saving} onclick={save}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  {/if}
</section>
