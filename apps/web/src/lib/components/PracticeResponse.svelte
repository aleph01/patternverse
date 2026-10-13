<script lang="ts">
  import { Quote } from '@lucide/svelte';

  let { text }: { text: string } = $props();
</script>

<div class="practice-response">
  <p class="response-label"><Quote size={14} aria-hidden="true" />Your response</p>
  <p class="response-text">{text}</p>
</div>

<style>
  .practice-response {
    min-width: 0;
    padding: 1rem 1.125rem;
    border-radius: 6px;
    background: #f3f2eb;
    color: var(--ink, #181814);
  }
  .response-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.4rem;
    color: var(--muted, #59675c);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.5;
  }
  .response-text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.65;
  }
</style>
