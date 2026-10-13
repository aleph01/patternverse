<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import {
    dailyPatternDay,
    dailyPatternDateLabel,
    selectDailyPatterns,
    type DailyPattern,
  } from '$lib/daily-patterns';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { patternIconForPattern } from '$lib/illustrations/pattern-mark-presets';

  let { candidates, initialDay }: { candidates: readonly DailyPattern[]; initialDay: string } =
    $props();
  let browserDay = $state('');
  const day = $derived(browserDay || initialDay);
  const patterns = $derived(selectDailyPatterns(candidates, day));

  onMount(() => {
    // Prerendered HTML is a usable fallback; hydration always selects the actual current day.
    const updateDay = () => {
      browserDay = dailyPatternDay();
    };
    updateDay();
    const timer = window.setInterval(updateDay, 30_000);
    document.addEventListener('visibilitychange', updateDay);
    window.addEventListener('focus', updateDay);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateDay);
      window.removeEventListener('focus', updateDay);
    };
  });
</script>

<section class="daily-patterns" aria-labelledby="daily-patterns-heading" data-day={day}>
  <div class="daily-heading">
    <div>
      <p class="kicker">daily discovery</p>
      <h2 id="daily-patterns-heading">today’s patterns.</h2>
      <p class="intro">Three ideas to explore. A fresh selection every day.</p>
    </div>
    <time datetime={day}>{dailyPatternDateLabel(day)}</time>
  </div>
  <div class="editorial-trio">
    {#each patterns as pattern, index (`${pattern.sourceId}:${pattern.id}`)}
      <article class:lead={index === 0} data-pattern-id={pattern.id}>
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="pattern-link" href={pattern.url}>
          <div class="pattern-mark" aria-hidden="true">
            <PatternIcon icon={patternIconForPattern(pattern.id, pattern.title)} decorative />
          </div>
          <div class="pattern-copy">
            <span class="verse-label">{pattern.verseTitle ?? 'Patternverse commons'}</span>
            <h3>{pattern.title}</h3>
            <p class="summary">{pattern.summary}</p>
            <span class="explore">Explore pattern <span aria-hidden="true">↗</span></span>
          </div>
        </a>
      </article>
    {:else}
      <p>No published patterns yet. Explore the library below.</p>
    {/each}
  </div>
  <div class="daily-bottom">
    <span>From across Patternverse.</span>
    <a href={resolve('/library')}>Browse the library <span aria-hidden="true">→</span></a>
  </div>
</section>

<style>
  .daily-patterns {
    --daily-line: #dedfd7;
    --daily-muted: #606159;
    padding: clamp(3rem, 6vw, 6rem) max(3vw, 24px);
    border-bottom: 1px solid var(--ink);
    background: var(--paper);
  }
  .daily-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.25rem;
    margin-bottom: 2rem;
  }
  .kicker {
    margin: 0 0 0.75rem;
    color: var(--green-dark);
    font-size: 0.8rem;
    font-weight: 750;
  }
  h2 {
    margin: 0;
    font-size: clamp(2rem, 3.4vw, 3.25rem);
    font-weight: 850;
    line-height: 1.08;
    letter-spacing: -0.055em;
  }
  .intro {
    margin: 0.8rem 0 0;
    font-size: 0.95rem;
    line-height: 1.55;
    color: var(--daily-muted);
  }
  time {
    flex-shrink: 0;
    padding-top: 2rem;
    font-size: 0.85rem;
    color: var(--daily-muted);
  }
  .editorial-trio {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 0 2rem;
  }
  article {
    min-width: 0;
    border-bottom: 1px solid var(--daily-line);
  }
  .lead {
    grid-row: span 2;
    border: 1px solid var(--daily-line);
    border-radius: 8px;
    background: #f5f8f4;
  }
  .pattern-link {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    height: 100%;
    padding: 1.25rem 0;
    text-decoration: none;
    color: var(--ink);
  }
  .lead .pattern-link {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.75rem;
    gap: 0;
  }
  .pattern-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-self: stretch;
  }
  .pattern-mark {
    order: 1;
    width: 72px;
    height: 72px;
    flex-shrink: 0;
  }
  .lead .pattern-mark {
    order: 0;
    width: 104px;
    height: 104px;
    margin-bottom: 2rem;
  }
  .verse-label {
    color: var(--green-dark);
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.5;
    text-transform: lowercase;
  }
  h3 {
    margin: 0.6rem 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 750;
    line-height: 1.18;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  }
  .lead h3 {
    max-width: 22ch;
    font-size: clamp(1.75rem, 2.4vw, 2.25rem);
  }
  .summary {
    margin: 0 0 1rem;
    max-width: 60ch;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--daily-muted);
  }
  .explore {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: auto;
    min-height: 44px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .lead .explore {
    border-top: 1px solid var(--daily-line);
  }
  .explore span {
    font-size: 1.2rem;
  }
  .pattern-link:hover h3,
  .pattern-link:hover .explore {
    color: var(--green-dark);
  }
  .pattern-link:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .daily-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    font-size: 0.8rem;
    color: var(--daily-muted);
  }
  .daily-bottom a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    font-weight: 700;
    text-decoration: none;
  }
  @media (max-width: 760px) {
    .daily-patterns {
      padding: 2.5rem 24px;
    }
    .daily-heading {
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    time {
      padding-top: 0;
      font-size: 0.8rem;
    }
    .editorial-trio {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .lead {
      grid-row: auto;
    }
    .pattern-mark,
    .lead .pattern-mark {
      display: none;
    }
    .pattern-link {
      padding: 0.75rem 0;
    }
    .lead .pattern-link {
      padding: 1.25rem;
    }
    h3,
    .lead h3 {
      max-width: none;
      font-size: 1.4rem;
    }
    .summary {
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .daily-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
    }
  }
</style>
