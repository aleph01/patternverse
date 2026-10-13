<script lang="ts">
  import type { IllustrationColor, ShapeKind } from './generator';
  let {
    kind,
    x = 0,
    y = 0,
    size = 64,
    rotation = 0,
    color = 'ink',
  }: {
    kind: ShapeKind;
    x?: number;
    y?: number;
    size?: number;
    rotation?: 0 | 90 | 180 | 270 | 45;
    color?: IllustrationColor;
  } = $props();
</script>

<g
  transform={`translate(${x} ${y}) scale(${size / 64}) rotate(${rotation} 32 32)`}
  style:color={`var(--illustration-${color})`}
  fill="currentColor"
>
  {#if kind === 'circle'}
    <circle cx="32" cy="32" r="32" />
  {:else if kind === 'semicircle'}
    <path d="M32 0 A32 32 0 0 0 32 64 Z" />
  {:else if kind === 'quarter-circle'}
    <path d="M0 0 H64 A64 64 0 0 1 0 64 Z" />
  {:else if kind === 'square'}
    <rect width="64" height="64" />
  {:else}
    <line
      x1="32"
      y1="0"
      x2="32"
      y2="64"
      stroke="currentColor"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
  {/if}
</g>
