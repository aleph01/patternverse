<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { ArrowUpRight, ChevronDown } from '@lucide/svelte';
  import CodeExample from '$lib/pattern-language/CodeExample.svelte';
  import DocumentationNav from '$lib/pattern-language/DocumentationNav.svelte';
  import { exampleOptions } from '$lib/pattern-language/options';
  import { visualizationExamples } from '$lib/pattern-language/display-examples';
  import {
    example,
    timerExample,
    typesExample,
    optionalExample,
    coalesceExample,
    decisionExample,
    helperExample,
    placeholderLambdaExample,
    namedLambdaExample,
    reduceExample,
    collectionExample,
    flowExample,
    displayExample,
    semanticExample,
    refineExample,
    markdownExample,
    expressionExample,
    inputExample,
    ratingExample,
    selectionExample,
    branchExample,
    timerOnlyExample,
    openCollectionExample,
    loopExample,
    imageExample,
    videoExample,
    agentExample,
    realizationExample,
    suggestionExample,
    eventExample,
    dataImportExample,
    pinnedImportExample,
  } from '$lib/pattern-language/examples';

  const sections: { id: string; label: string; group?: string }[] = [
    { id: 'overview', label: 'Overview', group: 'Start here' },
    { id: 'first-pattern', label: 'First pattern' },
    { id: 'read-the-source', label: 'Document & Markdown' },
    { id: 'types', label: 'Bindings & types', group: 'Values' },
    { id: 'inputs', label: 'Inputs & outputs' },
    { id: 'optional-values', label: 'Optional values' },
    { id: 'expressions', label: 'Expressions' },
    { id: 'step-types', label: 'Command reference', group: 'Interactions' },
    { id: 'questions', label: 'Questions & ratings' },
    { id: 'choices', label: 'Choices & ranking' },
    { id: 'grouped-steps', label: 'Forms' },
    { id: 'timers', label: 'Timers' },
    { id: 'media', label: 'Images & video' },
    { id: 'control-flow', label: 'Decisions', group: 'Programs' },
    { id: 'loops', label: 'Functional loops' },
    { id: 'functions', label: 'Helpers & lambdas' },
    { id: 'collections', label: 'Collections' },
    { id: 'flows', label: 'Reusable flows' },
    { id: 'imports', label: 'Imports & reference data' },
    { id: 'events', label: 'Message handlers' },
    { id: 'displays', label: 'Data visualization' },
    { id: 'ai-and-control', label: 'AI & refinement', group: 'Execution' },
    { id: 'lifecycle', label: 'Pause, end & replay' },
    { id: 'diagnostics', label: 'Errors & compatibility' },
    { id: 'try-the-editor', label: 'Editor' },
  ];
  let activeSection = $state('overview');
  let contentsOpen = $state(false);

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
    content="Learn Pattern Language: typed bindings, optional values, forms, control flow, collections, reusable flows, data displays, and explicit AI steps."
  />
</svelte:head>

