<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { ArrowLeft, ArrowRight, Search, Link } from '@lucide/svelte';
  import DocumentationNav from '$lib/pattern-language/DocumentationNav.svelte';
  import CodeExample from '$lib/pattern-language/CodeExample.svelte';
  import ParameterTable from '$lib/pattern-language/ParameterTable.svelte';
  import { documentationLocation } from '$lib/pattern-language/location.svelte';
  import {
    componentCatalog,
    componentCategories,
    findComponents,
    type LanguageComponent,
  } from '$lib/pattern-language/component-catalog';

  let query = $state('');
  let category = $state('All components');
  const matches = $derived(findComponents(query, category));
  const location = documentationLocation();
  const selection = $derived(location.hash.slice(1).split('/'));
  const component = $derived(matches.find((item) => item.id === selection[0]) ?? matches[0]);
  const variant = $derived(
    component?.variants.find((item) => component.id === selection[0] && item.id === selection[1]) ??
      component?.variants.find(
        (item) =>
          query.trim() &&
          [item.label, ...(item.parameters ?? []).map((parameter) => parameter.name)]
            .join(' ')
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ) ??
      component?.variants[0],
  );
  const index = $derived(component ? matches.indexOf(component) : -1);
  const parameters = $derived(variant?.parameters ?? component?.parameters ?? []);
  const result = $derived(variant?.result ?? component?.result);

  function hash(item: LanguageComponent, variantId = item.variants[0].id): `#${string}` {
    return `#${item.id}/${variantId}`;
  }
  function chooseVariant(value: string) {
    if (component)
      void goto(resolve(`/about/pattern-language/components${hash(component, value)}`), {
        keepFocus: true,
        noScroll: true,
      });
  }
  function clearFilters() {
    query = '';
    category = 'All components';
  }
</script>

<svelte:head>
  <title>Components · Pattern Language · Patternverse</title>
  <meta
    name="description"
    content="Browse Pattern Language components with live examples, editable source, parameter types and defaults, return values, and usage constraints."
  />
</svelte:head>

