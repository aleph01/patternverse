<script lang="ts">
  import PersonalWorkspace from '$lib/components/PersonalWorkspace.svelte';
  import SyncAndBackup from '$lib/components/SyncAndBackup.svelte';
</script>

<svelte:head>
  <title>My Patternverse</title>
  <meta
    name="description"
    content="Manage your personal Patternverse workspace, sync, and subscribed sources."
  />
</svelte:head>

<main class="my-page">
  <section class="my-hero" aria-labelledby="my-heading">
    <div class="my-hero-blocks" aria-hidden="true">
      <span class="my-block my-block-green"></span>
      <span class="my-block my-block-blue"></span>
      <span class="my-block my-block-coral"></span>
      <span class="my-block my-block-yellow"></span>
    </div>
    <p>Your personal knowledge workspace</p>
    <h1 id="my-heading">my patternverse.</h1>
    <span>Private by default. Portable by design.</span>
  </section>

  <PersonalWorkspace />
  <SyncAndBackup />
</main>
