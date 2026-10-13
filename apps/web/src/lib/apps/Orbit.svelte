<script lang="ts">
  let { small = false } = $props<{ small?: boolean }>();
</script>

<svg class:small viewBox="0 0 300 200" fill="none" aria-hidden="true">
  <ellipse cx="150" cy="100" rx="125" ry="43" transform="rotate(-24 150 100)" />
  <ellipse cx="150" cy="100" rx="65" ry="92" transform="rotate(30 150 100)" />
</svg>

<style>
  svg {
    width: 100%;
    max-width: 300px;
    stroke: currentColor;
    stroke-width: 2;
  }
  .small {
    max-width: 90px;
  }
</style>
