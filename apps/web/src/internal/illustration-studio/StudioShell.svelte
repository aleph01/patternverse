<script lang="ts">
  import Studio from './Studio.svelte';
  import PatternMarkStudio from './PatternMarkStudio.svelte';
  let mode = $state('marks');
</script>

<nav class="studio-switch" aria-label="Personal design tools">
  <button aria-pressed={mode === 'marks'} onclick={() => (mode = 'marks')}>Pattern icons</button>
  <button aria-pressed={mode === 'illustrations'} onclick={() => (mode = 'illustrations')}
    >Large illustrations</button
  >
</nav>
{#if mode === 'marks'}<PatternMarkStudio />{:else}<Studio />{/if}

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
</style>
