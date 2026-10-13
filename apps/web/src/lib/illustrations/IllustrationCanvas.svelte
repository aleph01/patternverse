<script lang="ts">
  import IllustrationShape from './IllustrationShape.svelte';
  import { COLORS, type Illustration } from './generator';
  import './tokens.css';
  let {
    illustration,
    label = 'Geometric illustration preview',
  }: {
    illustration: Illustration;
    label?: string;
  } = $props();
  const colorTokens = Object.entries(COLORS)
    .map(([key, value]) => `--illustration-${key}:${value}`)
    .join(';');
</script>

<svg
  viewBox={`0 0 ${illustration.width} ${illustration.height}`}
  role="img"
  aria-label={label}
  style={`${colorTokens};background:${COLORS[illustration.background]}`}
>
  {#each illustration.shapes as shape, index (index)}<IllustrationShape {...shape} />{/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
