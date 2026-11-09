<script lang="ts">
  import Studio from './Studio.svelte';
  import PatternMarkStudio from './PatternMarkStudio.svelte';
  import ConceptGraphicStudio from './ConceptGraphicStudio.svelte';
  let mode = $state('concepts');
</script>

<nav class="studio-switch" aria-label="Personal design tools">
  <button aria-pressed={mode === 'concepts'} onclick={() => (mode = 'concepts')}
    >Pattern graphics</button
  >
  <button aria-pressed={mode === 'illustrations'} onclick={() => (mode = 'illustrations')}
    >Large illustrations</button
  >
  <button aria-pressed={mode === 'marks'} onclick={() => (mode = 'marks')}
    >Archived grid tool</button
  >
</nav>
{#if mode === 'concepts'}<ConceptGraphicStudio />{:else if mode === 'marks'}
  <p class="archive-note">
    This tool keeps earlier grid recipes for export and recovery. The library now uses the authored
    collection in Pattern graphics.
  </p>
  <PatternMarkStudio />
{:else}<Studio />{/if}

<style>
  .studio-switch {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 4vw;
    border-bottom: 1px solid #deded8;
  }
  button {
    border: 1px solid #deded8;
    padding: 0.65rem 1rem;
    background: white;
    color: #181814;
    font: inherit;
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    background: #181814;
    color: white;
    border-color: #181814;
  }
  .archive-note {
    padding: 1rem 4vw;
    margin: 0;
    background: #fff4d4;
    color: #181814;
  }
</style>
