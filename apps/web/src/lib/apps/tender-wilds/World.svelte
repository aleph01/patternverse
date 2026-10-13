<script lang="ts">
  import { ArrowLeft, ArrowRight, Map, Plus } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import PaperBird from './PaperBird.svelte';
  import { ARROWS, moveBird, type Point } from './movement';
  import PlantArt from './PlantArt.svelte';
  import {
    gardenAt,
    islandInfo,
    stage,
    speciesFor,
    duration,
    remainingMinutes,
    type Game,
  } from './game';
  let {
    game,
    now,
    selectedPlot,
    selectedGarden,
    onStep,
    onPlot,
    onGarden,
    onMap,
    onVisit,
    busy,
  }: {
    game: Game;
    now: number;
    selectedPlot: number;
    selectedGarden: number;
    busy: boolean;
    onStep?: () => void;
    onPlot: (index: number) => void;
    onGarden: (index: number) => void;
    onMap: () => void;
    onVisit: (island: number) => void;
  } = $props();
  let x = $state(290);
  let y = $state(392);
  const garden = $derived(gardenAt(game));
  const structures = $derived(
    game.structures.filter((s) => s.island === game.current).map((s) => s.recipe),
  );
  const spots = [
    { x: 123, y: 53 },
    { x: 257, y: 55 },
    { x: 385, y: 54 },
    { x: 156, y: 451 },
    { x: 262, y: 472 },
    { x: 368, y: 448 },
  ];
  let screen: HTMLDivElement;
  let facing = $state(0);
  let moving = $state(false);
  let stride = $state(0);
  let reducedMotion = false;
  // Keyboard state belongs to the animation loop, not Svelte rendering.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const held = new Set<string>();
  let destination: Point | null = null;
  let frame = 0;
  let lastFrame = 0;
  function advanceStride(distance: number) {
    const previousStep = Math.floor(stride / Math.PI);
    stride += (distance * Math.PI) / 32;
    if (Math.floor(stride / Math.PI) !== previousStep) onStep?.();
  }
  function stop() {
    held.clear();
    destination = null;
    moving = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function step(timestamp: number) {
    frame = 0;
    const seconds = (timestamp - lastFrame) / 1000;
    lastFrame = timestamp;
    let direction = { x: 0, y: 0 };
    for (const key of held) {
      direction.x += ARROWS[key].x;
      direction.y += ARROWS[key].y;
    }
    if (!held.size && destination) {
      direction = { x: destination.x - x, y: destination.y - y };
      if (Math.hypot(direction.x, direction.y) <= 150 * Math.min(0.04, seconds)) {
        x = destination.x;
        y = destination.y;
        destination = null;
        moving = false;
        return;
      }
    }
    const next = moveBird({ x, y }, direction, seconds);
    moving = next.x !== x || next.y !== y;
    advanceStride(Math.hypot(next.x - x, next.y - y));
    if (moving) facing = (Math.atan2(direction.y, direction.x) * 180) / Math.PI - 90;
    x = next.x;
    y = next.y;
    if (held.size || destination) frame = requestAnimationFrame(step);
  }
  function startMoving() {
    if (!frame) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(step);
    }
  }
  function keyDown(event: KeyboardEvent) {
    if (
      !ARROWS[event.key] ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !(event.target instanceof Node) ||
      !screen?.contains(event.target)
    )
      return;
    event.preventDefault();
    if (held.has(event.key)) return;
    destination = null;
    held.add(event.key);
    const direction = ARROWS[event.key];
    const next = moveBird({ x, y }, direction, 0.04);
    moving = next.x !== x || next.y !== y;
    advanceStride(Math.hypot(next.x - x, next.y - y));
    x = next.x;
    y = next.y;
    facing = (Math.atan2(direction.y, direction.x) * 180) / Math.PI - 90;
    startMoving();
  }
  function keyUp(event: KeyboardEvent) {
    held.delete(event.key);
    if (!held.size && !destination) stop();
  }
  function walk(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    held.clear();
    destination = event.detail
      ? {
          x: Math.max(80, Math.min(515, ((event.clientX - rect.left) / rect.width) * 600)),
          y: Math.max(105, Math.min(525, ((event.clientY - rect.top) / rect.height) * 620)),
        }
      : { x: x > 320 ? 230 : 430, y: 392 };
    facing = (Math.atan2(destination.y - y, destination.x - x) * 180) / Math.PI - 90;
    if (reducedMotion) {
      x = destination.x;
      y = destination.y;
      stop();
    } else startMoving();
  }
  onMount(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return stop;
    const update = () => {
      reducedMotion = preference.matches;
    };
    update();
    preference.addEventListener('change', update);
    return () => {
      stop();
      preference.removeEventListener('change', update);
    };
  });
  $effect(() => {
    void game.current;
    stop();
    x = 290;
    y = 392;
    facing = 0;
    stride = 0;
  });
