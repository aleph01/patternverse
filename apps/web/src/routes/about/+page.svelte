<svelte:head>
  <title>About Patternverse</title>
  <meta
    name="description"
    content="Learn how Patternverse keeps practical knowledge searchable, connected, and portable."
  />
</svelte:head>

<main class="about-page">
  <section class="about-hero" aria-labelledby="about-heading">
    <div class="about-hero-blocks" aria-hidden="true">
      <span class="about-block about-block-green"></span>
      <span class="about-block about-block-blue"></span>
      <span class="about-block about-block-yellow"></span>
    </div>
    <p>About Patternverse</p>
    <h1 id="about-heading">Knowledge you can use—and keep.</h1>
    <div class="about-intro">
      <p>
        patternverse is a local-first library for procedural knowledge: approaches, ideas, and
        practices that help you decide what to do next.
      </p>
    </div>
  </section>

  <section class="about-library" aria-labelledby="library-model-heading">
    <div class="about-section-heading">
      <p>One library, several sources</p>
      <h2 id="library-model-heading">Everything useful, without putting everything in one box.</h2>
    </div>

    <div class="library-model" aria-label="Patternverse library model">
      <article>
        <span>01</span>
        <h3>your workspace</h3>
        <p>Private and editable. The knowledge you create, adapt, and carry with you.</p>
        <strong>editable</strong>
      </article>
      <article>
        <span>02</span>
        <h3>commons</h3>
        <p>The shared starting corpus that is available without copying it into your workspace.</p>
        <strong>read-only</strong>
      </article>
      <article>
        <span>03</span>
        <h3>subscribed sources</h3>
        <p>Independent public collections you can browse and search alongside everything else.</p>
        <strong>read-only</strong>
      </article>
    </div>

    <p class="library-model-result">browse · search · connect</p>
  </section>

  <section class="about-portability" aria-labelledby="portability-heading">
    <p>Knowledge first. Application second.</p>
    <h2 id="portability-heading">markdown in.<br />markdown out.</h2>
    <div>
      <p>
        Patternverse is built around a simple, portable corpus—not a proprietary database. Your
        notes should remain understandable and useful without this interface.
      </p>
      <p>
        Cloud sync is optional and applies only to your personal workspace. Public sources stay
        independently hosted and read-only.
      </p>
    </div>
  </section>

  <section class="about-structure" aria-labelledby="structure-heading">
    <div class="about-section-heading">
      <p>A small vocabulary</p>
      <h2 id="structure-heading">Different kinds of knowledge, connected deliberately.</h2>
    </div>
    <dl>
      <div>
        <dt>verses</dt>
        <dd>Broad lenses that provide orientation across a field.</dd>
      </div>
      <div>
        <dt>collections</dt>
        <dd>Curated paths through related material.</dd>
      </div>
      <div>
        <dt>patterns</dt>
        <dd>Reusable approaches to recurring situations.</dd>
      </div>
      <div>
        <dt>concepts</dt>
        <dd>Ideas that make the patterns easier to understand.</dd>
      </div>
      <div>
        <dt>practices</dt>
        <dd>Structured ways to put knowledge into action.</dd>
      </div>
    </dl>
  </section>

  <section class="about-start" aria-labelledby="about-start-heading">
    <p>Ready when you are</p>
    <h2 id="about-start-heading">Find something worth trying.</h2>
  </section>

  <section class="about-install" aria-labelledby="install-heading">
    <div class="about-install-intro">
      <p>Progressive web app</p>
      <h2 id="install-heading">install once.<br />keep it close.</h2>
      <div>
        <p>
          patternverse can be installed directly from your browser. It opens like an app and keeps
          the core library available offline.
        </p>
        <small>If it is already installed, you are all set—there is nothing else to download.</small
        >
      </div>
    </div>

    <ol class="about-install-steps">
      <li>
        <span>01</span>
        <strong>desktop</strong>
        <p>Use the install icon in the address bar, or choose “Install app” in the browser menu.</p>
      </li>
      <li>
        <span>02</span>
        <strong>iPhone or iPad</strong>
        <p>Open in Safari, tap Share, then choose “Add to Home Screen.”</p>
      </li>
      <li>
        <span>03</span>
        <strong>Android</strong>
        <p>Open the browser menu and choose “Install app” or “Add to Home screen.”</p>
      </li>
    </ol>
  </section>
</main>
