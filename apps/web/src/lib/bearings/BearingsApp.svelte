<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { beforeNavigate, goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import {
    Plus,
    PanelLeft,
    ArrowUpRight,
    Download,
    X,
    Network,
    List,
    Ellipsis,
    Check,
    CircleAlert,
    LoaderCircle,
    Settings,
    GitFork,
    AlignLeft,
    FileText,
    Keyboard,
    BookPlus,
    Pin,
  } from '@lucide/svelte';
  import type {
    BearingsNotebook as Notebook,
    LocalWorkspace,
    Situation,
    SituationPriority,
    BearingsCell,
  } from '@patternverse/workspace';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import type { CompiledEntity } from '@patternverse/compiler';
  import { personalBearingsCatalog, mergeBearingsCatalog, type BearingsPattern } from './catalog';
  import { createBearingsSession, initialBearingsSession } from './session';
  import BearingsNotebook from './BearingsNotebook.svelte';
  import BearingsLibrary from './BearingsLibrary.svelte';
  import BearingsMap from './BearingsMap.svelte';
  import BearingsPriority from './BearingsPriority.svelte';
  import BearingsReader from './BearingsReader.svelte';
  import BearingsSettings from './BearingsSettings.svelte';
  import BearingsAiSettings from './BearingsAiSettings.svelte';
  import { provideBearingsAi } from './ai.svelte';
  import type { VimStatus } from './vim';
  import { richEditor } from './rich-text';
  import {
    defaultCursorSettings,
    cursorSettingsKey,
    parseCursorSettings,
    type CursorSettings,
  } from './cursor-settings';
  import BearingsPatternPicker from './BearingsPatternPicker.svelte';
  import { libraryPatternCell } from './library';
  import type { BearingsReadingPattern } from './article';
  let {
    patterns: publicPatterns,
    references,
  }: { patterns: readonly BearingsPattern[]; references: readonly CompiledEntity[] } = $props();
  let workspace = $state.raw<LocalWorkspace>(undefined!);
  const ai = provideBearingsAi();
  ai.showLibrary = () => (library = true);
  let situations = $state<readonly Situation[]>([]),
    patterns = $state<readonly BearingsPattern[]>([]);
  let viewState = $state(initialBearingsSession()),
    loading = $state(true),
    error = $state('');
  let newTitle = $state(''),
    creating = $state(false),
    createOpen = $state(false),
    search = $state('');
  let library = $state(true),
    toolbarMenu = $state(false),
    busy = $state(false),
    deleteTarget = $state<Situation | null>(null);
  let listMenu = $state<{ situation: Situation; x: number; y: number } | null>(null);
  let sort = $state<'default' | 'priority'>('default');
  let renameTarget = $state.raw<Situation | null>(null),
    renameTitle = $state(''),
    renameError = $state('');
  let renameDialog = $state<HTMLDialogElement>(),
    renameInput = $state<HTMLInputElement>();
  let notebook = $state<BearingsNotebook>();
  let vimStatus = $state<VimStatus>({ mode: 'normal', pending: '' });
  let follow = $state(true);
  let chapterForm = $state(false);
  let libraryPanel = $state<BearingsLibrary>();
  let patternPicker = $state<BearingsPatternPicker>();
  let pickerPatterns = $state.raw<readonly BearingsPattern[]>([]);
  let pickerScope = $state('All patterns');
  async function openPatternPicker(trigger: HTMLElement | null) {
    const scope = libraryPanel?.patternScope();
    pickerPatterns = scope?.patterns ?? patterns;
    pickerScope = scope?.label ?? 'All patterns';
    toolbarMenu = false;
    await tick();
    await patternPicker?.open(trigger, scope?.query ?? '');
  }
  function patternShortcut(event: KeyboardEvent) {
    if (
      event.key !== '@' ||
      event.repeat ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !viewState.selected
    )
      return;
    if (ai.settingsOpen) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const editor = target.closest<HTMLElement>('.notebook .cell-text');
    const normal = !!editor && vim && editor.dataset.vimMode === 'normal';
    if (event.defaultPrevented && !normal) return;
    const modal = document.querySelector('dialog[open]');
    if ((modal && modal !== editor?.closest('.focus-editor')) || (readingPattern && !readingSplit))
      return;
    if (editor && !normal) {
      const instance = richEditor(editor);
      if (!instance) return;
      const { selection } = instance.state;
      if (selection.$from.parent.type.spec.code || instance.isActive('code')) return;
      const before = selection.$from.parent.textBetween(0, selection.$from.parentOffset);
      if (!selection.empty || (before && !/\s$/.test(before))) return;
    } else if (
      !editor &&
      target.closest('input, textarea, select, [contenteditable], [role="textbox"]')
    )
      return;
    event.preventDefault();
    void openPatternPicker(target);
  }
  let settings = $state<BearingsSettings>();
  let vim = $state(false);
  let cursor = $state<CursorSettings>({ ...defaultCursorSettings });
  function setCursor(value: CursorSettings) {
    cursor = value;
    try {
      localStorage.setItem(cursorSettingsKey, JSON.stringify(value));
    } catch {
      /* Settings still apply for this visit. */
    }
  }
  function setVim(enabled: boolean) {
    vim = enabled;
    try {
      localStorage.setItem('bearings-vim-mode', String(enabled));
    } catch {
      /* Keep the preference for this visit when storage is unavailable. */
    }
  }
  let toolbarTrigger = $state<HTMLButtonElement>(),
    libraryTrigger = $state<HTMLButtonElement>();
  let readingPattern = $state.raw<BearingsReadingPattern | null>(null),
    readingSplit = $state(false),
    workbench = $state<HTMLDivElement>();
  let readingTrigger: HTMLElement | null = null;
  let map = $state<BearingsMap>();
  let overview = $state<'list' | 'map'>('list'),
    mapSelectedId = $state(''),
    mapBusy = $state(false);
  let session: ReturnType<typeof createBearingsSession> | undefined;
  let allowNavigation = false;
  $effect(() => {
    const element = workbench,
      hasLibrary = library;
    if (!element) return;
    const measure = () => {
      const available = element.clientWidth - (hasLibrary && element.clientWidth > 700 ? 290 : 0);
      readingSplit = available >= 920;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  });
  function toggleLibrary() {
    if (library && document.activeElement?.closest('.library-panel')) {
      libraryTrigger?.focus({ preventScroll: true });
    }
    library = !library;
    toolbarMenu = false;
  }
  function sidebarShortcut(event: KeyboardEvent) {
    const normalEditor =
      vim &&
      event.target instanceof HTMLElement &&
      !!event.target.closest('.notebook .cell-text[data-vim-mode="normal"]');
    if (
      event.key !== '/' ||
      event.repeat ||
      event.isComposing ||
      // Vim reserves slash in Normal mode and lets this handler toggle the library.
      (event.defaultPrevented && !normalEditor) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !viewState.selected ||
      document.querySelector('dialog[open]') ||
      ai.settingsOpen ||
      (readingPattern && !readingSplit)
    )
      return;
    const typing = event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]')),
      );
    if (typing && !normalEditor) return;
    event.preventDefault();
    toggleLibrary();
  }
  function readPattern(pattern: NonNullable<BearingsCell['pattern']>, trigger: HTMLButtonElement) {
    readingTrigger = trigger;
    readingPattern = {
      sourceId: pattern.sourceId,
      id: pattern.entityId,
      title: pattern.title,
      summary: pattern.summary,
    };
  }
  async function closeReader() {
    readingPattern = null;
    await tick();
    if (readingTrigger?.isConnected) readingTrigger.focus({ preventScroll: true });
    readingTrigger = null;
  }
  const saveLabel = $derived(
    viewState.error
      ? 'Not saved'
      : viewState.saving
        ? 'Saving…'
        : viewState.dirty
          ? 'Unsaved changes'
          : 'Saved on this device',
  );
  const filtered = $derived(
    situations
      .filter((s) => `${s.title} ${s.context}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) =>
        sort === 'priority'
          ? (b.priority ?? 0) - (a.priority ?? 0) ||
            b.updatedAt.localeCompare(a.updatedAt) ||
            a.position - b.position ||
            a.id.localeCompare(b.id)
          : a.position - b.position || a.id.localeCompare(b.id),
      ),
  );
  async function refresh() {
    const [records, personal] = await Promise.all([
      workspace.listSituations(),
      workspace.listEntities(),
    ]);
    situations = records;
    patterns = mergeBearingsCatalog(publicPatterns, personalBearingsCatalog(personal, references));
  }
  onMount(() => {
    ai.init();
    const aiStorage = (event: StorageEvent) => ai.loadExternal(event.key);
    window.addEventListener('storage', aiStorage);
    let disposed = false;
    try {
      if (localStorage.getItem('bearings-situation-view') === 'map') overview = 'map';
      if (localStorage.getItem('bearings-situation-sort') === 'priority') sort = 'priority';
      vim = localStorage.getItem('bearings-vim-mode') === 'true';
      cursor = parseCursorSettings(localStorage.getItem(cursorSettingsKey));
    } catch {
      /* View preferences are optional. */
    }
    void getLocalWorkspace()
      .then(async (value) => {
        workspace = value;
        session = createBearingsSession({
          save: workspace.updateSituation,
          changed: (next) => (viewState = next),
          saved: (saved) => {
            situations = situations.map((s) => (s.id === saved.id ? saved : s));
          },
        });
        await refresh();
        const requested = page.url.searchParams.get('situation');
        if (!disposed && requested) {
          const situation = situations.find((s) => s.id === requested);
          if (situation) session.open(situation);
          else error = 'This situation is not available in this workspace on this device.';
        }
        if (!disposed) loading = false;
      })
      .catch((cause) => {
        if (!disposed) {
          error = cause instanceof Error ? cause.message : 'Local storage could not be opened.';
          loading = false;
        }
      });
    const unsubscribe = subscribeWorkspaceChanges(['situations', 'entities'], () => {
      if (workspace && !viewState.selected)
        void refresh().catch((cause) => (error = String(cause)));
    });
    const focus = () => {
      if (workspace && !viewState.selected)
        void refresh().catch((cause) => (error = String(cause)));
    };
    window.addEventListener('focus', focus);
    if (window.matchMedia('(max-width: 700px)').matches) library = false;
    return () => {
      disposed = true;
      ai.dispose();
      window.removeEventListener('storage', aiStorage);
      unsubscribe();
      window.removeEventListener('focus', focus);
      void session?.dispose();
    };
  });
  beforeNavigate((navigation) => {
    if (allowNavigation || !viewState.selected) return;
    notebook?.capturePosition();
    if (!viewState.dirty) return;
    if (navigation.willUnload) {
      navigation.cancel();
      return;
    }
    navigation.cancel();
    void session?.flush().then((saved) => {
      if (saved && navigation.to && !allowNavigation) {
        allowNavigation = true;
        if (navigation.type === 'popstate') {
          window.history.go(navigation.delta);
          return;
        }
        // SvelteKit already resolved this destination, including any deployment base.
        // eslint-disable-next-line svelte/no-navigation-without-resolve
        void goto(navigation.to.url);
      }
    });
  });
  async function open(situation: Situation) {
    if (busy || !session) return;
    if (map && !(await map.prepareLeave())) return;
    busy = true;
    error = '';
    try {
      const latest = (await workspace.listSituations()).find((s) => s.id === situation.id);
      if (!latest) throw new Error('This situation was removed in another window.');
      mapSelectedId = latest.id;
      if (session.open(latest)) {
        const url = new URL(page.url);
        url.searchParams.set('situation', latest.id);
        // eslint-disable-next-line svelte/no-navigation-without-resolve -- The current URL already includes the deployment base.
        replaceState(url, page.state);
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The notebook could not be opened.';
    } finally {
      busy = false;
    }
  }
  async function create() {
    if (!newTitle.trim() || creating) return;
    if (map && !(await map.prepareLeave())) return;
    creating = true;
    error = '';
    try {
      const situation = await workspace.createSituation(newTitle.trim());
      situations = [...situations, situation];
      newTitle = '';
      createOpen = false;
      if (session?.open(situation)) {
        const url = new URL(page.url);
        url.searchParams.set('situation', situation.id);
        // eslint-disable-next-line svelte/no-navigation-without-resolve -- The current URL already includes the deployment base.
        replaceState(url, page.state);
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The situation could not be created.';
    } finally {
      creating = false;
    }
  }
  async function back() {
    if (busy) return;
    busy = true;
    notebook?.capturePosition();
    if (await session?.close()) {
      readingPattern = null;
      readingTrigger = null;
      const url = new URL(window.location.href);
      if (url.searchParams.has('situation')) {
        url.searchParams.delete('situation');
        // eslint-disable-next-line svelte/no-navigation-without-resolve -- The current URL already includes the deployment base.
        replaceState(url, page.state);
      }
      await refresh().catch((cause) => (error = String(cause)));
    }
    busy = false;
  }
  function download() {
    if (!viewState.selected || !viewState.document) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...viewState.selected,
            title: viewState.title,
            context: viewState.context,
            notebook: viewState.document,
            ...(viewState.priority === null
              ? { priority: undefined }
              : { priority: viewState.priority }),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `bearings-${viewState.selected.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function removeSituation() {
    if (!deleteTarget || busy) return;
    busy = true;
    try {
      await workspace.deleteSituation(deleteTarget.id, deleteTarget.revision);
      deleteTarget = null;
      await refresh();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'This situation could not be deleted.';
    } finally {
      busy = false;
    }
  }
  function setSort(value: 'default' | 'priority') {
    sort = value;
    try {
      localStorage.setItem('bearings-situation-sort', value);
    } catch {
      /* Optional preference. */
    }
  }
  function showListMenu(situation: Situation, x: number, y: number) {
    listMenu = {
      situation,
      x: Math.max(8, Math.min(x, window.innerWidth - 206)),
      y: Math.max(8, Math.min(y, window.innerHeight - 160)),
    };
  }
  async function startRename(situation: Situation) {
    listMenu = null;
    renameTarget = situation;
    renameTitle = situation.title;
    renameError = '';
    await tick();
    renameDialog?.showModal();
    renameInput?.focus();
    renameInput?.select();
  }
  async function saveName() {
    if (!renameTarget || !renameTitle.trim() || busy) return;
    busy = true;
    renameError = '';
    try {
      await workspace.updateSituation(
        renameTarget.id,
        { title: renameTitle.trim(), context: renameTarget.context },
        renameTarget.revision,
      );
      await refresh();
      renameDialog?.close();
    } catch (cause) {
      renameError = cause instanceof Error ? cause.message : 'The situation could not be renamed.';
    } finally {
      busy = false;
    }
  }
  async function setPriority(situation: Situation, priority: SituationPriority | null) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const saved = await workspace.updateSituation(
        situation.id,
        { title: situation.title, context: situation.context, priority },
        situation.revision,
      );
      situations = situations.map((s) => (s.id === saved.id ? saved : s));
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The priority could not be saved.';
      await refresh().catch(() => {});
    } finally {
      busy = false;
    }
  }
  function edit(document: Notebook) {
    session?.edit({ document });
  }
  async function setOverview(next: 'list' | 'map') {
    if (mapBusy || (map && !(await map.prepareLeave()))) return;
    overview = next;
    try {
      localStorage.setItem('bearings-situation-view', next);
    } catch {
      /* View preferences are optional. */
    }
  }
  async function showMap() {
    const id = viewState.selected?.id;
    if (!id) return;
    const previous = overview;
    mapSelectedId = id;
    search = '';
    overview = 'map';
    await back();
    if (viewState.selected) {
      overview = previous;
      return;
    }
    try {
      localStorage.setItem('bearings-situation-view', 'map');
    } catch {
      /* View preferences are optional. */
    }
  }
  function selectOnMap(id: string) {
    mapSelectedId = id;
    const situation = situations.find((s) => s.id === id);
    if (
      situation &&
      search.trim() &&
      !`${situation.title} ${situation.context}`.toLowerCase().includes(search.trim().toLowerCase())
    )
      search = '';
  }
</script>

<svelte:window
  onbeforeunload={(e) => {
    notebook?.capturePosition();
    if (viewState.dirty) {
      e.preventDefault();
    }
  }}
  onkeydown={(e) => {
    sidebarShortcut(e);
    patternShortcut(e);
    if (e.key === 'Escape') {
      if (toolbarMenu) {
        toolbarMenu = false;
        toolbarTrigger?.focus();
      }
      listMenu = null;
      deleteTarget = null;
    }
  }}
  onpointerdown={(e) => {
    if (!(e.target as HTMLElement).closest('.situation-menu')) listMenu = null;
    if (!(e.target as HTMLElement).closest('.toolbar-menu')) toolbarMenu = false;
  }}
/>
<main class="bearings" class:has-notebook={!!viewState.selected}>
  <header class="app-header" class:notebook-toolbar={!!viewState.selected}>
    <a
      class="brand"
      aria-label={viewState.selected ? 'Back to situations' : 'Bearings'}
      title={viewState.selected ? 'Back to situations' : 'Bearings'}
      href={resolve('/apps/bearings')}
      onclick={(e) => {
        if (viewState.selected) {
          e.preventDefault();
          void back();
        }
      }}
      ><img
        src={`${resolve('/apps/bearings/icon.png')}?v=green`}
        alt=""
        width="36"
        height="36"
      /><span>Bearings</span></a
    >
    {#if viewState.selected && viewState.document}
      <div class="notebook-heading">
        <button
          class="icon library-toggle"
          bind:this={libraryTrigger}
          aria-keyshortcuts="/"
          aria-controls="bearings-library-panel"
          aria-label={library ? 'Collapse library' : 'Open library'}
          title={library ? 'Collapse library (/)' : 'Open library (/)'}
          aria-expanded={library}
          onclick={toggleLibrary}><PanelLeft size={19} /></button
        >
        <div class="situation-title">
          <div class="title-field">
            <label class="sr-only" for="situation-title">Situation title</label><input
              id="situation-title"
              value={viewState.title}
              maxlength="180"
              oninput={(e) => session?.edit({ title: e.currentTarget.value })}
            />
          </div>
        </div>
      </div>
      <div class="notebook-tools" role="group" aria-label="Notebook controls">
        <div class="view-switch" role="group" aria-label="Note view">
          <button
            aria-label="Tree"
            title="Tree view"
            aria-pressed={viewState.document.view === 'tree'}
            onclick={() => notebook?.setView('tree')}
            ><GitFork size={15} aria-hidden="true" /></button
          >
          <button
            aria-label="Notebook"
            title="Notebook view"
            aria-pressed={!viewState.document.view || viewState.document.view === 'notebook'}
            onclick={() => notebook?.setView('notebook')}
            ><AlignLeft size={15} aria-hidden="true" /></button
          >
          <button
            aria-label="Document"
            title="Document view"
            aria-pressed={viewState.document.view === 'document'}
            onclick={() => notebook?.setView('document')}
            ><FileText size={15} aria-hidden="true" /></button
          >
        </div>
        {#if viewState.document.chapters.length > 1}<select
            class="header-chapter-select"
            aria-label="Jump to chapter"
            value={viewState.document.activeChapterId}
            onchange={(event) => notebook?.jump(event.currentTarget.value)}
            >{#each viewState.document.chapters as chapter (chapter.id)}<option value={chapter.id}
                >{chapter.title}</option
              >{/each}</select
          >{/if}
      </div>
      <div class="direct-map-actions">
        <button
          class="icon"
          aria-label="Show situation map"
          title="Show situation map"
          disabled={busy}
          onclick={() => showMap()}><Network size={18} /></button
        >
      </div>
      <div class="direct-notebook-actions">
        <button
          class="icon"
          aria-label="Start a new chapter"
          aria-expanded={chapterForm}
          title="Start a new chapter"
          onclick={() => notebook?.startNewChapter()}><BookPlus size={18} /></button
        >
        {#if viewState.document.view !== 'tree'}<button
            class="icon"
            class:active={follow}
            aria-label="Automatically follow new entries"
            title="Automatically follow new entries"
            aria-pressed={follow}
            onclick={() => (follow = !follow)}><Pin size={17} /></button
          >{/if}
      </div>
      <BearingsAiSettings />
      <span
        class="save-state compact-save"
        class:save-failed={!!viewState.error}
        role="status"
        title={saveLabel}
      >
        <span class="sr-only">{saveLabel}</span>
        {#if viewState.error}<CircleAlert
            size={15}
            aria-hidden="true"
          />{:else if viewState.saving}<LoaderCircle
            size={15}
            aria-hidden="true"
          />{:else if viewState.dirty}<span class="unsaved-dot" aria-hidden="true"
          ></span>{:else}<Check size={15} aria-hidden="true" />{/if}
      </span>
      <div class="toolbar-menu">
        <button
          class="icon"
          aria-label="Notebook actions"
          bind:this={toolbarTrigger}
          title="Notebook actions"
          aria-expanded={toolbarMenu}
          onclick={() => (toolbarMenu = !toolbarMenu)}><Ellipsis size={19} /></button
        >
        {#if toolbarMenu}<div class="toolbar-menu-panel">
            <p>{saveLabel}</p>
            {#if viewState.document.chapters.length > 1}<label
                class="mobile-editor-action chapter-menu-select"
                >Jump to chapter<select
                  aria-label="Jump to chapter"
                  value={viewState.document.activeChapterId}
                  onchange={(event) => {
                    void notebook?.jump(event.currentTarget.value);
                    toolbarMenu = false;
                  }}
                  >{#each viewState.document.chapters as chapter (chapter.id)}<option
                      value={chapter.id}>{chapter.title}</option
                    >{/each}</select
                ></label
              >{/if}
            <button
              onclick={() => {
                toolbarMenu = false;
                if (toolbarTrigger) notebook?.openShortcuts(toolbarTrigger);
              }}><Keyboard size={16} />Keyboard shortcuts</button
            >
            <button
              class="mobile-editor-action"
              aria-expanded={chapterForm}
              onclick={() => {
                toolbarMenu = false;
                notebook?.startNewChapter();
              }}><BookPlus size={16} />Start a new chapter</button
            >
            {#if viewState.document.view !== 'tree'}<button
                class="mobile-editor-action"
                aria-pressed={follow}
                onclick={() => (follow = !follow)}
                ><Pin size={16} />Automatically follow new entries{#if follow}<Check
                    size={14}
                  />{/if}</button
              >{/if}
            <button
              onclick={() => {
                toolbarMenu = false;
                if (toolbarTrigger) void settings?.open(toolbarTrigger);
              }}><Settings size={16} />Settings</button
            >
            <button
              class="mobile-map-action"
              disabled={busy}
              onclick={() => {
                toolbarMenu = false;
                void showMap();
              }}><Network size={16} />Show situation map</button
            >
            <button
              onclick={() => {
                toolbarMenu = false;
                download();
              }}><Download size={16} />Download notebook copy</button
            >
            <a href={resolve('/')}><ArrowUpRight size={16} />Patternverse</a>
          </div>{/if}
      </div>
    {:else}<div class="header-right">
        <BearingsAiSettings />
        <button
          class="icon"
          aria-label="Settings"
          title="Settings"
          onclick={(event) => settings?.open(event.currentTarget)}><Settings size={18} /></button
        >
        <a class="home-link" href={resolve('/')}>Patternverse<ArrowUpRight size={14} /></a>
      </div>{/if}
  </header>
  {#if error}<p class="app-error" role="alert">{error}</p>{/if}
  {#if loading}<div class="loading" role="status">Opening your situations…</div>
  {:else if viewState.selected && viewState.document}
    {#if viewState.error}<div class="save-error" role="alert">
        <p>{viewState.error} Your current work is still open.</p>
        <button onclick={() => session?.flush()}>Retry save</button><button onclick={download}
          >Download a copy</button
        >
      </div>{/if}
    <div
      class="workbench"
      class:library-open={library}
      class:reader-open={!!readingPattern && readingSplit}
      bind:this={workbench}
      onfocusin={(event) => {
        const target = event.target;
        if (readingPattern && target instanceof HTMLElement && target.closest('.notebook'))
          readingTrigger = target;
      }}
    >
      <div class="library-panel" id="bearings-library-panel" hidden={!library}>
        <BearingsLibrary
          bind:this={libraryPanel}
          {patterns}
          onadd={(cell) => notebook?.add(cell)}
          onread={readPattern}
          onclose={toggleLibrary}
          onuseprompt={(prompt) => {
            ai.notice = '';
            if (!ai.enabled) {
              ai.notice = 'AI is off. Enable it from the top bar to use this prompt.';
              return;
            }
            void notebook?.askAi(prompt.body);
            if (window.matchMedia('(max-width: 700px)').matches) library = false;
          }}
        />
      </div>
      {#key viewState.selected.id}<BearingsNotebook
          bind:this={notebook}
          document={viewState.document}
          {patterns}
          {vim}
          {cursor}
          bind:vimStatus
          bind:follow
          bind:chapterForm
          onchange={edit}
          onread={readPattern}
        />{/key}
      {#if readingPattern}<BearingsReader
          pattern={readingPattern}
          {workspace}
          split={readingSplit}
          onclose={closeReader}
          onrelated={(pattern) => (readingPattern = pattern)}
        />{/if}
    </div>
  {:else}
    <div class="situations-page" class:graph-page={overview === 'map'}>
      <div class="list-intro">
        <span class="eyebrow">Make room for what matters</span>
        <h1>Your situations</h1>
        <p>A place for what you’re working through, one situation at a time.</p>
      </div>
      <div class="list-tools">
        <label class="sr-only" for="situation-search">Search situations</label><input
          id="situation-search"
          type="search"
          placeholder="Find a situation…"
          bind:value={search}
        />
        {#if overview === 'list'}<label class="sort-field">
            <span class="sr-only">Sort situations</span>
            <select
              aria-label="Sort situations"
              value={sort}
              onchange={(event) => setSort(event.currentTarget.value as 'default' | 'priority')}
            >
              <option value="default">Default order</option>
              <option value="priority">Priority: highest first</option>
            </select>
          </label>{/if}
        <div class="overview-views" role="group" aria-label="Situations view">
          <button
            aria-pressed={overview === 'list'}
            disabled={mapBusy}
            onclick={() => setOverview('list')}><List size={15} />List</button
          ><button
            aria-pressed={overview === 'map'}
            disabled={mapBusy}
            onclick={() => setOverview('map')}><Network size={15} />Map</button
          >
        </div>
        <button
          class="new-situation"
          disabled={mapBusy}
          onclick={() => (createOpen = !createOpen)}
          aria-expanded={createOpen}><Plus size={17} />New situation</button
        >
      </div>
      {#if createOpen}<form
          class="new-form"
          onsubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label for="new-situation">What would you like to work through?</label>
          <div>
            <input
              id="new-situation"
              bind:value={newTitle}
              maxlength="180"
              placeholder="e.g. A difficult conversation"
              required
            /><button type="submit" disabled={creating || !newTitle.trim()}
              >{creating ? 'Creating…' : 'Open notebook'}</button
            ><button
              type="button"
              class="icon"
              aria-label="Cancel new situation"
              onclick={() => (createOpen = false)}><X size={17} /></button
            >
          </div>
        </form>{/if}
      {#if overview === 'map'}<BearingsMap
          bind:this={map}
          {situations}
          {workspace}
          selectedId={mapSelectedId}
          query={search}
          onselect={selectOnMap}
          onchange={(records) => (situations = records)}
          onopen={open}
          onbusy={(value) => (mapBusy = value)}
        />
      {:else}<div class="situations-list">
          {#each filtered as situation (situation.id)}<div class="situation-list-item">
              <button
                class="situation-row"
                disabled={busy}
                oncontextmenu={(e) => {
                  e.preventDefault();
                  showListMenu(situation, e.clientX, e.clientY);
                }}
                onclick={() => open(situation)}
                ><div>
                  <h2>{situation.title}</h2>
                  <p>{situation.context || 'Open a space to think, practise, and reflect.'}</p>
                  <span
                    >{situation.notebook
                      ? `${situation.notebook.chapters.flatMap((c) => c.cells).length} entries${situation.notebook.chapters.length > 1 ? ` · ${situation.notebook.chapters.length} chapters` : ''}`
                      : 'Start notebook'}</span
                  >
                </div>
                <ArrowUpRight size={19} /></button
              >
              <div class="row-actions">
                <BearingsPriority
                  value={situation.priority ?? null}
                  label={`Priority for ${situation.title}`}
                  disabled={busy}
                  onchange={(priority) => setPriority(situation, priority)}
                />
                <button
                  class="icon"
                  aria-label={`Actions for ${situation.title}`}
                  title="Situation actions"
                  disabled={busy}
                  aria-expanded={listMenu?.situation.id === situation.id}
                  onclick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    showListMenu(situation, rect.right - 190, rect.bottom + 4);
                  }}><Ellipsis size={19} /></button
                >
              </div>
            </div>{/each}
        </div>{/if}
      {#if !situations.length && overview === 'list'}<div class="empty-list">
          <img
            src={`${resolve('/apps/bearings/icon.png')}?v=green`}
            width="80"
            height="80"
            alt=""
          />
          <h2>Something on your mind?</h2>
          <p>Give it a name. You can work through the rest as you go.</p>
          <button onclick={() => (createOpen = true)}
            ><Plus size={16} />Create your first situation</button
          >
        </div>{:else if !filtered.length && overview === 'list'}<p class="no-results">
          No situations match your search.
        </p>{/if}
      <footer>
        Saved privately in your Patternverse workspace on this device. <a
          href={resolve('/my?pane=sync')}>Backups & sync ↗</a
        >
      </footer>
    </div>
  {/if}
  {#if listMenu}<div
      class="situation-menu"
      role="menu"
      style:left={`${listMenu.x}px`}
      style:top={`${listMenu.y}px`}
    >
      <button role="menuitem" onclick={() => startRename(listMenu!.situation)}
        >Rename situation</button
      >
      <button
        role="menuitem"
        onclick={() => {
          deleteTarget = listMenu!.situation;
          listMenu = null;
        }}>Delete situation…</button
      ><button role="menuitem" onclick={() => (listMenu = null)}>Cancel</button>
    </div>{/if}
  {#if renameTarget}<dialog
      class="rename-dialog"
      bind:this={renameDialog}
      aria-labelledby="rename-title"
      oncancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onclose={() => (renameTarget = null)}
    >
      <form
        onsubmit={(event) => {
          event.preventDefault();
          void saveName();
        }}
      >
        <h2 id="rename-title">Rename situation</h2>
        <label for="rename-situation-title">Situation name</label>
        <input
          id="rename-situation-title"
          bind:this={renameInput}
          bind:value={renameTitle}
          maxlength="180"
          required
          disabled={busy}
        />
        {#if renameError}<p role="alert">{renameError}</p>{/if}
        <div class="rename-actions">
          <button type="button" disabled={busy} onclick={() => renameDialog?.close()}>Cancel</button
          ><button type="submit" disabled={busy || !renameTitle.trim()}>Save name</button>
        </div>
      </form>
    </dialog>{/if}
  {#if deleteTarget}<div class="modal-backdrop">
      <div
        role="alertdialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="delete-title"
        class="delete-dialog"
      >
        <h2 id="delete-title">Delete “{deleteTarget.title}”?</h2>
        <p>This removes the situation and its notebook from your workspace.</p>
        <div>
          <button onclick={() => (deleteTarget = null)}>Keep situation</button><button
            class="danger"
            disabled={busy}
            onclick={removeSituation}>Delete situation</button
          >
        </div>
      </div>
    </div>{/if}
  <BearingsSettings
    bind:this={settings}
    {vim}
    {cursor}
    onchange={setVim}
    oncursorchange={setCursor}
  />
  <BearingsPatternPicker
    bind:this={patternPicker}
    patterns={pickerPatterns}
    scope={pickerScope}
    onselect={(pattern) => {
      void notebook?.pick(libraryPatternCell(pattern));
    }}
  />
</main>

<style>
  .bearings {
    --bearings-paper: var(--paper, #fff);
    --bearings-surface: #f6f8f5;
    --bearings-ink: var(--ink, #181814);
    --bearings-muted: var(--text-muted-on-light, #62655f);
    --bearings-line: #dce1da;
    --bearings-accent: var(--green-dark, #007a4d);
    --bearings-accent-soft: var(--mint, #dff8ea);
    --bearings-danger: #b42318;
    color: var(--bearings-ink);
    background: var(--bearings-paper);
    min-height: 100dvh;
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.5;
  }
  .bearings.has-notebook {
    --bearings-toolbar-height: 58px;
    position: relative;
    height: 100dvh;
    min-height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 64px;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--bearings-ink);
    flex: none;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: inherit;
    text-decoration: none;
    font-size: 1.15rem;
    font-weight: 900;
    text-transform: lowercase;
    letter-spacing: -0.04em;
  }
  .brand span::after {
    content: '.';
    color: var(--bearings-accent);
  }
  .brand img {
    border-radius: 8px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }
  .home-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--bearings-muted);
    font-size: 0.75rem;
    text-decoration: none;
  }
  .save-state {
    color: var(--bearings-muted);
    font-size: 0.7rem;
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 5px;
    color: var(--bearings-muted);
    background: transparent;
    cursor: pointer;
    flex: none;
  }
  .icon:hover {
    background: var(--bearings-accent-soft);
    color: var(--bearings-ink);
  }
  .library-toggle[aria-expanded='true'] {
    background: var(--bearings-accent-soft);
    color: var(--bearings-ink);
  }
  .app-header.notebook-toolbar {
    height: var(--bearings-toolbar-height);
    min-height: var(--bearings-toolbar-height);
    box-sizing: border-box;
    padding: 0.4rem 1.1rem;
    gap: 0.4rem;
    border-bottom-color: var(--bearings-line);
    position: relative;
    z-index: 30;
  }
  .notebook-toolbar .brand {
    flex: none;
    gap: 0.5rem;
    padding-right: 1rem;
    margin-right: 0.3rem;
    border-right: 1px solid var(--bearings-line);
    font-size: 1.15rem;
  }
  .notebook-toolbar .brand img {
    width: 28px;
    height: 28px;
    border-radius: 7px;
  }
  .notebook-heading {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }
  .notebook-toolbar .icon {
    width: 32px;
    height: 32px;
  }
  .notebook-toolbar .icon.active {
    color: var(--bearings-accent);
  }
  .notebook-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
  }
  .view-switch {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--bearings-surface);
    border-radius: 6px;
  }
  .view-switch button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .view-switch button[aria-pressed='true'] {
    background: var(--bearings-ink);
    color: var(--bearings-paper);
  }
  .header-chapter-select {
    width: 96px;
    min-width: 0;
    padding: 4px;
    border: 0;
    border-radius: 4px;
    color: var(--bearings-muted);
    background: var(--bearings-surface);
    font: inherit;
    font-size: 12px;
    text-overflow: ellipsis;
  }
  .direct-map-actions,
  .direct-notebook-actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex: none;
  }
  .compact-save {
    display: grid;
    place-items: center;
    width: 24px;
    flex: none;
  }
  .save-failed {
    color: var(--bearings-danger);
  }
  .unsaved-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--bearings-accent);
  }
  .toolbar-menu {
    position: relative;
    flex: none;
  }
  .toolbar-menu-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 240px;
    max-width: calc(100vw - 24px);
    padding: 0.4rem;
    border: 1px solid var(--bearings-line);
    border-radius: 10px;
    background: var(--bearings-paper);
    box-shadow: 0 8px 28px #3022111c;
  }
  .toolbar-menu-panel p {
    margin: 0.2rem 0.5rem 0.4rem;
    font-size: 0.68rem;
    color: var(--bearings-muted);
  }
  .toolbar-menu-panel button,
  .toolbar-menu-panel a {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    min-height: 40px;
    box-sizing: border-box;
    padding: 0.5rem;
    border: 0;
    border-radius: 6px;
    text-align: left;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.78rem;
    text-decoration: none;
    cursor: pointer;
  }
  .toolbar-menu-panel button:hover,
  .toolbar-menu-panel a:hover {
    background: var(--bearings-surface);
  }
  .toolbar-menu-panel .mobile-map-action,
  .toolbar-menu-panel .mobile-editor-action {
    display: none;
  }
  .chapter-menu-select {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 0.5rem;
    font-size: 12px;
    color: var(--bearings-muted);
  }
  .chapter-menu-select select {
    width: 100%;
    border: 1px solid var(--bearings-line);
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    padding: 8px;
    border-radius: 4px;
    font: inherit;
  }
  .situation-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }
  .situation-list-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    border-top: 1px solid var(--bearings-line);
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: none;
  }
  .sort-field select {
    max-width: 100%;
    border: 1px solid var(--bearings-line);
    border-radius: 7px;
    padding: 0.65rem 0.6rem;
    font: inherit;
    font-size: 0.75rem;
    color: inherit;
    background: var(--bearings-paper);
  }
  .rename-dialog {
    width: min(430px, calc(100% - 2rem));
    box-sizing: border-box;
    border: 1px solid var(--bearings-line);
    border-radius: 12px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    padding: 1.5rem;
  }
  .rename-dialog::backdrop {
    background: #26221f55;
  }
  .rename-dialog h2 {
    font-size: 1.4rem;
    font-weight: 750;
    letter-spacing: -0.035em;
    margin: 0 0 1rem;
  }
  .rename-dialog label {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
  .rename-dialog input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--bearings-line);
    border-radius: 6px;
    padding: 0.7rem;
    background: transparent;
    color: inherit;
    font: inherit;
  }
  .rename-dialog p {
    color: var(--bearings-accent);
    font-size: 0.8rem;
  }
  .rename-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
    margin-top: 1.2rem;
  }
  .rename-actions button {
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--bearings-line);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .rename-actions button[type='submit'] {
    background: var(--bearings-accent);
    border-color: transparent;
    color: #fff;
  }
  .title-field {
    min-width: 0;
    flex: 1;
  }
  .title-field input {
    font-family: inherit;
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.025em;
    border: 0;
    background: transparent;
    color: inherit;
    width: 100%;
    padding: 0;
    line-height: 1.4;
  }
  .workbench {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    flex: 1;
    min-height: 0;
  }
  .workbench.library-open {
    grid-template-columns: 290px minmax(0, 1fr);
  }
  .workbench.reader-open {
    grid-template-columns: minmax(0, 1.1fr) minmax(400px, 1fr);
  }
  .workbench.library-open.reader-open {
    grid-template-columns: 290px minmax(0, 1.1fr) minmax(400px, 1fr);
  }
  .library-panel {
    min-height: 0;
    border-right: 1px solid var(--bearings-line);
    overflow: hidden;
  }
  .situations-page {
    max-width: 960px;
    margin: auto;
    padding: 4.5rem 3rem 2rem;
  }
  .situations-page.graph-page {
    max-width: 1440px;
    padding-top: 1.5rem;
  }
  .graph-page .list-intro p,
  .graph-page .list-intro .eyebrow {
    display: none;
  }
  .graph-page .list-intro h1 {
    font-size: 2.1rem;
    margin: 0 0 1.2rem;
  }
  .overview-views {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    padding: 0.2rem;
  }
  .overview-views button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 0.75rem;
    border: 0;
    border-radius: 3px;
    cursor: pointer;
  }
  .overview-views button[aria-pressed='true'] {
    color: var(--bearings-ink);
    background: var(--bearings-surface);
  }
  .eyebrow {
    font-size: 0.74rem;
    color: var(--bearings-muted);
  }
  .list-intro h1 {
    font-size: 3rem;
    font-weight: 850;
    line-height: 1.1;
    letter-spacing: -0.045em;
    margin: 0.8rem 0 1rem;
  }
  .list-intro p {
    font-size: 0.88rem;
    color: var(--bearings-muted);
    margin: 0 0 2.5rem;
    max-width: 420px;
    line-height: 1.8;
  }
  .list-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.3rem;
    flex-wrap: wrap;
  }
  .list-tools input {
    border: 1px solid var(--bearings-line);
    background: transparent;
    padding: 0.65rem 0.8rem;
    border-radius: 5px;
    font: inherit;
    font-size: 0.8rem;
    min-width: 0;
    width: 240px;
    color: inherit;
  }
  .new-situation,
  .new-form button[type='submit'],
  .empty-list button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--bearings-accent);
    border: 0;
    border-radius: 5px;
    color: #fff;
    padding: 0.7rem 1rem;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .situation-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    width: 100%;
    text-align: left;
    padding: 1.5rem 0.3rem;
    border: 0;
    min-width: 0;
    flex: 1;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  .situation-row:hover {
    background: var(--bearings-surface);
  }
  .situation-row h2 {
    overflow-wrap: anywhere;
    font-size: 1rem;
    font-weight: 500;
    margin: 0 0 0.4rem;
  }
  .situation-row p {
    font-size: 0.8rem;
    color: var(--bearings-muted);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.7;
  }
  .situation-row span {
    display: block;
    font-size: 0.67rem;
    color: var(--bearings-accent);
    margin-top: 0.65rem;
  }
  .situation-row :global(svg) {
    flex: none;
    color: var(--bearings-muted);
  }
  .new-form {
    background: var(--bearings-surface);
    padding: 1.2rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }
  .new-form label {
    display: block;
    font-size: 0.8rem;
    margin-bottom: 0.7rem;
  }
  .new-form > div {
    display: flex;
    gap: 0.7rem;
    align-items: center;
  }
  .new-form input {
    flex: 1;
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid var(--bearings-line);
    border-radius: 4px;
    background: var(--bearings-paper);
    font: inherit;
    font-size: 0.8rem;
    color: inherit;
  }
  .empty-list {
    text-align: center;
    padding: 3rem 1rem;
  }
  .empty-list img {
    border-radius: 18px;
  }
  .empty-list h2 {
    font: 800 1.7rem var(--font-sans);
    letter-spacing: -0.04em;
    margin: 1.2rem 0 0.8rem;
  }
  .empty-list p {
    font-size: 0.8rem;
    color: var(--bearings-muted);
    margin: 0 0 1.5rem;
  }
  .situations-page footer {
    font-size: 0.68rem;
    color: var(--bearings-muted);
    margin-top: 3rem;
    border-top: 1px solid var(--bearings-line);
    padding-top: 1.2rem;
  }
  .situations-page footer a {
    color: inherit;
    margin-left: 0.5rem;
  }
  .loading {
    text-align: center;
    padding: 5rem;
    color: var(--bearings-muted);
  }
  .no-results {
    color: var(--bearings-muted);
    font-size: 0.85rem;
    padding: 2rem 0;
  }
  .app-error,
  .save-error {
    background: #f8e9e2;
    color: #9c2b25;
    font-size: 0.8rem;
    padding: 0.8rem 2rem;
    margin: 0;
    flex: none;
  }
  .save-error p {
    margin: 0 0 0.4rem;
  }
  .save-error button {
    background: transparent;
    border: 1px solid currentColor;
    border-radius: 4px;
    color: inherit;
    padding: 0.4rem 0.7rem;
    font: inherit;
    margin-right: 0.6rem;
    cursor: pointer;
  }
  .situation-menu {
    position: fixed;
    z-index: 50;
    width: 190px;
    background: var(--bearings-paper);
    border: 1px solid var(--bearings-line);
    box-shadow: 0 5px 20px #0002;
    padding: 0.4rem;
    border-radius: 6px;
  }
  .situation-menu button {
    display: block;
    background: none;
    border: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    width: 100%;
    padding: 0.6rem;
    cursor: pointer;
  }
  .situation-menu button:hover {
    background: var(--bearings-surface);
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: #26221f55;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .delete-dialog {
    width: 430px;
    max-width: 100%;
    padding: 1.7rem;
    background: var(--bearings-paper);
    border-radius: 9px;
  }
  .delete-dialog h2 {
    font-size: 1.4rem;
    font-weight: 750;
    letter-spacing: -0.035em;
    margin: 0 0 1rem;
  }
  .delete-dialog p {
    font-size: 0.85rem;
    color: var(--bearings-muted);
    line-height: 1.7;
  }
  .delete-dialog > div {
    display: flex;
    justify-content: flex-end;
    gap: 0.7rem;
    margin-top: 1.5rem;
  }
  .delete-dialog button {
    border: 1px solid var(--bearings-line);
    background: transparent;
    color: inherit;
    padding: 0.7rem;
    font: inherit;
    font-size: 0.8rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .delete-dialog button.danger {
    background: var(--bearings-danger);
    color: #fff;
    border-color: transparent;
  }
  :global(.bearings .sr-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  :global(.bearings button:disabled) {
    cursor: default;
    opacity: 0.45;
  }
  :global(.bearings :focus-visible) {
    outline: var(--focus-width) solid var(--focus-color);
    outline-offset: var(--focus-offset);
  }
  @media (max-width: 700px) {
    .situation-list-item {
      gap: 0.3rem;
    }
    .situation-row {
      gap: 0.5rem;
    }
    .situation-row > div {
      min-width: 0;
    }
    .row-actions {
      gap: 0;
    }
    .app-header {
      padding: 0.85rem 1rem;
      min-height: 65px;
    }
    .brand {
      font-size: 1.3rem;
    }
    .header-right {
      gap: 0.5rem;
    }
    .home-link {
      font-size: 0;
    }
    .save-state {
      font-size: 0.62rem;
      max-width: 100px;
      text-align: right;
    }
    .situations-page {
      padding: 2.5rem 1.2rem 1rem;
    }
    .list-intro h1 {
      font-size: 2.5rem;
    }
    .list-tools {
      gap: 0.5rem;
    }
    .new-situation {
      padding: 0.7rem;
    }
    .new-form {
      padding: 0.8rem;
    }
    .new-form > div {
      flex-wrap: wrap;
    }
    .new-form input {
      flex-basis: 100%;
    }
    .title-field input {
      font-size: 1rem;
    }
    .graph-page {
      padding-left: 0.8rem;
      padding-right: 0.8rem;
    }
    .list-tools input {
      flex: 1;
      min-width: 130px;
    }
    .workbench.library-open {
      grid-template-columns: minmax(0, 1fr);
    }
    .library-panel {
      position: absolute;
      z-index: 25;
      top: var(--bearings-toolbar-height);
      bottom: 0;
      left: 0;
      width: min(320px, 90vw);
      box-shadow: 10px 0 40px #0002;
    }
    .app-error,
    .save-error {
      padding: 0.7rem 1rem;
    }
  }
  @media (max-width: 1000px) {
    .notebook-toolbar .brand span {
      display: none;
    }
    .notebook-toolbar .brand {
      padding-right: 0.7rem;
      margin-right: 0;
    }
  }
  @media (max-width: 900px) {
    .direct-map-actions,
    .direct-notebook-actions,
    .header-chapter-select {
      display: none;
    }
    .toolbar-menu-panel .mobile-map-action,
    .toolbar-menu-panel .mobile-editor-action {
      display: flex;
    }
  }
  @media (max-width: 600px) {
    .bearings.has-notebook {
      --bearings-toolbar-height: 56px;
    }
    .app-header.notebook-toolbar {
      gap: 0.15rem;
      padding: 0.3rem 0.6rem;
    }
    .notebook-toolbar .brand {
      border-right: 0;
      padding-right: 0.2rem;
    }
    .notebook-toolbar .brand img {
      width: 26px;
      height: 26px;
    }
    .notebook-toolbar .icon {
      width: 32px;
    }
    .notebook-toolbar .situation-title,
    .notebook-heading {
      gap: 0.1rem;
    }
    .direct-map-actions {
      display: none;
    }
    .toolbar-menu-panel .mobile-map-action {
      display: flex;
    }
    .compact-save {
      width: 16px;
    }
    .notebook-tools {
      gap: 0;
    }
  }
  @media (pointer: coarse) {
    .notebook-toolbar .icon,
    .view-switch button {
      min-width: 40px;
      min-height: 44px;
    }
    .view-switch {
      padding: 0;
    }
  }
</style>
