<script lang="ts">
  import { resolve } from '$app/paths';
  let { active }: { active: 'guide' | 'components' | 'functions' } = $props();
</script>

<nav class="documentation-nav" aria-label="Pattern Language documentation">
  <a
    href={resolve('/about/pattern-language')}
    aria-current={active === 'guide' ? 'page' : undefined}>Language guide</a
  >
  <a
    href={resolve('/about/pattern-language/components')}
    aria-current={active === 'components' ? 'page' : undefined}>Components</a
  >
  <a
    href={resolve('/about/pattern-language/functions')}
    aria-current={active === 'functions' ? 'page' : undefined}>Functions</a
  >
</nav>

<style>
  .documentation-nav {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin: 0 0 28px;
    border-bottom: 1px solid #dfe3d9;
    font-size: 13px;
    font-weight: 600;
    text-transform: none;
  }
  .documentation-nav a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 10px 0;
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
    color: var(--muted, #62655f);
  }
  .documentation-nav a[aria-current='page'] {
    color: var(--green-dark, #007a4d);
    border-bottom-color: currentColor;
  }
  .documentation-nav a:hover {
    color: var(--ink, #181814);
  }
  .documentation-nav a:focus-visible {
    outline: 2px solid var(--green-dark, #007a4d);
    outline-offset: 3px;
  }
</style>
