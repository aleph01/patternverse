<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { ArrowLeft, ArrowRight, Search, Link } from '@lucide/svelte';
  import DocumentationNav from '$lib/pattern-language/DocumentationNav.svelte';
  import CodeExample from '$lib/pattern-language/CodeExample.svelte';
  import ParameterTable from '$lib/pattern-language/ParameterTable.svelte';
  import { documentationLocation } from '$lib/pattern-language/location.svelte';
  import {
    functionCatalog,
    functionCategories,
    findFunctions,
    type LanguageFunction,
  } from '$lib/pattern-language/function-catalog';

  let query = $state('');
  let category = $state('All functions');
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  const matches = $derived(findFunctions(query, category));
  const location = documentationLocation();
  const selection = $derived(location.hash.slice(1).split('/'));
  const entry = $derived(matches.find((item) => item.id === selection[0]) ?? matches[0]);
  const variant = $derived(
    entry?.variants.find((item) => entry.id === selection[0] && item.id === selection[1]) ??
      entry?.variants[0],
  );
  const index = $derived(entry ? matches.indexOf(entry) : -1);

  function hash(item: LanguageFunction, variantId = item.variants[0].id): `#${string}` {
    return `#${item.id}/${variantId}`;
  }
  function chooseVariant(value: string) {
    if (entry)
      void goto(resolve(`/about/pattern-language/functions${hash(entry, value)}`), {
        keepFocus: true,
        noScroll: true,
      });
  }
  function clearFilters() {
    query = '';
    category = 'All functions';
  }
</script>

<svelte:head>
  <title>Functions · Pattern Language · Patternverse</title>
  <meta
    name="description"
    content="All built-in Pattern Language functions, with signatures, typed parameters, return values, pipelines, and editable live examples."
  />
</svelte:head>

