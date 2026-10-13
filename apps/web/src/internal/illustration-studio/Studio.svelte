<script lang="ts">
  import { Download, Shuffle } from '@lucide/svelte';
  import { downloadText } from '$lib/client/download';
  import IllustrationCanvas from '$lib/illustrations/IllustrationCanvas.svelte';
  import {
    COLORS,
    COMPOSITIONS,
    PALETTES,
    FORMATS,
    generateIllustration,
    illustrationSvg,
    type Composition,
    type Palette,
    type Format,
  } from '$lib/illustrations/generator';
  let composition = $state<Composition>('reframe');
  let palette = $state<Palette>('mint');
  let format = $state<Format>('landscape');
  let seed = $state(1);
  let title = $state('A different perspective');
  let notice = $state('');
  const illustration = $derived(generateIllustration(composition, palette, format, seed));
  function download() {
    downloadText(
      illustrationSvg(illustration, title),
      `patternverse-${composition}-${seed}.svg`,
      'image/svg+xml;charset=utf-8',
    );
    notice = 'SVG downloaded. You can edit its shapes in a vector editor.';
  }
</script>

<svelte:head
  ><title>Illustration studio — Patternverse</title><meta
    name="description"
    content="Create minimal geometric illustrations with Patternverse’s shapes and palette."
  /></svelte:head
>

<main class="illustration-studio">
  <p class="studio-back">Personal tool · localhost only · not part of the public website</p>
  <header>
    <p class="studio-kicker">Patternverse / illustration studio</p>
    <h1>A few shapes.<br />A clear idea.</h1>
    <p>
      Create geometric artwork with a shared visual language. Everything runs on this device—no AI
      or account needed.
    </p>
  </header>
  <div class="studio-workbench">
    <div
      class="studio-preview"
      style:aspect-ratio={`${illustration.width} / ${illustration.height}`}
    >
      <IllustrationCanvas {illustration} label={title || 'Geometric illustration preview'} />
    </div>
    <section class="studio-controls" aria-labelledby="studio-controls-heading">
      <h2 id="studio-controls-heading">Make an illustration</h2>
      <label for="illustration-title">Title <span>For the SVG’s accessible description</span></label
      ><input id="illustration-title" bind:value={title} maxlength="160" />
      <label for="illustration-composition">Composition</label><select
        id="illustration-composition"
        bind:value={composition}
        >{#each COMPOSITIONS as item (item.id)}<option value={item.id}>{item.label}</option
          >{/each}</select
      >
      <label for="illustration-palette">Palette</label><select
        id="illustration-palette"
        bind:value={palette}
        >{#each Object.entries(PALETTES) as [id, item] (id)}<option value={id}>{item.label}</option
          >{/each}</select
      >
      <div class="studio-swatches" aria-label="Selected palette">
        {#each [illustration.background, PALETTES[palette].primary, PALETTES[palette].secondary] as color, index (index)}<span
            style:background={COLORS[color]}
            title={COLORS[color]}
          ></span>{/each}
      </div>
      <label for="illustration-format">Canvas</label><select
        id="illustration-format"
        bind:value={format}
        >{#each Object.entries(FORMATS) as [id, item] (id)}<option value={id}>{item.label}</option
          >{/each}</select
      >
      <label for="illustration-seed"
        >Variation number <span>Use the same number to recreate a design</span></label
      ><input
        id="illustration-seed"
        type="number"
        min="1"
        max="999999"
        step="1"
        bind:value={seed}
      />
      <div class="studio-actions">
        <button
          type="button"
          onclick={() => {
            seed = (Number.isFinite(seed) ? seed : 1) + 1;
            notice = '';
          }}><Shuffle size={17} /> New variation</button
        ><button type="button" class="studio-download" onclick={download}
          ><Download size={17} /> Download SVG</button
        >
      </div>
      <p role="status" class="studio-notice">{notice}</p>
    </section>
  </div>
  <section class="studio-language" aria-labelledby="studio-language-heading">
    <h2 id="studio-language-heading">The visual language</h2>
    <div>
      <article>
        <h3>Five shapes</h3>
        <p>
          Circles, semicircles, quarter circles, squares, and straight lines. Curves keep their true
          proportions.
        </p>
      </article>
      <article>
        <h3>A fixed palette</h3>
        <p>
          Ink, white, green, blue, coral, and yellow. Mint and pale blue are backgrounds. One
          dominant accent, at most one secondary accent.
        </p>
      </article>
      <article>
        <h3>Less, deliberately</h3>
        <p>
          One idea, two to four main elements, and plenty of empty space. Flat colors only—no
          gradients, textures, or shadows.
        </p>
      </article>
    </div>
  </section>
</main>

<style>
  .illustration-studio {
    max-width: 1280px;
    margin: auto;
    padding: 2.5rem 2rem 5rem;
  }
  .studio-back {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    min-height: 44px;
    font-size: 0.9rem;
  }
  header {
    max-width: 650px;
    margin: 1.5rem 0 3rem;
  }
  .studio-kicker {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h1 {
    margin: 1rem 0;
    font-size: clamp(2.4rem, 5vw, 4.6rem);
    line-height: 1;
    letter-spacing: -0.055em;
  }
  header > p:last-child {
    color: #5b665e;
    line-height: 1.6;
  }
  .studio-workbench {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
    align-items: start;
    gap: 3rem;
  }
  .studio-preview {
    border: 1px solid #dce4de;
    overflow: hidden;
  }
  .studio-controls {
    display: grid;
    min-width: 0;
    gap: 0.65rem;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.3rem;
    letter-spacing: -0.025em;
  }
  label {
    display: grid;
    gap: 0.2rem;
    margin-top: 0.55rem;
    font-size: 0.88rem;
    font-weight: 650;
  }
  label span {
    color: #65726a;
    font-size: 0.75rem;
    font-weight: 400;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.6rem 0.75rem;
    border: 1px solid #cdd7d0;
    border-radius: 8px;
    background: white;
    color: var(--ink);
  }
  .studio-swatches {
    display: flex;
    gap: 0.5rem;
  }
  .studio-swatches span {
    width: 24px;
    height: 24px;
    border: 1px solid #d4dcd6;
    border-radius: 50%;
  }
  .studio-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 1rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.65rem 0.9rem;
    border: 1px solid var(--ink);
    background: white;
    color: var(--ink);
    cursor: pointer;
    font-size: 0.86rem;
  }
  .studio-download {
    background: var(--ink);
    color: white;
  }
  .studio-notice {
    min-height: 2.5rem;
    margin: 0;
    color: #36664a;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .studio-language {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #dce4de;
  }
  .studio-language > div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem;
  }
  h3 {
    font-size: 1rem;
  }
  .studio-language p {
    color: #5b665e;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  @media (max-width: 900px) {
    .studio-workbench {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    .studio-preview {
      max-height: 520px;
    }
  }
  @media (max-width: 600px) {
    .illustration-studio {
      padding: 1.5rem 1rem 3rem;
    }
    .studio-language > div {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    input,
    select {
      font-size: 16px;
    }
  }
</style>
