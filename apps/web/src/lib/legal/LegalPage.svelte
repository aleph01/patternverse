<script lang="ts">
  import type { Snippet } from 'svelte';
  import LegalLinks from './LegalLinks.svelte';
  import { operator } from './operator';

  let {
    title,
    intro,
    lang = 'de',
    children,
  }: { title: string; intro: string; lang?: 'de' | 'en'; children: Snippet } = $props();

  const updatedDate = new Date(`${operator.updated}T00:00:00Z`);
  let updated = $derived(
    new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(updatedDate),
  );
</script>

<svelte:head>
  <title>{title} — Patternverse</title>
  <meta name="description" content={intro} />
</svelte:head>

<main class="legal-page" {lang}>
  <header class="legal-page-heading">
    <p class="legal-kicker">patternverse / {lang === 'en' ? 'legal' : 'rechtliches'}</p>
    <h1>{title}</h1>
    <p class="legal-intro">{intro}</p>
    <p class="legal-updated">{lang === 'en' ? 'Last updated' : 'Stand'}: {updated}</p>
  </header>
  <LegalLinks />
  <div class="legal-copy">{@render children()}</div>
</main>

<style>
  .legal-page {
    width: min(100% - 2rem, 800px);
    margin: 0 auto;
    padding: clamp(2.5rem, 6vw, 5rem) 0;
    color: var(--ink);
  }
  .legal-page-heading {
    border-bottom: 1px solid var(--ink);
    padding-bottom: 1.5rem;
  }
  .legal-kicker,
  .legal-updated {
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .legal-kicker {
    color: var(--green-dark);
    font-weight: 700;
  }
  .legal-page h1 {
    margin: 0.75rem 0 1rem;
    font-size: clamp(2rem, 6vw, 3.5rem);
    line-height: 1.1;
    letter-spacing: -0.045em;
    overflow-wrap: anywhere;
  }
  .legal-intro {
    max-width: 65ch;
    font-size: 1.0625rem;
    line-height: 1.6;
  }
  .legal-updated {
    margin-bottom: 0;
    color: #575750;
  }
  .legal-copy {
    padding-top: 1rem;
  }
  .legal-copy :global(section) {
    margin: 0 0 2.5rem;
  }
  .legal-copy :global(h2) {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    line-height: 1.4;
    letter-spacing: -0.025em;
  }
  .legal-copy :global(p),
  .legal-copy :global(li),
  .legal-copy :global(address) {
    font-size: 1rem;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }
  .legal-copy :global(address) {
    font-style: normal;
  }
  .legal-copy :global(a) {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .legal-copy :global(a:hover) {
    color: var(--green-dark);
  }
  .legal-copy :global(ul) {
    padding-left: 1.25rem;
  }
  .legal-copy :global(.legal-notice) {
    border-left: 3px solid var(--green-dark);
    background: var(--mint);
    padding: 1rem 1.25rem;
  }
</style>
