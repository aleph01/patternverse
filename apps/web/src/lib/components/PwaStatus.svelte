<script lang="ts">
  import { pwaState } from '$lib/client/pwa';
</script>

{#if !$pwaState.online}
  <aside class="pwa-status offline" aria-live="polite">
    <p>
      <strong>Offline.</strong> Previously opened pages and downloaded content remain available.
    </p>
  </aside>
{/if}
