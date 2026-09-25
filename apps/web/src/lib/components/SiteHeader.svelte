<script lang="ts">
  import { resolve } from '$app/paths';
  import PatternverseLogo from './PatternverseLogo.svelte';

  const home = resolve('/');
</script>

<header class="site-header">
  <a class="wordmark" href={home} aria-label="Patternverse home"><PatternverseLogo /></a>
  <div class="site-utilities">
    <a class="mira-nav-link" href={resolve('/mira')}>mira</a>
    <a class="about-link" href={resolve('/about')}>about</a>
    <a class="personal-workspace-link" href={resolve('/my')}>my workspace <span>→</span></a>
  </div>
</header>
