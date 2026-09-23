<script lang="ts">
  import { applyPwaUpdate, pwaState } from '$lib/client/pwa';
</script>

{#if $pwaState.updateReady}
  <aside class="pwa-status update" aria-live="polite">
    <p>A new Patternverse version is ready.</p>
    <button type="button" onclick={applyPwaUpdate}>Update now</button>
  </aside>
{:else if !$pwaState.online}
  <aside class="pwa-status offline" aria-live="polite">
    <p><strong>Offline.</strong> Reading, search, and local editing remain available.</p>
  </aside>
{/if}
