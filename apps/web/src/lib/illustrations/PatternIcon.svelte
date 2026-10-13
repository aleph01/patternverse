<script lang="ts">
  import { generatePatternIcon, type PatternIcon } from './pattern-icons';
  import { ICON_COLOR_VARIABLES, coloredIconPaths } from './pattern-icon-svg';
  import './pattern-icons.css';

  type Props = ({ slug: string; icon?: never } | { icon: PatternIcon; slug?: never }) & {
    size?: number;
    title?: string;
    decorative?: boolean;
  };
  let { slug, icon, size, title = 'Pattern icon', decorative = false }: Props = $props();
  const generated = $derived(icon ?? generatePatternIcon(slug ?? 'pattern'));
  const paths = $derived(coloredIconPaths(generated));
</script>

<svg
  class="pattern-icon"
  viewBox="0 0 72 72"
  width={size}
  height={size}
  role={decorative ? undefined : 'img'}
  aria-hidden={decorative ? 'true' : undefined}
  aria-label={decorative ? undefined : title}
  data-icon-version={generated.version}
  data-icon-family={generated.family}
  style={size ? `width:${size}px;height:${size}px` : undefined}
>
  {#if !decorative}<title>{title}</title>{/if}
  {#each paths as path (path.color)}
    <path d={path.d} fill={ICON_COLOR_VARIABLES[path.color]} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
</style>
