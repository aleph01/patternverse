<script lang="ts">
  import { resolve } from '$app/paths';
  import { ArrowUpRight } from '@lucide/svelte';
  let { type, id }: { type: string; id: string } = $props();
</script>

<section
  id="suggest-improvement"
  class="contribution-invitation compact-meta-section"
  aria-labelledby="article-feedback-heading"
>
  <div class="feedback-copy">
    <div class="compact-meta-heading">
      <span class="compact-meta-index" aria-hidden="true"></span>
      <h2 id="article-feedback-heading">Article feedback</h2>
    </div>
    <p>Clearer wording, examples, or feedback on a passage.</p>
  </div>
  <a
    class="contribution-trigger"
    href={resolve('/[type=entityType]/[id]/feedback', { type, id })}
    data-sveltekit-reload
  >
    <span>Suggest an improvement</span>
    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
  </a>
</section>

<style>
  .contribution-invitation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    border-bottom: 1px solid var(--ink);
    padding: 1rem 1.5rem;
    flex-wrap: wrap;
  }
  .contribution-invitation:last-child {
    border-bottom: 0;
  }
  :global(.personal-state) + .contribution-invitation {
    border-top: 1px solid var(--ink);
  }
  .feedback-copy {
    display: grid;
    gap: 0.35rem;
  }
  h2 {
    margin: 0;
    font: 800 0.85rem/1.4 var(--font-sans);
    letter-spacing: -0.02em;
    text-transform: lowercase;
  }
  p {
    margin: 0;
    font: 400 0.75rem/1.6 var(--font-sans);
    color: var(--muted);
  }
  .contribution-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: 44px;
    font: 750 0.8rem/1.4 var(--font-sans);
  }
  .contribution-trigger:hover {
    color: var(--green-dark);
  }
  .contribution-trigger:hover span {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  @media (max-width: 800px) {
    .contribution-invitation {
      align-items: stretch;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.15rem;
    }
  }
</style>