</script>

<svelte:window
  onkeydown={keyDown}
  onkeyup={keyUp}
  onblur={stop}
  onfocusin={(event) => {
    if (event.target instanceof Node && !screen?.contains(event.target)) stop();
  }}
/>
<div class="tw-game-screen" bind:this={screen}>
  <div class="tw-game-nav" aria-label="Island navigation">
    <button
      disabled={busy || game.current === 0}
      aria-label="Visit previous island"
      onclick={() => onVisit(game.current - 1)}><ArrowLeft size={17} /></button
    >
    <button class="tw-map-button" onclick={onMap}
      ><Map size={16} /><span
        >{islandInfo(game.current).name} <small>· {game.current + 1}</small></span
      ></button
    >
    <button
      disabled={busy}
      aria-label={game.current < game.frontier ? 'Visit next island' : 'Plan the next bridge'}
      onclick={() => (game.current < game.frontier ? onVisit(game.current + 1) : onMap())}
      >{#if game.current < game.frontier}<ArrowRight size={17} />{:else}<Plus
          size={17}
        />{/if}</button
    >
  </div>
  <div class="tw-map-scene">
    <button
      class="tw-ground"
      aria-label="Wander around your garden. Tap an open space or use the arrow keys."
      onclick={walk}
    >
      <svg viewBox="0 0 600 620" aria-hidden="true">
        <rect width="600" height="620" fill={game.current % 3 === 1 ? '#d7eeec' : '#e3f1e9'} />
        <g fill="none" stroke="#fff" stroke-width="2" opacity=".65"
          ><path
            d="M20 130h20m-9 5h22M550 220h30m-12 6h21M16 488h19m-6 6h23M510 570h33m-16 7h40"
          /></g
        >
        <path
          d="M80 61Q115 40 204 50L441 60Q537 66 550 132L561 458Q554 548 480 570L123 565Q47 550 41 474L42 153Q43 91 80 61Z"
          fill="#ccd7b3"
          transform="translate(0 9)"
        />
        <path
          d="M80 61Q115 40 204 50L441 60Q537 66 550 132L561 458Q554 548 480 570L123 565Q47 550 41 474L42 153Q43 91 80 61Z"
          fill={game.current % 3 === 2 ? '#e0e7b8' : '#d9ecc8'}
          stroke="#edf5d8"
          stroke-width="10"
        />
        <path
          d="M48 395H553M296 387V557"
          fill="none"
          stroke="#eee6cd"
          stroke-width="44"
          stroke-linejoin="round"
        />
        <path
          d="M71 377h52m61 34h26m246-24h33M278 506h34m-19 29h17"
          stroke="#dbd3b9"
          stroke-width="3"
          stroke-linecap="round"
        />
        <rect x="148" y="147" width="292" height="206" rx="24" fill="#b7d19d" opacity=".5" />
        <g fill="#bfd3a5"
          ><path
            d="M74 196l5-9 6 9m-1 3 6-9 4 9M486 467l5-9 6 9m-1 3 6-9 4 9M120 533l5-9 6 9m-1 3 6-9 4 9M479 177l5-9 6 9"
          /></g
        >
        <g
          ><ellipse cx="87" cy="112" rx="33" ry="25" fill="#7eab85" opacity=".25" /><rect
            x="82"
            y="83"
            width="10"
            height="28"
            rx="3"
            fill="#aa8e66"
          /><circle cx="84" cy="70" r="30" fill="#8abb8c" /><circle
            cx="69"
            cy="80"
            r="21"
            fill="#92c394"
          /><circle cx="100" cy="79" r="23" fill="#80b482" /></g
        >
        <g transform="translate(420 21)"
          ><ellipse cx="87" cy="112" rx="33" ry="25" fill="#7eab85" opacity=".25" /><rect
            x="82"
            y="83"
            width="10"
            height="28"
            rx="3"
            fill="#aa8e66"
          /><circle cx="84" cy="70" r="30" fill="#8abb8c" /><circle
            cx="69"
            cy="80"
            r="21"
            fill="#92c394"
          /><circle cx="100" cy="79" r="23" fill="#80b482" /></g
        >
        <ellipse
          cx="489"
          cy="238"
          rx="31"
          ry="44"
          fill="#bfd9ca"
          stroke="#edf3d9"
          stroke-width="8"
        /><path d="M477 222h17m-7 24h19" stroke="#eaf7ef" stroke-width="3" /><ellipse
          cx="479"
          cy="250"
          rx="11"
          ry="6"
          fill="#8fc195"
        /><circle cx="479" cy="248" r="3" fill="#fff5d5" />
        <g fill="#b7c4ae"
          ><path d="M71 310l8-12h20l11 15-6 10H78Z" /><path d="M486 509l7-11h18l9 14-7 8h-21Z" /></g
        >
        {#if game.current > 0}<g
            ><path d="M0 375H63V417H0Z" fill="#c6aa7e" /><path
              d="M6 375v42m12-42v42m12-42v42m12-42v42m12-42v42"
              stroke="#a38760"
              stroke-width="2"
            /><path d="M0 372H66M0 420H66" stroke="#8c7859" stroke-width="5" /></g
          >{/if}
        {#if game.current < game.frontier}<g
            ><path d="M535 375H600V417H535Z" fill="#c6aa7e" /><path
              d="M541 375v42m12-42v42m12-42v42m12-42v42m12-42v42"
              stroke="#a38760"
              stroke-width="2"
            /><path d="M533 372H600M533 420H600" stroke="#8c7859" stroke-width="5" /></g
          >{:else}<path d="M535 375h17v42h-17" fill="#c6aa7e" />{/if}
        {#if structures.includes('bench')}<g transform="translate(80 440)"
            ><ellipse cx="27" cy="38" rx="40" ry="12" fill="#678b5b" opacity=".15" /><path
              d="M0 0h57v10H0Zm0 14h57v15H0ZM6 29h7v10H6Zm38 0h7v10h-7Z"
              fill="#b59365"
            /></g
          >{/if}
        {#if structures.includes('lantern')}<g transform="translate(472 301)"
            ><ellipse cx="12" cy="34" rx="22" ry="12" fill="#ffdc83" opacity=".35" /><path
              d="M12 5v33"
              stroke="#947b5c"
              stroke-width="4"
            /><rect
              x="0"
              y="0"
              width="24"
              height="25"
              rx="8"
              fill="#ffcf76"
              stroke="#ae8451"
              stroke-width="2"
            /><path d="M4 7h16m-16 11h16" stroke="#dfb268" /></g
          >{/if}
        {#if structures.includes('gate')}<g fill="#cf8f72"
            ><path d="M260 539h8v29h-8Zm63 0h8v29h-8ZM250 532h91v9h-91Zm9 15h72v5h-72Z" /></g
          >{/if}
        <g class="tw-wanderer" style:transform={`translate(${x}px, ${y}px)`}>
          <ellipse cx="0" cy="8" rx="18" ry="9" fill="#557850" opacity=".18" />
          <g transform={`rotate(${facing})`}>
            <svg x="-27" y="-28" width="54" height="54"
              ><PaperBird view="above" {stride} walking={moving} /></svg
            >
          </g>
        </g>
      </svg>
    </button>
    <span class="tw-nursery-label">YOUR NURSERY</span>
    {#each game.nursery as p, i (i)}
      <button
        class="tw-world-plot"
        class:selected={selectedGarden < 0 && selectedPlot === i}
        style:left={`${(158 + (i % 3) * 92) / 6}%`}
        style:top={`${(163 + Math.floor(i / 3) * 94) / 6.2}%`}
        aria-label={`Plot ${i + 1}: ${p ? `${speciesFor(p.species).name}, ${['sprout', 'young', 'mature'][stage(p, now)]}` : 'empty'}`}
        aria-pressed={selectedGarden < 0 && selectedPlot === i}
        onclick={() => onPlot(i)}
      >
        {#if p}<PlantArt {...p} stage={stage(p, now)} /><span class:ready={stage(p, now) === 2}
            >{stage(p, now) === 2 ? 'Harvest' : duration(remainingMinutes(p, now))}</span
          >{:else}<Plus size={18} /><span>Plant</span>{/if}
      </button>
    {/each}
    {#each garden as p, i (i)}
      <button
        class="tw-kept-plot"
        class:selected={selectedGarden === i}
        style:left={`${spots[i].x / 6}%`}
        style:top={`${spots[i].y / 6.2}%`}
        aria-label={`Garden spot ${i + 1}: ${p ? speciesFor(p.species).name : 'empty'}`}
        onclick={() => onGarden(i)}
      >
        {#if p}<PlantArt {...p} stage={stage(p, now)} />{:else}<span class="tw-empty-garden">✧</span
          >{/if}
      </button>
    {/each}
    <button
      class="tw-bridge-pin"
      aria-label={game.current < game.frontier
        ? 'Cross to the next island'
        : 'Build a bridge to the next island'}
      onclick={() => (game.current < game.frontier ? onVisit(game.current + 1) : onMap())}
      >{#if game.current < game.frontier}<ArrowRight size={17} />{:else}<Plus
          size={17}
        />{/if}</button
    >
  </div>
  <p class="tw-game-hint">Tap a plot to tend it. Tap the grass or hold arrow keys to wander.</p>
</div>

<style>
  .tw-game-screen {
    border: 1px solid #b5cfc0;
    border-radius: 20px;
    overflow: hidden;
    background: #e3f1e9;
    box-shadow: 0 8px 28px #244d3610;
  }
  .tw-game-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 12px;
    position: relative;
    z-index: 1;
    background: #f2f8ef;
    border-bottom: 1px solid #c9dccb;
  }
  .tw-game-nav button {
    min-height: 44px;
    min-width: 44px;
    border: 1px solid #c6d8c7;
    background: #fffdf5;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    color: #244f3a;
  }
  .tw-game-nav button:disabled {
    opacity: 0.35;
  }
  .tw-game-nav .tw-map-button {
    padding: 8px 14px;
    border-color: transparent;
    background: transparent;
    font-size: 13px;
  }
  .tw-map-button small {
    opacity: 0.6;
  }
  .tw-map-scene {
    position: relative;
    aspect-ratio: 600 / 620;
    width: 100%;
  }
  .tw-ground {
    position: absolute;
    inset: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    border: 0;
    background: none;
    cursor: crosshair;
  }
  .tw-ground > svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .tw-nursery-label {
    position: absolute;
    top: 23%;
    left: 25%;
    width: 48%;
    text-align: center;
    color: #4c7450;
    font-size: 9px;
    letter-spacing: 0.14em;
    pointer-events: none;
  }
  .tw-world-plot {
    min-width: 44px;
    min-height: 44px;
    position: absolute;
    width: 13.5%;
    height: 13.2%;
    border: 1px solid #ae9b72;
    border-radius: 12px;
    background: #daca9f;
    box-shadow: inset 0 0 0 4px #e7d8b0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 4px;
    cursor: pointer;
    color: #736d50;
  }
  .tw-world-plot.selected {
    outline: 3px solid #008856;
    outline-offset: 3px;
  }
  .tw-world-plot :global(svg:not(.lucide)) {
    width: 100%;
    height: 78%;
  }
  .tw-world-plot > span {
    font-size: 9px;
    line-height: 1;
  }
  .tw-world-plot .ready {
    color: #005b39;
    font-weight: 700;
  }
  .tw-kept-plot {
    min-width: 44px;
    min-height: 44px;
    position: absolute;
    width: 13.3%;
    height: 14%;
    padding: 0;
    background: transparent;
    border: 1px dashed #8ead7a88;
    border-radius: 50%;
    cursor: pointer;
  }
  .tw-kept-plot :global(svg) {
    width: 100%;
    height: 100%;
  }
  .tw-kept-plot.selected {
    outline: 2px solid #008856;
    outline-offset: 2px;
  }
  .tw-empty-garden {
    font-size: 19px;
    color: #80a477;
  }
  .tw-bridge-pin {
    position: absolute;
    top: 60%;
    right: 1.5%;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid #9dbd9e;
    border-radius: 50%;
    color: #235339;
    background: #fffdf3;
    box-shadow: 0 3px 0 #416e3920;
    cursor: pointer;
  }
  .tw-game-hint {
    text-align: center;
    font-size: 11px;
    color: #50725b;
    margin: 0;
    padding: 14px 8px;
    background: #f2f8ef;
    border-top: 1px solid #c9dccb;
  }
  @media (max-width: 800px) {
    .tw-game-nav {
      padding: 7px;
    }
    .tw-game-nav .tw-map-button {
      font-size: 11px;
      padding: 8px;
      gap: 5px;
    }
    .tw-game-hint {
      font-size: 10px;
      padding: 11px 6px;
    }
    .tw-nursery-label {
      font-size: 7px;
    }
    .tw-world-plot {
      border-radius: 8px;
      box-shadow: inset 0 0 0 2px #e7d8b0;
      padding: 2px;
    }
    .tw-world-plot > span {
      font-size: 8px;
    }
    .tw-world-plot.selected {
      outline-width: 2px;
      outline-offset: 2px;
    }
  }
</style>
