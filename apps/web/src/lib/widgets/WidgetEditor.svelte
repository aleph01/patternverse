<script lang="ts">
  import { tick } from 'svelte';
  import { Plus, Pencil, Trash2, Check, X } from '@lucide/svelte';
  import WidgetCodeEditor from './WidgetCodeEditor.svelte';
  import { afterNavigate, beforeNavigate, goto, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { widgetReference, type WidgetDraft, type WidgetRelease } from '@patternverse/workspace';
  import { prepareWidget, validatePackage, type WidgetInteraction } from './library';
  import { widgetTemplate } from './templates';
  import WidgetStep from './WidgetStep.svelte';
  let drafts = $state<WidgetDraft[]>([]),
    releases = $state<WidgetRelease[]>([]),
    draft = $state<WidgetDraft | null>(null);
  let tab = $state('overview'),
    file = $state('widget.json'),
    newFile = $state(''),
    renamedFile = $state('');
  let addingFile = $state(false),
    renamingFile = $state<string | null>(null),
    fileList = $state<HTMLElement>();
  let removedFile = $state<{
    path: string;
    source: string;
    wasActive: boolean;
    index: number;
  } | null>(null);
  let error = $state(''),
    message = $state(''),
    busy = $state(false),
    enabled = $state(false),
    creating = $state(false);
  let inspected = $state<WidgetRelease | null>(null),
    ready = $state(false),
    savedSignature = $state('');
  const dirty = $derived(Boolean(draft) && !inspected && JSON.stringify(draft) !== savedSignature);
  beforeNavigate(({ cancel }) => {
    if (dirty && !window.confirm('Leave without saving your widget changes?')) cancel();
  });
  let fixture = $state('{}'),
    prompt = $state('Which needs feel unmet in this situation?'),
    preview = $state<WidgetInteraction | null>(null),
    previewDraft = $state<unknown>(null),
    confirmed = $state<unknown>(undefined),
    previewWidth = $state('wide');
  let usage = $state<string[]>([]),
    historyCount = $state(0);
  const definition = $derived.by(() => {
    try {
      return JSON.parse(draft?.package.files[fileForDefinition()] || '{}') as {
        inputs?: Record<string, Record<string, unknown>>;
        outputs?: Record<string, Record<string, unknown>>;
      };
    } catch {
      return null;
    }
  });
  function exportName() {
    return (
      Object.keys(draft?.package.manifest.exports || {}).find(
        (name) => draft?.package.manifest.exports[name].kind === 'widget',
      ) || ''
    );
  }
  function fileForDefinition() {
    return draft?.package.manifest.exports[exportName()]?.path || 'widget.json';
  }
  async function refresh() {
    const workspace = await getLocalWorkspace();
    [drafts, releases] = await Promise.all([
      workspace.listWidgetDrafts(),
      workspace.listWidgetReleases(),
    ]);
  }
  afterNavigate(() => {
    void action(async () => {
      inspected = null;
      creating = false;
      ready = false;
      draft = null;
      preview = null;
      await refresh();
      const params = new URLSearchParams(location.search);
      if (params.has('release')) {
        inspected = releases.find((row) => row.id === params.get('release')) ?? null;
        if (!inspected) throw Error('This released widget is not available on this device.');
        const row = inspected;
        await open({
          id: row.widgetId,
          workspaceId: row.workspaceId,
          name: row.name,
          description: row.description,
          package: row.package,
          revision: 0,
          updatedAt: row.createdAt,
        });
      } else if (params.has('id')) {
        const row = drafts.find((row) => row.id === params.get('id'));
        if (!row) throw Error('This widget draft is not available on this device.');
        await open(row);
      } else {
        await create('blank');
      }
      savedSignature = JSON.stringify(draft);
      ready = true;
    });
  });
  async function action(fn: () => Promise<void>) {
    busy = true;
    error = '';
    message = '';
    try {
      await fn();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The widget could not be saved.';
    } finally {
      busy = false;
    }
  }
  async function open(value: WidgetDraft) {
    removedFile = null;
    addingFile = false;
    renamingFile = null;
    preview = null;
    confirmed = undefined;
    draft = JSON.parse(JSON.stringify(value));
    tab = 'overview';
    file = fileForDefinition();
    const workspace = await getLocalWorkspace();
    enabled = await workspace.widgetEnabled(value.package.identity);
    const entities = await workspace.listEntities();
    usage = entities
      .filter((e) =>
        JSON.stringify(e).includes(
          `${value.package.manifest.publisher}/${value.package.manifest.name}@`,
        ),
      )
      .map((e) => e.title);
    historyCount = (await workspace.listPracticeRuns()).filter((r) =>
      JSON.stringify(r).includes(value.package.identity),
    ).length;
  }
  async function create(kind: 'needs' | 'blank' | 'choices') {
    const workspace = await getLocalWorkspace(),
      w = await workspace.getWorkspace();
    const id = draft?.id ?? crypto.randomUUID();
    const name =
      kind === 'blank'
        ? 'Reflection widget'
        : kind === 'choices'
          ? 'Choice tags'
          : 'Needs selector';
    const slug =
      (kind === 'blank' ? 'reflection' : kind === 'choices' ? 'choice-tags' : 'needs-selector') +
      '-' +
      id.slice(0, 8);
    const value: WidgetDraft = {
      id,
      workspaceId: w.id,
      revision: 0,
      name,
      description: '',
      updatedAt: new Date().toISOString(),
      package: widgetTemplate(kind, `${w.id}/${id}`, name, slug),
    };
    await open(value);
    creating = true;
  }
  async function save() {
    if (!draft) return;
    const workspace = await getLocalWorkspace();
    draft = await workspace.saveWidgetDraft(JSON.parse(JSON.stringify(draft)));
    await refresh();
    creating = false;
    savedSignature = JSON.stringify(draft);
    replaceState(resolve(`/my/widgets/edit?id=${encodeURIComponent(draft.id)}`), {});
    message = 'Widget draft saved.';
  }
  async function release() {
    if (!draft) return;
    await validatePackage(JSON.parse(JSON.stringify(draft.package)));
    await save();
    const row = await (await getLocalWorkspace()).saveWidgetRelease(draft!.id, draft!.revision);
    enabled = true;
    await refresh();
    message = `Private version ${row.package.manifest.version} saved. Existing practices keep their pinned version.`;
  }
  async function duplicate(row: WidgetRelease) {
    const workspace = await getLocalWorkspace(),
      w = await workspace.getWorkspace(),
      id = crypto.randomUUID();
    const pkg = JSON.parse(JSON.stringify(row.package));
    pkg.identity = `${w.id}/${id}`;
    pkg.manifest.publisher = 'personal';
    pkg.manifest.name = pkg.manifest.name.slice(0, 60) + '-copy-' + id.slice(0, 6);
    pkg.manifest.version = '0.1.0';
    const copy = await workspace.saveWidgetDraft({
      id,
      revision: 0,
      name: row.name + ' copy',
      description: row.description,
      package: pkg,
    });
    savedSignature = JSON.stringify(draft);
    await goto(resolve(`/my/widgets/edit?id=${encodeURIComponent(copy.id)}`));
  }
  function download(row: WidgetRelease) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(row.package, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.package.manifest.name}-${row.package.manifest.version}.widget.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function runPreview() {
    if (!draft) return;
    await validatePackage(JSON.parse(JSON.stringify(draft.package)));
    preview = await prepareWidget(
      JSON.parse(JSON.stringify(draft.package)),
      exportName(),
      JSON.parse(fixture),
      prompt,
    );
    previewDraft = null;
    confirmed = undefined;
  }
  function setField(section: 'inputs' | 'outputs', key: string, property: string, value: string) {
    if (!draft || !definition) return;
    const next = JSON.parse(JSON.stringify(definition));
    if (!next[section]?.[key]) return;
    if (value === '') delete next[section][key][property];
    else next[section][key][property] = property === 'default' ? JSON.parse(value) : value;
    draft.package.files[fileForDefinition()] = JSON.stringify(next, null, 2);
  }
  function addField(section: 'inputs' | 'outputs') {
    if (!draft || !definition) return;
    const next = JSON.parse(JSON.stringify(definition));
    next[section] ??= {};
    let key = 'field',
      n = 1;
    while (next[section][key]) key = `field_${n++}`;
    next[section][key] = { type: 'text' };
    draft.package.files[fileForDefinition()] = JSON.stringify(next, null, 2);
  }
  function focusFileName(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
  async function focusFile() {
    await tick();
    const target = Array.from(
      fileList?.querySelectorAll<HTMLButtonElement>('[data-file]') ?? [],
    ).find((button) => button.dataset.file === file);
    (target ?? fileList?.querySelector<HTMLButtonElement>('[aria-label="Add file"]'))?.focus();
  }
  function deleteAsset(path: string) {
    if (!draft || inspected || busy || !Object.hasOwn(draft.package.files, path)) return;
    const paths = Object.keys(draft.package.files),
      index = paths.indexOf(path);
    removedFile = { path, source: draft.package.files[path], wasActive: file === path, index };
    // Replace the dictionary so deleted entries cannot linger in reactive descriptors.
    draft.package.files = Object.fromEntries(
      Object.entries(draft.package.files).filter(([name]) => name !== path),
    );
    if (file === path) {
      const remaining = Object.keys(draft.package.files);
      file = remaining[Math.min(index, remaining.length - 1)] ?? '';
    }
    if (renamingFile === path) renamingFile = null;
    message = '';
    void focusFile();
  }
  function undoDelete() {
    if (!draft || !removedFile || inspected) return;
    const removed = removedFile;
    if (Object.hasOwn(draft.package.files, removed.path))
      throw Error(
        'A file with that name already exists. Rename it before restoring the deleted file.',
      );
    const entries = Object.entries(draft.package.files);
    entries.splice(Math.min(removed.index, entries.length), 0, [removed.path, removed.source]);
    draft.package.files = Object.fromEntries(entries);
    if (removed.wasActive || !file) file = removed.path;
    removedFile = null;
    void focusFile();
  }

  function addAsset() {
    if (!draft) return;
    if (
      !/^[\w./-]+$/.test(newFile) ||
      newFile.split('/').some((p) => !p || p === '.' || p === '..') ||
      Object.hasOwn(draft.package.files, newFile)
    )
      throw Error('Choose a new relative file name.');
    draft.package.files[newFile] = '';
    file = newFile;
    newFile = '';
    addingFile = false;
    void focusFile();
  }
  function renameAsset() {
    if (
      !draft ||
      !renamingFile ||
      !renamedFile ||
      !Object.hasOwn(draft.package.files, renamingFile)
    )
      return;
    if (renamedFile === renamingFile) {
      renamingFile = null;
      void focusFile();
      return;
    }
    if (
      !/^[\w./-]+$/.test(renamedFile) ||
      renamedFile.split('/').some((p) => !p || p === '.' || p === '..') ||
      Object.hasOwn(draft.package.files, renamedFile)
    )
      throw Error('Choose a new relative file name.');
    draft.package.files = Object.fromEntries(
      Object.entries(draft.package.files).map(([name, source]) => [
        name === renamingFile ? renamedFile : name,
        source,
      ]),
    );
    for (const entry of Object.values(draft.package.manifest.exports)) {
      if (entry.path === renamingFile) entry.path = renamedFile;
    }
    if (file === renamingFile) file = renamedFile;
    renamedFile = '';
    renamingFile = null;
    void focusFile();
    message = 'File renamed. Update references in your code and contract before releasing.';
  }
</script>

<svelte:head
  ><title
    >{inspected ? 'Inspect widget' : creating ? 'Create widget' : (draft?.name ?? 'Widget editor')} —
    Patternverse</title
  ></svelte:head
>
<section class="widget-settings widget-editor" aria-labelledby="widget-settings-title">
  <a
    class="back-link"
    href={resolve(inspected ? '/my?pane=widgets&tab=installed' : '/my?pane=widgets')}>← Widgets</a
  >
  <div class="heading">
    <div>
      <p class="eyebrow">
        {inspected ? 'Released widget' : creating ? 'Build a widget' : 'Widget editor'}
      </p>
      <h1 id="widget-settings-title">
        {inspected ? draft?.name : creating ? 'Create widget' : (draft?.name ?? 'Opening widget…')}
      </h1>
      <p>
        {inspected
          ? `Private version ${inspected.package.manifest.version} · Read-only`
          : 'Write, preview, and release a reusable interface for your practices.'}
      </p>
    </div>
    {#if inspected}<button
        type="button"
        disabled={busy}
        onclick={() => void action(() => duplicate(inspected!))}>Duplicate to edit</button
      >{/if}
  </div>
  {#if error}<p role="alert">{error}</p>{/if}{#if message}<p role="status">{message}</p>{/if}
  {#if creating}<div class="template-picker">
      <h2>Start with a template</h2>
      <div class="templates">
        {#each [['needs', 'Needs selector'], ['choices', 'Choice tags'], ['blank', 'Blank reflection widget']] as [kind, name] (kind)}<button
            type="button"
            disabled={busy}
            onclick={() => void action(() => create(kind as 'needs' | 'blank' | 'choices'))}
            >{name}</button
          >{/each}
      </div>
    </div>{/if}
  {#if draft}
    <nav class="tabs" aria-label="Widget editor">
      {#each [['overview', 'Overview'], ['code', 'Code'], ['contract', 'Inputs & outputs'], ['preview', 'Preview'], ['versions', 'Versions']] as [key, label] (key)}<button
          type="button"
          aria-pressed={tab === key}
          onclick={() => {
            tab = key;
            if (key === 'code') file = fileForDefinition();
          }}>{label}</button
        >{/each}
    </nav>
    {#if tab === 'overview'}
      <label
        >Widget name<input
          readonly={Boolean(inspected)}
          maxlength="120"
          bind:value={draft.name}
        /></label
      ><label
        >Purpose<textarea
          readonly={Boolean(inspected)}
          maxlength="2000"
          bind:value={draft.description}></textarea></label
      >
      <div class="columns">
        <label
          >Package name<input
            readonly={Boolean(inspected)}
            bind:value={draft.package.manifest.name}
            disabled={releases.some((r) => r.widgetId === draft!.id)}
          /></label
        ><label
          >Version<input
            readonly={Boolean(inspected)}
            bind:value={draft.package.manifest.version}
            placeholder="0.1.0"
          /></label
        >
      </div>
      <label class="toggle"
        ><input
          type="checkbox"
          bind:checked={enabled}
          onchange={() =>
            void action(async () => {
              await (await getLocalWorkspace()).setWidgetEnabled(draft!.package.identity, enabled);
            })}
        />Enabled for practice rendering</label
      >
      <p class="reference">{widgetReference(draft.package)}</p>
      <p>
        {usage.length
          ? `Referenced by: ${usage.join(', ')}`
          : 'No current practices reference this widget.'}
        {historyCount} saved runs reference its identity.
      </p>
      {#if !inspected}
        <button
          type="button"
          disabled={busy}
          onclick={() =>
            void action(async () => {
              await (await getLocalWorkspace()).removeWidget(draft!.id);
              savedSignature = JSON.stringify(draft);
              draft = null;
              preview = null;
              await refresh();
              await goto(resolve('/my?pane=widgets'));
            })}>Remove widget</button
        >
      {/if}
    {:else if tab === 'code'}
      {#if removedFile}<div class="file-notice" role="status">
          <span>Deleted {removedFile.path}.</span><button
            type="button"
            class="undo-file"
            disabled={busy}
            onclick={() => void action(async () => undoDelete())}>Undo</button
          >
        </div>{/if}
      <div class="code-layout">
        <div class="file-panel" bind:this={fileList}>
          <div class="files-heading">
            <span>Files</span>{#if !inspected}<button
                type="button"
                class="icon-button"
                aria-label="Add file"
                title="Add file"
                disabled={busy}
                onclick={() => {
                  addingFile = !addingFile;
                  renamingFile = null;
                  newFile = '';
                }}><Plus size={15} aria-hidden="true" /></button
              >{/if}
          </div>
          {#if addingFile}<form
              class="file-name-form"
              onsubmit={(event) => {
                event.preventDefault();
                void action(async () => addAsset());
              }}
            >
              <label
                >New file name<input
                  use:focusFileName
                  bind:value={newFile}
                  placeholder="helpers.js"
                  required
                  onkeydown={(event) => {
                    if (event.key === 'Escape') {
                      addingFile = false;
                      void focusFile();
                    }
                  }}
                /></label
              >
              <div class="file-name-actions">
                <button
                  type="submit"
                  class="icon-button"
                  aria-label="Create file"
                  title="Create file"><Check size={14} aria-hidden="true" /></button
                ><button
                  type="button"
                  class="icon-button"
                  aria-label="Cancel new file"
                  title="Cancel"
                  onclick={() => {
                    addingFile = false;
                    void focusFile();
                  }}><X size={14} aria-hidden="true" /></button
                >
              </div>
            </form>{/if}
          <nav aria-label="Widget files">
            {#each Object.keys(draft.package.files) as path (path)}
              {#if renamingFile === path}<form
                  class="file-name-form"
                  onsubmit={(event) => {
                    event.preventDefault();
                    void action(async () => renameAsset());
                  }}
                >
                  <label
                    >Rename file<input
                      use:focusFileName
                      bind:value={renamedFile}
                      required
                      onkeydown={(event) => {
                        if (event.key === 'Escape') {
                          renamingFile = null;
                          void focusFile();
                        }
                      }}
                    /></label
                  >
                  <div class="file-name-actions">
                    <button
                      type="submit"
                      class="icon-button"
                      aria-label="Save file name"
                      title="Save file name"><Check size={14} aria-hidden="true" /></button
                    ><button
                      type="button"
                      class="icon-button"
                      aria-label="Cancel rename"
                      title="Cancel"
                      onclick={() => {
                        renamingFile = null;
                        void focusFile();
                      }}><X size={14} aria-hidden="true" /></button
                    >
                  </div>
                </form>
              {:else}<div class="file-row" class:selected={file === path}>
                  <button
                    type="button"
                    class="file-select"
                    data-file={path}
                    title={path}
                    aria-pressed={file === path}
                    onclick={() => {
                      file = path;
                      renamingFile = null;
                    }}>{path}</button
                  >{#if !inspected}<div class="file-actions">
                      <button
                        type="button"
                        class="icon-button rename-file"
                        aria-label={`Rename ${path}`}
                        title="Rename file"
                        disabled={busy}
                        onclick={() => {
                          renamingFile = path;
                          renamedFile = path;
                          addingFile = false;
                        }}><Pencil size={13} aria-hidden="true" /></button
                      ><button
                        type="button"
                        class="icon-button delete-file"
                        aria-label={`Delete ${path}`}
                        title="Delete file"
                        disabled={busy}
                        onclick={() => deleteAsset(path)}
                        ><Trash2 size={13} aria-hidden="true" /></button
                      >
                    </div>{/if}
                </div>{/if}
            {/each}
          </nav>
        </div>
        {#if file && Object.hasOwn(draft.package.files, file)}{#key file}<WidgetCodeEditor
              filename={file}
              source={draft.package.files[file]}
              readonly={Boolean(inspected)}
              onchange={(source) => {
                if (draft && !inspected) draft.package.files[file] = source;
              }}
            />{/key}{:else}<div class="no-code">
            <p>No files yet. Use the + button to add a file.</p>
          </div>{/if}
      </div>
    {:else if tab === 'contract'}
      {#if definition}{#each ['inputs', 'outputs'] as section (section)}<h4>
            {section === 'inputs' ? 'Inputs' : 'Outputs'}
          </h4>
          {#each Object.entries(definition[section as 'inputs' | 'outputs'] || {}) as [name, field] (name)}<div
              class="field-row"
            >
              <code>{name}</code><label
                >Type<input
                  readonly={Boolean(inspected)}
                  value={String(field.type || 'text')}
                  onchange={(event) =>
                    void action(async () =>
                      setField(
                        section as 'inputs' | 'outputs',
                        name,
                        'type',
                        event.currentTarget.value,
                      ),
                    )}
                /></label
              >{#if section === 'inputs'}<label
                  >Default (JSON)<input
                    readonly={Boolean(inspected)}
                    value={field.default === undefined ? '' : JSON.stringify(field.default)}
                    placeholder="No default"
                    onchange={(event) => {
                      const value = event.currentTarget.value;
                      void action(async () => setField('inputs', name, 'default', value));
                    }}
                  /></label
                >{/if}
            </div>{/each}<button
            type="button"
            disabled={Boolean(inspected)}
            onclick={() => addField(section as 'inputs' | 'outputs')}
            >Add {section === 'inputs' ? 'input' : 'output'}</button
          >{/each}
        <p>
          Bounds, enums, catalogue membership, data defaults, and fallback are editable in the same
          contract JSON.
        </p>{:else}<p>Repair the contract JSON in Code before editing fields.</p>{/if}
      <button
        type="button"
        onclick={() => {
          file = fileForDefinition();
          tab = 'code';
        }}>{inspected ? 'View contract JSON' : 'Edit contract JSON'}</button
      >
    {:else if tab === 'preview'}
      {#if inspected && !enabled}<p role="status">
          Enable this widget in Overview before running its code.
        </p>{/if}
      <label>Example prompt<input bind:value={prompt} /></label><WidgetCodeEditor
        filename="fixture.json"
        label="Fixture inputs (JSON)"
        title="Fixture inputs (JSON)"
        source={fixture}
        compact
        onchange={(value) => (fixture = value)}
      />
      <div class="actions">
        <button
          type="button"
          disabled={busy || Boolean(inspected && !enabled)}
          onclick={() => void action(runPreview)}
          >{preview ? 'Restart preview' : 'Run preview'}</button
        ><button type="button" disabled={!preview} onclick={() => (preview = null)}
          >Stop preview</button
        ><label
          >Width<select bind:value={previewWidth}
            ><option value="wide">Wide</option><option value="narrow">Narrow</option></select
          ></label
        >
      </div>
      <p>
        Code and fixture edits take effect after restarting the preview. Example confirmation does
        not save a real practice answer.
      </p>
      {#if preview}<div class:narrow={previewWidth === 'narrow'} class="preview">
          {#key preview}<WidgetStep
              interaction={preview}
              preview
              onchange={(value) => (previewDraft = value)}
              onconfirm={(value) => {
                confirmed = value;
              }}
            />{/key}
        </div>
        <pre>{JSON.stringify(previewDraft, null, 2)}</pre>
        {#if confirmed !== undefined}<p role="status">Example answer confirmed.</p>{/if}{/if}
    {:else if tab === 'versions'}
      {#each releases.filter((r) => r.package.identity === draft!.package.identity) as release (release.id)}<div
          class="release"
        >
          <div>
            <strong>{release.package.manifest.version}</strong>
            <p>{release.reference}</p>
            <code>:import "{release.reference}" as widget_ui</code>
          </div>
          <button type="button" onclick={() => download(release)}>Export package</button>
        </div>{/each}
      <p>
        New versions are chosen explicitly in a practice. Active and saved runs keep their original
        version.
      </p>
    {/if}
    {#if !inspected}<footer>
        <span class="save-state"
          >{creating
            ? 'New widget · not saved'
            : dirty
              ? 'Unsaved changes'
              : 'Draft saved on this device'}</span
        ><button type="button" disabled={busy} onclick={() => void action(save)}>Save draft</button
        ><button type="button" class="primary" disabled={busy} onclick={() => void action(release)}
          >Save private version</button
        >
      </footer>{/if}
  {:else if !ready && !error}<p>Opening your widget…</p>{/if}
</section>

<style>
  .widget-settings {
    --widget-border: var(--ink);
    --widget-divider: #e2e4df;
    --widget-surface: #f5f5f2;
    max-width: 1200px;
    margin: 0 auto;
    padding: clamp(24px, 4vw, 56px) 4vw 56px;
    min-width: 0;
  }
  .heading,
  .release {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }
  .back-link {
    display: inline-block;
    margin-bottom: 28px;
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;
    font-weight: var(--weight-control);
  }
  .back-link:hover {
    color: var(--green-dark);
  }
  .eyebrow {
    font-size: var(--text-xs);
    font-weight: var(--weight-eyebrow);
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }
  .template-picker {
    background: var(--widget-surface);
    border: 1px solid var(--widget-divider);
    padding: 20px;
    margin: 24px 0;
  }
  .template-picker h2 {
    font-size: 14px;
    margin: 0 0 12px;
  }
  .save-state {
    margin-right: auto;
    font-size: 12px;
    color: var(--muted);
  }
  .heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .heading > div {
    min-width: 0;
    max-width: 100%;
  }
  h1 {
    overflow-wrap: anywhere;
    font-size: clamp(26px, 4vw, 36px);
    letter-spacing: -0.04em;
    text-transform: lowercase;
    margin: 0;
  }
  h4 {
    margin: 18px 0 12px;
    font-size: 16px;
  }
  p {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .actions,
  .templates,
  .tabs,
  footer {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tabs {
    margin: 24px 0;
    border-bottom: 1px solid var(--widget-border);
    padding-bottom: 16px;
  }
  button,
  input,
  textarea,
  select {
    font: inherit;
    font-size: 0.85rem;
  }
  button {
    border: 1px solid var(--widget-border);
    border-radius: var(--radius-control);
    background: var(--paper);
    color: var(--ink);
    min-height: var(--control-min-height);
    font-size: var(--text-control);
    font-weight: var(--weight-control);
    text-transform: lowercase;
    padding: 0.7rem 1rem;
    cursor: pointer;
  }
  button:where(:hover):not(:disabled) {
    background: var(--mint);
  }
  button.primary {
    background: var(--ink);
    color: var(--paper);
  }
  button.primary:hover:not(:disabled) {
    background: var(--green);
    color: var(--ink);
  }
  button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  label {
    display: grid;
    gap: 7px;
    margin: 12px 0;
    font-size: 0.82rem;
    font-weight: var(--weight-label);
  }
  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid var(--widget-border);
    background: var(--paper);
    color: var(--ink);
    border-radius: var(--radius-control);
    padding: 0.75rem 0.9rem;
    min-width: 0;
  }
  input:not([type='checkbox']),
  select {
    min-height: 44px;
  }
  textarea:not(.code) {
    min-height: 95px;
  }
  input[readonly],
  textarea[readonly],
  input:disabled {
    background: var(--widget-surface);
    color: var(--muted);
  }
  input[type='checkbox'] {
    box-shadow: none;
    min-height: 0;
    accent-color: var(--green-dark);
  }
  .toggle {
    display: flex;
    align-items: center;
  }
  .toggle input {
    width: 16px;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    align-items: center;
  }
  .code-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }
  .code-layout nav {
    align-items: stretch;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .file-panel {
    min-width: 0;
    border: 1px solid var(--widget-border);
    border-radius: var(--radius-control);
    background: var(--paper);
    padding: 8px;
  }
  .files-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 35px;
    padding: 0 0 7px 8px;
    color: var(--muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-label);
  }
  .file-row {
    width: 100%;
    display: flex;
    align-items: center;
    min-width: 0;
    border-radius: var(--radius-control);
  }
  .file-row.selected {
    background: var(--mint);
  }
  .file-row .file-select {
    display: block;
    justify-content: flex-start;
    flex: 1;
    min-width: 0;
    text-align: left;
    font-family: ui-monospace, monospace;
    font-size: 11px;
    padding: 10px 8px;
    border: 0;
    background: transparent;
    color: var(--ink);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    border-radius: var(--radius-control);
    min-height: 40px;
    text-transform: none;
  }
  .file-row .file-select:hover {
    background: var(--widget-surface);
  }
  .file-row.selected .file-select:hover {
    background: transparent;
  }
  .file-row.selected .file-select {
    color: var(--green-dark);
    font-weight: 650;
  }
  .icon-button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
    min-height: 30px;
  }
  .icon-button:hover,
  .icon-button:focus-visible {
    background: var(--mint);
    color: var(--ink);
  }
  .file-actions {
    display: flex;
    gap: 0;
    flex-shrink: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s;
  }
  .file-row:hover .file-actions,
  .file-row:focus-within .file-actions {
    opacity: 1;
    pointer-events: auto;
  }
  .delete-file:hover,
  .delete-file:focus-visible {
    color: #a62b1f;
    background: #f9e9e4;
  }
  .file-notice {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 9px 12px;
    margin: 0 0 12px;
    background: var(--widget-surface);
    border: 1px solid var(--widget-divider);
    border-radius: var(--radius-control);
    font-size: 12px;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .undo-file {
    border: 0;
    background: transparent;
    text-decoration: underline;
    padding: 4px;
    font-size: 12px;
  }
  .no-code {
    padding: 32px;
    border: 1px dashed var(--widget-border);
    border-radius: var(--radius-control);
    min-width: 0;
  }
  .file-name-form {
    background: var(--widget-surface);
    border: 1px solid var(--widget-divider);
    border-radius: var(--radius-control);
    padding: 8px;
    margin: 4px 0 8px;
  }
  .file-name-form label {
    margin: 0;
    font-size: 10px;
    gap: 5px;
  }
  .file-name-form input {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    padding: 8px;
    min-height: 36px;
  }
  .file-name-actions {
    display: flex;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 6px;
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    align-items: center;
    border-bottom: 1px solid var(--widget-border);
  }
  footer {
    flex-direction: row;
    min-height: 0;
    border-bottom: 0;
    border-top: 1px solid var(--widget-border);
    margin-top: 20px;
    padding: 16px 0 0;
    justify-content: flex-end;
  }
  .release {
    border-bottom: 1px solid var(--widget-border);
    padding: 15px 0;
    flex-wrap: wrap;
  }
  .reference,
  pre,
  code {
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  pre {
    padding: 12px;
    background: var(--widget-surface);
    border-radius: var(--radius-control);
  }
  [role='alert'] {
    color: #a03226;
  }
  .preview {
    margin-top: 18px;
    border: 1px solid var(--widget-border);
    padding: 12px;
    max-width: 100%;
  }
  .preview.narrow {
    width: 360px;
    max-width: 100%;
  }
  @media (max-width: 600px) {
    .code-layout,
    .columns,
    .field-row {
      grid-template-columns: 1fr;
    }
    .code-layout nav {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 4px;
    }
    .icon-button {
      width: 36px;
      height: 36px;
    }
    input,
    textarea,
    select {
      font-size: 16px;
    }
  }
  @media (hover: none) {
    .file-actions {
      opacity: 1;
      pointer-events: auto;
    }
  }
</style>
