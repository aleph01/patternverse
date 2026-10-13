<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Both links are resolved by the article page. */
  import { Play, MessageCircle, ArrowUpRight, ArrowRight } from '@lucide/svelte';
  import WorksheetButton from './WorksheetButton.svelte';
  import CollectionBrowser from './CollectionBrowser.svelte';
  import type { EntityRef } from '@patternverse/schema';
  import type { CollectionOverview } from '$lib/collection-navigation';
  import type { WorksheetDefinition } from '$lib/worksheet/export';
  import { worksheetEligibility } from '$lib/worksheet/availability.svelte';
  let {
    title,
    tryHref,
    miraHref,
    description,
    compact = false,
    worksheetDefinition,
    article,
    collectionOverviews = [],
  } = $props<{
    title: string;
    tryHref?: string;
    miraHref?: string;
    description: string;
    compact?: boolean;
    worksheetDefinition?: WorksheetDefinition;
    article?: EntityRef;
    collectionOverviews?: readonly CollectionOverview[];
  }>();
  const workbook = worksheetEligibility(() => worksheetDefinition);
  const hasShortcuts = $derived(Boolean(tryHref || miraHref || workbook.available));
</script>

{#snippet shortcuts()}
  <nav class="shortcuts" aria-label="Pattern shortcuts">
    {#if tryHref}<a
        class="try-yourself"
        href={tryHref}
        aria-label="Try this pattern yourself"
        title="Try yourself"><Play size={18} strokeWidth={1.7} /><span>Try yourself</span></a
      >{/if}
    {#if miraHref}<a href={miraHref} aria-label="Explore this pattern with mira" title="With mira"
        ><MessageCircle size={18} strokeWidth={1.7} /><span>With mira</span></a
      >{/if}
    {#if worksheetDefinition && workbook.available}<WorksheetButton
        definition={worksheetDefinition}
        compact
      />{/if}
  </nav>
{/snippet}

{#if compact && (hasShortcuts || collectionOverviews.length)}
  <CollectionBrowser
    overviews={collectionOverviews}
    {article}
    {title}
    actions={hasShortcuts ? shortcuts : undefined}
  />
{:else if !compact}
  <section class="article-actions" aria-labelledby="try-pattern-heading">
    <h2 id="try-pattern-heading">try this pattern</h2>
    <div class="choices">
      {#if tryHref || description}
        <div class="choice">
          <div class="choice-heading">
            <Play size={18} strokeWidth={1.7} />
            <h3>By yourself</h3>
          </div>
          <p>{description}</p>
          {#if tryHref}<a href={tryHref}>Try this pattern <ArrowRight size={16} /></a>{/if}
        </div>
      {/if}
      {#if miraHref}
        <div class="choice">
          <div class="choice-heading">
            <MessageCircle size={18} strokeWidth={1.7} />
            <h3>With mira</h3>
          </div>
          <p>Explore what this pattern means for your situation in a reflective conversation.</p>
          <a href={miraHref}>Open in mira <ArrowUpRight size={16} /></a>
        </div>
      {/if}
      {#if worksheetDefinition && workbook.available}
        <div class="choice">
          <div class="choice-heading"><h3>In your own editor</h3></div>
          <p>Take a blank worksheet into Notion, a document, or wherever you prefer to write.</p>
          <WorksheetButton definition={worksheetDefinition} />
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .shortcuts {
    display: flex;
    gap: 0.5rem;
  }
  .shortcuts a {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    width: 44px;
    height: 44px;
    border: 1px solid #dcdfd9;
    border-radius: 6px;
    color: #191a17;
    background: white;
  }
  .shortcuts span {
    display: none;
  }
  .shortcuts a.try-yourself {
    width: auto;
    padding-inline: 0.85rem;
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
    font-size: 0.85rem;
    font-weight: 650;
    text-transform: none;
  }
  .try-yourself span {
    display: inline;
  }
  .shortcuts a.try-yourself:hover {
    background: var(--green-dark);
    border-color: var(--green-dark);
  }
  .shortcuts :global(button.compact) {
    width: 44px;
    height: 44px;
    padding: 0;
  }
  .shortcuts :global(button.compact span) {
    display: none;
  }
  a:hover {
    background: #eff7f2;
    border-color: #7b9885;
  }
  a:focus-visible {
    outline: 2px solid #008958;
    outline-offset: 3px;
  }
  .article-actions {
    max-width: 760px;
    margin: 2.5rem auto 3rem;
    padding-block: 1.6rem;
    border-block: 1px solid #dfe2dc;
  }
  .article-actions h2 {
    margin: 0 0 1.5rem;
    font-size: 1.15rem;
    line-height: 1.4;
    letter-spacing: -0.02em;
  }
  .choices {
    display: flex;
    gap: 1.8rem;
  }
  .choice {
    flex: 1;
    min-width: 0;
  }
  .choice + .choice {
    border-left: 1px solid #e4e5e1;
    padding-left: 1.8rem;
  }
  .choice-heading {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .choice h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 650;
  }
  .choice p {
    margin: 0.65rem 0 0.8rem;
    font-size: 0.9rem;
    line-height: 1.65;
    color: #62665f;
  }
  .choice a {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 44px;
    font-size: 0.9rem;
    font-weight: 650;
    color: #1d211c;
  }
  @media (max-width: 800px) {
    .shortcuts {
      width: 100%;
    }
    .shortcuts a.try-yourself {
      flex: 1;
    }
  }
  @media (max-width: 640px) {
    .choices {
      flex-direction: column;
      gap: 1.2rem;
    }
    .choice + .choice {
      border-left: 0;
      border-top: 1px solid #e4e5e1;
      padding: 1.2rem 0 0;
    }
  }
</style>
