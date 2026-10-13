<script lang="ts">
  let { onFree, onOpenRouter }: { onFree: () => void; onOpenRouter: () => void } = $props();
</script>

<section class="pattern-run-message" aria-labelledby="guided-ai-choice-heading">
  <h2 id="guided-ai-choice-heading">Choose AI for this practice</h2>
  <p>
    Free AI is available for guided steps only, with a limited daily allowance shared by everyone.
  </p>
  <p class="pattern-run-privacy">
    Choosing free AI sends this practice’s confirmed answers and progress to Patternverse’s backend
    for validation, and the step’s relevant context to Cloudflare Workers AI. Patternverse does not
    store those answers on the server. Avoid sensitive or identifying details. AI can be wrong; this
    is not therapy or medical advice.
  </p>
  <div class="pattern-run-actions">
    <button type="button" class="pattern-run-primary" onclick={onFree}>Use free AI →</button>
    <button type="button" class="pattern-run-secondary" onclick={onOpenRouter}
      >Use OpenRouter instead</button
    >
  </div>
  <p class="pattern-run-privacy">
    This choice applies to this practice only. No paid fallback happens automatically.
  </p>
</section>

<style>
  .pattern-run-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
</style>
