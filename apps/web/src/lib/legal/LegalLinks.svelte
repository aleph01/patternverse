<script lang="ts">
  import { resolve } from '$app/paths';
  let { newTab = false }: { newTab?: boolean } = $props();
</script>

<nav class="legal-links" aria-label="Legal information">
  <a
    href={resolve('/impressum')}
    target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}>legal notice</a
  >
  <a
    href={resolve('/privacy')}
    target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}>privacy</a
  >
  <a
    href={resolve('/legal')}
    target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}>safety &amp; use</a
  >
</nav>

<style>
  .legal-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    text-transform: none;
  }
  .legal-links a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .legal-links a:hover {
    color: var(--green-dark);
  }
</style>
