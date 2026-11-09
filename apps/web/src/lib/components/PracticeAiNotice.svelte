<script lang="ts">
  import { resolve } from '$app/paths';

  let {
    reason = null,
    desktop = false,
    embedded = false,
    connected = null,
    provider = null,
    freeAvailable = false,
    issue = null,
    checking = false,
    error = '',
    onCheck,
  }: {
    reason?: string | null;
    desktop?: boolean;
    embedded?: boolean;
    connected?: boolean | null;
    provider?: 'free' | 'openrouter' | null;
    freeAvailable?: boolean;
    issue?: 'connection' | 'credits' | 'free-limit' | null;
    checking?: boolean;
    error?: string;
    onCheck: () => void;
  } = $props();
  const id = $props.id();
  let dialog: HTMLDialogElement;
  let showing = $state(false);
  const canConnect = $derived(!desktop && !embedded && provider !== 'free' && connected === false);
  const status = $derived(
    embedded
      ? 'AI unavailable in this embed'
      : desktop
        ? 'Uses your local model'
        : provider === 'free'
          ? issue === 'free-limit'
            ? 'Free AI limit reached'
            : 'Using free AI'
          : issue === 'credits'
            ? 'OpenRouter credits needed'
            : connected === true
              ? 'OpenRouter connected'
              : checking
                ? 'Checking connection…'
                : connected === false
                  ? 'OpenRouter not connected'
                  : 'Connection not checked',
  );
  function showInfo() {
    dialog.showModal();
    showing = true;
  }
</script>

