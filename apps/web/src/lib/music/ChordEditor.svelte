<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { Copy, Trash2, GripHorizontal } from '@lucide/svelte';
  import MusicPlayer from './MusicPlayer.svelte';
  import {
    chordPalette,
    cloneSketch,
    defaultSketch,
    durations,
    MAX_CHORDS,
    parseSketch,
    scaleNotes,
    sketchExample,
    sketchPresets,
    SKETCH_STORAGE_KEY,
    tonicName,
    displayAccidentals,
    type ChordSketch,
    type ScaleMode,
  } from './harmony';

  let { expanded = false }: { expanded?: boolean } = $props();
  let opened = $state(untrack(() => expanded));
  const uid = $props.id();
  let sketch = $state<ChordSketch>(defaultSketch());
  let selected = $state(0),
    ready = $state(false),
    dirty = $state(false);
  let history = $state<ChordSketch[]>([]),
    future = $state<ChordSketch[]>([]);
  let storageMessage = $state('Edits are saved on this device.');
  let canDrag = $state(false);
  let dragging = $state<number | null>(null);
  let dropTarget = $state<{ index: number; after: boolean } | null>(null);
  let announcement = $state('');
  let progression = $state<HTMLOListElement>();
  const palette = $derived(chordPalette(sketch.tonic, sketch.mode));
  const example = $derived(sketchExample(sketch));
  const current = $derived(sketch.cells[selected]);
  const selectedChord = $derived(palette[current.degree - 1]);
  const durationLabel = (beats: number) =>
    beats === 4
      ? '1 bar · 4 beats'
      : beats === 8
        ? '2 bars · 8 beats'
        : `${beats} ${beats === 1 ? 'beat' : 'beats'}`;

  onMount(() => {
    try {
      const stored = localStorage.getItem(SKETCH_STORAGE_KEY);
      if (stored) {
        const restored = parseSketch(stored);
        if (restored) {
          sketch = restored;
          storageMessage = 'Loaded your sketch from this device.';
        } else
          storageMessage =
            'The saved sketch could not be read. Your next edit will save a new sketch.';
      }
    } catch {
      storageMessage = 'Local saving is unavailable in this browser.';
    }
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    const updatePointer = () => {
      canDrag = pointer.matches;
    };
    updatePointer();
    pointer.addEventListener('change', updatePointer);
    ready = true;
    return () => pointer.removeEventListener('change', updatePointer);
  });
  $effect(() => {
    const serialized = JSON.stringify(sketch);
    if (!ready || !dirty) return;
    try {
      localStorage.setItem(SKETCH_STORAGE_KEY, serialized);
      storageMessage = 'Saved on this device.';
    } catch {
      storageMessage =
        'Your sketch is still here, but this browser could not save it. Keep this tab open.';
    }
  });
  function edit(next: ChordSketch) {
    history = [...history.slice(-49), cloneSketch(sketch)];
    future = [];
    sketch = cloneSketch(next);
    dirty = true;
    selected = Math.min(selected, sketch.cells.length - 1);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    future = [...future, cloneSketch(sketch)];
    history = history.slice(0, -1);
    sketch = cloneSketch(previous);
    selected = Math.min(selected, sketch.cells.length - 1);
    dirty = true;
  }
  function redo() {
    const next = future.at(-1);
    if (!next) return;
    history = [...history, cloneSketch(sketch)];
    future = future.slice(0, -1);
    sketch = cloneSketch(next);
    selected = Math.min(selected, sketch.cells.length - 1);
    dirty = true;
  }
  function add(degree: number) {
    if (sketch.cells.length >= MAX_CHORDS) return;
    edit({ ...sketch, cells: [...sketch.cells, { degree, beats: 4 }] });
    selected = sketch.cells.length - 1;
    void focusCard(selected);
  }
  function updateCell(field: 'degree' | 'beats', value: number) {
    edit({
      ...sketch,
      cells: sketch.cells.map((cell, i) => (i === selected ? { ...cell, [field]: value } : cell)),
    });
  }
  async function focusCard(index: number) {
    await tick();
    const cards = progression?.querySelectorAll<HTMLButtonElement>('.chord-card');
    const card = cards?.[index];
    card?.focus({ preventScroll: true });
    const scroller = progression?.parentElement;
    if (card && scroller) {
      const bounds = card.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      if (bounds.left < viewport.left || bounds.right > viewport.right)
        scroller.scrollLeft += bounds.left - viewport.left - 3;
    }
  }
  function move(from: number, next: number) {
    if (from === next || next < 0 || next >= sketch.cells.length) return;
    const cells = sketch.cells.map((cell) => ({ ...cell }));
    const [cell] = cells.splice(from, 1);
    cells.splice(next, 0, cell);
    edit({ ...sketch, cells });
    selected = next;
    announcement = `Moved ${palette[cell.degree - 1].roman} to position ${next + 1} of ${cells.length}.`;
    void focusCard(next);
  }
  function duplicate(index: number) {
    if (sketch.cells.length >= MAX_CHORDS) return;
    const cells = sketch.cells.map((cell) => ({ ...cell }));
    cells.splice(index + 1, 0, { ...cells[index] });
    edit({ ...sketch, cells });
    selected = index + 1;
    announcement = `Duplicated chord ${index + 1}. Copy selected at position ${selected + 1}.`;
    void focusCard(selected);
  }
  function remove(index: number) {
    if (sketch.cells.length === 1) return;
    const previous = selected;
    edit({ ...sketch, cells: sketch.cells.filter((_, i) => i !== index) });
    selected = Math.min(previous > index ? previous - 1 : previous, sketch.cells.length - 1);
    announcement = `Removed chord ${index + 1}. ${sketch.cells.length} ${sketch.cells.length === 1 ? 'chord remains' : 'chords remain'}.`;
    void focusCard(selected);
  }
  function clearDrag() {
    dragging = null;
    dropTarget = null;
  }
  function startDrag(event: DragEvent, index: number) {
    if (!ready || !canDrag || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    dragging = index;
    selected = index;
    event.dataTransfer.setData('application/x-patternverse-chord', uid);
    event.dataTransfer.effectAllowed = 'move';
  }
  function overCard(event: DragEvent, index: number) {
    if (dragging === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.getBoundingClientRect()
        : null;
    if (rect) dropTarget = { index, after: event.clientX >= rect.left + rect.width / 2 };
  }
  function dropCard(event: DragEvent, index: number) {
    if (
      dragging === null ||
      event.dataTransfer?.getData('application/x-patternverse-chord') !== uid
    )
      return;
    event.preventDefault();
    const source = dragging;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const boundary = index + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
    clearDrag();
    move(source, boundary > source ? boundary - 1 : boundary);
  }
  function cardKey(event: KeyboardEvent, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
  }
  function preset(event: Event) {
    const control = event.currentTarget as HTMLSelectElement;
    const item = sketchPresets.find((candidate) => candidate.id === control.value);
    if (item) {
      edit(item.sketch);
      selected = 0;
    }
    control.value = '';
  }
</script>

<details class="chord-editor" bind:open={opened}>
  <summary
    ><span class="eyebrow">Write with chord numbers</span><span class="summary-title"
      >Build a chord progression <span class="open-indicator" aria-hidden="true"></span></span
    ><span>Arrange I, IV, V and more. Change the key; keep the relationships.</span></summary
  >
  <div class="editor-body">
    <p class="intro">
      Roman numerals tell you where a chord is built in the key. Start with a sketch, or add chords
      from the palette. Select a chord in your progression to edit it.
    </p>
    <div class="key-controls">
      <div>
        <label for={`${uid}-key`}>Key</label><select
          id={`${uid}-key`}
          value={sketch.tonic}
          disabled={!ready}
          onchange={(event) => edit({ ...sketch, tonic: Number(event.currentTarget.value) })}
          >{#each Array.from({ length: 12 }, (_, i) => i) as tonic (tonic)}<option value={tonic}
              >{tonicName(tonic, sketch.mode)}</option
            >{/each}</select
        >
      </div>
      <div>
        <label for={`${uid}-scale`}>Scale</label><select
          id={`${uid}-scale`}
          value={sketch.mode}
          disabled={!ready}
          onchange={(event) => edit({ ...sketch, mode: event.currentTarget.value as ScaleMode })}
          ><option value="major">Major</option><option value="minor">Natural minor</option></select
        >
      </div>
      <div class="preset">
        <label for={`${uid}-preset`}>Starting point</label><select
          id={`${uid}-preset`}
          value=""
          onchange={preset}
          disabled={!ready}
          ><option value="">Load a progression…</option
          >{#each sketchPresets as item (item.id)}<option value={item.id}>{item.title}</option
            >{/each}</select
        >
      </div>
    </div>
    <p class="scale-notes">
      Scale: {scaleNotes(sketch.tonic, sketch.mode).map(displayAccidentals).join(' · ')}
    </p>
    <div class="palette" role="group" aria-label="Add a chord">
      {#each palette as chord (chord.degree)}<button
          type="button"
          disabled={!ready || sketch.cells.length >= MAX_CHORDS}
          onclick={() => add(chord.degree)}
          aria-label={`Add ${chord.roman} (${chord.name})`}
          ><strong>{chord.roman}</strong><span>{chord.name}</span><small>+ add</small></button
        >{/each}
    </div>
    <p class="legend">Uppercase = major · lowercase = minor · ° = diminished</p>
    {#if sketch.mode === 'minor'}<p class="legend">
        Minor numerals use the major scale as a reference: ♭III, ♭VI, and ♭VII name its lowered
        roots. The v chord here is minor.
      </p>{/if}
    <div class="progression-heading">
      <h3>Your progression</h3>
      <span>{sketch.cells.length}/{MAX_CHORDS} chords · {example.beats} beats · 4/4</span>
    </div>
    <p class="reorder-help" id={`${uid}-reorder-help`}>
      <span class="desktop-help"
        >Drag cards to reorder. With a card focused, use the Left and Right arrow keys.</span
      >
      <span class="touch-help"
        >Select a card to show its actions. Change its Position below to reorder.</span
      >
    </p>
    <div class="progression-scroll">
      <ol
        class="progression"
        aria-label="Your chord progression"
        bind:this={progression}
        style={`grid-template-columns:${sketch.cells.map((cell) => `${cell.beats}fr`).join(' ')};min-width:${(example.beats / Math.min(...sketch.cells.map((cell) => cell.beats))) * 110}px`}
      >
        {#each sketch.cells as cell, i (i)}
          {@const chord = palette[cell.degree - 1]}
          <li
            class:selected={selected === i}
            class:dragging={dragging === i}
            class:drop-before={dropTarget?.index === i && !dropTarget.after}
            class:drop-after={dropTarget?.index === i && dropTarget.after}
          >
            <button
              type="button"
              class="chord-card"
              draggable={ready && canDrag}
              aria-pressed={selected === i}
              aria-describedby={`${uid}-reorder-help`}
              aria-label={`Chord ${i + 1}: ${chord.roman} (${chord.name}), ${cell.beats} beats`}
              onclick={() => (selected = i)}
              onkeydown={(event) => cardKey(event, i)}
              ondragstart={(event) => startDrag(event, i)}
              ondragover={(event) => overCard(event, i)}
              ondrop={(event) => dropCard(event, i)}
              ondragend={clearDrag}
            >
              <span class="index">{i + 1}</span><span class="drag-grip" aria-hidden="true"
                ><GripHorizontal size={13} /></span
              ><strong>{chord.roman}</strong><span>{chord.name}</span><small
                >{durationLabel(cell.beats)}</small
              >
            </button>
            <div class="card-actions">
              <button
                type="button"
                aria-label={`Duplicate chord ${i + 1}`}
                title="Duplicate chord"
                disabled={!ready || sketch.cells.length >= MAX_CHORDS}
                onclick={() => duplicate(i)}><Copy size={14} aria-hidden="true" /></button
              >
              <button
                type="button"
                aria-label={`Remove chord ${i + 1}`}
                title="Remove chord"
                disabled={!ready || sketch.cells.length === 1}
                onclick={() => remove(i)}><Trash2 size={14} aria-hidden="true" /></button
              >
            </div>
          </li>
        {/each}
      </ol>
    </div>
    <fieldset class="inspector" disabled={!ready}>
      <legend>Selected chord {selected + 1}</legend>
      <div class="cell-controls">
        <div>
          <label for={`${uid}-chord`}>Chord</label><select
            id={`${uid}-chord`}
            value={current.degree}
            onchange={(event) => updateCell('degree', Number(event.currentTarget.value))}
            >{#each palette as chord (chord.degree)}<option value={chord.degree}
                >{chord.roman} · {chord.name}</option
              >{/each}</select
          >
        </div>
        <div>
          <label for={`${uid}-duration`}>Duration</label><select
            id={`${uid}-duration`}
            value={current.beats}
            onchange={(event) => updateCell('beats', Number(event.currentTarget.value))}
            >{#each durations as duration (duration)}<option value={duration}
                >{durationLabel(duration)}</option
              >{/each}</select
          >
        </div>
        <div class="touch-position">
          <label for={`${uid}-position`}>Position</label><select
            id={`${uid}-position`}
            value={selected}
            onchange={(event) => move(selected, Number(event.currentTarget.value))}
          >
            {#each Array.from({ length: sketch.cells.length }, (_, index) => index) as index (index)}<option
                value={index}>{index + 1} of {sketch.cells.length}</option
              >{/each}
          </select>
        </div>
      </div>
      <p class="tones">Chord tones: {selectedChord.tones.join(' · ')}</p>
    </fieldset>
    <div class="history">
      <button type="button" disabled={!history.length} onclick={undo}>Undo</button><button
        type="button"
        disabled={!future.length}
        onclick={redo}>Redo</button
      ><span role="status">{storageMessage}</span>
    </div>
    <span class="sr-only" aria-live="polite">{announcement}</span>
    <p class="legend">
      Changing the key transposes your sketch. Changing the scale also changes its chord qualities.
      Editing stops playback so you can hear the revised progression from the start.
    </p>
    {#if opened}<MusicPlayer customExample={example} />{/if}
  </div>
</details>

<style>
  .chord-editor {
    border: 2px solid var(--ink);
    margin: 0 0 2.5rem;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
  }
  summary {
    cursor: pointer;
    padding: 1.25rem;
    display: grid;
    gap: 0.5rem;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .eyebrow {
    font-size: 0.65rem;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--green-dark);
  }
  .summary-title {
    font-weight: 850;
    font-size: 1.4rem;
    letter-spacing: -0.04em;
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .open-indicator::before {
    content: '+';
  }
  details[open] .open-indicator::before {
    content: '−';
  }
  summary > span:last-child {
    font-size: 0.8rem;
    line-height: 1.5;
  }
  details[open] summary {
    border-bottom: 1px solid var(--ink);
  }
  .editor-body {
    padding: 1.25rem;
  }
  .intro {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    line-height: 1.6;
  }
  .key-controls {
    display: grid;
    grid-template-columns: 1fr 1.4fr 2fr;
    gap: 0.75rem;
  }
  .key-controls > div,
  .cell-controls > div {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }
  label {
    font-size: 0.75rem;
    font-weight: 750;
  }
  select {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.5rem;
    font: inherit;
    font-size: 0.8rem;
    background: var(--paper);
    border: 1px solid var(--ink);
    border-radius: 0;
    color: var(--ink);
  }
  .scale-notes,
  .legend,
  .tones {
    font-size: 0.72rem;
    line-height: 1.6;
  }
  .scale-notes {
    margin: 0.75rem 0;
  }
  .legend {
    color: var(--muted);
    margin: 0.65rem 0 1rem;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.35rem;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--ink);
    padding: 0.55rem;
    min-height: 44px;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--mint);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .palette button {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.55rem 0.2rem;
  }
  strong {
    font-size: 1.3rem;
    font-weight: 850;
  }
  .palette small {
    font-size: 0.6rem;
    font-weight: 500;
    color: var(--muted);
  }
  .progression-heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.5rem 0 0.75rem;
  }
  h3 {
    font-size: 1rem;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .progression-heading > span {
    font-size: 0.65rem;
  }
  .progression {
    display: grid;
    gap: 0;
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
  }
  .progression-scroll {
    overflow-x: auto;
    padding: 3px;
  }
  .progression li {
    position: relative;
    min-width: 0;
  }
  .progression .chord-card {
    width: 100%;
    height: 150px;
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.3rem;
    padding: 2.3rem 0.25rem 0.65rem;
  }
  .chord-card[draggable='true'] {
    cursor: grab;
  }
  .progression li.dragging {
    opacity: 0.45;
  }
  .progression li.selected .chord-card {
    background: var(--mint);
    outline: 2px solid var(--green-dark);
    outline-offset: -2px;
  }
  .drag-grip {
    position: absolute;
    top: 0.4rem;
    left: 50%;
    transform: translateX(-50%);
    color: var(--muted);
    opacity: 0.55;
    pointer-events: none;
  }
  .card-actions {
    position: absolute;
    top: 0.2rem;
    right: 0.2rem;
    display: flex;
    gap: 2px;
    opacity: 0;
    pointer-events: none;
  }
  .card-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    width: 28px;
    min-height: 28px;
    background: var(--paper);
  }
  .progression li:focus-within .card-actions {
    opacity: 1;
    pointer-events: auto;
  }
  .progression li:focus-within .drag-grip {
    opacity: 0;
  }
  @media (hover: hover) and (pointer: fine) {
    .progression li:hover .card-actions {
      opacity: 1;
      pointer-events: auto;
    }
    .progression li:hover .drag-grip {
      opacity: 0;
    }
  }
  .progression li.drop-before::before,
  .progression li.drop-after::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--green-dark);
    z-index: 2;
    pointer-events: none;
  }
  .progression li.drop-before::before {
    left: -5px;
  }
  .progression li.drop-after::after {
    right: -5px;
  }
  .reorder-help {
    font-size: 0.68rem;
    color: var(--muted);
    line-height: 1.5;
    margin: 0 0 0.75rem;
  }
  .touch-help {
    display: none;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .cell-controls > .touch-position {
    display: none;
  }
  .index {
    position: absolute;
    top: 0.35rem;
    left: 0.4rem;
    font-size: 0.6rem;
    color: var(--muted);
  }
  .progression small {
    font-size: 0.6rem;
    font-weight: 500;
  }
  .inspector {
    border: 1px solid var(--ink);
    margin: 0;
    padding: 0.85rem;
  }
  legend {
    font-size: 0.75rem;
    font-weight: 750;
    padding: 0 0.3rem;
  }
  .cell-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .tones {
    margin: 0.7rem 0;
  }
  .history {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .history {
    margin: 1rem 0;
  }
  .history span {
    font-size: 0.7rem;
    flex: 1;
    min-width: 150px;
    line-height: 1.5;
  }
  .editor-body :global(.music-player) {
    margin: 1.25rem 0 0;
    border-width: 1px;
  }
  @media (max-width: 600px) {
    .key-controls {
      grid-template-columns: 1fr 1fr;
    }
    .preset {
      grid-column: 1/-1;
    }
    .palette {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .editor-body,
    summary {
      padding: 0.85rem;
    }
  }
  @media (any-pointer: coarse), (hover: none) {
    .cell-controls > .touch-position {
      display: grid;
      grid-column: 1/-1;
    }
    .progression li.selected .card-actions {
      opacity: 1;
      pointer-events: auto;
    }
    .card-actions button {
      width: 44px;
      min-height: 44px;
    }
    .progression .chord-card {
      padding-top: 3.2rem;
    }
    .drag-grip {
      display: none;
    }
    .desktop-help {
      display: none;
    }
    .touch-help {
      display: inline;
    }
  }
</style>