{#snippet navigation()}
  <nav aria-label="On this page">
    {#each sections as section (section.id)}
      {#if section.group}<p class="nav-group">{section.group}</p>{/if}
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
  <CodeExample {filename} {source} options={exampleOptions[filename]} />
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
      <DocumentationNav active="guide" />
      <h1 id="language-heading">Pattern Language</h1>
      <p class="docs-lede">Readable source for guided practices.</p>
      <p>
        Pattern Language describes questions, choices, and steps in plain text. You write it as
        Pattern Markdown: the words remain readable, while a small vocabulary tells Patternverse
        when to ask for a response or move to another step.
      </p>
      <p>
        The features below all use <code>:language 1</code>. Types, optional values, and reusable
        flows are additive; existing source remains supported. The editor preview and practices run
        through the same compiler and runtime.
      </p>
      <div class="docs-note">
        <p class="note-label">Read the code. Try the result.</p>
        <p>
          Each runnable example pairs highlighted source with the real preview. Answer questions,
          change choices, or edit the code and select <strong>Run changes</strong>. The panes sit
          side by side on wide screens and stack on smaller screens. Examples are temporary; AI
          steps use explicitly selected sample replies.
        </p>
      </div>
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
            ><th scope="row"><code>focus = !ask</code></th><td
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
      <p>
        Use <code>name = expression</code> for a value and <code>name = !action</code> for an
        interaction result. Bindings are immutable: a name cannot be reassigned. Put the text for a
        question or display inside explicit braces. Lines beginning with <code>#</code> are comments.
      </p>
      <h3>Document structure</h3>
      <p>
        Start with <code>:language 1</code>, then metadata, input/output declarations, imports,
        types, helpers, and flows before the main steps. Put attributes before the text in their
        action block. Close each explicit block with a brace and finish each execution path with
        <code>-&gt; end</code>. Declarations describe the program; steps run in authored order.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Declaration</th><th scope="col">Contract</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>:language 1</code></th><td
              >The language tag for all supported features in this guide.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:title "A check-in"</code></th><td
              >An optional title for the practice.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:input topic: text</code></th><td
              >A required, typed value supplied by the caller.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:output answer: text</code></th><td
              >A value every successful completion must return; the annotation is optional.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:import …</code></th><td
              >A pinned executable dependency or a named reference-data resource.</td
            ></tr
          >
        </tbody>
      </table>
      <h3>Markdown, references, and literal syntax</h3>
      <p>
        Question and display bodies support Markdown paragraphs, headings, emphasis, lists, links,
        and quotations. <code>{'{{binding}}'}</code> inserts a value and
        <code>{'{{entry.answer}}'}</code> reads a known field. Choices display their labels. Inserted
        participant or model text stays data; it cannot introduce another language step.
      </p>
      {@render sourceExample('markdown.pattern.md', markdownExample)}
      <p>
        Prefix reserved syntax with a backslash when it should appear as text, such as
        <code>\!ask</code>, <code>\-&gt; end</code>, or <code>{'\\{{name}}'}</code>. Common
        indentation is removed from a body while relative indentation is preserved. Explicit braces
        keep annotation-shaped prose and lines such as <code>Given:</code> inside the intended body. Earlier
        shorthand bodies remain compatible.
      </p>
    </section>

    <section id="types" aria-labelledby="types-heading">
      <h2 id="types-heading">Bindings and types</h2>
      <p>
        Types are inferred unless you add an annotation such as <code>topic: text</code>. An
        annotation checks the value; it does not convert it. For example, a quoted number remains
        text and cannot be assigned to a <code>number</code> binding.
      </p>
      {@render sourceExample('typed-entry.pattern.md', typesExample)}
      <table class="reference-table">
        <thead><tr><th scope="col">Type</th><th scope="col">Values</th></tr></thead>
        <tbody>
          <tr><th scope="row"><code>text</code></th><td>Text, including an empty string.</td></tr>
          <tr
            ><th scope="row"><code>number</code></th><td>Numeric values and rating results.</td></tr
          >
          <tr
            ><th scope="row"><code>boolean</code></th><td
              ><code>true</code> or <code>false</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>choice</code></th><td
              >A choice with a stable <code>.value</code> and display <code>.label</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>list[T]</code></th><td
              >An ordered list whose elements share a type, such as <code>list[text]</code> or
              <code>list[choice]</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>{'{topic: text}'}</code></th><td
              >A record with named, typed fields; read them with <code>entry.topic</code>.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>Optional[T]</code></th><td
              >A present value of type <code>T</code>, or explicit absence with
              <code>None</code>.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Declare public inputs with <code>:input topic: text</code> and outputs with
        <code>:output entry</code> or a typed output declaration. Every completing path must supply
        each output. An annotation can give an empty list its element type, as above; the compatible
        <code>list&lt;text&gt;</code> and <code>[]:text</code> spellings also remain supported.
      </p>
    </section>

    <section id="inputs" aria-labelledby="inputs-heading">
      <h2 id="inputs-heading">Inputs and outputs</h2>
      <p>
        Inputs are supplied when a run starts, rather than read from surrounding chat or another
        pattern’s variables. Every declared input must be supplied with its declared type. Outputs
        identify which completed bindings a caller receives; internal bindings remain local.
      </p>
      {@render sourceExample('typed-inputs.pattern.md', inputExample)}
      <p>
        Annotations on outputs supply expected types throughout the program. For example,
        <code>:output notes: list[text]</code> permits <code>notes = []</code> because the element
        type is known. Omitting an output annotation keeps inference. Every path ending with
        <code>-&gt; end</code> must provide every declared output, including paths that finish early.
      </p>
      <p>
        The compatible <code>:input topic text</code> spelling also works. Input values are explicit
        data, never source text to execute. When another flow calls the practice, it supplies inputs
        with <code>:with</code> and receives a record of declared outputs.
      </p>
    </section>

    <section id="optional-values" aria-labelledby="optional-heading">
      <h2 id="optional-heading">Optional values and presence checks</h2>
      <p>
        Use <code>Optional[text]</code> when a value may be absent. Assign <code>None</code> for
        absence, or a text value for presence. <code>Optional</code> is built in and needs no
        import. A binding initialized with <code>None</code> needs an expected type, for example
        <code>note: Optional[text] = None</code>.
      </p>
      {@render sourceExample('optional-note.pattern.md', optionalExample)}
      <h3>Defaults for absent values</h3>
      <p>
        <code>optional ?? fallback</code> returns the contained value when present and evaluates the
        fallback only for <code>None</code>. The fallback must match the contained type. Empty text,
        zero, false, and empty lists are present values and stay unchanged.
      </p>
      {@render sourceExample('optional-fallback.pattern.md', coalesceExample)}
      <p>
        Chains associate right to left: <code>a ?? b ?? fallback</code> means
        <code>a ?? (b ?? fallback)</code>. Arithmetic binds more tightly than <code>??</code>;
        comparisons, Boolean operators, and pipelines bind less tightly. For example,
        <code>note ?? " default " |&gt; trim</code> trims the selected text. Parenthesize a pipeline inside
        the fallback when only that branch should be transformed.
      </p>
      <p>
        Inside <code>:when note != None</code>, the compiler knows that <code>note</code> is text,
        so it can be passed to <code>trim</code> or used in a text reference. Check presence before
        accessing an optional record’s fields, doing arithmetic, or calling a helper that expects
        the contained type. Direct <code>== None</code> checks work too. A presence check applies within
        the branch it proves; it does not automatically carry past a branch join.
      </p>
      <p>
        <code>list[Optional[text]]</code> allows absent entries in a list;
        <code>Optional[list[text]]</code> allows the whole list to be absent. An empty list
        <code>[]</code>, empty text <code>""</code>, and <code>None</code> are different values. There
        is no implicit truthiness or optional chaining.
      </p>
      <div class="docs-note">
        <p class="note-label">Optional values and optional questions</p>
        <p>
          <code>[optional]</code> on a form question permits empty text; it does not produce
          <code>None</code>. A standalone <code>!ask</code> also returns text, including an empty
          answer. Assigning that result to <code>Optional[text]</code> wraps it as present. An
          optional input is still required: its caller must explicitly supply a value or typed
          absence. Missing inputs are not filled with <code>None</code>.
        </p>
      </div>
    </section>

    <section id="expressions" aria-labelledby="expressions-heading">
      <h2 id="expressions-heading">Expressions and immutable data</h2>
      <p>
        Expressions derive values without asking questions or calling a model. Parentheses make
        grouping explicit, records expose named fields, and lists keep a single element type. The
        compiler checks every field path and operation.
      </p>
      {@render sourceExample('expressions.pattern.md', expressionExample)}
      <table class="reference-table">
        <thead
          ><tr
            ><th scope="col">Operators</th><th scope="col"
              >Rule, from strongest to weakest precedence</th
            ></tr
          ></thead
        >
        <tbody>
          <tr
            ><th scope="row"><code>(…)</code>, <code>entry.field</code>, <code>helper(…)</code></th
            ><td>Grouping, known field access, literals, and function calls.</td></tr
          >
          <tr
            ><th scope="row"><code>-value</code>, <code>*</code>, <code>+</code>, <code>-</code></th
            ><td
              >Unary minus, then multiplication, then addition/subtraction. Operands are numbers.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>??</code></th><td
              >Use a fallback only for None. Right-associative; lower precedence than arithmetic and
              higher than comparisons.</td
            ></tr
          >
          <tr
            ><th scope="row"
              ><code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>,
              <code>==</code>, <code>!=</code></th
            ><td
              >Non-chained comparisons. Ordering requires numbers; equality compares compatible
              types, including structural lists/records and choice IDs.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>not</code>, <code>and</code>, <code>or</code></th><td
              >Boolean negation, then short-circuit AND, then short-circuit OR. No implicit
              truthiness.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>|&gt;</code></th><td
              >Pass the left value as the first argument of the next pure call; pipelines have the
              lowest precedence.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>|&gt;&gt;</code></th><td
              >Map the next pure call over one list level, inserting each item as its first
              argument. Both pipes share the lowest precedence and run left to right.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Use commas between list items and record fields; trailing commas are accepted. An empty list
        needs an expected type or a compatible explicit element annotation. Use
        <code>concat</code> to combine text or lists. Effects such as <code>!ask</code>,
        <code>!agent</code>, and semantic suggestions are whole statements, so they cannot be hidden
        inside a record, list, helper argument, or pure transformation.
      </p>
    </section>

    <section id="step-types" aria-labelledby="steps-heading">
      <h2 id="steps-heading">Command reference</h2>
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
          <tr
            ><th scope="row"><code>!image</code>, <code>!video</code></th><td
              >Show media with authored alternatives, captions, or playback settings.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!collect</code></th><td
              >Build a bounded list of participant-created entries.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!use</code></th><td
              >Call a local flow or pinned imported pattern with explicit inputs.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!refine</code></th><td
              >Review and revise wording with explicit participant acceptance.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!agent</code></th><td
              >Request a model result with a declared type and explicitly supplied context.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>!turn</code></th><td
              >Request an explicit model-generated conversational turn under its authored contract.</td
            ></tr
          >
        </tbody>
      </table>
    </section>

    <section id="questions" aria-labelledby="questions-heading">
      <h2 id="questions-heading">Questions and ratings</h2>
      <p>
        <code>answer = !ask</code> returns text. A standalone question allows an intentionally empty
        answer. Use a form for a nonblank required answer or several related fields confirmed
        together. Prompt references can use earlier bindings, such as
        <code>{'What matters about {{topic}}?'}</code>.
      </p>
      {@render sourceExample('rate-energy.pattern.md', ratingExample)}
      <p>
        <code>!rate minimum..maximum</code> returns a finite number within inclusive bounds. Bounds
        may be negative or decimal. <code>:low</code> and <code>:high</code> supply endpoint labels;
        <code>:prefer slider</code> is a presentation preference. The numeric range remains authoritative,
        whichever control the host uses. An invalid or out-of-range reply leaves the question pending.
      </p>
    </section>

    <section id="choices" aria-labelledby="choices-heading">
      <h2 id="choices-heading">Single choice, multiple choice, and ranking</h2>
      <p>
        Give each option a stable ID and a quoted label. A single choice returns <code>choice</code
        >;
        <code>[multi]</code> returns <code>list[choice]</code> in catalogue order. A ranking returns every
        offered item exactly once, in the participant’s confirmed order.
      </p>
      {@render sourceExample('choices-and-ranking.pattern.md', selectionExample)}
      <table class="reference-table">
        <thead><tr><th scope="col">Parameter</th><th scope="col">Meaning</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>multi</code></th><td
              >Allow multiple selections; without it, choose exactly one.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>min=N</code>, <code>max=N</code></th><td
              >Inclusive multi-selection bounds. The default minimum is 1 and maximum is the offered
              count. <code>min=0</code> permits an explicit empty selection.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>from=selected</code></th><td
              >Use an existing choices catalogue or list of choices instead of literal options.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>label=description</code></th><td
              >When ranking records, use a nonblank text field for labels and return the complete
              original records.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>prefer=…</code></th><td
              ><code>radio</code>/<code>chips</code> for single choice, <code>checklist</code>/<code
                >chips</code
              >
              for multi, and <code>reorder</code> for ranking. These affect presentation.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        <code>.value</code> is an option’s stable ID; <code>.label</code> is its display wording.
        Use IDs in matches. Dynamic catalogues cannot be combined with literal options. Duplicate
        IDs, unknown selections, repeated ranking items, and contradictory bounds are rejected. To
        rank a subset, choose it first, then pass the returned list to <code>!rank</code>.
      </p>
      <p>
        Multi-selection and ranking have explicit confirmation controls. The preview uses the
        editor’s controls; a host may present single-choice confirmation differently. The accepted
        result, type checks, and stable option identities are shared. The legacy
        <code>:option id "Label"</code> and <code>:from source</code> forms remain supported.
      </p>
    </section>

    <section id="grouped-steps" aria-labelledby="grouped-heading">
      <h2 id="grouped-heading">Grouped forms</h2>
      <p>
        A form keeps related content together. For example, a single step can show an instruction
        with a timer directly beneath it.
      </p>
      {@render sourceExample('timed-reflection.pattern.md', timerExample)}
      <p>
        Text fields in a form are required and multiline by default. <code>[optional]</code> permits
        an empty answer; <code>:multiline false</code> requests a single-line field, and
        <code>:placeholder "A small next step"</code> supplies a hint. A form can also group ratings
        and choices. Its completed result is a record, such as <code>reflection.thought</code> and
        <code>reflection.notes</code>, available after the whole form is submitted. Sibling fields
        cannot read one another’s unfinished answers.
      </p>
      <p>
        A form supports ordered <code>!show</code>, <code>!ask</code>, <code>!rate</code>,
        <code>!choose</code>, and <code>!timer</code> blocks. Ranking, branching, model requests, child
        calls, and nested forms belong between forms. Required text must be nonblank; ratings and choices
        use the same typed contracts as standalone steps. All fields are validated and accepted together,
        so a rejected field keeps the complete form draft open.
      </p>
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

    <section id="timers" aria-labelledby="timers-heading">
      <h2 id="timers-heading">Countdown timers</h2>
      <p>
        A timer binds an immutable receipt containing <code>duration_seconds</code>,
        <code>elapsed_seconds</code>, and <code>completed</code>. Its widget provides start, pause,
        resume, and reset; the participant explicitly confirms continuation.
      </p>
      {@render sourceExample('adjustable-timer.pattern.md', timerOnlyExample)}
      <table class="reference-table">
        <thead><tr><th scope="col">Attribute</th><th scope="col">Contract</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>:duration N</code></th><td
              >Required whole seconds, from 1 to 86,400.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:blocking true/false</code></th><td
              >Required. A blocking timer must finish before continuation; a nonblocking standalone
              timer permits continuation after starting.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:adjustable true</code></th><td
              >Permit duration changes before starting. Both <code>:min N</code> and
              <code>:max N</code> are then required and must contain the initial duration.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:sticky true/false</code></th><td
              >Defaults to true: a started timer moves to the practice’s timer area. False keeps it
              in its authored step.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:persistent true</code></th><td
              >A form attribute that keeps its nonblocking timer controls available in the visible
              completed step while the run continues.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Durations in source are seconds even when an editor control displays minutes. A nonblocking
        receipt records the clock at continuation; later clock changes do not rewrite that value.
        Pausing a run pauses its clocks, and leaving removes the countdowns. Reopening historical
        receipts does not start them again.
      </p>
    </section>

    <section id="media" aria-labelledby="media-heading">
      <h2 id="media-heading">Images and video</h2>
      <p>
        Media are standalone display effects. They do not bind an answer or block the next step.
        Attributes are literal configuration; references may appear in the Markdown caption or
        guidance. The examples below load their external media only when you run them.
      </p>
      <h3>Images</h3>
      {@render sourceExample('image.pattern.md', imageExample)}
      <p>
        <code>:url</code> requires an HTTPS source and <code>:alt</code> requires a meaningful text
        alternative. Use exactly <code>""</code> for a purely decorative image. An optional
        <code>:title</code> supplies a visible heading. The Markdown body is the caption. Meaningful images
        can be enlarged with the pointer or keyboard; a failed load keeps the alternative and source link
        available.
      </p>
      <h3>Video excerpts</h3>
      {@render sourceExample('video.pattern.md', videoExample)}
      <table class="reference-table">
        <thead><tr><th scope="col">Attribute</th><th scope="col">Meaning</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>:url</code>, <code>:title</code></th><td
              >Required HTTPS video source and optional visible/accessibility title.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:start</code>, <code>:end</code></th><td
              >Whole seconds or quoted <code>M:SS</code>/<code>H:MM:SS</code>. Both are absolute
              positions; end must exceed start. Start defaults to zero and end is otherwise the
              source’s end.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:autoplay</code>, <code>:muted</code>, <code>:loop</code></th><td
              >Boolean preferences, all false by default. Browser playback policies still apply;
              looping repeats the excerpt.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:captions "en"</code></th><td
              >Prefer an available caption language; it cannot create a missing track.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Supported sources include YouTube, Vimeo, Dailymotion, and direct MP4/WebM files. Explicit
        excerpt attributes override timestamps in the shared URL. Dailymotion requires the host’s
        player configuration. Pause/end controls pause players; playback position is local
        presentation state rather than a returned binding. Media failures do not fabricate a
        participant response.
      </p>
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
      {@render sourceExample('choose-a-path.pattern.md', decisionExample)}
      <p>
        Local <code>:case</code> arms continue after the match unless they explicitly end. A static
        single-choice question can omit <code>:else</code> when every offered ID is covered, as
        above. Closed enums work the same way. Text, numbers, and choices without a known catalogue
        need a final <code>:else</code>. Match choice IDs, rather than their display labels.
      </p>
      <p>
        <code>?branch</code> checks <code>:when</code> conditions in order and always needs a final
        <code>:else</code>. A value read after a decision must be supplied with the same type on
        every path that continues to that read. Mutually exclusive arms may supply the same name.
      </p>
      {@render sourceExample('conditional-path.pattern.md', branchExample)}
      <p>
        Arms can contain local decisions, but not labels or jumps that escape their region. Braces
        do not introduce mutable variables: mutually exclusive arms can provide one binding, while a
        later possible reassignment is rejected. Legacy forward labels and
        <code>:case value -&gt; label</code> remain compatible. Backward jumps are not loops.
      </p>
    </section>

    <section id="loops" aria-labelledby="loops-heading">
      <h2 id="loops-heading">Functional loops</h2>
      <p>
        <code>?loop[max] name = initial</code> carries an explicitly typed state value through
        repeated interactions. Each iteration gets fresh immutable locals, and
        <code>-&gt; repeat expression</code> supplies the next state of the same type.
      </p>
      {@render sourceExample('bounded-loop.pattern.md', loopExample)}
      <p>
        The optional bracket is the total number of iterations, including the first.
        <code>[0]</code> skips the body. Omitting it means no authored maximum; host resource limits
        still apply. <code>-&gt; break</code>, reaching the maximum, or the participant’s Leave loop
        control continues below the loop. Ending the whole run is a separate action.
      </p>
      <p>
        A repeated body must include a participant interaction, and its final repeat/break must be
        last. Bodies are straight-line; loop state and iteration locals do not escape the loop or
        shadow outer names. Nested same-run repetition and branching are rejected rather than
        inferred.
      </p>
    </section>

    <section id="functions" aria-labelledby="functions-heading">
      <h2 id="functions-heading">Pure helpers, lambdas, and pipelines</h2>
      <p>
        Declare a helper with <code>fn</code> before the practice’s steps. Its parameters and result have
        explicit types. Helpers use only their parameters and earlier helpers; they do not ask questions,
        call models, or read surrounding bindings.
      </p>
      {@render sourceExample('clean-notes.pattern.md', helperExample)}
      <h3 id="lambdas">Inline lambdas</h3>
      <p>
        <code>map</code>, <code>filter</code>, <code>fold</code>, <code>reduce</code>,
        <code>find</code>,
        <code>any</code>, and <code>all</code> accept inline callbacks as well as named helpers. An
        underscore marks a parameter whose type is inferred from the input list. Use
        <code>_.name</code>
        for a field or <code>trim(_)</code> for a call. Earlier immutable values, such as
        <code>threshold</code>, can be captured by an inline lambda.
      </p>
      {@render sourceExample('lambda-placeholders.pattern.md', placeholderLambdaExample)}
      <p>
        Each <code>_</code> occurrence introduces a separate parameter, from left to right:
        <code>_ + _</code> means <code>(accumulator, item) =&gt; accumulator + item</code> in a
        fold. To reuse the same parameter, name it: <code>n =&gt; n * n</code>. Two-parameter
        lambdas use parentheses: <code>(total, item) =&gt; total + item</code>.
      </p>
      {@render sourceExample('lambda-named.pattern.md', namedLambdaExample)}
      <p>
        For nested transforms, name the outer parameter so each inner underscore has a clear owner.
        Parameters are local to their lambda; captured values must already be available. Predicate
        callbacks must return Boolean values, folds must return the seed’s type, and reducers must
        return the list element type. Bodies contain pure expressions; questions, AI calls, and
        unseeded shuffle are not allowed. Inline lambdas are supported in callback positions and
        cannot be stored or returned as function values. Named <code>fn</code> helpers keep their explicit-parameter
        contracts.
      </p>
      <p>
        A pipeline passes the value on its left as the first argument on its right:
        <code>value |&gt; trim</code> means <code>trim(value)</code>. Use <code>trim</code>,
        <code>lowercase</code>, and <code>normalize_whitespace</code> for text;
        <code>count</code>, <code>concat</code>, <code>map</code>, <code>filter</code>,
        <code>flatten</code>, <code>fold</code>, and <code>reduce</code> for collections.
        <code>map</code>,
        <code>filter</code>, and <code>fold</code> take named helpers or inline lambdas. Lists stay homogeneous,
        and transformations produce new values.
      </p>
      <p>
        Use <code>items |&gt;&gt; clean</code> to map a pure helper or built-in over one list level.
        <code>scores |&gt;&gt; clamp(0, 10)</code> calls <code>clamp(item, 0, 10)</code> for each
        score. Mix both pipes freely: <code>notes |&gt;&gt; clean |&gt; join("; ")</code> cleans
        each note, then joins the resulting list. Order and length are preserved, including typed
        empty results. List-valued results stay nested; additional list arguments are passed whole.
        <code>|&gt;&gt;</code> provides explicit mapping without recursive or multi-list broadcasting.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Function</th><th scope="col">Input and result</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>trim(text)</code></th><td
              >Remove leading and trailing whitespace.</td
            ></tr
          >
          <tr><th scope="row"><code>lowercase(text)</code></th><td>Return lowercase text.</td></tr>
          <tr
            ><th scope="row"><code>normalize_whitespace(text)</code></th><td
              >Normalize runs of whitespace in text.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>clamp(n, min, max)</code></th><td
              >Bound a number; reject minimum greater than maximum.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>concat(a, b)</code></th><td
              >Join two texts or two lists of the same element type.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>count(items)</code></th><td
              >Return the number of elements in a list or choices catalogue.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>map(items, helper)</code></th><td
              >Call a pure callback once per element; preserve order and length.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>filter(items, helper)</code></th><td
              >Keep items whose pure callback returns true, in their original order.</td
            ></tr
          >
          <tr><th scope="row"><code>flatten(items)</code></th><td>Remove one list layer.</td></tr>
          <tr
            ><th scope="row"><code>shuffle(items[, seed])</code></th><td
              >Return a new permutation. Without a text seed, use a whole binding; the order is
              stable when the run resumes. A seeded call is pure.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>fold(items, seed, helper)</code></th><td
              >Call a pure callback with accumulator then item; the result keeps the seed’s type.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>reduce(items, helper)</code></th><td
              >Start with the first element and combine remaining elements in order; return
              Optional[T], with None for an empty list.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>records(library)</code></th><td
              >Return a reference library’s typed record list.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>lookup(library, key)</code></th><td
              >Return the record for a typed reference, or an optional record when the key is
              arbitrary text.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Browse the <a href={resolve('/about/pattern-language/functions')}>Functions reference</a> for
        signatures, parameters, return types, and editable examples of every built-in.
      </p>
      <p>
        Use <code>join</code> and <code>split</code> to combine or separate texts, and
        <code>contains</code>, <code>starts_with</code>, and <code>ends_with</code> for literal text
        checks. <code>sum</code> totals numbers; <code>min</code> and <code>max</code> return
        optional extrema. <code>first</code>, <code>last</code>, and predicate-based
        <code>find</code>
        return optional elements. Use <code>??</code> for an explicit default. <code>any</code> and
        <code>all</code> test predicates with short-circuit evaluation; <code>distinct</code> keeps each
        value’s first occurrence in order.
      </p>
      <h3>Reducing without a seed</h3>
      <p>
        <code>reduce(items, callback)</code> uses the first element as its initial accumulator. The
        callback receives the accumulator and next item and must return the same element type. A
        singleton returns its element without invoking the callback; an empty list returns
        <code>None</code>. Use <code>??</code> for an explicit fallback, or <code>fold</code> for an explicit
        seed or a different accumulator type. Optional element types are not supported because directly
        nested Optional values are not allowed.
      </p>
      {@render sourceExample('reduce-scores.pattern.md', reduceExample)}
      <p>
        Helpers declare parameter and result types, cannot recurse or capture surrounding values,
        and may call only earlier helpers. They are named declarations rather than stored function
        values or closures. For a multiline pipeline, put <code>|&gt;</code> or
        <code>|&gt;&gt;</code> at the start of each continuation line. Empty map/filter results retain
        their type; an empty fold returns its seed.
      </p>
    </section>

    <section id="collections" aria-labelledby="collections-heading">
      <h2 id="collections-heading">Collecting and traversing entries</h2>
      <p>
        Use <code>each</code> to run a sequence of interactions once for each item in an existing
        list or set of choices. A final <code>-&gt; yield expression</code> chooses each iteration’s result.
        The completed binding is a list of those results, in source order.
      </p>
      {@render sourceExample('two-questions.pattern.md', collectionExample)}
      <p>
        Each iteration has fresh local bindings. An empty input runs no interactions and returns a
        typed empty list. For an open-ended collection, use <code>entries = !collect</code> with a
        required finite <code>:max</code> and optional <code>:min</code>. The participant chooses
        whether to add another entry after the minimum is met. An explicit final yield chooses the
        exported value; existing language-one collections without it keep their record output.
      </p>
      <p>
        Collection bodies are straight-line sequences. Put more complex branching or nested
        procedures in a called flow or child pattern. Pausing preserves the current entry and
        accepted answers; ending the practice does not manufacture a successful collection result.
      </p>
      <h3>Participant-created entries</h3>
      {@render sourceExample('open-collection.pattern.md', openCollectionExample)}
      <p>
        <code>:min</code> defaults to 1 and cannot exceed <code>:max</code>. With
        <code>:min 0</code>, the participant first chooses whether to start. A record is appended
        only after its whole body completes. At the maximum, collection ends without asking to add
        another entry. A final yield exports exactly its expression; legacy language-one collections
        without a yield export their body’s record fields.
      </p>
      <p>
        The compatible mapped form <code>!collect</code> with <code>:from items</code> and
        <code>:as item</code> traverses a frozen source and has no add/finish question.
        <code>each</code> makes the per-item yield explicit. Empty sources produce typed empty lists,
        and invalid replies preserve previously completed entries.
      </p>
    </section>

    <section id="flows" aria-labelledby="flows-heading">
      <h2 id="flows-heading">Reusable flows</h2>
      <p>
        A <code>flow</code> packages interactive steps behind explicit inputs and outputs. Declare
        it before the main steps, then call it with <code>!use</code>. The returned record contains
        its declared outputs.
      </p>
      {@render sourceExample('ask-a-topic.pattern.md', flowExample)}
      <p>
        Flows have isolated bindings and cannot capture the caller’s local values. Pass each input
        with <code>:with</code>; <code>-&gt; end</code> returns the flow’s outputs. A flow can call sibling
        flows or pinned imported patterns, but recursive calls are rejected.
      </p>
      <p>
        Inputs are passed exactly once. <code>:with topic</code> forwards an input of the same name;
        <code>:with topic = another_value</code> supplies an expression under a different name. Missing,
        extra, or mistyped inputs fail compilation. Only declared outputs are exposed on the returned
        record. The caller waits for the child to complete.
      </p>
    </section>

    <section id="imports" aria-labelledby="imports-heading">
      <h2 id="imports-heading">Executable imports and reference data</h2>
      <h3>Pinned executable patterns</h3>
      <p>
        Mira’s saved-pattern import picker supplies an exact artifact identity and compiled content
        revision. The template below shows where that value belongs. A title, ordinal version, file
        path, or URL cannot replace a content pin.
      </p>
      {@render sourceExample('pinned-import.pattern.md', pinnedImportExample)}
      <p>
        An import only makes a dependency available; <code>!use</code> executes it. Input and output contracts
        are checked across the dependency closure, including unused imports. Missing dependencies and
        cycles are errors. Existing runs keep the exact imported sources with which they started.
      </p>
      <h3>Named reference-data libraries</h3>
      <p>
        A published content entry can register a JSON resource through its <code>libraries</code>
        metadata. The resource declares a <code>record_type</code> and a <code>records</code> list;
        each record must exactly match its schema and have a unique, nonblank text ID. A
        source-qualified ID such as <code>commons:materials</code> identifies that resource.
      </p>
      {@render sourceExample('data-import.pattern.md', dataImportExample)}
      <p>
        <code>records(materials)</code> returns the typed record list. A
        <code>ref[materials]</code> is a validated ID in that resource, so
        <code>lookup(materials, reference)</code> returns its record. An arbitrary text lookup can
        miss and returns <code>Optional[record type]</code>; check for <code>None</code> before reading
        fields. References from another resource are rejected.
      </p>
      <p>
        Reference data resolves when a new run starts and is frozen with its schema and values in
        that run. A resource update affects new runs; reopening an existing run uses its original
        copy. Both forms of import are declarative, with their own validation and resource limits.
      </p>
    </section>

    <section id="events" aria-labelledby="events-heading">
      <h2 id="events-heading">Active-pattern message handlers</h2>
      <p>
        An <code>events</code> declaration can route
        <code>on user.message -&gt; handle_message</code>
        to a local flow while a pattern is waiting for a text answer. The handler takes text inputs
        <code>message</code> and <code>prompt</code>, and returns <code>disposition</code> as
        <code>pass</code> or <code>handled</code>. Passing delivers the original answer; handling
        returns to the same unanswered question after the side conversation. These handlers run
        within active patterns; they do not listen to all chat or operate pause/end controls.
      </p>
      {@render sourceExample('message-handler.pattern.md', eventExample)}
      <p>
        Try <code>help</code> to show an explanation and return to the same pending question. Any other
        message passes through as its answer. This example makes the routing decision deterministically.
        A handler may also use an explicit classifier with declared context.
      </p>
      <p>
        The nearest enclosing handler receives active text questions, including questions in called
        flows. It receives only the submitted message and rendered prompt. Handlers do not intercept
        themselves, ratings, choice confirmations, or review decisions. A paused or completed
        pattern receives no new messages. Unsupported event kinds fail compilation.
      </p>
    </section>

    <section id="displays" aria-labelledby="displays-heading">
      <h2 id="displays-heading">Data visualization & display</h2>
      <p>
        Pass an existing collection to <code>!show</code> to display its records. Describe the attributes
        to map, group, or order; the renderer chooses a readable presentation and keeps the original fields
        available as text.
      </p>
      {#each visualizationExamples as display (display.id)}
        <h3>{display.label}</h3>
        <p>{display.note}</p>
        <CodeExample filename={display.filename} source={display.source} />
      {/each}
      <h3>Combining properties</h3>
      <p>Mapping, grouping, and ordering can describe the same collection together.</p>
      {@render sourceExample('show-ideas.pattern.md', displayExample)}
      <p>
        <code>:map</code> accepts one or two dimensions. <code>:group</code> creates labelled
        groups, <code>:order</code> sorts ascending or descending, <code>:link</code> describes
        relationships by ID, and <code>:split</code> separates context views. All are optional. Displays
        do not change the collection or ask for a response.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Property</th><th scope="col">Presentation</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row"><code>:map value</code></th><td
              >A numeric spectrum, inferred time axis, or categorical bands.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:map effort, impact</code></th><td
              >Two dimensions: first horizontal, second vertical.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:group category</code></th><td
              >Labelled groups without changing mapped positions.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:order score desc</code></th><td
              >Stable ordering; <code>asc</code> is the default.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:link parent</code></th><td
              >Directed relationships to text IDs, lists of IDs, or choices. A field named <code
                >parent</code
              > points from the parent to the current item.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>:split scenario</code></th><td
              >Separate context views sharing the same axis domains.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        All properties are optional and may appear once in any order. Without them, the result is a
        labelled collection. Numbers preserve distance, enums preserve declaration order, and
        consistent ISO date text can become a timeline. There is no separate date type. Nested
        scalar attributes work; transform values before showing them.
      </p>
      <p>
        Labels prefer <code>name</code>, <code>title</code>, <code>label</code>,
        <code>idea</code>, <code>text</code>, then <code>id</code>. Relationships need stable IDs;
        empty text or an empty list means no link. Cycles are labelled and shown with dashed edges.
        Invalid relationships produce warnings and a labelled fallback. Small screens keep readable
        lists with complete attributes, rather than relying on a cramped graphic.
      </p>
    </section>

    <section id="ai-and-control" aria-labelledby="control-heading">
      <h2 id="control-heading">AI and participant control</h2>
      <p>
        Ordinary authored text and response references do not request AI wording. An explicit <code
          >~</code
        > marker can ask for a different phrasing of a predetermined conversational move.
      </p>
      <p>
        <code>wording = ~</code> binds generated text for later use; it does not display or accept
        the wording. <code>!agent</code> declares its result with <code>:returns</code>, including
        typed records and lists. Repeated <code>:context</code> attributes explicitly share bound
        values, and <code>:min</code>/<code>:max</code> constrain list results. Other bindings and chat
        history are not automatically included.
      </p>
      <h3>Typed generation</h3>
      {@render sourceExample('typed-agent.pattern.md', agentExample)}
      <p>
        <code>:returns</code> is a result contract, including exact record fields, homogeneous
        lists, optional values, and resource references. <code>:min</code>/<code>:max</code> bound a
        returned list. Repeated <code>:context</code> attributes pass explicit values separately from
        the authored instructions. Invalid model replies leave the request pending. A type-correct confidence
        score is still a model claim, not a measured probability.
      </p>
      <h3>Authored intent, flexible wording</h3>
      {@render sourceExample('realized-wording.pattern.md', realizationExample)}
      <p>
        <code>~ instruction</code> and <code>~ {'{ … }'}</code> request wording for a fixed authored
        move. A realized question or display contains one realization without mixed literal body
        text. The returned wording does not decide the next step. A bound realization stores text; a
        standalone realization displays it. <code>!turn</code> is an explicit delegated conversational
        generation step under its own authored prompt.
      </p>
      <h3>Closed categories and semantic suggestions</h3>
      <p>
        Declare a closed enum with <code>type</code> and a classifier with descriptions for its
        categories, explicit context, and a fallback. <code>?~</code> requests a model interpretation
        within those categories. The authored match determines the next step.
      </p>
      {@render sourceExample('classify-a-message.pattern.md', semanticExample)}
      <p>
        <code>items |&gt; select ~</code>, <code>filter ~</code>, and <code>rank ~</code> request
        suggestions constrained to the offered items. Each returns a record with
        <code>outcome</code> (<code>decided</code> or <code>uncertain</code>) and a typed
        <code>items</code> list. These are whole binding statements. Pure
        <code>filter(items, helper)</code>
        stays deterministic. A valid model result is still an interpretation or suggestion, and consequential
        choices should be reviewed by the participant. A classifier fallback means ambiguity; model errors
        leave the step pending instead.
      </p>
      {@render sourceExample('semantic-suggestion.pattern.md', suggestionExample)}
      <table class="reference-table">
        <thead><tr><th scope="col">Operation</th><th scope="col">Decided result</th></tr></thead>
        <tbody>
          <tr><th scope="row"><code>select ~</code></th><td>Exactly one offered item.</td></tr>
          <tr
            ><th scope="row"><code>filter ~</code></th><td
              >Zero or more originals in catalogue order.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>rank ~</code></th><td
              >Every offered original once, in suggested order.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Every uncertain result has an empty typed list. A decided empty filter is different from
        uncertainty. Invented IDs, duplicates, incorrect selection counts, and incomplete rankings
        are rejected. Model interpretation does not stand in for a person’s choice, cancellation,
        acceptance, or permission to renew a revision budget.
      </p>
      <h3>Reviewing and refining wording</h3>
      <p>
        <code>!refine</code> presents the initial wording for review before any revision. Its body
        runs only when the participant requests a change. End that body with
        <code>-&gt; propose</code> to offer the next candidate.
      </p>
      {@render sourceExample('review-wording.pattern.md', refineExample)}
      <p>
        The result includes <code>reviewed.value</code> and <code>reviewed.outcome.value</code>.
        Outcomes include <code>accepted</code>, <code>unresolved</code>, and
        <code>limit_reached</code>; completion alone does not mean acceptance. <code>rounds</code>
        bounds revisions, and an optional <code>renewable</code> flag permits another budget only with
        explicit participant approval.
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

    <section id="lifecycle" aria-labelledby="lifecycle-heading">
      <h2 id="lifecycle-heading">Pause, end, and replay</h2>
      <p>
        Execution waits at an explicit participant or model step. A reply is checked against its
        exact pending request before it is accepted. Invalid replies leave that step pending;
        already accepted work remains intact.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Action</th><th scope="col">Result</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row">Pause / resume</th><td
              >Preserve accepted answers and the pending step; resume returns to it.</td
            ></tr
          >
          <tr
            ><th scope="row">Leave loop</th><td
              >Exit the current functional loop and continue below it.</td
            ></tr
          >
          <tr
            ><th scope="row">End run</th><td
              >Cancel the run and active children, with no successful outputs or authored
              continuation.</td
            ></tr
          >
          <tr
            ><th scope="row"><code>-&gt; end</code></th><td
              >Complete successfully and return declared outputs.</td
            ></tr
          >
          <tr
            ><th scope="row">Keep wording</th><td
              >Explicitly accept the current refinement candidate.</td
            ></tr
          >
          <tr
            ><th scope="row">Finish without keeping it</th><td
              >Finish refinement with an unfinished outcome; inspect the outcome before treating
              text as accepted.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Editing a definition never patches an active run. Saved runs pin their source, executable
        dependencies, reference data, and accepted results. Reopening uses that snapshot and
        verified reply history, without regenerating already accepted model results. Late or
        duplicate replies cannot advance a different pending step. These documentation examples keep
        only a temporary browser run and reset when restarted or left.
      </p>
    </section>

    <section id="diagnostics" aria-labelledby="diagnostics-heading">
      <h2 id="diagnostics-heading">Errors, limits, and compatibility</h2>
      <p>
        The source editor reports compiler diagnostics with line positions. In an example, edit the
        code and run changes to see the same checks. A failed compilation shows diagnostics instead
        of pretending to render a valid program.
      </p>
      <table class="reference-table">
        <thead><tr><th scope="col">Symptom</th><th scope="col">What to check</th></tr></thead>
        <tbody>
          <tr
            ><th scope="row">Unknown binding or field</th><td
              >Declare the value first, use a known record path, and read form fields only after
              submission.</td
            ></tr
          >
          <tr
            ><th scope="row">Optional value used as text/number</th><td
              >Check <code>== None</code> or <code>!= None</code> in the branch where the contained value
              is used.</td
            ></tr
          >
          <tr
            ><th scope="row">Empty list has no type</th><td
              >Supply an annotation such as <code>items: list[text] = []</code> or a typed output.</td
            ></tr
          >
          <tr
            ><th scope="row">Binding may already be assigned</th><td
              >Use a new name for a derived value; only mutually exclusive branches may supply the
              same binding.</td
            ></tr
          >
          <tr
            ><th scope="row">Missing output / branch value</th><td
              >Supply it with the same type on every relevant completing/continuing path.</td
            ></tr
          >
          <tr
            ><th scope="row">Incomplete match</th><td
              >Cover every known enum variant or static option ID; otherwise add a final <code
                >:else</code
              >.</td
            ></tr
          >
          <tr
            ><th scope="row">Declaration treated as body text</th><td
              >Use explicit braces to close the preceding question or display before the next
              binding.</td
            ></tr
          >
          <tr
            ><th scope="row">Rejected model or participant reply</th><td
              >Check exact types, required fields, offered IDs, selection counts, and current
              request identity.</td
            ></tr
          >
          <tr
            ><th scope="row">Unavailable import</th><td
              >Use a complete executable pin or a published source-qualified data ID with a matching
              schema.</td
            ></tr
          >
        </tbody>
      </table>
      <p>
        Source size, expression complexity, collection sizes, dependency depth, helper expansion,
        model results, and display graphics are bounded. Exceeding an execution limit fails
        explicitly; large visualizations can use a labelled data fallback with warnings. Keep open
        collections bounded and place substantial reusable procedures behind explicit interfaces.
      </p>
      <p>
        All current features in this guide use <code>:language 1</code>. Legacy bindings, forward
        labels, <code>list&lt;T&gt;</code>, and prior supported version tags retain their
        interpretation. New syntax is additive and does not rewrite stored source or active runs.
        First-class functions, payload-bearing enum variants, and global event listeners remain
        outside the supported language described here. Extension packages have a separate authoring
        and delivery design; they are distinct from the executable and data imports above.
      </p>
    </section>

    <section id="try-the-editor" class="docs-next" aria-labelledby="editor-heading">
      <h2 id="editor-heading">Try the editor</h2>
      <p>
        Open the editor to explore a practice’s source and preview. Change a line, then restart the
        preview to try the updated version. Blocks expose common steps, forms, and local decisions;
        use Source for types, helpers, flows, and other advanced constructs. Ctrl+Space opens source
        suggestions, and compiler diagnostics identify invalid types or missing values.
      </p>
      <p>
        Mock replies let you explore AI steps without a model call. Preview does not change an
        already running practice. Start with a small complete example, then add declarations,
        interactions, and branches one at a time so each compiler check has a clear purpose.
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
    grid-template-columns: 176px minmax(0, 1120px);
    align-items: start;
    justify-content: center;
    gap: 48px;
    max-width: 1520px;
    margin: 0 auto;
    padding: 48px 32px 80px;
    color: var(--ink);
    background: var(--paper);
    overflow: visible;
  }
  .desktop-contents {
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - 48px);
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
  .nav-group {
    margin: 16px 0 4px;
    padding-left: 12px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--muted);
    text-transform: uppercase;
  }
  .nav-group:first-child {
    margin-top: 0;
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
    display: block;
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
  .docs-article > header p,
  section > p,
  .docs-note {
    max-width: 800px;
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
  h3 {
    margin: 28px 0 12px;
    font-size: 1.05rem;
    font-weight: 750;
    letter-spacing: -0.015em;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.82em;
    padding: 2px 5px;
    background: #f0f2ec;
    border-radius: 3px;
    overflow-wrap: anywhere;
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
  }
</style>
