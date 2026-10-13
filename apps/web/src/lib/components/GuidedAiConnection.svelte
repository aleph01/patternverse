<script lang="ts">
  import { resolve } from '$app/paths';

  let {
    reason = 'connection',
    checking = false,
    error = '',
    onCheck,
    checkLabel,
  }: {
    reason?: 'connection' | 'credits' | 'free-limit';
    checking?: boolean;
    error?: string;
    onCheck: () => void;
    checkLabel?: string;
  } = $props();
</script>

<section class="pattern-run-message" aria-labelledby="guided-ai-connection-heading">
  <h2 id="guided-ai-connection-heading">
    {reason === 'free-limit'
      ? 'Free AI limit reached for today.'
      : reason === 'credits'
        ? 'Your OpenRouter limit has been reached.'
        : 'Connect with OpenRouter'}
  </h2>
  <p>
    {reason === 'free-limit'
      ? 'Connect with OpenRouter to continue this guided step using your own account and credits, or wait until the free allowance resets.'
      : reason === 'credits'
        ? 'Add credits or adjust your limit in OpenRouter, or connect another account. Then return here and retry this step.'
        : 'Sign in to OpenRouter to use AI-assisted guided steps. No API key to copy or paste.'}
    Your practice stays open in this tab. Connecting does not save or send your responses.
  </p>
  <p class="pattern-run-privacy">
    AI steps use your account and credits with zero-retention routing. Nothing switches
    automatically.
  </p>
  <div class="pattern-run-actions">
    <a
      class="pattern-run-primary"
      href={resolve('/auth/openrouter/connect')}
      target="_blank"
      rel="noopener noreferrer">Connect with OpenRouter ↗</a
    >
    {#if reason === 'credits'}
      <a
        class="pattern-run-secondary"
        href="https://openrouter.ai/settings/credits"
        target="_blank"
        rel="noopener noreferrer">Manage OpenRouter credits ↗</a
      >
    {/if}
    <button type="button" class="pattern-run-secondary" disabled={checking} onclick={onCheck}
      >{checking ? 'Checking connection…' : (checkLabel ?? 'Check connection')}</button
    >
  </div>
  {#if error}<p class="pattern-run-error" role="alert">{error}</p>{/if}
</section>

<style>
  .pattern-run-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
</style>
