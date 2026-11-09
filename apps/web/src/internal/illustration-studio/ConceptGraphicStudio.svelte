<script lang="ts">
  import { downloadText } from '$lib/client/download';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { PATTERN_GRAPHICS, patternGraphicSvg } from '$lib/illustrations/pattern-graphics';
  import { PATTERN_GRAPHIC_SPECIFICATION } from '$lib/illustrations/pattern-graphic-specification';

  let query = $state('');
  let motif = $state('');
  let size = $state(48);
  let dark = $state(false);
  let selectedId = $state('reframing-alternative-paths');
  const sorted = [...PATTERN_GRAPHICS].sort((a, b) => a.title.localeCompare(b.title));
  const motifs = [...new Set(sorted.map((g) => g.motif))].sort();
  const selected = $derived(sorted.find((g) => g.id === selectedId) ?? sorted[0]);
  const visible = $derived(
    sorted.filter(
      (g) =>
        (!motif || g.motif === motif) &&
        `${g.title} ${g.mechanism} ${g.reading} ${g.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
  );

  function exportBrief() {
    downloadText(
      `${PATTERN_GRAPHIC_SPECIFICATION}\nPattern: ${selected.title}\nID: ${selected.id}\nCentral mechanism: ${selected.mechanism}\nCurrent visual mapping: ${selected.reading}\n`,
      `${selected.id}-design-brief.txt`,
      'text/plain',
    );
  }
</script>

<main class="concept-studio">
  <header>
    <p class="eyebrow">personal design tools</p>
    <h1>Pattern graphic studio</h1>
    <p>One visual language. A deliberate composition for every concept.</p>
  </header>

  <section class="inspector" aria-label="Selected graphic">
    <div class:dark class="preview">
      {#each [32, 48, 96] as previewSize (previewSize)}
        <div>
          <PatternIcon icon={selected} title={selected.title} size={previewSize} /><span
            >{previewSize} px</span
          >
        </div>
      {/each}
    </div>
    <div class="explanation">
      <h2>{selected.title}</h2>
      <p>{selected.mechanism}</p>
      <p class="reading">{selected.reading}</p>
      <div class="actions">
        <button
          onclick={() =>
            downloadText(patternGraphicSvg(selected), `${selected.id}.svg`, 'image/svg+xml')}
          >Export SVG</button
        >
        <button onclick={exportBrief}>Export design brief</button>
        <button
          onclick={() =>
            downloadText(
              JSON.stringify({ version: 2, graphics: PATTERN_GRAPHICS }, null, 2),
              'patternverse-concept-graphics.json',
              'application/json',
            )}>Export collection</button
        >
      </div>
    </div>
  </section>

  <div class="controls">
    <label
      >Find a pattern<input
        type="search"
        bind:value={query}
        placeholder="Search titles and meanings"
      /></label
    >
    <label
      >Visual relationship<select bind:value={motif}
        ><option value="">All relationships</option>{#each motifs as name (name)}<option
            value={name}>{name}</option
          >{/each}</select
      ></label
    >
    <label
      >Gallery size<select bind:value={size}
        >{#each [32, 48, 96] as option (option)}<option value={option}>{option} px</option
          >{/each}</select
      ></label
    >
    <label class="check"><input type="checkbox" bind:checked={dark} /> Dark preview</label>
  </div>
  <p class="count" role="status">{visible.length} of {sorted.length} authored graphics</p>
  <section class:dark class="gallery" aria-label="Pattern concept gallery">
    {#each visible as graphic (graphic.id)}
      <button
        class="graphic"
        aria-pressed={selectedId === graphic.id}
        onclick={() => (selectedId = graphic.id)}
      >
        <PatternIcon icon={graphic} {size} decorative />
        <span>{graphic.title}</span>
      </button>
    {:else}<p>No patterns match this search.</p>{/each}
  </section>
  <details>
    <summary>Design specification</summary>
    <pre>{PATTERN_GRAPHIC_SPECIFICATION}</pre>
  </details>
</main>

<style>
  .concept-studio {
    max-width: 1440px;
    margin: auto;
    padding: 2rem 4vw 4rem;
    color: #181814;
  }
  .eyebrow {
    color: #62655f;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    margin: 0.5rem 0;
  }
  header {
    margin-bottom: 2rem;
  }
  p {
    line-height: 1.6;
  }
  .inspector {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 2fr;
    gap: 2rem;
    border-block: 1px solid #deded8;
    padding-block: 1.5rem;
  }
  .preview {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 1rem;
    background: #fff;
  }
  .preview > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .preview span {
    font-size: 0.75rem;
  }
  .reading,
  .count {
    color: #62655f;
  }
  .explanation h2 {
    margin-top: 0;
  }
  .actions,
  .controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .controls {
    align-items: end;
    margin-top: 1.5rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  .check {
    flex-direction: row;
    align-items: center;
    min-height: 44px;
  }
  input,
  select,
  button {
    font: inherit;
    color: inherit;
  }
  input[type='search'],
  select {
    background: white;
    border: 1px solid #bcbeb4;
    padding: 0.65rem;
    min-height: 44px;
    max-width: 100%;
  }
  button {
    background: #fff;
    border: 1px solid #deded8;
    padding: 0.65rem 0.8rem;
    cursor: pointer;
    min-height: 44px;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
    gap: 1px;
    background: #deded8;
    padding: 1px;
  }
  .graphic {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    min-height: 180px;
    padding: 1.5rem 0.8rem;
    border: 0;
  }
  .graphic span {
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .graphic[aria-pressed='true'] {
    box-shadow: inset 0 0 0 2px #007a4d;
  }
  .dark {
    --pattern-icon-primary: #efeee6;
    --pattern-icon-secondary: #a6a69e;
    --pattern-icon-purple: #b09bdc;
    background: #252521;
    color: #efeee6;
  }
  .dark .graphic {
    background: #181814;
  }
  details {
    margin-top: 2rem;
  }
  summary {
    cursor: pointer;
    padding-block: 0.7rem;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
    line-height: 1.6;
  }
  @media (max-width: 720px) {
    .inspector {
      grid-template-columns: 1fr;
    }
    .controls > label {
      max-width: 100%;
    }
  }
</style>
