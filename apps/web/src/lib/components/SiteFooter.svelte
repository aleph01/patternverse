<script lang="ts">
  import { resolve } from '$app/paths';
  import { pwaState } from '$lib/client/pwa';
  import PatternverseLogo from './PatternverseLogo.svelte';
</script>

<footer>
  <a class="wordmark" href={resolve('/')} aria-label="Patternverse home"><PatternverseLogo /></a>
  <p>{$pwaState.offlineReady ? 'available offline' : 'local browser'}</p>
</footer>
