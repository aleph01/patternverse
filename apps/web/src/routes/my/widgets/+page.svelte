<script lang="ts">
  import { resolve } from '$app/paths';
  import WidgetSettings from '$lib/widgets/WidgetSettings.svelte';
</script>

<svelte:head><title>All widgets — Patternverse</title></svelte:head>
<main class="widgets-page">
  <a href={resolve('/my?pane=widgets')}>← Back to workspace</a><WidgetSettings expanded />
</main>

<style>
  .widgets-page {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(24px, 4vw, 56px) 4vw;
  }
  .widgets-page > a {
    display: inline-block;
    margin-bottom: 28px;
    color: var(--muted);
    font-size: 13px;
    text-decoration: none;
  }
</style>
