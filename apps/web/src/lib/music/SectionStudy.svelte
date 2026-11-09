<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { ChevronUp, ChevronLeft, ChevronRight, Piano, Drum, Music2 } from '@lucide/svelte';
  import type { BeatRange, MusicExample } from './model';
  import { tracksFor } from './model';
  import { formSections } from './form';
  import { measuresFor } from './timing';
  import FormTimeline from './FormTimeline.svelte';
  import HarmonyRibbon from './HarmonyRibbon.svelte';
  import BeatGrid from './BeatGrid.svelte';
  import PianoRoll from './PianoRoll.svelte';
  import MusicNotation from './MusicNotation.svelte';

  let {
    example,
    beat,
    playing,
    disabled,
    parts,
    onseek,
    onrange,
    ontoggleparts,
    canMute = true,
    children,
    recording,
  }: {
    example: MusicExample;
    beat: number;
    playing: boolean;
    disabled: boolean;
    parts: string[];
    onseek: (beat: number, range?: BeatRange) => void;
    onrange: (range: BeatRange | undefined) => void;
    ontoggleparts: (ids: string[]) => void;
    canMute?: boolean;
    children: Snippet;
    recording?: Snippet;
  } = $props();
  let expanded = $state(false),
    harmony = $state(true),
    drums = $state(true),
    names = $state(false),
    inversions = $state(true),
    notes = $state(false),
    notation = $state(false);
  const sections = $derived(formSections(example));
  const section = $derived(
    sections.find((s) => beat >= s.start && beat < s.end) ?? sections.at(-1),
  );
  const measures = $derived(measuresFor(example));
  const sectionBars = $derived(
    measures
      .filter((b) => section && b.start < section.end && b.end > section.start)
      .map((b) => ({
        ...b,
        start: Math.max(b.start, section!.start),
        end: Math.min(b.end, section!.end),
      })),
  );
  const page = $derived(
    Math.max(
      0,
      Math.floor(
        Math.max(
          0,
          sectionBars.findIndex((b) => beat >= b.start && beat < b.end),
        ) / 4,
      ),
    ),
  );
  const bars = $derived(sectionBars.slice(page * 4, page * 4 + 4));
  const currentBar = $derived(bars.find((b) => beat >= b.start && beat < b.end) ?? bars[0]);
  const tracks = $derived(tracksFor(example));
  const hasDrums = $derived(tracks.some((t) => t.drum));
  const hasNotes = $derived(example.notes.length > 0);
  const hasHarmony = $derived(Boolean(example.harmony?.length));
  const uid = $props.id();
  const exampleId = $derived(example.id);

  $effect(() => {
    void exampleId;
    untrack(() => {
      expanded = false;
      notes = hasNotes && !example.harmony?.length;
      drums = true;
      notation = false;
      harmony = true;
    });
  });
  $effect(() => {
    const range = expanded && section ? { start: section.start, end: section.end } : undefined;
    untrack(() => onrange(range));
  });
  function explore(position: number) {
    expanded = true;
    const target = sections.find((s) => position >= s.start && position < s.end);
    onseek(position, target);
  }
  function seekInside(position: number) {
    onseek(position, expanded ? section : undefined);
  }
  function toggleModule(module: 'notes' | 'drums' | 'notation') {
    if (!expanded) {
      notes = false;
      drums = false;
      notation = false;
      expanded = true;
    }
    if (module === 'notes') notes = !notes;
    if (module === 'drums') drums = !drums;
    if (module === 'notation') notation = !notation;
  }
</script>

