<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<section class="field-guide about-page" id="home-about" aria-labelledby="home-about-heading">
  <div class="field-guide-inner">
    <header class="field-guide-intro">
      <p class="field-guide-eyebrow">About Patternverse</p>
      <h2 id="home-about-heading">Practical ideas,<br />collected in one place.</h2>
      <p>
        Patternverse is a library of reusable approaches to thinking, learning, creating, and
        working through difficulties. Articles explain an approach with examples and limitations.
        Some include an interactive practice to help you try it.
      </p>
    </header>

    <div class="field-guide-rows">
      <section class="field-guide-row" id="find-a-pattern" aria-labelledby="find-heading">
        <span class="field-guide-number" aria-hidden="true">01</span>
        <h3 id="find-heading">Explore<br />the library.</h3>
        <div class="field-guide-copy">
          <p>
            Browse by verse, open a collection, or search by title and keyword. Follow related
            patterns to explore an idea further.
          </p>
          <a href={resolve('/library')}><span class="field-guide-link-label">Explore</span> <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <section class="field-guide-row" id="try-a-practice" aria-labelledby="practice-heading">
        <span class="field-guide-number" aria-hidden="true">02</span>
        <h3 id="practice-heading">Read an idea.<br />Try a practice.</h3>
        <div class="field-guide-copy">
          <p>
            Start with the article. Where a guided practice is available, you can work through its
            questions and steps at your own pace.
          </p>
        </div>
      </section>
      <section class="field-guide-row" id="keep-your-work" aria-labelledby="keep-heading">
        <span class="field-guide-number" aria-hidden="true">03</span>
        <h3 id="keep-heading"><span id="make-a-pattern"></span>Keep what<br />is useful.</h3>
        <div class="field-guide-copy">
          <p>
            Bookmark patterns and collections to build your library. Write your own patterns in the
            visual editor and organize them in your private workspace. You can also add interactive
            practices using Pattern Language.
          </p>
          <a href={resolve('/about/pattern-language')}
            ><span class="field-guide-link-label">About Pattern Language</span> <span aria-hidden="true">→</span></a
          >
        </div>
      </section>
    </div>

    <section
      class="field-guide-install"
      id="install-patternverse"
      aria-labelledby="install-heading"
    >
      <p class="field-guide-eyebrow">On your home screen</p>
      <h3 id="install-heading">install once.<br />keep it close.</h3>
      <p>
        Install Patternverse from your browser to open it like an app and keep the core library
        available offline.
      </p>
      <details>
        <summary>How to install</summary>
        <div class="field-guide-platforms">
          <div>
            <h4>Desktop</h4>
            <p>
              Use the install icon in the address bar, or choose “Install app” in the browser menu.
            </p>
          </div>
          <div>
            <h4>iPhone or iPad</h4>
            <p>Open in Safari, tap Share, then choose “Add to Home Screen.”</p>
          </div>
          <div>
            <h4>Android</h4>
            <p>Open the browser menu and choose “Install app” or “Add to Home screen.”</p>
          </div>
        </div>
      </details>
    </section>
  </div>
</section>

<style>
  .field-guide {
    padding: clamp(3rem, 6vw, 5rem) max(3vw, calc((100vw - 1440px) / 2));
    background: var(--paper);
    color: var(--ink);
    scroll-margin-top: 1rem;
  }
  .field-guide-inner {
    max-width: 68rem;
    margin-inline: auto;
  }
  .field-guide p {
    margin: 0;
    color: #65655c;
    font-size: 1rem;
    line-height: 1.7;
  }
  .field-guide .field-guide-eyebrow {
    margin-bottom: 1rem;
    font-size: 0.7rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }
  .field-guide-intro .field-guide-eyebrow {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: var(--ink);
  }
  .field-guide-intro .field-guide-eyebrow::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    background: var(--green);
  }
  .field-guide-intro {
    max-width: 45rem;
  }
  .field-guide h2 {
    margin: 0 0 1.25rem;
    font-size: clamp(1.75rem, 3.4vw, 2.5rem);
    font-weight: 500;
    line-height: 1.12;
    letter-spacing: -0.03em;
    text-transform: none;
  }
  .field-guide a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    color: var(--ink);
    font-size: 0.875rem;
    font-weight: 400;
    text-decoration: none;
  }
  .field-guide-rows {
    display: grid;
    gap: 0;
    margin-top: 2rem;
  }
  .field-guide-row {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) minmax(0, 1.55fr);
    gap: 1rem;
    padding-block: clamp(2rem, 4vw, 3rem);
    border-top: 1px solid var(--ink);
    background: var(--paper);
    scroll-margin-top: 2rem;
  }
  .field-guide-row p {
    color: #363630;
  }
  .field-guide-number {
    padding-top: 0.25rem;
    color: #65655c;
    font-size: 0.75rem;
  }
  .field-guide h3 {
    margin: 0;
    font-size: clamp(1.25rem, 2vw, 1.5rem);
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: -0.02em;
    text-transform: none;
  }
  .field-guide-copy a {
    margin-top: 0.5rem;
    color: var(--green-dark);
    font-weight: 600;
  }
  .field-guide-copy a:hover,
  .field-guide-copy a:focus-visible {
    color: var(--ink);
  }
  .field-guide-install {
    padding: clamp(1.5rem, 4vw, 2.5rem);
    margin-top: 1rem;
    border-top: 4px solid var(--green);
    background: var(--ink);
    color: var(--paper);
    scroll-margin-top: 2rem;
  }
  .field-guide-install p {
    color: #d4d4cb;
  }
  .field-guide-install .field-guide-eyebrow {
    color: var(--green);
  }
  .field-guide-install h3 {
    margin-bottom: 1.25rem;
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.08;
    letter-spacing: -0.035em;
  }
  .field-guide-install > p:not(.field-guide-eyebrow) {
    max-width: 36rem;
  }
  .field-guide details {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e1e1d8;
  }
  .field-guide summary {
    min-height: 44px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .field-guide-install details {
    border-top-color: #55554c;
  }
  .field-guide-install summary {
    color: var(--green);
  }
  .field-guide-platforms {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid #66665f;
    border-left: 1px solid #66665f;
    margin-top: 0.5rem;
  }
  .field-guide-platforms > div {
    padding: clamp(1rem, 2vw, 1.5rem);
    border-right: 1px solid #66665f;
    border-bottom: 1px solid #66665f;
  }
  .field-guide h4 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .field-guide-platforms p {
    font-size: 0.875rem;
  }
  @media (max-width: 600px) {
    .field-guide {
      padding: 2.5rem 1.25rem;
    }
    .field-guide-row {
      grid-template-columns: 1.5rem minmax(0, 1fr);
      gap: 0.625rem;
    }
    .field-guide-copy {
      grid-column: 2;
    }
    .field-guide-platforms {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
