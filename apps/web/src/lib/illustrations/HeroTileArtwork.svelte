<script lang="ts">
  import { HERO_WING_PATH, heroLandscape, heroPortrait } from './hero-tiles';
</script>

{#snippet composition(art: typeof heroLandscape)}
  {#each art.tiles as tile (tile.transform)}
    <path class={tile.tone} d={tile.path} transform={tile.transform} />
  {/each}
  {#each art.birds as bird (bird.transform)}
    <g class={bird.tone} data-bird transform={bird.transform}>
      <path d={HERO_WING_PATH} />
      <path d={HERO_WING_PATH} transform="translate(48 0) scale(-1 1)" />
    </g>
  {/each}
{/snippet}

<div class="tile-artwork" aria-hidden="true">
  <svg
    class="landscape-composition"
    viewBox={`0 0 ${heroLandscape.width} ${heroLandscape.height}`}
    preserveAspectRatio="xMaxYMax meet"
    focusable="false"
  >
    {@render composition(heroLandscape)}
  </svg>
  <svg
    class="portrait-composition"
    viewBox={`0 0 ${heroPortrait.width} ${heroPortrait.height}`}
    preserveAspectRatio="xMaxYMax meet"
    focusable="false"
  >
    {@render composition(heroPortrait)}
  </svg>
</div>

<style>
  .tile-artwork {
    width: 100%;
    height: 100%;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .portrait-composition {
    display: none;
  }
  .mist {
    fill: #f2f2ef;
  }
  .stone {
    fill: #ddddd7;
  }
  .green {
    fill: #b6cbb7;
  }
  .purple {
    fill: #c3b4dc;
  }
  @media (max-width: 760px) {
    .landscape-composition {
      display: none;
    }
    .portrait-composition {
      display: block;
    }
  }
</style>
