<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { ArrowUpRight, Check, ChevronDown, Copy } from '@lucide/svelte';

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'first-pattern', label: 'First pattern' },
    { id: 'read-the-source', label: 'Syntax' },
    { id: 'step-types', label: 'Step types' },
    { id: 'grouped-steps', label: 'Steps & timers' },
    { id: 'control-flow', label: 'Control flow' },
    { id: 'ai-and-control', label: 'AI & control' },
    { id: 'try-the-editor', label: 'Editor' },
  ];
  let activeSection = $state('overview');
  let contentsOpen = $state(false);
  let copyStatus = $state<Record<string, string>>({});

  const example = `:language 1
:title "A small check-in"

!ask focus {
    What would you like to explore?
}

!show {
    You named {{focus}}. Take a moment with that.
}

-> end`;
  const timerExample = `:language 1
:title "A timed reflection"

reflection = !form {
    :title "Take a moment"
    !show {
        Consider what you would like to do next.
    }
    !timer pause {
        :duration 60
        :blocking true
        :sticky false
        Start when you are ready.
    }
}

-> end`;

  async function copySource(filename: string, source: string) {
    try {
      await navigator.clipboard.writeText(source);
      copyStatus[filename] = 'Copied';
    } catch {
      copyStatus[filename] = 'Select code to copy';
    }
  }

  onMount(() => {
    const headings = sections.map(({ id }) => document.getElementById(id));
    const trackSection = () => {
      const current = headings
        .filter((heading) => heading && heading.getBoundingClientRect().top <= 160)
        .at(-1);
      activeSection = current?.id ?? 'overview';
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        activeSection = 'try-the-editor';
      }
    };
    trackSection();
    window.addEventListener('scroll', trackSection, { passive: true });
    return () => window.removeEventListener('scroll', trackSection);
  });
</script>

<svelte:head>
  <title>Pattern Language documentation · Patternverse</title>
  <meta
    name="description"
    content="Learn to read and write Pattern Language: questions, choices, grouped steps, timers, and explicit control flow for guided practices."
  />
</svelte:head>

