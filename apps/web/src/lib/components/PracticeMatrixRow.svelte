<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- The article page resolves action URLs. */
  import { ArrowRight, ArrowUpRight } from '@lucide/svelte';
  import WorksheetButton from './WorksheetButton.svelte';
  import type { PracticeAction } from '$lib/practice-options';
  import { worksheetEligibility } from '$lib/worksheet/availability.svelte';
  let {
    practice,
    showMira,
    showWorksheets,
  }: { practice: PracticeAction; showMira: boolean; showWorksheets: boolean } = $props();
  const worksheet = worksheetEligibility(() => practice.worksheetDefinition);
</script>

<tr>
  <th scope="row"
    ><span class="practice-title">{practice.title}</span>{#if practice.summary}<span
        class="practice-summary">{practice.summary}</span
      >{/if}{#if practice.durationMinutes}<span class="practice-duration"
        >{practice.durationMinutes} min</span
      >{/if}</th
  >
  <td
    ><span class="mobile-label">By yourself</span>{#if practice.tryHref}<a
        href={practice.tryHref}
        aria-label={`Start ${practice.title}`}>Start <ArrowRight size={16} /></a
      >{:else}<span class="unavailable" aria-label="Self-guided practice unavailable">—</span
      >{/if}</td
  >
  {#if showMira}<td
      ><span class="mobile-label">With mira</span>{#if practice.miraHref}<a
          href={practice.miraHref}
          aria-label={`Explore ${practice.title} with mira`}>Explore <ArrowUpRight size={16} /></a
        >{:else}<span class="unavailable" aria-label="Mira unavailable">—</span>{/if}</td
    >{/if}
  {#if showWorksheets}<td
      ><span class="mobile-label">In your own editor</span
      >{#if practice.worksheetDefinition && worksheet.available}<WorksheetButton
          definition={practice.worksheetDefinition}
          label={`Open worksheet for ${practice.title}`}
        />{:else}<span class="unavailable" aria-label="Worksheet unavailable">—</span>{/if}</td
    >{/if}
</tr>

<style>
  th,
  td {
    padding: 1.3rem 0.65rem;
    border-bottom: 1px solid #dfe2dc;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }
  th {
    padding-left: 0;
    text-align: left;
    font-weight: 400;
  }
  td {
    text-align: center;
  }
  td:last-child {
    padding-right: 0;
  }
  tr:last-child th,
  tr:last-child td {
    border-bottom: 0;
  }
  .practice-title {
    display: block;
    font-size: 0.95rem;
    font-weight: 650;
    line-height: 1.4;
  }
  .practice-summary {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.85rem;
    line-height: 1.6;
    color: #62665f;
  }
  .practice-duration {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: #62665f;
  }
  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 44px;
    color: #1d211c;
    font-size: 0.85rem;
    font-weight: 650;
  }
  a:focus-visible {
    outline: 2px solid #008958;
    outline-offset: 3px;
  }
  .mobile-label {
    display: none;
  }
  .unavailable {
    color: #62665f;
  }
  @media (max-width: 640px) {
    tr {
      display: flex;
      flex-wrap: wrap;
      padding-block: 1.2rem;
      border-bottom: 1px solid #dfe2dc;
      gap: 0.5rem 1rem;
    }
    tr:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    th {
      flex-basis: 100%;
    }
    th,
    td {
      padding: 0;
      border: 0;
    }
    td {
      flex: 1;
      text-align: left;
      min-width: 80px;
    }
    .mobile-label {
      display: block;
      color: #62665f;
      font-size: 0.7rem;
      margin-top: 0.5rem;
    }
    a {
      justify-content: start;
      font-size: 0.8rem;
    }
    td :global(button) {
      padding-inline: 0.5rem;
      font-size: 0.75rem;
      gap: 0.35rem;
    }
  }
</style>
