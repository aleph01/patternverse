<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { asset } from '$app/paths';
  import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Repeat2 } from '@lucide/svelte';
  import { musicExamples } from './examples';
  import { compositionExamples } from './composition-examples';
  import { tracksFor, withVariant, type MusicExample, type Note } from './model';
  import { measuresFor, positionLabel } from './timing';
  import { createTransport } from './transport';
  import { createRecordingTransport } from './recording-transport';
  import { createYoutubeTransport } from './youtube-transport';
  import { recordingClock } from './recording-timing';
  import type { BeatRange } from './model';
  import SectionStudy from './SectionStudy.svelte';
  import {
    instruments,
    defaultInstrumentation,
    type Instrument,
    type Instrumentation,
  } from './instruments';
  import PianoRoll from './PianoRoll.svelte';
  import BeatGrid from './BeatGrid.svelte';
  import MusicNotation from './MusicNotation.svelte';
  import ChordTimeline from './ChordTimeline.svelte';
  import { formSections } from './form';

  let {
    initial = 'seed',
    customExample,
    examples,
    allowEditing = true,
    rollHeight,
    showSelector = true,
    showPartControls = true,
  }: {
    initial?: string;
    customExample?: MusicExample;
    examples?: MusicExample[];
    allowEditing?: boolean;
    rollHeight?: number;
    showSelector?: boolean;
    showPartControls?: boolean;
  } = $props();
  const library = $derived(
    examples?.length ? examples : [...musicExamples, ...compositionExamples],
  );
  let selection = $state(untrack(() => initial));
  let variant = $state('b');
  let edits = $state<Record<string, Note[]>>({});
  const base = $derived(
    customExample ?? library.find((item) => item.id === selection) ?? library[0],
  );
  const activeVariant = $derived(
    base.variants?.some((item) => item.id === variant) ? variant : base.variants?.[0]?.id,
  );
  const editKey = $derived(`${base.id}:${activeVariant ?? ''}`);
  const example = $derived(
    edits[editKey]
      ? { ...withVariant(base, activeVariant ?? ''), notes: edits[editKey] }
      : withVariant(base, activeVariant ?? ''),
  );
  let playing = $state(false),
    busy = $state(false),
    ready = $state(false),
    mounted = $state(false),
    loop = $state(false);
  let beat = $state(0),
    page = $state(0),
    error = $state('');
  const preferredView = (item: MusicExample) =>
    item.defaultView ?? (item.harmony?.length ? 'harmony' : 'roll');
  let view = $state<NonNullable<MusicExample['defaultView']>>(
    untrack(() => preferredView(example)),
  );
  let parts = $state<string[]>(['melody', 'chords', 'bass']);
  let instrumentation = $state<Instrumentation>({ ...defaultInstrumentation });
  let transport:
    | ReturnType<typeof createTransport>
    | ReturnType<typeof createRecordingTransport>
    | ReturnType<typeof createYoutubeTransport>
    | undefined;
  let recordingHost = $state<HTMLDivElement>();
  let source = $state<'midi' | 'recording'>('midi');
  let sectionRange = $state<BeatRange>();
  let connected: MusicExample | undefined;
  const uid = $props.id();
  const tracks = $derived(tracksFor(example));
  const notationParts = $derived(
    example.notationParts ? parts.filter((id) => example.notationParts!.includes(id)) : parts,
  );
  const measures = $derived(measuresFor(example));
  const bars = $derived(measures.slice(page * 4, page * 4 + 4));
  const currentBar = $derived(
    measures.find((bar) => beat >= bar.start && beat < bar.end) ?? measures.at(-1)!,
  );
  const recordingTiming = $derived(
    example.recording ? recordingClock(example, example.recording) : undefined,
  );
  const positionText = $derived(
    (source === 'recording' && recordingTiming
      ? `${timestamp(recordingTiming.seconds(beat))} · `
      : '') + positionLabel(example, beat),
  );
  const hasDrums = $derived(tracks.some((track) => track.drum));
  const hasHarmony = $derived((example.harmony?.length ?? 0) > 0);
  const hasForm = $derived(formSections(example).length > 0);
  const editable = $derived(allowEditing && !customExample && hasDrums);
  const currentVariant = $derived(base.variants?.find((item) => item.id === activeVariant));

  function timestamp(seconds: number) {
    const rounded = Math.max(0, Math.floor(seconds));
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
  }

  function configure() {
    return transport?.configure({ loop, loopRange: sectionRange, parts, instrumentation });
  }
  function connect(resetParts = false) {
    transport?.dispose();
    connected = example;
    if (resetParts) {
      const oldIds = new Set(parts);
      const previousIds = new Set(connectedTracks);
      parts = tracks
        .map((track) => track.id)
        .filter((id) => oldIds.has(id) || !previousIds.has(id));
    }
    connectedTracks = tracks.map((track) => track.id);
    for (const track of tracks)
      if (!instrumentation[track.id]) instrumentation[track.id] = track.instrument ?? 'piano';
    const changed = (state: import('./transport').Playback) => {
      playing = state.playing;
      beat = state.beat;
      if (state.error) error = state.error;
      if (state.playing) {
        const bar =
          measures.find((item) => state.beat >= item.start && state.beat < item.end) ??
          measures.at(-1)!;
        page = Math.floor(bar.index / 4);
      }
    };
    transport =
      source === 'recording' && example.recording
        ? example.recording.youtubeId
          ? createYoutubeTransport(example, example.recording, () => recordingHost, changed)
          : createRecordingTransport(example, example.recording, changed)
        : createTransport(example, changed);
  }
  let connectedTracks: string[] = [];
  async function run(action: () => Promise<void> | undefined) {
    error = '';
    busy = true;
    try {
      await action();
    } catch (cause) {
      error =
        cause instanceof Error && ['PianoSampleError', 'MusicRecordingError'].includes(cause.name)
          ? cause.message
          : 'Sound could not start. Press Play to try again. The musical views are still available.';
    } finally {
      busy = false;
    }
  }
  async function replace(resume = false, position = 0) {
    playing = false;
    beat = position;
    error = '';
    connect();
    await configure();
    await transport?.seek(Math.min(position, example.beats));
    if (resume) {
      await tick();
      await transport?.play();
    }
  }
  function choose(event: Event) {
    selection = (event.currentTarget as HTMLSelectElement).value;
    variant = 'b';
    source =
      example.defaultPlayback ??
      (example.notes.length ? 'midi' : example.recording ? 'recording' : 'midi');
    sectionRange = undefined;
    page = 0;
    beat = 0;
    view = preferredView(example);
    connect(true);
    void run(configure);
  }
  function compare(id: string) {
    if (id === activeVariant || busy) return;
    const resume = playing,
      position = beat;
    transport?.pause();
    variant = id;
    void run(() => replace(resume, position));
  }
  function edit(track: string, start: number) {
    const resume = playing,
      position = beat;
    transport?.pause();
    const hit = example.notes.find(
      (note) => note.part === track && Math.abs(note.start - start) < 0.015,
    );
    const template =
      example.notes.find((note) => note.part === track) ??
      base.notes.find((note) => note.part === track)!;
    edits[editKey] = hit
      ? example.notes.filter((note) => note !== hit)
      : [
          ...example.notes,
          { ...template, start, duration: Math.min(template.duration, example.beats - start) },
        ].sort((a, b) => a.start - b.start);
    void run(() => replace(resume, position));
  }
  function restore() {
    const resume = playing,
      position = beat;
    transport?.pause();
    delete edits[editKey];
    void run(() => replace(resume, position));
  }
  function toggle(ids: string | string[]) {
    const group = typeof ids === 'string' ? [ids] : ids;
    parts = group.some((id) => parts.includes(id))
      ? parts.filter((part) => !group.includes(part))
      : [...new Set([...parts, ...group])];
    void run(() => transport?.configure({ parts }));
  }
  function chooseInstrument(id: string, instrument: Instrument) {
    instrumentation = { ...instrumentation, [id]: instrument };
    void run(() => transport?.configure({ instrumentation }));
  }
  function showPage(next: number) {
    page = next;
    void run(() => transport?.seek(measures[next * 4].start));
  }
  function seekSection(position: number, requestedRange?: BeatRange) {
    const resume = playing;
    const target =
      requestedRange ??
      (sectionRange
        ? formSections(example).find((s) => position >= s.start && position < s.end)
        : undefined);
    if (hasForm) transport?.pause();
    if (target) sectionRange = { start: target.start, end: target.end };
    beat = position;
    const bar = measures.find((m) => position >= m.start && position < m.end);
    page = Math.floor((bar?.index ?? 0) / 4);
    void run(async () => {
      if (hasForm) await configure();
      await transport?.seek(position);
      if (hasForm && resume) await transport?.play();
    });
  }

  function setSectionRange(range: BeatRange | undefined) {
    if (sectionRange?.start === range?.start && sectionRange?.end === range?.end) return;
    sectionRange = range;
    if (loop) void run(configure);
  }
  function switchSource(next: 'midi' | 'recording') {
    if (next === source || busy) return;
    const resume = playing,
      position = beat;
    transport?.pause();
    source = next;
    void run(() => replace(resume, position));
  }

  $effect(() => {
    const edited = example;
    if (!mounted) return;
    untrack(() => {
      if (edited === connected) return;
      page = 0;
      beat = 0;
      connect(true);
      void run(configure);
    });
  });
  onMount(() => {
    mounted = true;
    source =
      example.defaultPlayback ??
      (!example.notes.length && example.recording ? 'recording' : 'midi');
    ready =
      typeof AudioContext !== 'undefined' || (!!example.recording && typeof Audio !== 'undefined');
    connect(true);
    void run(configure);
    const hide = () => {
      if (document.hidden) transport?.pause();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', hide);
      transport?.dispose();
    };
  });
