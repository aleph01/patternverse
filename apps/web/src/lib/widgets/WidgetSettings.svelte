<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { resolve } from '$app/paths';
  import { ArrowLeft, ArrowRight, Blocks, Maximize2, Plus, CodeXml } from '@lucide/svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import {
    parseWidgetPackage,
    type WidgetDraft,
    type WidgetRelease,
  } from '@patternverse/workspace';
  import { validatePackage } from './library';
  let { expanded = false }: { expanded?: boolean } = $props();
  let drafts = $state<WidgetDraft[]>([]),
    releases = $state<WidgetRelease[]>([]),
    enabled = $state<Record<string, boolean>>({});
  let tab = $state('mine'),
    query = $state(''),
    busy = $state(false),
    ready = $state(false),
    error = $state(''),
    message = $state('');
  let importInput: HTMLInputElement;
  let rail = $state<HTMLUListElement>(),
    atStart = $state(true),
    atEnd = $state(true);
  const rows = $derived.by(() => {
    const search = query.trim().toLocaleLowerCase();
    const result =
      tab === 'mine'
        ? drafts.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            version: d.package.manifest.version,
            status: 'Editable draft',
            identity: d.package.identity,
            kind: Object.values(d.package.manifest.exports).some((e) => e.kind === 'data')
              ? 'Selection'
              : 'Custom interface',
            href: `/my/widgets/edit?id=${encodeURIComponent(d.id)}` as const,
          }))
        : releases.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            version: r.package.manifest.version,
            status: enabled[r.package.identity] ? 'Enabled release' : 'Disabled release',
            identity: r.package.identity,
            kind: 'Private version',
            href: `/my/widgets/edit?release=${encodeURIComponent(r.id)}` as const,
          }));
    return result.filter(
      (row) => !search || `${row.name} ${row.description}`.toLocaleLowerCase().includes(search),
    );
  });
  const fullHref = $derived(`/my/widgets?tab=${tab}` as const);
  async function refresh() {
    const w = await getLocalWorkspace();
    [drafts, releases] = await Promise.all([w.listWidgetDrafts(), w.listWidgetReleases()]);
    enabled = Object.fromEntries(
      await Promise.all(
        [...new Set(releases.map((r) => r.package.identity))].map(async (id) => [
          id,
          await w.widgetEnabled(id),
        ]),
      ),
    );
    ready = true;
    await tick();
    measure();
  }
  function measure() {
    if (!rail) return;
    atStart = rail.scrollLeft <= 2;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }
  function scroll(direction: number) {
    rail?.scrollBy({
      left: direction * Math.max(240, rail.clientWidth * 0.8),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  onMount(() => {
    tab = new URLSearchParams(location.search).get('tab') === 'installed' ? 'installed' : 'mine';
    let active = true;
    const load = () => {
      void refresh().catch((c) => {
        if (active) error = c instanceof Error ? c.message : 'Could not open widgets.';
      });
    };
    load();
    const unsubscribe = subscribeWorkspaceChanges(['widgets'], load);
    const observer = new ResizeObserver(measure);
    if (rail) observer.observe(rail);
    window.addEventListener('resize', measure);
    return () => {
      active = false;
      unsubscribe();
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  });
  async function chooseTab(next: string) {
    tab = next;
    query = '';
    await tick();
    if (rail) rail.scrollLeft = 0;
    measure();
  }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    busy = true;
    error = '';
    message = '';
    try {
      if (file.size > 1048576) throw Error('Widget packages must be under 1 MiB.');
      const pkg = parseWidgetPackage(JSON.parse(await file.text()));
      await validatePackage(pkg);
      await (await getLocalWorkspace()).importWidgetPackage(pkg);
      await refresh();
      await chooseTab('installed');
      message =
        'Package imported and disabled. Enable it from its full-page overview before running its code.';
    } catch (c) {
      error = c instanceof Error ? c.message : 'Could not import package.';
    } finally {
      busy = false;
      input.value = '';
    }
  }
</script>

<section
  class="widget-settings widget-library"
  class:expanded
  aria-labelledby="widget-library-title"
>
  <header class="library-heading">
    <div>
      <p class="eyebrow">Your reusable interfaces</p>
      <h2 id="widget-library-title">{expanded ? 'All widgets' : 'Widgets'}</h2>
      <p>Create an interface once. Use it in any practice.</p>
    </div>
    <div class="library-actions">
      <input
        type="file"
        accept=".json"
        bind:this={importInput}
        onchange={importFile}
        hidden
      /><button type="button" disabled={busy} onclick={() => importInput.click()}
        >Import package</button
      ><a class="create" href={resolve('/my/widgets/edit?new=1')}
        ><Plus size={16} aria-hidden="true" />Create widget</a
      >
    </div>
  </header>
  {#if error}<p role="alert">{error}</p>{/if}{#if message}<p role="status">{message}</p>{/if}
  <div class="library-toolbar">
    <nav aria-label="Widget library">
      <button type="button" aria-pressed={tab === 'mine'} onclick={() => chooseTab('mine')}
        >My widgets <span>{drafts.length}</span></button
      ><button
        type="button"
        aria-pressed={tab === 'installed'}
        onclick={() => chooseTab('installed')}>Installed <span>{releases.length}</span></button
      >
    </nav>
    {#if expanded}<label class="search"
        >Find widgets<input
          type="search"
          placeholder="Search by name or purpose"
          bind:value={query}
        /></label
      >{:else}<a class="expand" href={resolve(fullHref)}
        ><Maximize2 size={14} aria-hidden="true" />View all widgets</a
      >{/if}
  </div>
  {#if !ready}<p class="empty">Opening your widgets…</p>{:else if !rows.length}<div class="empty">
      <Blocks size={28} aria-hidden="true" />
      <h3>
        {query
          ? 'No matching widgets'
          : tab === 'mine'
            ? 'Your next practice starts here'
            : 'No installed versions yet'}
      </h3>
      <p>
        {query
          ? 'Try another name or purpose.'
          : tab === 'mine'
            ? 'Build a widget from your own code, or start with the needs selector.'
            : 'Release a personal widget or import a package to see it here.'}
      </p>
      {#if !query && tab === 'mine'}<a href={resolve('/my/widgets/edit?new=1')}
          >Build your first widget →</a
        >{/if}
    </div>{:else}
    <div
      class="cards"
      role="region"
      aria-roledescription={expanded ? undefined : 'carousel'}
      aria-label={expanded ? 'Widget results' : 'Widget carousel'}
    >
      <ul
        bind:this={rail}
        class:card-grid={expanded}
        class:card-rail={!expanded}
        onscroll={measure}
        aria-label={expanded ? 'All widgets' : 'Scrollable widgets'}
      >
        {#each rows as row (row.id)}<li>
            <a class="widget-card" href={resolve(row.href)}
              ><div class="card-top">
                <span class="widget-symbol"
                  >{#if row.kind === 'Selection'}<Blocks
                      size={24}
                      aria-hidden="true"
                    />{:else}<CodeXml size={24} aria-hidden="true" />{/if}</span
                ><span class="status" class:released={tab === 'installed'}>{row.status}</span>
              </div>
              <div class="card-copy">
                <h3>{row.name}</h3>
                <p>
                  {row.description ||
                    (tab === 'mine'
                      ? 'An editable interface for your interactive practices.'
                      : 'An immutable version, ready to inspect and use in a practice.')}
                </p>
              </div>
              <div class="card-bottom">
                <span>{row.kind} · {row.version}</span><span class="card-open"
                  >{tab === 'mine' ? 'Open editor' : 'Inspect widget'}
                  <ArrowRight size={15} aria-hidden="true" /></span
                >
              </div></a
            >
          </li>{/each}
      </ul>
    </div>
    {#if !expanded}<footer>
        <p>{rows.length} {rows.length === 1 ? 'widget' : 'widgets'} · Scroll to browse</p>
        <div class="carousel-controls">
          <button
            type="button"
            aria-label="Previous widgets"
            disabled={atStart}
            onclick={() => scroll(-1)}><ArrowLeft size={16} aria-hidden="true" /></button
          ><button
            type="button"
            aria-label="Next widgets"
            disabled={atEnd}
            onclick={() => scroll(1)}><ArrowRight size={16} aria-hidden="true" /></button
          >
        </div>
      </footer>{:else}<p class="result-count">
        {rows.length}
        {rows.length === 1 ? 'widget' : 'widgets'}
      </p>{/if}
  {/if}
</section>

<style>
  .widget-library {
    min-width: 0;
  }
  .library-heading,
  .library-actions,
  .library-toolbar,
  nav,
  .expand,
  .create,
  footer,
  .carousel-controls,
  .card-top,
  .card-bottom,
  .card-open {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .library-heading {
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.04em;
    text-transform: lowercase;
  }
  p {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--muted);
    margin: 10px 0 0;
  }
  .eyebrow {
    margin: 0 0 8px;
    font-size: var(--text-xs);
    font-weight: var(--weight-eyebrow);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .library-actions {
    flex-wrap: wrap;
  }
  button,
  a,
  input {
    font: inherit;
  }
  button,
  .create {
    padding: 0.7rem 1rem;
    border: 1px solid var(--ink);
    border-radius: var(--radius-control);
    font-size: var(--text-control);
    font-weight: var(--weight-control);
    text-transform: lowercase;
    cursor: pointer;
    background: var(--paper);
    color: var(--ink);
    min-height: var(--control-min-height);
  }
  .create {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
    text-decoration: none;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button:hover:not(:disabled),
  .create:hover {
    background: var(--green);
    color: var(--ink);
  }
  a:focus-visible,
  button:focus-visible,
  input:focus-visible,
  ul:focus-visible {
    outline: var(--focus-width) solid var(--focus-color);
    outline-offset: var(--focus-offset);
  }
  .library-toolbar {
    justify-content: space-between;
    flex-wrap: wrap;
    margin: 28px 0 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--ink);
  }
  nav {
    gap: 6px;
  }
  nav button {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 9px 12px;
  }
  nav button[aria-pressed='true'] {
    color: var(--paper);
    background: var(--ink);
  }
  nav span {
    margin-left: 5px;
    font-size: 10px;
    opacity: 0.7;
  }
  .expand {
    font-size: 12px;
    text-decoration: none;
    color: var(--muted);
    font-weight: var(--weight-control);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 4px 2px 14px;
    min-width: 0;
  }
  .card-rail {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--muted) transparent;
  }
  .card-rail > li {
    flex: 0 0 clamp(255px, 32%, 320px);
    scroll-snap-align: start;
    min-width: 0;
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 20px;
  }
  .card-grid > li {
    min-width: 0;
  }
  .widget-card {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 255px;
    height: 100%;
    padding: 22px;
    border: 1px solid var(--ink);
    border-radius: var(--radius-control);
    background: var(--paper);
    text-decoration: none;
    color: var(--ink);
    transition: background-color 0.15s;
  }
  .widget-card:hover {
    background: var(--entry-hover-background);
  }
  .card-top {
    justify-content: space-between;
    gap: 8px;
  }
  .widget-symbol {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-control);
    background: var(--mint);
    color: var(--green-dark);
    flex-shrink: 0;
  }
  .status {
    font-size: 10px;
    padding: 5px 8px;
    border-radius: var(--radius-control);
    background: #f5f5f2;
    color: var(--muted);
    font-weight: var(--weight-label);
  }
  .status.released {
    background: var(--mint);
    color: var(--green-dark);
  }
  .card-copy {
    flex: 1;
  }
  .card-copy h3 {
    font-size: 18px;
    letter-spacing: -0.025em;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .card-copy p {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 12px;
    margin-top: 8px;
  }
  .card-bottom {
    justify-content: space-between;
    border-top: 1px solid #e2e4df;
    padding-top: 15px;
    flex-wrap: wrap;
    font-size: 10px;
    color: var(--muted);
  }
  .card-open {
    gap: 5px;
    color: var(--green-dark);
    font-weight: var(--weight-control);
  }
  footer {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 8px;
    min-height: 0;
    padding: 0;
    border: 0;
  }
  footer p,
  .result-count {
    font-size: 11px;
  }
  .carousel-controls {
    gap: 6px;
  }
  .carousel-controls button {
    padding: 10px;
    min-height: var(--control-min-height);
  }
  .empty {
    padding: 48px 24px;
    border: 1px dashed var(--muted);
    border-radius: var(--radius-control);
    background: #f5f5f2;
    text-align: center;
    color: var(--ink);
  }
  .empty :global(svg) {
    margin: 0 auto 14px;
  }
  .empty h3 {
    font-size: 18px;
    margin: 0;
  }
  .empty p {
    max-width: 48ch;
    margin: 10px auto;
  }
  .empty a {
    display: inline-block;
    margin-top: 12px;
    font-size: 12px;
    font-weight: var(--weight-control);
    color: var(--green-dark);
  }
  [role='alert'] {
    color: #a03226;
  }
  .search {
    display: grid;
    gap: 5px;
    font-size: 10px;
    color: var(--muted);
    font-weight: var(--weight-label);
  }
  .search input {
    min-width: 230px;
    border: 1px solid var(--ink);
    border-radius: var(--radius-control);
    padding: 0.75rem 0.9rem;
    font-size: 0.85rem;
    min-height: var(--control-min-height);
    color: var(--ink);
    background: var(--paper);
  }
  @media (max-width: 600px) {
    .library-heading {
      gap: 18px;
    }
    .library-toolbar {
      gap: 16px;
    }
    .library-actions {
      width: 100%;
    }
    .create {
      justify-content: center;
    }
    .card-rail > li {
      flex-basis: 85%;
      max-width: 320px;
    }
    .widget-card {
      padding: 18px;
    }
    .search,
    .search input {
      width: 100%;
      min-width: 0;
    }
    .library-toolbar nav {
      max-width: 100%;
      flex-wrap: wrap;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .widget-card {
      transition: none;
    }
  }
</style>
