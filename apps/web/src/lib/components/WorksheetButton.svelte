<script lang="ts">
  import { FileText } from '@lucide/svelte';
  import WorksheetPreview from './WorksheetPreview.svelte';
  import type { WorksheetDefinition } from '$lib/worksheet/export';
  import { worksheetEligibility } from '$lib/worksheet/availability.svelte';
  let {
    definition,
    compact = false,
    explainUnavailable = false,
  }: {
    definition: WorksheetDefinition;
    compact?: boolean;
    explainUnavailable?: boolean;
  } = $props();
  let open = $state(false);
  const eligibility = worksheetEligibility(() => definition);
</script>

{#if eligibility.available}<button
    type="button"
    class:compact
    aria-label="Open worksheet"
    title="Worksheet"
    onclick={() => (open = true)}
    ><FileText size={18} strokeWidth={1.7} /><span>Worksheet</span></button
  >{/if}
{#if explainUnavailable && eligibility.reason}<small>{eligibility.reason}</small>{/if}
{#if open && eligibility.available}<WorksheetPreview {definition} bind:open />{/if}

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    min-height: 44px;
    padding: 10px 14px;
    border: 1px solid #dcdfd9;
    border-radius: 6px;
    color: #191a17;
    background: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    background: #eff7f2;
    border-color: #7b9885;
  }
  button:focus-visible {
    outline: 2px solid #008958;
    outline-offset: 3px;
  }
  button.compact {
    width: 44px;
    height: 44px;
    padding: 0;
  }
  .compact span {
    display: none;
  }
  @media (max-width: 640px) {
    button.compact {
      width: auto;
      padding: 0 10px;
      font-size: 0.78rem;
    }
    .compact span {
      display: inline;
    }
  }
</style>