</script>

<section
  class="music-player"
  class:structured={hasForm}
  aria-label={customExample ? 'Chord sketch player' : 'Musical example player'}
>
  <header>
    <div>
      <span class="eyebrow">Listen & follow</span>
      <h2>
        {customExample ? 'Hear your progression' : hasForm ? example.title : 'Hear the example'}
      </h2>
    </div>
    <span class="setting"
      >{example.key} · {currentBar.numerator}/{currentBar.denominator}{(example.tempos?.length ??
        0) > 1
        ? ' · tempo map'
        : ` · ${Math.round(example.tempo * 100) / 100} bpm`}</span
    >
  </header>
  {#if !customExample && showSelector}
    <div class="example-select">
      <label for={`${uid}-example`}>Musical example</label><select
        id={`${uid}-example`}
        value={selection}
        onchange={choose}
        disabled={!mounted || busy}
        >{#each library as item (item.id)}<option value={item.id}>{item.title}</option
          >{/each}</select
      >
    </div>
  {/if}
  <p class="description">{base.description}</p>
  {#if base.variants?.length}<div class="versions" role="group" aria-label="Compare versions">
      {#each base.variants as item, i (item.id)}<button
          type="button"
          disabled={!mounted || busy}
          aria-pressed={activeVariant === item.id}
          onclick={() => compare(item.id)}
          ><span class="letter">{String.fromCharCode(65 + i)}</span>{item.label}</button
        >{/each}
    </div>{/if}
  {#if example.comparison}<details class="comparison-notes">
      <summary>What changes in A/B?</summary>
      <dl>
        <dt>What changed?</dt>
        <dd>{example.comparison.changed}</dd>
        <dt>What stayed the same?</dt>
        <dd>{example.comparison.invariant}</dd>
        <dt>What effect can it have?</dt>
        <dd>{example.comparison.effect}</dd>
        <dt>When would I use it?</dt>
        <dd>{example.comparison.useWhen}</dd>
      </dl>
    </details>{/if}
  {#if hasForm}
    <SectionStudy
      {example}
      {beat}
      {playing}
      {parts}
      disabled={!mounted || busy}
      onseek={seekSection}
      onrange={setSectionRange}
      ontoggleparts={toggle}
      canMute={source === 'midi'}
    >
      <div class="structure-transport">
        <button
          class="play"
          type="button"
          aria-label={playing ? 'Pause' : busy ? 'Starting audio' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
          disabled={!ready || busy}
          onclick={() => (playing ? transport?.pause() : void run(() => transport?.play()))}
        >
          {#if playing}<Pause size={18} />{:else}<Play size={18} />{/if}
        </button>
        <button
          type="button"
          aria-label="Restart example"
          title={sectionRange ? 'Restart section' : 'Restart song'}
          disabled={!ready || busy}
          onclick={() => void run(() => transport?.seek(sectionRange?.start ?? 0))}
          ><RotateCcw size={18} /></button
        >
        <button
          type="button"
          class="loop-button"
          aria-label={sectionRange ? 'Loop section' : 'Loop song'}
          title={sectionRange ? 'Loop section' : 'Loop song'}
          aria-pressed={loop}
          disabled={!ready || busy}
          onclick={() => {
            loop = !loop;
            void run(configure);
          }}><Repeat2 size={18} /></button
        >
        <span class="position" data-playback={playing ? 'playing' : 'paused'}>{positionText}</span>
      </div>
      {#if example.recording}
        <div class="recording-source" role="group" aria-label="Playback source">
          <span class="recording-label"
            >{source === 'recording' ? example.recording.label : 'Sampled piano & drums'}</span
          >
          <div>
            <button
              type="button"
              aria-pressed={source === 'recording'}
              disabled={busy}
              onclick={() => switchSource('recording')}>Recording</button
            >
            {#if example.notes.length}<button
                type="button"
                aria-pressed={source === 'midi'}
                disabled={busy}
                onclick={() => switchSource('midi')}>MIDI study</button
              >{/if}
          </div>
        </div>
      {/if}
      {#snippet recording()}
        {#if source === 'recording' && example.recording?.youtubeId}
          <div class="official-recording">
            <div class="recording-frame" bind:this={recordingHost}></div>
            {#if example.recording.alignmentStatus === 'draft'}<p class="alignment-note">
                Section timing is approximate. The MIDI is a community arrangement; its individual
                notes may differ from this recording.
              </p>{/if}
            <p>
              {error
                ? 'Switch to MIDI study if this recording is unavailable here.'
                : 'Press Play to load the official YouTube recording. Its playback position drives the map.'}
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- Authored external recording source. -->
              <a href={example.recording.src} target="_blank" rel="noreferrer">Open on YouTube ↗</a>
            </p>
          </div>
        {/if}
      {/snippet}
    </SectionStudy>
  {:else}
    <div class="display-toolbar">
      <div class="views" role="group" aria-label="Musical view">
        {#if hasHarmony}<button
            type="button"
            disabled={!mounted}
            aria-pressed={view === 'harmony'}
            onclick={() => (view = 'harmony')}>Chords</button
          >{/if}
        {#if hasDrums}<button
            type="button"
            disabled={!mounted}
            aria-pressed={view === 'grid'}
            onclick={() => (view = 'grid')}>Beat grid</button
          >{/if}
        <button
          type="button"
          disabled={!mounted}
          aria-pressed={view === 'roll'}
          onclick={() => (view = 'roll')}>Piano roll</button
        ><button
          type="button"
          disabled={!mounted}
          aria-pressed={view === 'score'}
          onclick={() => (view = 'score')}>Notation</button
        >
      </div>
      <span class="position" data-playback={playing ? 'playing' : 'paused'}>{positionText}</span>
    </div>
    {#if bars.length}
      <div class="musical-view">
        {#if view === 'harmony' && hasHarmony}<ChordTimeline {example} {bars} {beat} {playing} />
        {:else if view === 'score'}<MusicNotation
            {example}
            {bars}
            parts={notationParts}
            {beat}
            {playing}
          />
        {:else if view === 'grid' && hasDrums}<BeatGrid
            {example}
            {bars}
            {parts}
            {beat}
            {playing}
            onedit={editable && !busy ? edit : undefined}
          />
        {:else}<PianoRoll {example} {bars} {parts} {beat} {playing} height={rollHeight} />{/if}
      </div>
    {/if}
    <div class="view-footer">
      <span
        >{view === 'form' && hasForm
          ? 'A whole-piece map. The piano roll and notation show the current four-bar window.'
          : view === 'harmony' && hasHarmony
            ? 'Roman numerals describe the chord root; the bass shows its inversion. Scroll sideways on narrow screens.'
            : view === 'score'
              ? example.notationParts
                ? 'Pitched parts in notation; drums remain audible and visible in the beat grid.'
                : 'The same musical passage, in notation.'
              : view === 'grid'
                ? editable
                  ? 'Select a step to add or remove a hit.'
                  : 'Each lane follows a percussion part.'
                : 'Higher = higher pitch · wider = longer note'}{view === 'roll' && bars.length > 1
          ? ' · Scroll sideways on narrow screens.'
          : ''}</span
      >
      {#if measures.length > 4}<div class="pages">
          <button
            type="button"
            aria-label="Previous four bars"
            disabled={page === 0 || busy}
            onclick={() => showPage(page - 1)}><ChevronLeft size={16} /></button
          ><span>Bars {bars[0].index + 1}–{bars.at(-1)!.index + 1} of {measures.length}</span
          ><button
            type="button"
            aria-label="Next four bars"
            disabled={(page + 1) * 4 >= measures.length || busy}
            onclick={() => showPage(page + 1)}><ChevronRight size={16} /></button
          >
        </div>{/if}
    </div>
  {/if}
  {#if currentVariant}<p class="listen-for" aria-live="polite">
      {edits[editKey]
        ? 'Your edited version. Compare it with the other version or restore the example.'
        : currentVariant.description}
    </p>{/if}
  {#if !hasForm}
    <div class="transport">
      <button
        class="play"
        type="button"
        disabled={!ready || busy}
        onclick={() => (playing ? transport?.pause() : void run(() => transport?.play()))}
        >{#if playing}<Pause size={17} />Pause{:else}<Play size={17} />{busy
            ? 'Starting…'
            : 'Play'}{/if}</button
      >
      <button
        type="button"
        aria-label="Restart example"
        disabled={!ready || busy}
        onclick={() => void run(() => transport?.seek(0))}><RotateCcw size={17} /></button
      >
      <label class="loop"
        ><input
          type="checkbox"
          checked={loop}
          onchange={(event) => {
            loop = event.currentTarget.checked;
            void run(() => transport?.configure({ loop }));
          }}
        />Loop</label
      >
      {#if edits[editKey]}<button
          class="restore"
          type="button"
          disabled={!mounted || busy}
          onclick={restore}>Restore example</button
        >{/if}
    </div>
  {/if}
  {#if !hasForm && showPartControls && tracks.some((track) => !track.drum)}
    <div class="parts" role="group" aria-label="Audible parts">
      {#each tracks.filter((track) => !track.drum) as track (track.id)}<div class="part-instrument">
          <button
            type="button"
            class:enabled={parts.includes(track.id)}
            aria-pressed={parts.includes(track.id)}
            disabled={!mounted || busy}
            onclick={() => toggle(track.id)}
            ><span
              class="swatch"
              class:chord={track.id === 'chords' || track.id === 'accompaniment'}
            ></span>{track.label}
            {parts.includes(track.id) ? 'on' : 'off'}</button
          >
          {#if !track.drum}<div class="instrument">
              <label for={`${uid}-${track.id}-instrument`}>{track.label} instrument</label><select
                id={`${uid}-${track.id}-instrument`}
                value={instrumentation[track.id] ?? track.instrument ?? 'piano'}
                disabled={!mounted || busy}
                onchange={(event) =>
                  chooseInstrument(track.id, event.currentTarget.value as Instrument)}
                >{#each instruments as instrument (instrument.id)}<option value={instrument.id}
                    >{instrument.name}</option
                  >{/each}</select
              >
            </div>{/if}
        </div>{/each}
    </div>
    {#if tracks.filter((track) => !track.drum).every((track) => !parts.includes(track.id))}<p
        class="hint"
      >
        All parts are muted. Switch a part on to hear it.
      </p>{/if}
  {/if}
  {#if error}<p class="error" role="status">{error}</p>{/if}
  {#if !ready}<p class="hint">
      Playback needs JavaScript and browser audio support. You can read the complete musical
      examples in the article.
    </p>{/if}
  <footer>
    {#if example.source?.url}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- External artist attribution URL. -->
      <a href={example.source.url} target="_blank" rel="noreferrer">{example.source.label}</a>
    {:else}<span
        >{customExample
          ? 'Your local sketch'
          : (example.source?.label ?? 'Original course music')}</span
      >{/if}
    {#if tracks.some((track) => !track.drum && (instrumentation[track.id] ?? track.instrument ?? 'piano') === 'piano')}
      <span
        >Piano: <a
          href={asset('/audio/piano/salamander/ATTRIBUTION.txt')}
          target="_blank"
          rel="noreferrer">Salamander · Alexander Holm</a
        ></span
      >
    {/if}
  </footer>
  {#if example.notices?.length}<details class="import-notes">
      <summary>About this rendering</summary>{#each example.notices as notice (notice)}<p>
          {notice}
        </p>{/each}
    </details>{/if}
</section>

<style>
  .music-player {
    margin: 0 0 2.5rem;
    padding: 1.25rem;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--green-dark);
  }
  h2 {
    font-size: 1.45rem;
    line-height: 1.15;
    margin: 0.3rem 0 0;
    letter-spacing: -0.04em;
  }
  .setting {
    font-size: 0.75rem;
    font-weight: 600;
  }
  label {
    font-size: 0.75rem;
    font-weight: 600;
  }
  .example-select {
    display: grid;
    gap: 0.4rem;
  }
  select {
    font: inherit;
    color: inherit;
    background: var(--paper);
    border: 1px solid var(--ink);
    border-radius: 0;
    min-height: 44px;
    width: 100%;
    min-width: 0;
    padding: 0.6rem;
  }
  .description {
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0.75rem 0 1rem;
  }
  button {
    font: inherit;
    font-size: 0.76rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    padding: 0.5rem 0.7rem;
    min-width: 44px;
    min-height: 44px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button:hover:not(:disabled) {
    background: var(--mint);
  }
  .versions {
    display: flex;
    flex-wrap: wrap;
    margin: 1rem 0;
  }
  .versions button + button {
    margin-left: -1px;
  }
  .versions [aria-pressed='true'] {
    background: var(--mint);
    color: var(--green-dark);
    border-color: var(--green-dark);
    position: relative;
  }
  .letter {
    border: 1px solid currentColor;
    width: 16px;
    height: 18px;
    display: grid;
    place-items: center;
    font-size: 0.65rem;
  }
  .display-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0 0.7rem;
  }
  .views {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .views button {
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0.3rem 0;
    font-weight: 400;
    color: var(--muted);
  }
  .views [aria-pressed='true'] {
    border-bottom-color: var(--green-dark);
    color: var(--ink);
  }
  .position {
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
  }
  .musical-view {
    min-width: 0;
  }
  .comparison-notes {
    font-size: 0.75rem;
    line-height: 1.6;
    border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
    padding: 0 12px;
    margin: 10px 0;
  }
  .comparison-notes summary {
    cursor: pointer;
    padding: 10px 0;
    min-height: 44px;
    box-sizing: border-box;
  }
  .comparison-notes dl {
    margin: 0 0 12px;
  }
  .comparison-notes dt {
    font-weight: 750;
    margin-top: 8px;
  }
  .comparison-notes dd {
    margin: 2px 0 0;
  }
  .view-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.7rem;
    line-height: 1.4;
    color: var(--muted);
    margin: 0.5rem 0 1rem;
  }
  .pages {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .pages button {
    padding: 0.3rem;
  }
  .listen-for {
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--green-dark);
    margin: 0.75rem 0 1rem;
  }
  .transport {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 1rem 0;
    flex-wrap: wrap;
  }
  .play {
    background: var(--ink);
    color: var(--paper);
    min-width: 100px;
  }
  .play:hover:not(:disabled) {
    color: var(--ink);
  }
  .loop {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 0.35rem;
    padding: 0 0.35rem;
  }
  input {
    accent-color: var(--green-dark);
  }
  .restore {
    margin-left: auto;
  }
  .parts {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .part-instrument {
    display: flex;
    align-items: end;
    gap: 0.5rem;
    flex: 1 1 230px;
    max-width: 340px;
    min-width: 0;
  }
  .part-instrument:has(.instrument) {
    flex-basis: 260px;
  }
  .instrument {
    display: grid;
    gap: 0.3rem;
    flex: 1;
    min-width: 0;
  }
  .instrument label {
    font-size: 0.65rem;
    color: var(--muted);
  }
  .instrument select {
    font-size: 0.76rem;
  }
  .parts button {
    border-color: color-mix(in srgb, var(--ink) 25%, transparent);
    overflow-wrap: anywhere;
  }
  .parts button.enabled {
    border-color: var(--ink);
    background: var(--mint);
  }
  .swatch {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green-dark);
  }
  .swatch.chord {
    background: var(--ink);
  }
  .hint,
  footer {
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--muted);
  }
  .error {
    font-size: 0.82rem;
    line-height: 1.5;
    border-left: 3px solid var(--ink);
    padding-left: 0.7rem;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .import-notes {
    font-size: 0.75rem;
    line-height: 1.5;
    margin-top: 0.5rem;
  }
  .import-notes p {
    margin: 0.5rem 0;
  }
  @media (max-width: 500px) {
    .music-player {
      padding: 0.85rem;
    }
    h2 {
      font-size: 1.25rem;
    }
    .part-instrument {
      max-width: 100%;
    }
    .display-toolbar {
      gap: 0.3rem;
    }
    .views {
      gap: 0.65rem;
    }
  }
  @media (pointer: coarse) {
    select {
      font-size: 16px;
    }
  }

  .structured {
    border: 1px solid color-mix(in srgb, var(--ink) 18%, var(--paper));
    border-radius: var(--radius-panel);
    padding: 1.25rem;
  }
  .structured h2 {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .structured .setting {
    background: color-mix(in srgb, var(--ink) 4%, var(--paper));
    border-radius: 20px;
    padding: 0.4rem 0.65rem;
    font-weight: 400;
  }
  .structure-transport {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 1rem;
    flex-wrap: wrap;
  }
  .structure-transport button {
    border: 0;
    border-radius: var(--radius-control);
    min-width: 44px;
    padding: 0.5rem;
  }
  .structure-transport .play {
    background: var(--ink);
    color: var(--paper);
  }
  .structure-transport .loop-button[aria-pressed='true'] {
    background: var(--mint);
    color: var(--green-dark);
  }
  .structure-transport .position {
    margin-left: auto;
    color: var(--muted);
  }
  .recording-source {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    flex-wrap: wrap;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--ink) 4%, var(--paper));
    margin: 0 0 1rem;
    font-size: 0.74rem;
  }
  .recording-source > div {
    display: flex;
    gap: 0.25rem;
  }
  .recording-source button {
    font-size: 0.7rem;
    border: 0;
    border-radius: var(--radius-control);
    min-height: 36px;
    background: transparent;
    font-weight: 400;
  }
  .recording-source button[aria-pressed='true'] {
    background: var(--paper);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent);
  }
  .recording-label {
    color: var(--muted);
  }
  .official-recording {
    margin-top: 0.75rem;
  }
  .recording-frame {
    width: min(100%, 360px);
    margin-inline: auto;
    aspect-ratio: 16 / 9;
    min-height: 200px;
    background: color-mix(in srgb, var(--ink) 6%, var(--paper));
    border-radius: var(--radius-control);
    overflow: hidden;
    display: grid;
    place-items: center;
  }
  .recording-frame:empty::before {
    content: 'Official recording · YouTube';
    color: var(--muted);
    font-size: 0.8rem;
  }
  .recording-frame :global(iframe) {
    width: 100%;
    height: 100%;
    min-height: 200px;
    border: 0;
  }
  .official-recording p {
    font-size: 0.7rem;
    color: var(--muted);
    line-height: 1.5;
  }
  @media (max-width: 480px) {
    .structured {
      padding: 0.9rem;
    }
    .structure-transport .position {
      font-size: 0.66rem;
    }
  }
</style>
