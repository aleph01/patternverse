<script lang="ts">
  import { resolve } from '$app/paths';
  import { pwaState } from '$lib/client/pwa';
</script>

<footer>
  <a class="wordmark" href={resolve('/')}>patternverse<span>.</span></a>
  <p>{$pwaState.offlineReady ? 'available offline' : 'local browser'}</p>
</footer>