<div class="section-study">
  {@render children()}
  <div class="study-layout">
    <div class="module-rail" role="group" aria-label="Musical views">
      <button
        type="button"
        aria-label="Roman numeral chords"
        aria-describedby={hasHarmony ? undefined : `${uid}-unannotated`}
        title={hasHarmony ? 'Roman numeral chords' : 'Roman numeral chords — not yet annotated'}
        aria-pressed={hasHarmony && harmony}
        disabled={disabled || !hasHarmony}
        onclick={() => (harmony = !harmony)}
        ><span class="roman-icon" aria-hidden="true">Ⅰ Ⅴ</span></button
      >
      {#if !hasHarmony}<span id={`${uid}-unannotated`} class="sr-only"
          >Chord labels have not been annotated for this arrangement.</span
        >{/if}
      <button
        type="button"
        aria-label="Piano roll"
        title="Piano roll"
        aria-pressed={expanded && notes}
        disabled={disabled || !hasNotes}
        onclick={() => toggleModule('notes')}><Piano size={19} aria-hidden="true" /></button
      >
      <button
        type="button"
        aria-label="Drums"
        title="Drums"
        aria-pressed={expanded && drums}
        disabled={disabled || !hasDrums}
        onclick={() => toggleModule('drums')}><Drum size={19} aria-hidden="true" /></button
      >
      <button
        type="button"
        aria-label="Notation"
        title="Notation"
        aria-pressed={expanded && notation}
        disabled={disabled || !hasNotes}
        onclick={() => toggleModule('notation')}><Music2 size={19} aria-hidden="true" /></button
      >
    </div>
    <div class="study-content">
      <FormTimeline
        {example}
        {beat}
        {playing}
        {disabled}
        {expanded}
        {parts}
        {ontoggleparts}
        {canMute}
        onseek={explore}
      >
        {#if section && bars.length && ((hasHarmony && harmony) || expanded)}
          <div class="progression-panel">
            <div class="window-navigation">
              <span>{section.label} · Bars {bars[0].index + 1}–{bars.at(-1)!.index + 1}</span>
              {#if sectionBars.length > 4}<div>
                  <button
                    type="button"
                    aria-label="Previous four bars"
                    disabled={disabled || page === 0}
                    onclick={() => seekInside(sectionBars[(page - 1) * 4].start)}
                    ><ChevronLeft size={16} /></button
                  >
                  <button
                    type="button"
                    aria-label="Next four bars"
                    disabled={disabled || (page + 1) * 4 >= sectionBars.length}
                    onclick={() => seekInside(sectionBars[(page + 1) * 4].start)}
                    ><ChevronRight size={16} /></button
                  >
                </div>{/if}
            </div>
            {#if hasHarmony && harmony}<HarmonyRibbon
                {example}
                {bars}
                {beat}
                {names}
                {inversions}
                {disabled}
                onseek={seekInside}
              />{/if}
          </div>
        {/if}
      </FormTimeline>
      {#if recording}{@render recording()}{/if}
      {#if expanded && section && bars.length}
        <section class="section-detail" id={`${uid}-detail`} aria-label="Section detail">
          <button
            type="button"
            class="section-heading"
            aria-expanded="true"
            aria-controls={`${uid}-detail-content`}
            onclick={() => (expanded = false)}
          >
            <span
              ><strong>{section.label}</strong><small
                >Bars {sectionBars[0].index + 1}–{sectionBars.at(-1)!.index + 1}</small
              ></span
            >
            <ChevronUp size={18} aria-hidden="true" /><span class="sr-only">Minimize section</span>
          </button>
          <div id={`${uid}-detail-content`}>
            {#if section.description}<p class="section-description">{section.description}</p>{/if}
            {#if !hasHarmony && hasNotes}<p class="no-harmony">
                Chord labels have not been annotated for this passage. Explore its notes below.
              </p>
            {:else if !hasNotes}<p class="no-harmony">
                Follow the recording and its section map. Chord and drum annotations can be added to
                this study.
              </p>{/if}
            {#if hasHarmony && harmony}<details class="explore">
                <summary>Chord display</summary>
                <div class="modules">
                  <label><input type="checkbox" bind:checked={names} />Chord names</label><label
                    ><input type="checkbox" bind:checked={inversions} />Inversion tags</label
                  >
                </div>
              </details>{/if}
            {#if drums && hasDrums && currentBar}<div class="module">
                <h3>Drums · bar {currentBar.index + 1}</h3>
                <BeatGrid {example} bars={[currentBar]} {parts} {beat} {playing} compact />
              </div>{/if}
            {#if notes && hasNotes}<div class="module">
                <h3>Piano roll</h3>
                <PianoRoll {example} {bars} {parts} {beat} {playing} height={320} />
              </div>{/if}
            {#if notation && hasNotes}<div class="module">
                <h3>Notation</h3>
                <MusicNotation {example} {bars} {parts} {beat} {playing} />
              </div>{/if}
          </div>
        </section>
      {:else}<p class="overview-help">Select a section to explore its chords and drums.</p>{/if}
    </div>
  </div>
</div>

<style>
  .section-study {
    min-width: 0;
  }
  .study-layout {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 0.85rem;
    align-items: start;
  }
  .study-content {
    min-width: 0;
  }
  .module-rail {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    position: sticky;
    top: 0.75rem;
  }
  .module-rail button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: color-mix(in srgb, var(--ink) 3%, var(--paper));
    border-color: transparent;
  }
  .module-rail button[aria-pressed='true'] {
    color: var(--green-dark);
    background: var(--mint);
    border-color: color-mix(in srgb, var(--green-dark) 22%, var(--paper));
  }
  .module-rail button:hover:not(:disabled) {
    border-color: var(--green-dark);
  }
  .roman-icon {
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1;
  }
  .progression-panel {
    margin-top: 0.7rem;
  }
  .section-detail {
    border-top: 1px solid color-mix(in srgb, var(--ink) 15%, var(--paper));
    margin-top: 1rem;
    padding-top: 0.65rem;
  }
  button {
    font: inherit;
    color: var(--ink);
    background: var(--paper);
    border: 1px solid color-mix(in srgb, var(--ink) 18%, var(--paper));
    border-radius: var(--radius-control);
    min-height: 44px;
    padding: 0.45rem 0.65rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border: 0;
    padding: 0.4rem 0;
    gap: 0.75rem;
    text-align: left;
  }
  .section-heading > span {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  strong {
    font-size: 0.95rem;
    font-weight: 600;
  }
  small {
    font-size: 0.72rem;
    color: var(--muted);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .section-description,
  .no-harmony,
  .overview-help {
    font-size: 0.76rem;
    line-height: 1.6;
    color: var(--muted);
    margin: 0.4rem 0 0.85rem;
  }
  .overview-help {
    margin: 0.8rem 0 0;
  }
  .window-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    font-size: 0.72rem;
    color: var(--muted);
    margin: 0.4rem 0;
  }
  .window-navigation > div {
    display: flex;
    gap: 0.3rem;
  }
  .explore > summary {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .explore > summary::before {
    content: '+';
    font-size: 1.1rem;
    margin-right: 0.4rem;
  }
  .explore[open] > summary::before {
    content: '−';
  }
  .modules {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--ink) 4%, var(--paper));
  }
  .modules label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    font-size: 0.75rem;
    cursor: pointer;
  }
  input {
    accent-color: var(--green-dark);
    width: 16px;
    height: 16px;
  }
  .module {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--ink) 12%, var(--paper));
  }
  h3 {
    margin: 0 0 0.65rem;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--muted);
  }
  button:focus-visible,
  summary:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: 3px;
  }
  @media (max-width: 480px) {
    .study-layout {
      gap: 0.45rem;
    }
  }
</style>
