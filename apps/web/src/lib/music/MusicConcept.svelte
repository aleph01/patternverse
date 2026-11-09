<script lang="ts">
  import { onMount } from 'svelte';
  import { Play, Pause } from '@lucide/svelte';
  import { createTransport } from './transport';
  import type { MusicConcept } from './concepts';
  let { concept }: { concept: MusicConcept } = $props();
  const uid = $props.id();
  let selection = $state(0);
  const option = $derived(concept.options[selection]);
  let mounted = $state(false),
    busy = $state(false),
    playing = $state(false);
  let beat = $state(0),
    error = $state('');
  let transport: ReturnType<typeof createTransport> | undefined;
  const y = (midi: number) => 184 - (midi - 58) * 15;
  const positions = [84, 260, 436];
  const label = (pitch: string) => pitch.replace(/\d/g, '').replace('#', '♯').replace('b', '♭');
  function stop() {
    transport?.dispose();
    transport = undefined;
    playing = false;
    beat = 0;
  }
  function choose(index: number) {
    stop();
    error = '';
    selection = index;
  }
  async function play() {
    if (playing) {
      transport?.pause();
      return;
    }
    busy = true;
    error = '';
    try {
      stop();
      transport = createTransport(option.example, (state) => {
        playing = state.playing;
        beat = state.beat;
      });
      await transport.play();
    } catch (cause) {
      error =
        cause instanceof Error && cause.name === 'PianoSampleError'
          ? cause.message
          : 'Sound could not start. You can still explore the diagram.';
    } finally {
      busy = false;
    }
  }
  onMount(() => {
    mounted = typeof AudioContext !== 'undefined';
    const hide = () => {
      if (document.hidden) transport?.pause();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', hide);
    };
  });
</script>

