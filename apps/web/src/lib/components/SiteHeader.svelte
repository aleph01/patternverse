<script lang="ts">
  import { resolve } from '$app/paths';

  const home = resolve('/');
</script>

<header class="site-header">
  <a class="wordmark" href={home} aria-label="Patternverse home">patternverse<span>.</span></a>
  <div class="site-utilities">
    <a class="about-link" href={resolve('/about')}>about</a>
    <a class="personal-workspace-link" href={resolve('/my')}>my workspace <span>→</span></a>
  </div>
</header>
