<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<section class="home-chatgpt" id="home-chatgpt" aria-labelledby="home-chatgpt-heading">
  <div class="chatgpt-inner">
    <p class="chatgpt-eyebrow">Another way in</p>
    <div class="chatgpt-columns">
      <div class="chatgpt-copy">
        <h2 id="home-chatgpt-heading">Use Patternverse<br />in ChatGPT.</h2>
        <p class="chatgpt-intro">
          Bring useful patterns into the conversation you’re already having.
        </p>
        <p class="chatgpt-description">
          Search the library, explore an article, or try a worksheet.
        </p>
        <details id="chatgpt-setup">
          <summary>See setup instructions <span aria-hidden="true">↓</span></summary>
          <div class="chatgpt-instructions">
            <h3>Connect your ChatGPT account</h3>
            <ol>
              <li>
                Open <a href="https://chatgpt.com/plugins" target="_blank" rel="noreferrer"
                  >Plugins in ChatGPT <span aria-hidden="true">↗</span></a
                >. Select the plus button, then <strong>Add custom MCP server</strong>.
              </li>
              <li>
                Name it <strong>Patternverse</strong>. For the description, enter “Search published
                patterns, read articles, and try the Define the Decision worksheet.”
              </li>
              <li>
                Choose a public URL connection, enter <code>https://patternverse.org/mcp</code>, and
                choose <strong>no authentication</strong>. Review the connection notice, then select
                <strong>Create as a plugin</strong> and install it.
              </li>
              <li>
                Start a new chat, type <strong>@</strong>, and select <strong>Patternverse</strong>.
                Try asking: “Find a Patternverse pattern to help me make a clearer decision.”
              </li>
            </ol>
            <p>
              Custom connections depend on your ChatGPT account and workspace permissions. If the
              option is missing, check your workspace settings or ask your administrator. See
              <a
                href="https://developers.openai.com/plugins/deploy/connect-chatgpt"
                target="_blank"
                rel="noreferrer"
                >OpenAI’s current connection guide <span aria-hidden="true">↗</span></a
              > for the latest steps.
            </p>
            <p>
              This connection searches published Commons content. Only <em>Define the Decision</em>
              currently runs as an inline worksheet; other practices can be explored on Patternverse.
              Worksheet responses stay in the open worksheet’s memory and aren’t automatically shared
              back to the conversation or saved. Closing or restarting the worksheet clears them.
            </p>
          </div>
        </details>
        <p class="chatgpt-note">Manual setup. Requires custom connections in ChatGPT.</p>
      </div>

      <aside class="chatgpt-example" aria-labelledby="chatgpt-example-heading">
        <p class="chatgpt-example-label" id="chatgpt-example-heading">Start with a question</p>
        <blockquote>“I keep comparing options without knowing what I actually want.”</blockquote>
        <p class="chatgpt-pattern-label">A pattern to explore</p>
        <a
          class="chatgpt-pattern-link"
          href={resolve('/pattern/define-the-decision-before-comparing-options')}
        >
          Define the Decision Before Comparing Options <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </div>
  </div>
</section>

<style>
  .home-chatgpt {
    padding: clamp(3rem, 6vw, 5rem) max(3vw, calc((100vw - 1440px) / 2));
    background: var(--paper);
    color: var(--ink);
    scroll-margin-top: 2rem;
  }
  .chatgpt-eyebrow,
  .chatgpt-example-label,
  .chatgpt-pattern-label {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .chatgpt-eyebrow {
    margin-bottom: 2rem;
  }
  .chatgpt-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: start;
    gap: clamp(2rem, 5vw, 5rem);
  }
  h2 {
    margin: 0 0 1.5rem;
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: -0.05em;
  }
  .chatgpt-intro {
    max-width: 30ch;
    margin: 0 0 1.25rem;
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    line-height: 1.55;
  }
  .chatgpt-description {
    max-width: 38ch;
    margin: 0 0 1.75rem;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.65;
  }
  summary {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    min-height: 48px;
    padding: 0.8rem 1rem;
    border: 0;
    border-radius: 6px;
    background: var(--ink);
    color: var(--paper);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    list-style: none;
  }
  summary:hover {
    background: var(--surface-dark-raised);
  }
  .chatgpt-note {
    max-width: 36ch;
    margin: 0.875rem 0 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .chatgpt-example {
    padding-top: 0.5rem;
    max-width: 26rem;
  }
  blockquote {
    margin: 1.25rem 0 2.5rem;
    font-size: clamp(1.4rem, 2.6vw, 2rem);
    line-height: 1.4;
    letter-spacing: -0.035em;
  }
  .chatgpt-pattern-label {
    color: var(--muted);
    letter-spacing: 0.04em;
    line-height: 1.5;
  }
  .chatgpt-pattern-link {
    display: inline-block;
    min-height: 44px;
    max-width: 28ch;
    padding-top: 0.625rem;
    color: var(--green-dark);
    font-size: 1rem;
    line-height: 1.6;
  }
  .chatgpt-pattern-link:hover {
    text-decoration: underline;
  }
  .chatgpt-pattern-link span {
    white-space: nowrap;
  }
  details {
    margin-top: 0;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  details[open] summary > span {
    transform: rotate(180deg);
  }
  .chatgpt-instructions {
    padding: 1.5rem 0 0.25rem;
    font-size: 0.875rem;
    line-height: 1.7;
  }
  .chatgpt-instructions h3 {
    margin: 0 0 1.25rem;
    font-size: 1.25rem;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  .chatgpt-instructions ol {
    padding-left: 1.25rem;
    margin: 0 0 1.5rem;
  }
  .chatgpt-instructions li + li {
    margin-top: 1rem;
  }
  .chatgpt-instructions p {
    margin: 1rem 0 0;
    color: var(--muted);
  }
  .chatgpt-instructions a {
    color: var(--green-dark);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  code {
    overflow-wrap: anywhere;
    font-size: 0.875rem;
  }
  @media (max-width: 650px) {
    .home-chatgpt {
      padding: 2.5rem 1.25rem;
    }
    .chatgpt-columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
