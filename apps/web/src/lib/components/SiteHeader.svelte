<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import PatternverseLogo from './PatternverseLogo.svelte';

  const home = resolve('/');
</script>

<header class="site-header">
  <a class="wordmark" href={home} aria-label="Patternverse home"><PatternverseLogo /></a>
  <nav class="site-utilities" aria-label="Main navigation">
    <a
      class="library-nav-link"
      href={resolve('/library')}
      aria-current={page.url.pathname === '/library' ? 'page' : undefined}>library</a
    >
    <a
      class="mira-nav-link"
      href={resolve('/apps')}
      aria-current={page.url.pathname.startsWith('/apps') ? 'page' : undefined}>apps</a
    >
    <a href={resolve('/my')} aria-current={page.url.pathname === '/my' ? 'page' : undefined}
      >workspace</a
    >
  </nav>
</header>
