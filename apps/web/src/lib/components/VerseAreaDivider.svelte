<script lang="ts">
  let { title, id, level = 3 }: { title: string; id?: string; level?: 3 | 4 } = $props();
</script>

<svelte:element this={`h${level}`} {id} class="verse-area-divider"
  ><span>{title}</span></svelte:element
>

<style>
  .verse-area-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: var(--verse-area-divider-height, 54px);
    margin: 0;
    color: var(--ink);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.3;
    text-transform: lowercase;
  }
  .verse-area-divider::before,
  .verse-area-divider::after {
    content: '';
    flex: 1;
    min-width: 0.5rem;
    height: 1px;
    background: color-mix(in srgb, var(--ink) 35%, transparent);
  }
  .verse-area-divider::before {
    flex: 0 0 1.25rem;
  }
  span {
    max-width: 80%;
  }
</style>
