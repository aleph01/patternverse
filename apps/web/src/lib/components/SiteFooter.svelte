<script lang="ts">
  import { resolve } from '$app/paths';
  import { pwaState } from '$lib/client/pwa';
  import { installedPwa } from '$lib/client/installed-pwa';
  import PatternverseLogo from './PatternverseLogo.svelte';
  import LegalLinks from '$lib/legal/LegalLinks.svelte';
</script>

<footer>
  <a class="wordmark" href={resolve('/')} aria-label="Patternverse home"><PatternverseLogo /></a>
  <div class="footer-details">
    <LegalLinks />
    {#if $installedPwa && $pwaState.offlineReady}<p>available offline</p>{/if}
  </div>
</footer>

<style>
  footer {
    gap: 1.5rem;
    padding-block: 1.5rem;
    border-top: 1px solid #d9d9d3;
  }
  .footer-details {
    display: grid;
    gap: 0.25rem;
    justify-items: end;
  }
  @media (max-width: 760px) {
    footer {
      gap: 0.75rem;
    }
    .footer-details {
      justify-items: start;
    }
  }
</style>