<aside class="ai-notice" aria-label="AI-assisted practice">
  <div class="ai-notice-heading">
    <strong>AI-assisted practice</strong>
    <span class="ai-status" aria-live="polite">{status}</span>
    <button
      class="ai-info-button"
      type="button"
      aria-haspopup="dialog"
      aria-expanded={showing}
      onclick={showInfo}
    >
      <span aria-hidden="true">ⓘ</span> About AI
    </button>
  </div>
  {#if canConnect}
    <div class="ai-connect-row">
      <p>Some steps may use AI. You can start now and connect when needed.</p>
      <a href={resolve('/auth/openrouter/connect')} target="_blank" rel="noopener noreferrer"
        >Connect with OpenRouter ↗</a
      >
    </div>
  {:else if freeAvailable && !provider && connected !== true && !desktop && !embedded}
    <p class="ai-note">
      Some steps may use AI. Free AI is available; choose a provider when you reach an AI step.
    </p>
  {/if}
</aside>

<dialog
  bind:this={dialog}
  class="ai-info-dialog"
  aria-labelledby={`${id}-title`}
  onclose={() => (showing = false)}
>
  <header>
    <h2 id={`${id}-title`}>About AI in this practice</h2>
    <button
      type="button"
      class="ai-close"
      aria-label="Close AI information"
      onclick={() => dialog.close()}>×</button
    >
  </header>
  <p class="ai-purpose">
    {reason ||
      'Some paths use AI to suggest interpretations, write tailored questions or offer alternatives.'}
  </p>
  <div class="ai-questions">
    <details>
      <summary>What is OpenRouter?</summary>
      <p>
        OpenRouter is a service that connects Patternverse to AI models through your account. You
        can connect by signing in; there is no API key to copy or paste.
      </p>
      {#if desktop}<p>
          This desktop practice uses your selected local model instead of OpenRouter.
        </p>{/if}
    </details>
    <details>
      <summary>Do I need to connect before starting?</summary>
      <p>
        You can complete non-AI steps first. If your chosen path reaches an AI step, the practice
        waits there until AI is available. Connecting does not send your answers or run that step.
      </p>
      {#if freeAvailable}<p>
          You can also choose free AI at an AI step, while the shared allowance is available.
        </p>{/if}
      {#if embedded}<p>
          This embedded view supports self-guided steps only; it has no AI connection.
        </p>{/if}
    </details>
    <details>
      <summary>Does it cost anything?</summary>
      <p>
        OpenRouter requests use your account's credits. The cost depends on the model and request.
        Connecting alone does not purchase credits.
      </p>
      <p>
        Free AI, when offered, has a limited shared daily allowance. Desktop local-model steps do
        not use OpenRouter credits. The practice never switches automatically to a paid provider.
      </p>
    </details>
    <details>
      <summary>What gets sent?</summary>
      {#if desktop}
        <p>
          The practice instruction, relevant answers and any reference material for that step go to
          your selected local model on this device.
        </p>
      {:else if provider === 'free'}
        <p>
          Free AI sends this practice's confirmed answers and progress to Patternverse's backend for
          validation, and the step's relevant context to Cloudflare Workers AI. Those answers are
          not stored on the server.
        </p>
      {:else}
        <p>
          OpenRouter steps send the practice instruction, relevant answers and any reference
          material for that step through OpenRouter to your selected model, using zero-retention
          routing. Other workspace content is not included.
        </p>
      {/if}
      <p>
        You choose whether to use AI. Connection and status checks do not send your practice
        responses.
      </p>
    </details>
    <details>
      <summary>Does connecting save my answers?</summary>
      <p>
        Connecting and saving are separate actions. Choose Save to workspace to keep your responses.
        You can connect without saving this practice.
      </p>
    </details>
    <details>
      <summary>How should I use AI suggestions?</summary>
      <p>
        Treat suggestions as possibilities to examine. AI can miss context or add assumptions; you
        decide what fits your experience.
      </p>
    </details>
  </div>
  {#if !desktop && !embedded && provider !== 'free'}
    <footer>
      {#if connected !== true}<a
          class="ai-connect-link"
          href={resolve('/auth/openrouter/connect')}
          target="_blank"
          rel="noopener noreferrer">Connect with OpenRouter ↗</a
        >{/if}
      <button class="ai-check-button" type="button" disabled={checking} onclick={onCheck}
        >{checking ? 'Checking connection…' : 'Check connection'}</button
      >
      {#if error}<p class="ai-error" role="alert">{error}</p>{/if}
    </footer>
  {/if}
</dialog>

<style>
  .ai-notice {
    margin: 1rem 0 1.25rem;
    padding: 0.8rem 1rem;
    border: 1px solid var(--line, #d5d8d1);
    border-radius: 4px;
    background: var(--paper, #fff);
    color: var(--ink, #181814);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .ai-notice-heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.8rem;
  }
  .ai-notice-heading strong {
    font-weight: 650;
  }
  .ai-status {
    color: var(--muted, #60645e);
  }
  .ai-info-button {
    margin-left: auto;
  }
  .ai-info-button,
  .ai-check-button {
    background: none;
    border: 0;
    padding: 0.15rem 0;
    color: var(--green-dark, #007a4d);
    font: inherit;
    cursor: pointer;
  }
  .ai-info-button:hover,
  a:hover,
  .ai-check-button:hover {
    text-decoration: underline;
  }
  .ai-connect-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
    margin-top: 0.5rem;
  }
  .ai-connect-row p,
  .ai-note {
    margin: 0;
    color: var(--muted, #60645e);
  }
  .ai-note {
    margin-top: 0.5rem;
  }
  a {
    color: var(--green-dark, #007a4d);
    text-decoration: none;
    font-weight: 600;
  }
  button:focus-visible,
  a:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--focus, #005fcc);
    outline-offset: 3px;
  }
  .ai-info-dialog {
    width: min(34rem, calc(100% - 2rem));
    max-height: calc(100dvh - 2rem);
    box-sizing: border-box;
    padding: 1.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--line, #d5d8d1);
    border-radius: 6px;
    background: var(--paper, #fff);
    color: var(--ink, #181814);
    font: inherit;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .ai-info-dialog::backdrop {
    background: rgb(0 0 0 / 30%);
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
    line-height: 1.35;
  }
  .ai-close {
    border: 0;
    background: none;
    color: inherit;
    padding: 0 0.25rem;
    font: inherit;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }
  .ai-purpose {
    margin: 0.85rem 0 1rem;
    color: var(--muted, #60645e);
  }
  details {
    border-top: 1px solid var(--line, #d5d8d1);
  }
  summary {
    padding: 0.7rem 0;
    cursor: pointer;
    font-weight: 600;
  }
  details p {
    margin: 0 0 0.8rem;
    color: var(--muted, #60645e);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    border-top: 1px solid var(--line, #d5d8d1);
    margin-top: 0.5rem;
    padding-top: 0.8rem;
  }
  .ai-error {
    flex-basis: 100%;
    margin: 0;
    color: var(--error, #a12626);
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  @media (max-width: 600px) {
    .ai-notice {
      padding: 0.7rem 0.8rem;
    }
    .ai-status {
      flex-basis: 100%;
      order: 1;
    }
    .ai-info-dialog {
      width: 100%;
      max-width: none;
      max-height: 88dvh;
      margin: auto 0 0;
      border-radius: 12px 12px 0 0;
    }
  }
</style>
