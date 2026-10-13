<script lang="ts">
  import { COLORS } from './game';
  let {
    color = 0,
    form = 0,
    stage = 2,
  }: { color?: number; form?: number; stage?: number } = $props();
</script>

<svg viewBox="0 0 80 100" aria-hidden="true" focusable="false">
  <ellipse cx="40" cy="91" rx="25" ry="5" fill="#233b32" opacity=".12" />
  {#if stage === 0}
    <path d="M40 88V72" stroke="#566c50" stroke-width="3" />
    <path d="M40 79Q18 77 25 66Q42 66 40 79M40 76Q40 60 56 64Q58 76 40 76" fill={COLORS[color]} />
  {:else}
    <g transform={stage === 1 ? 'translate(12 27) scale(.7)' : ''}>
      <path d="M40 88V31" stroke="#566451" stroke-width="3" />
      {#if form === 0}
        <circle cx="40" cy="32" r="20" fill={COLORS[color]} />
        <circle cx="23" cy="45" r="16" fill={COLORS[color]} />
        <circle cx="56" cy="45" r="17" fill={COLORS[color]} />
        <circle cx="40" cy="43" r="5" fill="#f0d7a0" />
        <path d="M40 73Q14 73 19 57Q38 57 40 73" fill="#698064" />
      {:else if form === 1}
        <path d="M40 7L62 40H51L71 64H47L64 79H16L33 64H9L29 40H18Z" fill={COLORS[color]} />
        <path d="M40 25V81" stroke="#edf0d8" stroke-width="1" opacity=".45" />
      {:else}
        <path d="M27 89V41M53 89V34" stroke="#667658" stroke-width="2" />
        <rect x="22" y="21" width="10" height="35" rx="5" fill={COLORS[color]} />
        <rect x="35" y="9" width="10" height="36" rx="5" fill={COLORS[color]} />
        <rect x="48" y="16" width="10" height="33" rx="5" fill={COLORS[color]} />
      {/if}
    </g>
  {/if}
</svg>
