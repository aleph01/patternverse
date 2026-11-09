<script lang="ts">
  import { resolve } from '$app/paths';
  import PatternverseLogo from './PatternverseLogo.svelte';
  import LegalLinks from '$lib/legal/LegalLinks.svelte';
</script>

<footer>
  <a class="wordmark" href={resolve('/')} aria-label="Patternverse home"><PatternverseLogo /></a>
  <div class="footer-details">
    <a class="contribute-link" href={resolve('/contribute')}>contribute</a>
    <LegalLinks />
  </div>
</footer>

<style>
  footer {
    gap: 1.5rem;
    padding-block: 1.5rem;
    border-top: 1px solid #d9d9d3;
  }
  .footer-details {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem 1.25rem;
  }
  .contribute-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .contribute-link:hover {
    color: var(--green-dark);
  }
  @media (max-width: 760px) {
    footer {
      gap: 0.75rem;
    }
    .footer-details {
      justify-content: flex-start;
    }
  }
</style>