<section class="music-concept" aria-labelledby={`${uid}-title`}>
  <p class="eyebrow">{concept.category} · start with the idea</p>
  <h2 id={`${uid}-title`}>{concept.title}</h2>
  <p class="idea">{concept.idea}</p>
  <p class="vocabulary">{concept.vocabulary}</p>
  <div class="options" role="group" aria-label="Concept comparisons">
    {#each concept.options as item, i (item.example.id)}
      <button type="button" aria-pressed={selection === i} onclick={() => choose(i)}
        >{item.label}</button
      >
    {/each}
  </div>
  <figure>
    {#if concept.kind === 'intervals'}
      <svg viewBox="0 0 520 240" role="img" aria-label={`Pitch distances: ${option.explanation}`}>
        <title>Pitch distances, with higher notes placed higher</title>
        {#each [58, 59, 60, 61, 62, 63, 64, 65, 66] as pitch (pitch)}
          <line class="guide" x1="35" x2="485" y1={y(pitch)} y2={y(pitch)} />
        {/each}
        {#each option.example.notes.slice(0, -1) as note, i (i)}
          {@const next = option.example.notes[i + 1]}
          <line
            class="connection"
            x1={positions[i]}
            y1={y(note.midi)}
            x2={positions[i + 1]}
            y2={y(next.midi)}
          />
          <rect
            class="distance-bg"
            x={positions[i] + 58}
            y={(y(note.midi) + y(next.midi)) / 2 - 12}
            width="62"
            height="24"
          />
          <text class="distance" x={positions[i] + 89} y={(y(note.midi) + y(next.midi)) / 2 + 5}
            >+{next.midi - note.midi}</text
          >
        {/each}
        {#each option.example.notes as note, i (i)}
          <circle
            class="note"
            class:sounding={playing && beat >= note.start && beat < note.start + note.duration}
            cx={positions[i]}
            cy={y(note.midi)}
            r="17"
          />
          <text class="pitch" x={positions[i]} y={y(note.midi) + 39}>{label(note.pitch)}</text>
          <text class="order" x={positions[i]} y="227">{i + 1}</text>
        {/each}
        <text class="axis" x="260" y="20">Higher pitch ↑ · read from left to right</text>
      </svg>
    {:else if concept.kind === 'borrowing'}
      <svg viewBox="0 0 520 240" role="img" aria-label={`Chord tones: ${option.explanation}`}>
        <title>One chord tone changes, while the other two stay fixed</title>
        <line class="connection" x1="130" x2="130" y1={y(58)} y2={y(65)} />
        {#each option.example.notes as note, i (i)}
          <line class="guide" x1="155" x2="450" y1={y(note.midi)} y2={y(note.midi)} />
          <circle class="note" class:changed={i === 1} cx="130" cy={y(note.midi)} r="18" />
          <text class="chord-pitch" x="185" y={y(note.midi) + 6}>{label(note.pitch)}</text>
          <text class="role" x="260" y={y(note.midi) + 6}
            >{i === 0
              ? 'Root · stays'
              : i === 2
                ? 'Top note · stays'
                : selection === 0
                  ? 'Middle note · D'
                  : 'Middle note · D lowered to D♭'}</text
          >
        {/each}
        <text class="axis" x="260" y="225">Same root · one changed note · different colour</text>
      </svg>
    {:else}
      <svg viewBox="0 0 520 230" role="img" aria-label={`Beat placement: ${option.explanation}`}>
        <title>Compare the moved kick with an unchanged steady pulse</title>
        <text class="row-label" x="12" y="104">Pulse</text>
        <text class="row-label" x="12" y="174">Kick</text>
        {#each ['1', '&', '2', '&', '3', '&', '4', '&'] as count, i (i)}
          {@const x = 100 + i * 55}
          <line class="guide" x1={x} x2={x} y1="64" y2="193" />
          <text class="count" {x} y="48">{count}</text>
          {#if i % 2 === 0}<circle class="pulse" cx={x} cy="100" r="8" />{/if}
          {#if i === 0 || i === (selection === 0 ? 4 : 5)}<circle
              class="note"
              class:sounding={playing && beat >= i / 2 && beat < i / 2 + 0.25}
              cx={x}
              cy="170"
              r="15"
            />{/if}
        {/each}
        <text class="axis" x="290" y="221">The count keeps going through the gaps</text>
      </svg>
    {/if}
    <figcaption aria-live="polite">{option.explanation}</figcaption>
  </figure>
  <button
    class="listen"
    type="button"
    disabled={!mounted || busy}
    onclick={play}
    data-playback={playing ? 'playing' : 'paused'}
  >
    {#if playing}<Pause size={16} />Pause{:else}<Play size={16} />{busy
        ? 'Preparing sound…'
        : 'Hear this sketch'}{/if}
  </button>
  <span class="sketch">Original {concept.kind === 'syncopation' ? 'drum' : 'piano'} sketch</span>
  {#if error}<p class="error" role="status">{error}</p>{/if}
  <p class="takeaway">{concept.takeaway}</p>
</section>

<style>
  .music-concept {
    min-width: 0;
    font-family: var(--font-sans);
  }
  .eyebrow {
    color: var(--green-dark);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0.4rem 0 1rem;
    font-size: clamp(1.4rem, 4vw, 1.9rem);
    line-height: 1.2;
    letter-spacing: -0.035em;
  }
  .idea {
    font-size: 1rem;
    line-height: 1.65;
  }
  .vocabulary,
  .takeaway {
    font-size: 0.85rem;
    line-height: 1.65;
  }
  .vocabulary {
    color: var(--ink-muted);
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 1.25rem 0 0;
  }
  button {
    min-height: 44px;
    padding: 9px 13px;
    font: inherit;
    font-size: 0.78rem;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid #bbc5b7;
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  figure {
    margin: 0.75rem 0 1rem;
    padding: 0.75rem;
    background: var(--mint);
    border: 1px solid #b5cfc0;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  svg text {
    fill: var(--ink);
    font-family: var(--font-sans);
  }
  .guide {
    stroke: var(--green-dark);
    opacity: 0.15;
  }
  .connection {
    stroke: var(--green-dark);
    stroke-width: 2;
  }
  .note {
    fill: var(--green-dark);
    stroke: var(--paper);
    stroke-width: 3;
  }
  .note.changed {
    fill: var(--ink);
  }
  .note.sounding {
    fill: var(--ink);
    stroke: var(--green);
    stroke-width: 6;
  }
  .distance-bg {
    fill: var(--mint);
  }
  .distance {
    font-size: 18px;
    font-weight: 700;
    text-anchor: middle;
  }
  .pitch,
  .count {
    font-size: 18px;
    font-weight: 700;
    text-anchor: middle;
  }
  .chord-pitch {
    font-size: 20px;
    font-weight: 700;
  }
  .role,
  .row-label {
    font-size: 14px;
  }
  .axis,
  .order {
    font-size: 12px;
    text-anchor: middle;
    fill: var(--green-dark);
  }
  .pulse {
    fill: var(--ink);
  }
  figcaption {
    border-top: 1px solid #b5cfc0;
    padding: 0.75rem 0.25rem 0.25rem;
    font-size: 0.85rem;
    line-height: 1.6;
  }
  .listen {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    background: var(--ink);
    color: var(--paper);
  }
  .sketch {
    margin-left: 0.6rem;
    font-size: 0.7rem;
    color: var(--ink-muted);
  }
  .takeaway {
    margin: 1.25rem 0 0;
  }
  .error {
    font-size: 0.8rem;
    color: #9b2525;
  }
  @media (max-width: 450px) {
    figure {
      padding: 0.35rem;
    }
    .sketch {
      display: block;
      margin: 0.5rem 0;
    }
    .options button {
      flex: 1 1 45%;
    }
  }
</style>