{#snippet navigation()}
  <nav aria-label="On this page">
    {#each sections as section (section.id)}
      <a
        href={'#' + section.id}
        aria-current={activeSection === section.id ? 'location' : undefined}
        onclick={() => {
          activeSection = section.id;
          contentsOpen = false;
        }}>{section.label}</a
      >
    {/each}
  </nav>
{/snippet}

{#snippet sourceExample(filename: string, source: string)}
  <figure class="source-example">
    <figcaption>
      <span>{filename}</span>
      <button
        type="button"
        onclick={() => copySource(filename, source)}
        aria-label={`Copy ${filename}`}
      >
        {#if copyStatus[filename] === 'Copied'}<Check size={15} aria-hidden="true" />{:else}<Copy
            size={15}
            aria-hidden="true"
          />{/if}
        <span aria-live="polite">{copyStatus[filename] ?? 'Copy'}</span>
      </button>
    </figcaption>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable source examples need keyboard focus.) -->
    <pre tabindex="0" role="region" aria-label={`${filename} source`}><code>{source}</code></pre>
  </figure>
{/snippet}

<main class="language-docs">
  <aside class="desktop-contents">
    <div class="contents-panel">
      <p class="contents-label">On this page</p>
      {@render navigation()}
    </div>
  </aside>

  <article class="docs-article" aria-labelledby="language-heading">
    <details class="mobile-contents" bind:open={contentsOpen}>
      <summary>On this page <ChevronDown size={16} aria-hidden="true" /></summary>
      {@render navigation()}
    </details>

    <header id="overview" class="docs-intro">
      <div class="docs-meta">
        <p><a href={resolve('/')}>Patternverse</a><span aria-hidden="true">/</span>Documentation</p>
        <span class="language-version">Language 1</span>
      </div>
      <h1 id="language-heading">Pattern Language</h1>
      <p class="docs-lede">Readable source for guided practices.</p>
      <p>
        Pattern Language describes questions, choices, and steps in plain text. You write it as
        Pattern Markdown: the words remain readable, while a small vocabulary tells Patternverse
        when to ask for a response or move to another step.
      </p>
    </header>

    <section id="first-pattern" aria-labelledby="first-pattern-heading">
      <h2 id="first-pattern-heading">Your first pattern</h2>
      <p>
        This complete example asks a question, uses the answer in a short reflection, and ends. The
        text inside each block is what the person sees.
      </p>
      {@render sourceExample('a-small-check-in.pattern.md', example)}
    </section>

    <section id="read-the-source" aria-labelledby="read-source-heading">
      <h2 id="read-source-heading">Reading the source</h2>
      <p>
        Headers describe the pattern. Instructions describe its steps. A named response can be used
        in later text.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Syntax</th><th scope="col">Meaning</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>:language 1</code></th><td>Declares the language version.</td
            ></tr
          >
          <tr><th scope="row"><code>:title</code></th><td>Gives the practice a title.</td></tr>
          <tr
            ><th scope="row"><code>!ask focus</code></th><td
              >Waits for a text response and names it <code>focus</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>{'{{focus}}'}</code></th><td
              >Places that response into later text.</td
            ></tr
          >
          <tr><th scope="row"><code>!show</code></th><td>Displays authored text.</td></tr>
          <tr
            ><th scope="row"><code>-&gt; end</code></th><td>Finishes the pattern explicitly.</td
            ></tr
          >
        </tbody>
      </table>
    </section>

    <section id="step-types" aria-labelledby="steps-heading">
      <h2 id="steps-heading">Step types</h2>
      <p>
        Choose the interaction that fits the step. These are the basic building blocks; responses
        are confirmed by the person using the practice.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Instruction</th><th scope="col">Use it to</th></tr></thead>
        <tbody>
          <tr><th scope="row"><code>!ask</code></th><td>Collect a text response.</td></tr>
          <tr
            ><th scope="row"><code>!choose</code></th><td
              >Offer a single choice, or multiple choices with <code>[multi]</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!rank</code></th><td
              >Ask the person to arrange the offered items in order.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!rate</code></th><td
              >Collect a rating within an authored range.</td
            ></tr
          >
          <tr><th scope="row"><code>!show</code></th><td>Present text or a reflection.</td></tr>
          <tr
            ><th scope="row"><code>!form</code></th><td
              >Group text, questions, and timers into one worksheet step.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!timer</code></th><td
              >Add a countdown with an authored duration.</td
            ></tr
          >
        </tbody>
      </table>
    </section>

    <section id="grouped-steps" aria-labelledby="grouped-heading">
      <h2 id="grouped-heading">Grouped steps and timers</h2>
      <p>
        A form keeps related content together. For example, a single step can show an instruction
        with a timer directly beneath it.
      </p>
      {@render sourceExample('timed-reflection.pattern.md', timerExample)}
      <dl class="parameter-list">
        <div>
          <dt><code>:duration 60</code></dt>
          <dd>Sets the countdown to 60 seconds.</dd>
        </div>
        <div>
          <dt><code>:blocking true</code></dt>
          <dd>
            Keeps Continue unavailable until the timer finishes. The person then confirms
            continuation.
          </dd>
        </div>
        <div>
          <dt><code>:sticky false</code></dt>
          <dd>
            Keeps the timer in this step. With <code>true</code>, a started timer moves to the
            practice’s sticky timer area.
          </dd>
        </div>
      </dl>
    </section>

    <section id="control-flow" aria-labelledby="flow-heading">
      <h2 id="flow-heading">Control flow</h2>
      <p>
        A practice can follow a different path based on a response, or repeat a step. The paths are
        written in the source.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Instruction</th><th scope="col">Purpose</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>?match</code></th><td
              >Choose an authored path based on a value, such as a selected choice.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>?branch</code></th><td
              >Choose an authored path using explicit conditions.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>?loop</code></th><td
              >Repeat a step, with an optional maximum number of iterations. The person can stop the
              loop.</td
            ></tr
          >
          <tr><th scope="row"><code>-&gt; end</code></th><td>Complete the practice.</td></tr>
        </tbody>
      </table>
    </section>

    <section id="ai-and-control" aria-labelledby="control-heading">
      <h2 id="control-heading">AI and participant control</h2>
      <p>
        Ordinary authored text and response references do not request AI wording. An explicit <code
          >~</code
        > marker can ask for a different phrasing of a predetermined conversational move.
      </p>
      <div class="docs-note">
        <p class="note-label">Wording and steps</p>
        <p>
          Where AI is used to phrase a step, that wording is bounded by the authored step. It does
          not silently invent a new path or make the person’s choices for them.
        </p>
      </div>
      <p>
        The source stays portable and inspectable. The person supplies their responses and remains
        in control of whether to continue.
      </p>
    </section>

    <section id="try-the-editor" class="docs-next" aria-labelledby="editor-heading">
      <h2 id="editor-heading">Try the editor</h2>
      <p>
        Open the editor to explore a practice’s source and preview. Change a line, then restart the
        preview to try the updated version.
      </p>
      <a class="editor-action" href={resolve('/editor')}
        >Open the editor <ArrowUpRight size={16} aria-hidden="true" /></a
      >
    </section>
  </article>
</main>

<style>
  .language-docs {
    display: grid;
    grid-template-columns: 200px minmax(0, 760px);
    align-items: start;
    justify-content: center;
    gap: 64px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 48px 40px 80px;
    color: var(--ink);
    background: var(--paper);
    overflow: visible;
  }
  .desktop-contents {
    position: sticky;
    top: 50dvh;
    max-height: calc(100dvh - 48px);
    margin-top: calc(50dvh - 140px);
    transform: translateY(-50%);
    box-sizing: border-box;
    display: flex;
    overflow-y: auto;
  }
  .contents-panel {
    width: 100%;
    flex-shrink: 0;
    margin-block: auto;
  }
  .contents-label {
    margin: 0 0 10px;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 650;
  }
  nav {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    font-weight: 400;
    text-transform: none;
  }
  nav a {
    padding: 8px 12px;
    border-left: 2px solid transparent;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  nav a:hover {
    color: var(--ink);
  }
  nav a[aria-current='location'] {
    color: var(--green-dark);
    border-left-color: var(--green-dark);
    font-weight: 650;
  }
  .docs-article {
    min-width: 0;
    font-size: 0.95rem;
    line-height: 1.75;
  }
  .docs-intro,
  section {
    scroll-margin-top: 32px;
  }
  .docs-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.5;
  }
  .docs-meta p {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }
  .docs-meta a:hover {
    color: var(--green-dark);
  }
  .language-version {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  h1 {
    margin: 0 0 12px;
    font-size: clamp(2rem, 3.8vw, 2.8rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.15;
  }
  .docs-lede {
    margin: 0 0 18px;
    color: var(--muted);
    font-size: 1.12rem;
    line-height: 1.55;
  }
  p {
    margin: 0 0 16px;
  }
  section {
    margin-top: 44px;
    padding-top: 28px;
    border-top: 1px solid #e1e3da;
  }
  h2 {
    margin: 0 0 16px;
    font-size: 1.4rem;
    font-weight: 750;
    letter-spacing: -0.025em;
    line-height: 1.35;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.82em;
    padding: 2px 5px;
    background: #f0f2ec;
    border-radius: 3px;
    overflow-wrap: anywhere;
  }
  .source-example {
    margin: 24px 0 0;
    border: 1px solid var(--ink);
    border-radius: 5px;
    background: var(--ink);
    color: var(--paper);
    overflow: hidden;
  }
  .source-example figcaption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid #45473e;
    font-size: 0.72rem;
    line-height: 1.5;
  }
  .source-example figcaption > span {
    overflow-wrap: anywhere;
  }
  .source-example button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 6px 9px;
    border: 1px solid #53554d;
    border-radius: 4px;
    background: transparent;
    color: var(--paper);
    font: inherit;
    cursor: pointer;
  }
  .source-example button:hover {
    color: var(--ink);
    background: var(--paper);
  }
  pre {
    margin: 0;
    padding: 22px;
    overflow-x: auto;
    font:
      0.8rem/1.8 ui-monospace,
      SFMono-Regular,
      Consolas,
      monospace;
  }
  pre code {
    padding: 0;
    background: transparent;
    font: inherit;
    overflow-wrap: normal;
  }
  pre:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: -3px;
  }
  .reference-table {
    width: 100%;
    margin: 24px 0 0;
    border-collapse: collapse;
    font-size: 0.86rem;
    line-height: 1.65;
    text-align: left;
    table-layout: fixed;
  }
  .reference-table th:first-child {
    width: 29%;
  }
  .reference-table thead th {
    padding: 9px 0;
    font-size: 0.73rem;
    color: var(--muted);
    font-weight: 650;
    border-bottom: 1px solid #d7dbd0;
  }
  .reference-table tbody th,
  .reference-table td {
    padding: 13px 0;
    vertical-align: top;
    border-bottom: 1px solid #e5e7df;
  }
  .reference-table tbody th {
    padding-right: 20px;
    font-weight: 400;
  }
  .reference-table tbody tr:last-child th,
  .reference-table tbody tr:last-child td {
    border-bottom: 0;
  }
  .parameter-list {
    margin: 24px 0 0;
    font-size: 0.86rem;
  }
  .parameter-list > div {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid #e5e7df;
  }
  .parameter-list > div:last-child {
    border: 0;
  }
  dt,
  dd {
    margin: 0;
  }
  .docs-note {
    padding: 14px 18px;
    margin: 24px 0;
    border-left: 3px solid var(--green-dark);
    background: #f4f7f1;
    font-size: 0.88rem;
    line-height: 1.65;
  }
  .docs-note p:last-child {
    margin: 0;
  }
  .note-label {
    margin-bottom: 6px;
    font-size: 0.75rem;
    font-weight: 750;
  }
  .editor-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 10px 14px;
    border: 1px solid #bfc2ba;
    border-radius: 5px;
    font-size: 0.8rem;
    font-weight: 650;
  }
  .editor-action:hover {
    color: var(--paper);
    background: var(--ink);
    border-color: var(--ink);
  }
  .mobile-contents {
    display: none;
  }
  @media (min-width: 741px) and (max-width: 1000px) {
    .language-docs {
      grid-template-columns: 168px minmax(0, 760px);
      gap: 32px;
      padding-inline: 28px;
    }
  }
  @media (max-width: 740px) {
    .language-docs {
      display: block;
      padding: 28px max(5vw, 20px) 56px;
    }
    .desktop-contents {
      display: none;
    }
    .mobile-contents {
      display: block;
      margin-bottom: 30px;
      border-bottom: 1px solid #e1e3da;
    }
    .mobile-contents summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0 16px;
      font-size: 0.8rem;
      font-weight: 650;
      cursor: pointer;
      list-style: none;
      min-height: 44px;
    }
    .mobile-contents summary::-webkit-details-marker {
      display: none;
    }
    .mobile-contents[open] summary :global(svg) {
      transform: rotate(180deg);
    }
    .mobile-contents nav {
      padding-bottom: 16px;
    }
    .mobile-contents nav a {
      min-height: 44px;
    }
    .docs-article {
      max-width: 760px;
      margin: 0 auto;
    }
  }
  @media (max-width: 540px) {
    .docs-meta {
      font-size: 0.68rem;
    }
    .docs-lede {
      font-size: 1.05rem;
    }
    h2 {
      font-size: 1.25rem;
    }
    section {
      margin-top: 32px;
      padding-top: 24px;
    }
    .reference-table th:first-child {
      width: 37%;
    }
    .reference-table tbody th {
      padding-right: 12px;
    }
    .parameter-list > div {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
    }
    .source-example figcaption {
      padding: 10px 12px;
    }
    .source-example button {
      min-height: 44px;
    }
    pre {
      padding: 16px;
      font-size: 0.75rem;
    }
  }
</style>
