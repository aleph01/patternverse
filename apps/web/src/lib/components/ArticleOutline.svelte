<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import type { ArticleSection } from '$lib/article-sections';

  let { sections }: { sections: readonly ArticleSection[] } = $props();
  let activeId = $state('article-overview');
  let menu = $state<HTMLDetailsElement>();

  function closeMenu() {
    if (menu) menu.open = false;
  }

  function escapeMenu(event: KeyboardEvent) {
    if (event.key === 'Escape' && menu?.open) {
      closeMenu();
      menu.querySelector('summary')?.focus();
    }
  }

  function closeOutside(event: PointerEvent) {
    if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
  }

  $effect(() => {
    const headings = ['article-overview', ...sections.map(({ id }) => id)].flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    let frame: number | undefined;
    const update = () => {
      frame = undefined;
      activeId =
        headings.findLast(({ element }) => element.getBoundingClientRect().top <= 96)?.id ??
        'article-overview';
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  });
</script>

<svelte:window onkeydown={escapeMenu} onpointerdown={closeOutside} />

{#snippet links()}
  <a
    href="#article-overview"
    aria-current={activeId === 'article-overview' ? 'location' : undefined}
    onclick={closeMenu}>Overview</a
  >
  {#each sections as section (section.id)}
    <a
      href={`#${encodeURIComponent(section.id)}`}
      class:subsection={section.depth === 3}
      aria-current={activeId === section.id ? 'location' : undefined}
      onclick={closeMenu}>{section.title}</a
    >
  {/each}
{/snippet}

<aside class="article-outline">
  <div class="outline-desktop">
    <p>Contents</p>
    <nav aria-label="Article contents">{@render links()}</nav>
  </div>
  <details class="outline-menu" bind:this={menu}>
    <summary>Contents <ChevronDown size={16} aria-hidden="true" /></summary>
    <nav aria-label="Article contents">{@render links()}</nav>
  </details>
</aside>

<style>
  .article-outline {
    grid-area: body;
    min-width: 0;
    position: sticky;
    top: 0;
    align-self: start;
    z-index: 10;
    background: var(--paper);
  }
  .outline-desktop {
    display: none;
  }
  .outline-menu {
    position: relative;
    padding-top: 0.5rem;
    border-bottom: 1px solid var(--ink);
  }
  .outline-menu nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: min(60dvh, 28rem);
    overflow-y: auto;
    padding: 0.75rem 0;
    border: 1px solid var(--ink);
    background: var(--paper);
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0.5rem 0;
    font-size: 0.85rem;
    font-weight: 750;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  details[open] summary :global(svg) {
    transform: rotate(180deg);
  }
  nav {
    display: grid;
    gap: 0.2rem;
    padding-bottom: 0.75rem;
  }
  nav a {
    display: block;
    padding: 0.45rem 0.75rem;
    border-left: 2px solid transparent;
    color: var(--ink-muted);
    font-size: 0.82rem;
    line-height: 1.45;
    overflow-wrap: anywhere;
    text-decoration: none;
  }
  nav a.subsection {
    padding-left: 1.5rem;
  }
  nav a[aria-current] {
    border-left-color: var(--green-dark);
    color: var(--green-dark);
    font-weight: 750;
  }
  nav a:hover {
    color: var(--green-dark);
    text-decoration: underline;
  }
  nav a:focus-visible,
  summary:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    nav a {
      min-height: 44px;
      display: flex;
      align-items: center;
    }
  }
  @media (min-width: 1200px) {
    .article-outline {
      grid-area: contents;
      position: static;
      align-self: stretch;
      z-index: auto;
      background: transparent;
    }
    .outline-menu {
      display: none;
    }
    .outline-desktop {
      display: block;
      position: sticky;
      top: 1.5rem;
      max-height: calc(100dvh - 3rem);
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .outline-desktop p {
      margin: 0.15rem 0 0.85rem;
      font-size: 0.76rem;
      font-weight: 800;
    }
  }
</style>
