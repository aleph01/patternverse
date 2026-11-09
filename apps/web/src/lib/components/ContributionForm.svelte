<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';

  let availability = $state<'checking' | 'ready' | 'unavailable'>('checking');
  let sending = $state(false);
  let sent = $state(false);
  let error = $state('');
  let name = $state('');
  let email = $state('');
  let message = $state('');
  let website = $state('');

  onMount(() => {
    const controller = new AbortController();
    fetch('/api/contribute/status', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const status = response.ok ? await response.json() : null;
        availability = status?.available === true ? 'ready' : 'unavailable';
      })
      .catch(() => {
        availability = 'unavailable';
      });
    return () => controller.abort();
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (sending || sent || availability !== 'ready') return;
    error = '';
    sending = true;
    try {
      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website }),
      });
      const result = await response.json();
      if (!response.ok || result?.sent !== true) {
        error =
          typeof result?.error === 'string'
            ? result.error
            : 'Your message could not be sent. Please try again or use the email link above.';
        return;
      }
      sent = true;
      name = '';
      email = '';
      message = '';
    } catch {
      error = 'Your message could not be sent. Please try again or use the email link above.';
    } finally {
      sending = false;
    }
  }
</script>

<section aria-labelledby="form-heading">
  <h2 id="form-heading">Or write here</h2>
  <p>Your message goes to the same inbox. A rough idea is enough.</p>
  {#if sent}
    <p class="success" role="status">Thanks for sharing your idea. Your message has been sent.</p>
  {:else}
    <form aria-label="Contribution idea" onsubmit={submit}>
      <fieldset disabled={sending}>
        <div class="contact-fields">
          <label for="contribution-name"
            ><span>Name <small>(optional)</small></span>
            <input
              id="contribution-name"
              name="name"
              autocomplete="name"
              maxlength="100"
              bind:value={name}
            />
          </label>
          <label for="contribution-email"
            >Your email
            <input
              id="contribution-email"
              name="email"
              type="email"
              autocomplete="email"
              maxlength="254"
              required
              bind:value={email}
            />
          </label>
        </div>
        <label for="contribution-message"
          >What would you like to contribute?
          <textarea
            id="contribution-message"
            name="message"
            rows="6"
            maxlength="5000"
            required
            bind:value={message}></textarea>
        </label>
        <div class="honeypot" aria-hidden="true" inert>
          <label for="contribution-website"
            >Leave this field empty
            <input
              id="contribution-website"
              name="website"
              autocomplete="off"
              tabindex="-1"
              bind:value={website}
            />
          </label>
        </div>
        <p class="privacy-note">
          Your details are used to respond to your message. <a href={resolve('/privacy')}
            >Privacy notice</a
          >
        </p>
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        {#if availability === 'unavailable'}
          <p class="availability" role="status">
            The form is temporarily unavailable. Please use the email link above.
          </p>
        {/if}
        <button type="submit" disabled={availability !== 'ready'}>
          {sending
            ? 'Sending…'
            : availability === 'checking'
              ? 'Checking availability…'
              : 'Send message'}
        </button>
      </fieldset>
    </form>
  {/if}
</section>

<style>
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    line-height: 1.4;
    letter-spacing: -0.025em;
  }
  p {
    line-height: 1.75;
  }
  fieldset {
    min-width: 0;
    margin: 1.5rem 0 0;
    padding: 0;
    border: 0;
  }
  .contact-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
  label {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    font-weight: 650;
    line-height: 1.5;
  }
  label small {
    font-weight: 400;
  }
  input,
  textarea {
    width: 100%;
    min-width: 0;
    padding: 0.75rem;
    border: 1px solid #a6aaa4;
    color: var(--ink);
    background: var(--paper);
    font-weight: 400;
  }
  input {
    min-height: 48px;
  }
  textarea {
    resize: vertical;
    line-height: 1.6;
  }
  .honeypot {
    display: none;
  }
  .privacy-note,
  .availability {
    font-size: 0.875rem;
  }
  .privacy-note a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  button {
    min-height: 48px;
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--ink);
    color: var(--paper);
    background: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }
  button:hover:enabled {
    background: var(--green-dark);
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .success {
    padding: 1rem 1.25rem;
    border-left: 3px solid var(--green-dark);
    background: var(--mint);
  }
  .error {
    color: #8a251f;
  }
  @media (max-width: 540px) {
    .contact-fields {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