<main class="function-documentation">
  <!-- Hashes select variants after hydration; every documented target also exists in static HTML. -->
  <div hidden aria-hidden="true">
    {#each functionCatalog as item (item.id)}
      {#each item.variants as example (example.id)}
        <span id={`${item.id}/${example.id}`}></span>
      {/each}
    {/each}
  </div>
  <header class="intro">
    <p class="breadcrumb">
      <a href={resolve('/')}>Patternverse</a><span aria-hidden="true">/</span>Documentation
    </p>
    <DocumentationNav active="functions" />
    <div class="intro-title">
      <h1>Functions</h1>
      <span class="version">Language 1</span>
    </div>
    <p class="lede">Transform values inline. See exactly what comes back.</p>
    <p class="intro-copy">
      Built-in functions return new values without AI calls. Use pure functions in bindings, helper
      bodies, and pipelines. Unseeded <code>shuffle</code> is a whole-binding operation; supply a text
      seed to use it as a pure function. Bind a result before displaying it in Markdown.
    </p>
    <p class="pipeline-note">
      <code>value |&gt; function(extra)</code> means <code>function(value, extra)</code>. In the
      signatures below, <code>T</code>, <code>U</code>, <code>A</code>, and <code>R</code> stand for matching
      value types, not words you need to write in your source.
    </p>
    <p class="pipeline-note">
      Optional results can use <code>first(notes) ?? "No notes yet."</code> for a default only when
      absent. See
      <a href={resolve('/about/pattern-language#optional-values')}
        >optional values and the ?? operator</a
      > for presence checks, precedence, and a live example.
    </p>
  </header>

  <p class="pipeline-note lambda-note">
    Callback functions accept <code>_ &gt;= 7</code> or <code>n =&gt; n &gt;= 7</code>, with
    inferred types and captures of earlier immutable values. See
    <a href={resolve('/about/pattern-language#lambdas')}>inline lambdas</a> for both syntaxes and nested
    examples.
  </p>

  <div class="filters" role="search" aria-label="Find a built-in function">
    <label class="search-field"
      ><span>Search functions</span>
      <div>
        <Search size={17} aria-hidden="true" /><input
          type="search"
          bind:value={query}
          placeholder="Name, parameter, or return type…"
        />
      </div></label
    >
    <label class="category-field"
      >Category<select bind:value={category} aria-label="Category"
        ><option>All functions</option>{#each functionCategories as name (name)}<option
            >{name}</option
          >{/each}</select
      ></label
    >
    <p class="result-count" role="status">{matches.length} of {functionCatalog.length} functions</p>
  </div>

  {#if entry && variant}
    <div class="reference-layout">
      <aside class="function-index">
        <nav aria-label="Function index">
          {#each functionCategories as name (name)}
            {@const functions = matches.filter((item) => item.category === name)}
            {#if functions.length}
              <div class="function-group">
                <h3>{name}</h3>
                <div class="function-links">
                  {#each functions as item (item.id)}
                    <a
                      href={resolve(`/about/pattern-language/functions${hash(item)}`)}
                      data-sveltekit-noscroll
                      aria-current={entry.id === item.id ? 'true' : undefined}
                      ><code>{item.id}</code></a
                    >
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </nav>
      </aside>
      <article aria-labelledby="function-heading">
        <div class="browse-controls" role="group" aria-label="Browse functions">
          {#if index > 0}<a
              href={resolve(`/about/pattern-language/functions${hash(matches[index - 1])}`)}
              data-sveltekit-noscroll
              aria-label="Previous function"><ArrowLeft size={15} aria-hidden="true" />Previous</a
            >{:else}<button disabled aria-label="Previous function"
              ><ArrowLeft size={15} aria-hidden="true" />Previous</button
            >{/if}
          <p aria-live="polite">{index + 1} / {matches.length}</p>
          {#if index < matches.length - 1}<a
              href={resolve(`/about/pattern-language/functions${hash(matches[index + 1])}`)}
              data-sveltekit-noscroll
              aria-label="Next function">Next<ArrowRight size={15} aria-hidden="true" /></a
            >{:else}<button disabled aria-label="Next function"
              >Next<ArrowRight size={15} aria-hidden="true" /></button
            >{/if}
        </div>
        <header class="function-heading">
          <p class="category-label">{entry.category}</p>
          <div class="title">
            <h2 id="function-heading">{entry.id}</h2>
            <a
              class="permalink"
              href={resolve(`/about/pattern-language/functions${hash(entry, variant.id)}`)}
              aria-label={`Link to ${entry.id}`}
              data-sveltekit-noscroll><Link size={16} aria-hidden="true" /></a
            >
          </div>
          <p>{entry.summary}</p>
          <div class="signatures" aria-label="Function signatures">
            {#each entry.signatures as signature (signature)}<code>{signature}</code>{/each}
          </div>
        </header>
        <section class="live-example" aria-labelledby="example-heading">
          <div class="example-heading">
            <h3 id="example-heading">Try it</h3>
            {#if entry.variants.length > 1}<label class="variant-field"
                >Example variant<select
                  value={variant.id}
                  disabled={!ready}
                  aria-label="Example variant"
                  onchange={(event) => chooseVariant(event.currentTarget.value)}
                  >{#each entry.variants as item (item.id)}<option value={item.id}
                      >{item.label}</option
                    >{/each}</select
                ></label
              >{:else}<span class="variant-label">{variant.label}</span>{/if}
          </div>
          {#key `${entry.id}/${variant.id}`}<CodeExample
              filename={variant.filename}
              source={variant.source}
              options={variant.options}
            />{/key}
        </section>
        <section class="reference-section" aria-labelledby="parameters-heading">
          <h3 id="parameters-heading">Parameters</h3>
          <p class="section-description">
            Arguments are positional and required. A pipeline supplies the first argument.
          </p>
          <ParameterTable parameters={entry.parameters} label="Function parameters" />
        </section>
        <section class="reference-section" aria-labelledby="return-heading">
          <h3 id="return-heading">Returned value</h3>
          <code class="return-type">{entry.result.type}</code>
          <p>{entry.result.description}</p>
        </section>
        <section class="reference-section" aria-labelledby="notes-heading">
          <h3 id="notes-heading">Usage notes</h3>
          <ul>
            {#each entry.notes as note (note)}<li>{note}</li>{/each}
          </ul>
          <a class="guide-link" href={resolve('/about/pattern-language#functions')}
            >Helpers and pipelines in the language guide<ArrowRight
              size={14}
              aria-hidden="true"
            /></a
          >
          {#if entry.id === 'lookup'}<a
              class="guide-link"
              href={resolve('/about/pattern-language#optional-values')}
              >Working with optional values<ArrowRight size={14} aria-hidden="true" /></a
            >{/if}
          {#if entry.id === 'filter'}<a
              class="guide-link"
              href={resolve('/about/pattern-language/components#suggest/filter')}
              >AI candidate filtering<ArrowRight size={14} aria-hidden="true" /></a
            >{/if}
        </section>
      </article>
    </div>
  {:else}
    <section class="empty-results" aria-labelledby="empty-heading">
      <h2 id="empty-heading">No functions match</h2>
      <p>
        Try a name such as “trim”, a parameter such as “seed”, or a return type such as “Optional”.
      </p>
      <button onclick={clearFilters}>Clear filters</button>
    </section>
  {/if}
</main>

<style>
  .function-documentation {
    max-width: 1520px;
    margin: 0 auto;
    padding: 36px 32px 80px;
    color: var(--ink, #181814);
  }
  .intro {
    margin-bottom: 28px;
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
    font-size: 18px;
    color: var(--muted, #62655f);
  }
  .intro-copy,
  .pipeline-note {
    max-width: 860px;
    font-size: 14px;
    line-height: 1.75;
  }
  .pipeline-note {
    margin: 16px 0 0;
    color: var(--muted, #62655f);
    font-size: 13px;
  }
  .lambda-note {
    margin: 0 0 24px;
  }
  code {
    font:
      0.92em/1.7 ui-monospace,
      SFMono-Regular,
      Consolas,
      monospace;
    overflow-wrap: anywhere;
  }
  .filters {
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
  .search-field div:focus-within,
  select:focus-visible,
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--green-dark, #007a4d);
    outline-offset: 3px;
  }
  input:focus-visible {
    outline: none;
  }
  .result-count {
    margin: 0 0 11px;
    font-size: 12px;
    color: var(--muted, #62655f);
    white-space: nowrap;
  }
  .reference-layout {
    display: grid;
    grid-template-columns: 196px minmax(0, 1fr);
    gap: 32px;
    align-items: start;
  }
  .function-index {
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
    font-size: 13px;
    line-height: 1.5;
    min-height: 44px;
  }
  .function-group + .function-group {
    margin-top: 20px;
  }
  .function-group h3 {
    margin: 0 0 8px;
    padding: 0 14px;
    color: var(--muted, #62655f);
    font-size: 11px;
    font-weight: 650;
    line-height: 1.5;
    letter-spacing: 0;
  }
  .function-links {
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
  nav a[aria-current='true'] code {
    font-weight: 700;
  }
  article {
    min-width: 0;
  }
  .browse-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 1px solid #dfe4d9;
  }
  .browse-controls a,
  .browse-controls button,
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
  .browse-controls button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .browse-controls p {
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
  .title {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-size: 28px;
    line-height: 1.3;
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }
  .permalink {
    color: var(--muted, #62655f);
    padding: 5px;
  }
  .function-heading > p:not(.category-label) {
    max-width: 780px;
    font-size: 14px;
    line-height: 1.75;
  }
  .signatures,
  .return-type {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid #dfe4d9;
    border-radius: 4px;
    background: #f7f8f3;
    font-size: 13px;
  }
  .signatures code {
    display: block;
  }
  .signatures code + code {
    margin-top: 8px;
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
  .reference-section > p,
  ul {
    max-width: 800px;
  }
  .section-description {
    color: var(--muted, #62655f);
    margin: 8px 0 16px;
    font-size: 13px;
  }
  .return-type {
    display: block;
  }
  ul {
    padding-left: 20px;
  }
  li {
    padding-left: 4px;
    margin: 10px 0;
  }
  .guide-link {
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    margin-top: 12px;
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
    .reference-layout {
      grid-template-columns: 168px minmax(0, 1fr);
      gap: 24px;
    }
  }
  @media (max-width: 740px) {
    .function-documentation {
      padding: 28px max(5vw, 20px) 56px;
    }
    .filters {
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
    .reference-layout {
      display: block;
    }
    .function-index {
      position: static;
      max-height: 200px;
      margin-bottom: 24px;
      padding: 6px;
      border: 1px solid #dfe4d9;
      border-radius: 5px;
    }
    .function-links {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    nav a {
      min-height: 44px;
      padding: 10px;
    }
    .browse-controls {
      gap: 10px;
    }
    .browse-controls a,
    .browse-controls button {
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