<main class="component-documentation">
  <!-- Hashes select variants after hydration; every documented target also exists in static HTML. -->
  <div hidden aria-hidden="true">
    {#each componentCatalog as item (item.id)}
      {#each item.variants as example (example.id)}
        <span id={`${item.id}/${example.id}`}></span>
      {/each}
    {/each}
  </div>
  <header class="gallery-intro">
    <p class="breadcrumb">
      <a href={resolve('/')}>Patternverse</a><span aria-hidden="true">/</span>Documentation
    </p>
    <DocumentationNav active="components" />
    <div class="intro-title">
      <h1>Components</h1>
      <span class="version">Language 1</span>
    </div>
    <p class="lede">Explore a building block. Inspect its contract. Try the result.</p>
    <p class="intro-copy">
      Questions, displays, flow controls, and extension widgets, with editable examples powered by
      the editor’s runtime. AI examples use sample replies; your test responses stay temporary.
    </p>
  </header>

  <div class="gallery-filters" role="search" aria-label="Find a language component">
    <label class="search-field"
      ><span>Search components</span>
      <div>
        <Search size={17} aria-hidden="true" /><input
          type="search"
          bind:value={query}
          placeholder="Name, command, or parameter…"
        />
      </div></label
    >
    <label class="category-field"
      >Category<select bind:value={category} aria-label="Category"
        ><option>All components</option>{#each componentCategories as name (name)}<option
            >{name}</option
          >{/each}</select
      ></label
    >
    <p class="result-count" role="status">
      {matches.length} of {componentCatalog.length} components
    </p>
  </div>

  {#if component && variant && result}
    <div class="gallery-layout">
      <aside class="component-index">
        <nav aria-label="Component index">
          {#each componentCategories as name (name)}
            {@const components = matches.filter((item) => item.category === name)}
            {#if components.length}
              <div class="component-group">
                <h3>{name}</h3>
                <div class="component-links">
                  {#each components as item (item.id)}
                    <a
                      href={resolve(`/about/pattern-language/components${hash(item)}`)}
                      data-sveltekit-noscroll
                      aria-current={component.id === item.id ? 'true' : undefined}
                      ><span>{item.name}</span><code>{item.command}</code></a
                    >
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </nav>
      </aside>
      <article class="component-detail" aria-labelledby="component-heading">
        <div class="carousel-controls" role="group" aria-label="Browse components">
          {#if index > 0}<a
              href={resolve(`/about/pattern-language/components${hash(matches[index - 1])}`)}
              data-sveltekit-noscroll
              aria-label="Previous component"><ArrowLeft size={15} aria-hidden="true" />Previous</a
            >{:else}<button type="button" disabled aria-label="Previous component"
              ><ArrowLeft size={15} aria-hidden="true" />Previous</button
            >{/if}
          <p aria-live="polite">{index + 1} / {matches.length}</p>
          {#if index < matches.length - 1}<a
              href={resolve(`/about/pattern-language/components${hash(matches[index + 1])}`)}
              data-sveltekit-noscroll
              aria-label="Next component">Next<ArrowRight size={15} aria-hidden="true" /></a
            >{:else}<button type="button" disabled aria-label="Next component"
              >Next<ArrowRight size={15} aria-hidden="true" /></button
            >{/if}
        </div>
        <header class="component-heading">
          <p class="category-label">{component.category}</p>
          <div class="component-title">
            <h2 id="component-heading">{component.name}</h2>
            <a
              class="permalink"
              href={resolve(`/about/pattern-language/components${hash(component, variant.id)}`)}
              aria-label={`Link to ${component.name}`}
              data-sveltekit-noscroll><Link size={16} aria-hidden="true" /></a
            >
          </div>
          <code class="command">{component.command}</code>
          <p>{component.summary}</p>
        </header>
        <section class="live-example" aria-labelledby="example-heading">
          <div class="example-heading">
            <h3 id="example-heading">Try it</h3>
            {#if component.variants.length > 1}<label class="variant-field"
                >Example variant<select
                  value={variant.id}
                  aria-label="Example variant"
                  onchange={(event) => chooseVariant(event.currentTarget.value)}
                  >{#each component.variants as item (item.id)}<option value={item.id}
                      >{item.label}</option
                    >{/each}</select
                ></label
              >{:else}<span class="variant-label">{variant.label}</span>{/if}
          </div>
          {#key `${component.id}/${variant.id}`}<CodeExample
              filename={variant.filename}
              source={variant.source}
              options={variant.options}
            />{/key}
        </section>
        <section class="reference-section" aria-labelledby="parameters-heading">
          <h3 id="parameters-heading">Parameters</h3>
          <p class="section-description">
            Types, requiredness, defaults, and constraints for {variant.parameters
              ? 'this variant'
              : 'this component'}.
          </p>
          <ParameterTable {parameters} />
        </section>
        <section class="reference-section" aria-labelledby="result-heading">
          <h3 id="result-heading">Returned value</h3>
          <code class="return-type">{result.type}</code>
          <p>{result.description}</p>
          {#if result.fields?.length}<ParameterTable
              parameters={result.fields}
              label="Returned fields"
            />{/if}
        </section>
        <section class="reference-section" aria-labelledby="notes-heading">
          <h3 id="notes-heading">Usage notes</h3>
          <ul>
            {#each component.notes as note (note)}<li>{note}</li>{/each}
          </ul>
          <a class="guide-link" href={resolve(`/about/pattern-language#${component.guideAnchor}`)}
            >Read the language guide<ArrowRight size={14} aria-hidden="true" /></a
          >
        </section>
      </article>
    </div>
  {:else}
    <section class="empty-results" aria-labelledby="empty-heading">
      <h2 id="empty-heading">No components match</h2>
      <p>
        Try a name such as “timer”, a command such as “!ask”, or a parameter such as “duration”.
      </p>
      <button type="button" onclick={clearFilters}>Clear filters</button>
    </section>
  {/if}
</main>

<style>
  .component-documentation {
    max-width: 1520px;
    margin: 0 auto;
    padding: 36px 32px 80px;
    color: var(--ink, #181814);
  }
  .gallery-intro {
    margin-bottom: 32px;
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 20px;
    color: var(--muted, #62655f);
    font-size: 12px;
  }
  .intro-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: clamp(2rem, 3.8vw, 2.8rem);
    line-height: 1.15;
    letter-spacing: -0.04em;
  }
  .version {
    font:
      12px ui-monospace,
      monospace;
    color: var(--muted, #62655f);
  }
  .lede {
    margin: 0 0 12px;
    color: var(--muted, #62655f);
    font-size: 18px;
  }
  .intro-copy {
    max-width: 760px;
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
  }
  .gallery-filters {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 16px;
    padding: 20px;
    margin-bottom: 28px;
    border: 1px solid #dfe4d9;
    border-radius: 7px;
    background: #f8f9f5;
  }
  .search-field,
  .category-field {
    display: grid;
    gap: 7px;
    font-size: 11px;
    font-weight: 650;
  }
  .search-field {
    flex: 1;
    min-width: 200px;
  }
  .search-field div {
    display: flex;
    align-items: center;
    padding: 0 12px;
    border: 1px solid #ccd3c5;
    border-radius: 4px;
    background: var(--paper, #fff);
    color: var(--muted, #62655f);
  }
  input,
  select {
    min-height: 42px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid #ccd3c5;
    border-radius: 4px;
    background: var(--paper, #fff);
    color: var(--ink, #181814);
    font: inherit;
    font-size: 13px;
  }
  input {
    width: 100%;
    border: 0;
    background: transparent;
  }
  .search-field div:focus-within {
    outline: 2px solid var(--green-dark, #007a4d);
    outline-offset: 2px;
  }
  input:focus-visible {
    outline: none;
  }
  select:focus-visible,
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--green-dark, #007a4d);
    outline-offset: 3px;
  }
  .result-count {
    margin: 0 0 11px;
    font-size: 12px;
    color: var(--muted, #62655f);
    white-space: nowrap;
  }
  .gallery-layout {
    display: grid;
    grid-template-columns: 176px minmax(0, 1fr);
    gap: 48px;
    align-items: start;
  }
  .component-index {
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - 48px);
    overflow-y: auto;
  }
  nav {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
    text-transform: none;
    font-weight: 400;
  }
  nav a {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 4px;
    padding: 10px 12px;
    border-left: 2px solid transparent;
    color: var(--muted, #62655f);
    font-size: 12px;
    line-height: 1.5;
  }
  nav a code {
    font-size: 10px;
    overflow-wrap: anywhere;
  }
  .component-group + .component-group {
    margin-top: 20px;
  }
  .component-group h3 {
    margin: 0 0 8px;
    padding: 0 14px;
    color: var(--muted, #62655f);
    font-size: 11px;
    font-weight: 650;
    line-height: 1.5;
    letter-spacing: 0;
  }
  .component-links {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  nav a:hover {
    color: var(--ink, #181814);
    background: #f5f7f0;
  }
  nav a[aria-current='true'] {
    border-left-color: var(--green-dark, #007a4d);
    background: #f0f6ed;
    color: var(--green-dark, #007a4d);
  }
  nav a[aria-current='true'] span {
    font-weight: 700;
  }
  .component-detail {
    min-width: 0;
  }
  .carousel-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 1px solid #dfe4d9;
  }
  .carousel-controls a,
  .carousel-controls button,
  .empty-results button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    border: 1px solid #ccd3c5;
    border-radius: 4px;
    padding: 8px 12px;
    font: inherit;
    font-size: 12px;
    background: var(--paper, #fff);
    color: var(--ink, #181814);
    cursor: pointer;
    text-transform: none;
  }
  .carousel-controls button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .carousel-controls p {
    margin: 0;
    color: var(--muted, #62655f);
    font:
      12px ui-monospace,
      monospace;
  }
  .category-label {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 650;
    color: var(--green-dark, #007a4d);
  }
  .component-title {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-size: 28px;
    line-height: 1.25;
    letter-spacing: -0.03em;
  }
  .permalink {
    color: var(--muted, #62655f);
    padding: 5px;
  }
  .command {
    display: inline-block;
    margin-top: 12px;
    padding: 4px 7px;
    border-radius: 3px;
    background: #eff3e9;
    font:
      13px ui-monospace,
      monospace;
    overflow-wrap: anywhere;
  }
  .component-heading > p:last-child {
    max-width: 780px;
    margin: 16px 0 0;
    font-size: 14px;
    line-height: 1.75;
  }
  .live-example {
    margin-top: 28px;
  }
  .example-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }
  .variant-field {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--muted, #62655f);
  }
  .variant-label {
    font-size: 12px;
    color: var(--muted, #62655f);
  }
  .reference-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #dfe4d9;
    font-size: 14px;
    line-height: 1.75;
  }
  .reference-section > p {
    max-width: 800px;
  }
  .section-description {
    color: var(--muted, #62655f);
    margin: 8px 0 16px;
    font-size: 13px;
  }
  .return-type {
    display: block;
    margin-top: 16px;
    padding: 14px;
    border: 1px solid #dfe4d9;
    border-radius: 4px;
    background: #f7f8f3;
    font:
      13px/1.7 ui-monospace,
      monospace;
    overflow-wrap: anywhere;
  }
  ul {
    max-width: 800px;
    padding-left: 20px;
  }
  li {
    padding-left: 4px;
    margin: 10px 0;
  }
  .guide-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--green-dark, #007a4d);
    font-size: 13px;
    font-weight: 650;
  }
  .empty-results {
    padding: 48px 20px;
    border: 1px solid #dfe4d9;
    border-radius: 7px;
    text-align: center;
  }
  .empty-results p {
    margin: 16px 0 24px;
    font-size: 14px;
    line-height: 1.7;
  }
  @media (max-width: 1000px) {
    .gallery-layout {
      grid-template-columns: 152px minmax(0, 1fr);
      gap: 24px;
    }
  }
  @media (max-width: 740px) {
    .component-documentation {
      padding: 28px max(5vw, 20px) 56px;
    }
    .gallery-filters {
      padding: 16px;
      gap: 12px;
    }
    .search-field,
    .category-field {
      width: 100%;
    }
    .result-count {
      margin: 4px 0 0;
    }
    input,
    select {
      font-size: 16px;
    }
    .gallery-layout {
      display: block;
    }
    .component-index {
      position: static;
      max-height: 200px;
      margin-bottom: 24px;
      padding: 6px;
      border: 1px solid #dfe4d9;
      border-radius: 5px;
    }
    .component-links {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    nav a {
      min-height: 64px;
      padding: 10px;
    }
    .carousel-controls {
      gap: 10px;
    }
    .carousel-controls a,
    .carousel-controls button {
      min-height: 44px;
    }
    .variant-field {
      width: 100%;
      justify-content: space-between;
    }
    .variant-field select {
      max-width: 68%;
    }
    h2 {
      font-size: 25px;
    }
  }
</style>
