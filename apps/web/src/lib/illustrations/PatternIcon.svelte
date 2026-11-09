<script lang="ts">
  import type { PatternIcon } from './pattern-icons';
  import { patternGraphicForPattern, type PatternGraphic } from './pattern-graphics';
  import { ICON_COLOR_VARIABLES, coloredIconPaths } from './pattern-icon-svg';
  import './pattern-icons.css';

  type Props = (
    { slug: string; icon?: never } | { icon: PatternIcon | PatternGraphic; slug?: never }
  ) & {
    size?: number;
    title?: string;
    decorative?: boolean;
  };
  let { slug, icon, size, title = 'Pattern icon', decorative = false }: Props = $props();
  const generated = $derived(icon ?? patternGraphicForPattern(slug ?? ''));
  const paths = $derived(generated.version === 1 ? coloredIconPaths(generated) : []);
</script>

<svg
  class="pattern-icon"
  viewBox={generated.version === 2 ? '0 0 96 96' : '0 0 72 72'}
  width={size}
  height={size}
  role={decorative ? undefined : 'img'}
  aria-hidden={decorative ? 'true' : undefined}
  aria-label={decorative ? undefined : title}
  data-icon-version={generated.version}
  data-icon-kind={generated.version === 2 ? 'concept' : 'legacy-grid'}
  data-icon-family={generated.version === 2 ? generated.motif : generated.family}
  data-pattern-graphic={generated.version === 2 ? generated.id : undefined}
  style={size ? `width:${size}px;height:${size}px` : undefined}
>
  {#if !decorative}<title>{title}</title>{/if}
  {#if generated.version === 2}
    {#if !decorative}<desc>{generated.reading}</desc>{/if}
    {#each generated.paths as path (path)}
      <path
        d={path.d}
        fill={path.fill === 'none' ? 'none' : ICON_COLOR_VARIABLES[path.fill]}
        stroke={path.stroke ? ICON_COLOR_VARIABLES[path.stroke] : undefined}
        stroke-width={path.strokeWidth}
        stroke-linecap={path.linecap}
        stroke-linejoin={path.linejoin}
      />
    {/each}
  {:else}
    {#each paths as path (path.color)}
      <path d={path.d} fill={ICON_COLOR_VARIABLES[path.color]} />
    {/each}
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
</style>
