<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { SvelteDate } from 'svelte/reactivity';
  import { resolve } from '$app/paths';
  import { Search, LockKeyhole, Pencil, Copy, Download, Trash2 } from '@lucide/svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import { downloadPracticeFile } from '$lib/client/practice-export';
  import {
    createPracticeHistoryActions,
    initialPracticeHistoryActions,
  } from '$lib/client/practice-history-actions';
  import {
    practiceHistoryView,
    historyHighlights,
    historyDate,
    historyVerseNames,
    historyCanResume,
  } from '$lib/client/practice-history-view';
  import type { SavedPracticeRun } from '@patternverse/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import { verseAccentClass } from '$lib/verse-accent';
  let { commonsEntities }: { commonsEntities: readonly EntitySummary[] } = $props();
  let runs = $state<readonly SavedPracticeRun[]>([]);
  let verseNames = $state<Record<string, string>>({});
  let ready = $state(false);
  let loadError = $state('');
  let query = $state('');
  let verse = $state('');
  let status = $state('');
  let requestedPage = $state(1);
  let history = $state(initialPracticeHistoryActions());
  let detailHeading = $state<HTMLHeadingElement>();
  let active = true;
  const view = $derived(
    practiceHistoryView({
      runs,
      query,
      verse,
      status,
      page: requestedPage,
      selectedId: history.selectedId,
      verseNames,
      now: new SvelteDate(),
    }),
  );
  const filtered = $derived(view.filtered);
  const pagination = $derived(view.pagination);
  const selected = $derived(view.selected);
  const verseIds = $derived(view.verseIds);
  const error = $derived(history.error || loadError);
  let reload = async () => {};
  let resumeRefresh = async () => {};
  const actions = createPracticeHistoryActions({
    workspace: getLocalWorkspace,
    selected: () => selected,
    refresh: () => reload(),
    confirm: (question) => window.confirm(question),
    copy: (text) => navigator.clipboard.writeText(text),
    download: downloadPracticeFile,
    started: () => {
      loadError = '';
    },
    changed: (state) => {
      history = state;
    },
  });
  $effect(() => {
    if (requestedPage !== pagination.page) requestedPage = pagination.page;
  });
  $effect(() => {
    if (!history.busy && !history.renaming) void untrack(resumeRefresh);
  });
  onMount(() => {
    const reader = createWorkspaceRefresh({
      read: async () => {
        const workspace = await getLocalWorkspace();
        return Promise.all([workspace.listPracticeRuns(), workspace.listEntities()]);
      },
      apply: ([saved, personal]) => {
        runs = saved;
        verseNames = historyVerseNames(commonsEntities, personal);
      },
      failed: () => {
        loadError = 'Could not refresh practice history.';
      },
      settled: () => {
        ready = true;
      },
      canRefresh: () => !history.busy && !history.renaming,
    });
    reload = () => reader.refresh(true);
    resumeRefresh = reader.resume;
    const refresh = () => {
      void reader.refresh();
    };
    const unsubscribe = subscribeWorkspaceChanges(['practice-runs', 'entities'], refresh);
    window.addEventListener('focus', refresh);
    actions.select(new URLSearchParams(location.search).get('run') ?? '', false);
    refresh();
    return () => {
      active = false;
      actions.dispose();
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  });
  function resetFilters() {
    requestedPage = 1;
    actions.reset();
  }
  async function open(run: SavedPracticeRun) {
    actions.select(run.id);
    await tick();
    if (active && history.selectedId === run.id) detailHeading?.focus({ preventScroll: true });
  }
  function page(number: number) {
    requestedPage = number;
    actions.reset();
  }
</script>

<section
  class:detail-open={history.mobileDetail}
  class="practice-history"
  aria-labelledby="history-title"
>
  <div class="history-controls">
    <header>
      <div>
        <h2 id="history-title">practice history.</h2>
        <p>Your responses, kept together.</p>
      </div>
      <span><LockKeyhole size={13} aria-hidden="true" />Private · on this device</span>
    </header>
    <div class="search-row">
      <label class="search"
        ><Search size={17} aria-hidden="true" /><input
          type="search"
          aria-label="Search practice history"
          placeholder="Search titles, patterns or your answers…"
          bind:value={query}
          oninput={resetFilters}
        /></label
      >
    </div>
    <div class="filters">
      <select
        aria-label="Filter practice history by verse"
        bind:value={verse}
        onchange={resetFilters}
        ><option value="">All verses</option>{#each verseIds as id (id)}<option value={id}
            >{verseNames[id] ?? id}</option
          >{/each}</select
      ><select
        aria-label="Filter practice history by status"
        bind:value={status}
        onchange={resetFilters}
        ><option value="">All runs</option><option value="in-progress">In progress</option><option
          value="completed">Completed</option
        ><option value="stopped">Stopped</option></select
      ><span role="status"
        >{filtered.length} {filtered.length === 1 ? 'run' : 'runs'} · newest first</span
      >
    </div>
  </div>
  {#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if history.message}<p
      class="notice"
      role="status"
    >
      {history.message}
    </p>{/if}
  {#if !ready}<p class="empty">Loading your practice history…</p>{:else if !runs.length}<div
      class="empty"
    >
      <h3>Your first run belongs here.</h3>
      <p>
        Open a pattern’s guided practice and choose “Save to workspace”. Confirmed steps will be
        saved as you continue.
      </p>
      <a href={resolve('/library')}>Find a pattern →</a>
    </div>{:else if !filtered.length}<p class="empty">
      No matching runs. Try another word or clear the filters.
    </p>{:else}
    <div class="history-browser">
      <div class="run-list" aria-label="Saved practice runs">
        {#each view.rows as row (row.run.id)}{@const run = row.run}{#if row.startsGroup}<p
              class="date-group"
            >
              {row.group}
            </p>{/if}<button
            class="run"
            aria-pressed={selected?.id === run.id}
            onclick={() => open(run)}
            ><strong
              >{#each row.title as chunk, index (index)}{#if chunk.hit}<mark>{chunk.text}</mark
                  >{:else}{chunk.text}{/if}{/each}</strong
            ><span class="pattern-name">{run.patternTitle}</span><span class="snippet"
              >{#each row.snippet as chunk, index (index)}{#if chunk.hit}<mark>{chunk.text}</mark
                  >{:else}{chunk.text}{/if}{/each}</span
            ><span class="run-meta"
              >{#if run.verseIds[0]}<span class={'verse ' + verseAccentClass(run.verseIds[0])}
                  >{verseNames[run.verseIds[0]] ?? run.verseIds[0]}</span
                >{/if}<span
                >{run.status === 'completed'
                  ? '✓ Completed'
                  : run.status === 'stopped'
                    ? 'Stopped'
                    : 'In progress'}</span
              ></span
            ><span class="date">{row.date}</span></button
          >{/each}
      </div>
      {#if selected}<section class="run-detail" aria-label="Saved responses">
          <button class="back" onclick={actions.back}>← Practice history</button>
          <div class="detail-meta">
            <span
              >{selected.status === 'completed'
                ? '✓ Completed'
                : selected.status === 'stopped'
                  ? 'Stopped'
                  : 'In progress'}</span
            ><span>{historyDate(selected.updatedAt)}</span>
          </div>
          <h3 tabindex="-1" bind:this={detailHeading}>{selected.title}</h3>
          <p class="origin">
            {selected.patternTitle}<br />Started in {selected.origin === 'chatgpt'
              ? 'ChatGPT'
              : 'Patternverse'}
          </p>
          <div class="run-actions">
            {#if historyCanResume(selected, commonsEntities)}<a
                class="primary"
                href={resolve(
                  `/${selected.patternType}/${selected.patternRef.entityId}/run?history=${encodeURIComponent(selected.id)}`,
                )}>Continue practice →</a
              >{/if}<button disabled={history.busy} onclick={actions.toggleRename}
              ><Pencil size={14} aria-hidden="true" />Rename</button
            ><button onclick={() => void actions.copy()}
              ><Copy size={14} aria-hidden="true" />Copy plain text</button
            ><button onclick={() => void actions.exportRun()}
              ><Download size={14} aria-hidden="true" />Export</button
            ><button class="danger" disabled={history.busy} onclick={() => void actions.remove()}
              ><Trash2 size={14} aria-hidden="true" />Delete</button
            >
          </div>
          {#if history.renaming}<form
              class="rename"
              onsubmit={(event) => {
                event.preventDefault();
                void actions.rename();
              }}
            >
              <label
                >Run title<input
                  value={history.name}
                  oninput={(event) => actions.setName(event.currentTarget.value)}
                  required
                  maxlength="120"
                /></label
              ><button disabled={history.busy} type="submit">Save name</button>
            </form>{/if}
          {#if history.copyText}<label class="copy-fallback"
              >Copy your responses<textarea
                readonly
                rows="6"
                value={history.copyText}
                onfocus={(e) => e.currentTarget.select()}></textarea></label
            >{/if}
          {#each selected.responses as response (response.id)}<div class="response">
              <h4>
                {#each historyHighlights(response.prompt, query) as chunk, index (index)}{#if chunk.hit}<mark
                      >{chunk.text}</mark
                    >{:else}{chunk.text}{/if}{/each}
              </h4>
              <p>
                {#each historyHighlights(response.answer || 'Not answered', query) as chunk, index (index)}{#if chunk.hit}<mark
                      >{chunk.text}</mark
                    >{:else}{chunk.text}{/if}{/each}
              </p>
            </div>{/each}
          {#if !selected.responses.length}<p class="empty">No confirmed responses yet.</p>{/if}
        </section>{/if}
    </div>
    {#if pagination.pageCount > 1}<nav class="pages" aria-label="Practice history pagination">
        <button disabled={pagination.page === 1} onclick={() => page(pagination.page - 1)}
          >← Previous</button
        >{#each pagination.pages as number, index (`${number}:${index}`)}{#if number === 'ellipsis'}<span
              >…</span
            >{:else}<button
              aria-label={`Go to page ${number}`}
              aria-current={number === pagination.page ? 'page' : undefined}
              onclick={() => page(number)}>{number}</button
            >{/if}{/each}<button
          disabled={pagination.page === pagination.pageCount}
          onclick={() => page(pagination.page + 1)}>Next →</button
        >
      </nav>{/if}
  {/if}
  <p class="device-note">
    Saved locally, not uploaded or shared with an AI. This browser’s history is separate from other
    devices and ChatGPT. Clearing site data deletes it. Exports and workspace backups contain
    unencrypted private responses.
  </p>
</section>

<style>
  .practice-history {
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.4rem;
  }
  h2 {
    margin: 0;
    font-size: 1.7rem;
    letter-spacing: -0.05em;
  }
  header p {
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 0.88rem;
  }
  header > span {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.7rem;
    color: var(--green-dark);
  }
  button,
  .run-actions a {
    min-height: 44px;
    border: 1px solid #dce1d9;
    background: white;
    color: var(--ink);
    border-radius: 4px;
    padding: 0.6rem 0.75rem;
    font: inherit;
    font-size: 0.76rem;
    font-weight: 650;
    cursor: pointer;
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button:hover:not(:disabled) {
    border-color: var(--green-dark);
  }
  .search-row {
    display: flex;
    gap: 0.6rem;
    align-items: center;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    border: 1px solid #dce1d9;
    padding: 0.65rem 0.8rem;
    border-radius: 4px;
    min-width: 0;
  }
  .search input {
    width: 100%;
    border: 0;
    padding: 0;
    min-width: 0;
  }
  .filters {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
    margin: 0.8rem 0 1.4rem;
  }
  .filters select {
    width: auto;
    font-size: 0.76rem;
  }
  .filters > span {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--muted);
  }
  input,
  select,
  textarea {
    font: inherit;
    color: var(--ink);
    background: white;
    border: 1px solid #dce1d9;
    border-radius: 4px;
    min-height: 44px;
    padding: 0.65rem;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible,
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  .history-browser {
    display: grid;
    grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.25fr);
    border: 1px solid #dce1d9;
    border-radius: 5px;
    overflow: hidden;
  }
  .run-list {
    padding: 0.65rem;
    border-right: 1px solid #dce1d9;
    min-width: 0;
  }
  .date-group {
    padding: 0.5rem 0.6rem;
    margin: 0.3rem 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    font-weight: 700;
  }
  .run {
    display: block;
    width: 100%;
    text-align: left;
    justify-content: start;
    border: 1px solid transparent;
    padding: 0.85rem 0.65rem;
    margin-bottom: 0.25rem;
    overflow-wrap: anywhere;
  }
  .run[aria-pressed='true'] {
    background: #edf7f0;
    border-color: #dce1d9;
  }
  .run strong {
    display: block;
    font-size: 0.85rem;
    line-height: 1.4;
    font-weight: 750;
  }
  .pattern-name,
  .snippet,
  .date {
    display: block;
    font-size: 0.73rem;
    color: var(--muted);
    line-height: 1.55;
    margin-top: 0.4rem;
  }
  .snippet {
    font-weight: 400;
  }
  .run-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.65rem;
    color: var(--muted);
    margin-top: 0.65rem;
    align-items: center;
  }
  .verse {
    background: var(--verse-rest, #f1f4ee);
    padding: 0.2rem 0.35rem;
    border-radius: 3px;
    color: var(--ink);
  }
  .date {
    font-size: 0.65rem;
    font-weight: 400;
  }
  .run-detail {
    padding: 1.4rem;
    min-width: 0;
  }
  .detail-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 0.67rem;
    margin-bottom: 0.7rem;
  }
  .run-detail h3 {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.25;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
  .origin {
    font-size: 0.76rem;
    color: var(--muted);
    line-height: 1.6;
  }
  .run-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin: 1rem 0 1.2rem;
  }
  .primary {
    background: var(--ink) !important;
    color: white !important;
  }
  .danger {
    color: #a62b1f;
  }
  .response {
    border-top: 1px solid #dce1d9;
    padding: 1.1rem 0;
  }
  .response h4 {
    margin: 0 0 0.55rem;
    font-size: 0.78rem;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .response p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  mark {
    background: #fbefb8;
    color: inherit;
  }
  .back {
    display: none;
    margin-bottom: 1rem;
  }
  .empty {
    padding: 1.5rem;
    border: 1px dashed #dce1d9;
    font-size: 0.85rem;
    color: var(--muted);
    line-height: 1.65;
  }
  .empty h3 {
    margin: 0;
    color: var(--ink);
  }
  .empty a {
    color: var(--green-dark);
    font-weight: 700;
  }
  .notice {
    font-size: 0.8rem;
    line-height: 1.6;
    padding: 0.8rem;
    background: #edf7f0;
  }
  .error {
    background: #fff0eb;
    color: #a62b1f;
  }
  .device-note {
    margin: 1.3rem 0 0;
    font-size: 0.72rem;
    line-height: 1.65;
    color: var(--muted);
  }
  .pages {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .pages button[aria-current='page'] {
    background: var(--ink);
    color: white;
  }
  .pages span {
    padding: 0.7rem;
  }
  .rename label,
  .copy-fallback {
    display: grid;
    gap: 0.5rem;
    font-size: 0.8rem;
    margin: 1rem 0;
  }
  .rename {
    margin-bottom: 1rem;
  }
  @media (max-width: 1000px) {
    .history-browser {
      grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1fr);
    }
    .run-detail {
      padding: 1rem;
    }
  }
  @media (max-width: 800px) {
    header {
      align-items: start;
      flex-direction: column;
      gap: 0.6rem;
    }
    .search-row {
      flex-wrap: wrap;
    }
    .search {
      flex-basis: 100%;
    }
    input,
    select,
    textarea {
      font-size: 16px;
    }
    .filters > span {
      margin-left: 0;
      width: 100%;
    }
    .history-browser {
      display: block;
      border: 0;
    }
    .run-list {
      border: 0;
      padding: 0;
    }
    .run {
      padding: 1.1rem 0.7rem;
    }
    .run-detail {
      display: none;
      padding: 0;
    }
    .detail-open .run-detail {
      display: block;
    }
    .detail-open .run-list,
    .detail-open .history-controls,
    .detail-open .pages {
      display: none;
    }
    .back {
      display: inline-flex;
    }
    .run-detail h3 {
      font-size: 1.5rem;
    }
    .response {
      padding: 1.4rem 0;
    }
    .response p {
      font-size: 0.95rem;
    }
    .run-meta {
      font-size: 0.72rem;
    }
    .snippet,
    .pattern-name {
      font-size: 0.8rem;
    }
  }
</style>
