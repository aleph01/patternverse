<script lang="ts">
  import { Play, MessageCircle, FileText } from '@lucide/svelte';
  import type { PracticeAction } from '$lib/practice-options';
  import PracticeMatrixRow from './PracticeMatrixRow.svelte';
  let { practices }: { practices: readonly PracticeAction[] } = $props();
  const showMira = $derived(practices.some((practice) => practice.miraHref));
  const showWorksheets = $derived(practices.some((practice) => practice.worksheetDefinition));
</script>

<p>Choose a practice and how you’d like to use it.</p>
<table aria-label="Practices and ways to use them">
  <thead
    ><tr
      ><th scope="col">Practice</th><th scope="col"
        ><span><Play size={18} strokeWidth={1.7} />By yourself</span></th
      >{#if showMira}<th scope="col"
          ><span><MessageCircle size={18} strokeWidth={1.7} />With mira</span></th
        >{/if}{#if showWorksheets}<th scope="col"
          ><span><FileText size={18} strokeWidth={1.7} />In your own editor</span></th
        >{/if}</tr
    ></thead
  >
  <tbody
    >{#each practices as practice (`${practice.ref.sourceId}:${practice.ref.entityId}`)}<PracticeMatrixRow
        {practice}
        {showMira}
        {showWorksheets}
      />{/each}</tbody
  >
</table>

<style>
  p {
    margin: -0.5rem 0 1.5rem;
    font-size: 0.9rem;
    color: #62665f;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th {
    padding: 0 0.65rem 1rem;
    border-bottom: 1px solid #dfe2dc;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  th:first-child {
    width: 40%;
    padding-left: 0;
    text-align: left;
  }
  th:last-child {
    padding-right: 0;
  }
  th span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  @media (max-width: 640px) {
    table,
    tbody {
      display: block;
    }
    thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
</style>
