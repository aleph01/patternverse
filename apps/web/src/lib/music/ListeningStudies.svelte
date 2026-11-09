<script lang="ts">
  import ListeningExample from './ListeningExample.svelte';
  import type { ListeningStudy } from './listening';
  let { studies, guide = false }: { studies: readonly ListeningStudy[]; guide?: boolean } =
    $props();
</script>

{#if studies.length}
  <section aria-label="Listening studies" class="listening-studies">
    {#if guide}<div class="intro">
        <h2>Three listening studies</h2>
        <p>
          Choose a passage, then follow one musical question. The same recordings are linked from
          the relevant patterns.
        </p>
      </div>{/if}
    {#each studies as study (study.id)}<ListeningExample {study} />{/each}
  </section>
{/if}

<style>
  .intro {
    margin: 1.5rem 0 1rem;
  }
  .intro h2 {
    font-size: 1.15rem;
    margin: 0 0 0.4rem;
  }
  .intro p {
    font-size: 0.87rem;
    line-height: 1.6;
    color: var(--ink-muted);
    max-width: 65ch;
  }
</style>
