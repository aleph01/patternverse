<script lang="ts">
  import { onMount } from 'svelte';
  import MusicPlayer from '../../lib/music/MusicPlayer.svelte';
  import { importMidi } from '../../lib/music/midi';
  import type { MusicExample } from '../../lib/music/model';
  import type { RepertoireEntry } from './catalog';
  import { repertoireExcerpt } from './excerpt';
  import { compositionExamples } from '../../lib/music/composition-examples';
  import { chordStudies } from './chord-studies';
  import { songStudy, recordingStudy } from '../../lib/music/song-study';
  import { getLuckyStudy } from './get-lucky-study';
  import ChordEditor from '../../lib/music/ChordEditor.svelte';

  let examples = $state<MusicExample[]>([]);
  let realStudy = $state<MusicExample>();
  let fullSongStudy = $state<MusicExample>();
  let noSurprises = $state<MusicExample>();
  let familiarStudy = $state<MusicExample>();
  let songbookStudies = $state<MusicExample[]>([]);
  let songbookErrors = $state<string[]>([]);
  let structureSelection = $state(songStudy.id);
  let entries = $state<RepertoireEntry[]>([]);
  let loading = $state(true);
  let errors = $state<string[]>([]);
  let library = $state<'songs' | 'comparisons' | 'chords' | 'structure'>('structure');
  let live = true;

  async function load() {
    loading = true;
    errors = [];
    try {
      const response = await fetch('/repertoire/catalog.json');
      if (!response.ok) throw new Error('The example list could not load.');
      const catalog: RepertoireEntry[] = await response.json();
      const results = await Promise.allSettled(
        catalog.map(async (entry) => {
          const response = await fetch(`/repertoire/${entry.id}.mid`);
          if (!response.ok) throw new Error(`${entry.title} could not load.`);
          const example = repertoireExcerpt(
            importMidi(await response.arrayBuffer(), entry.file),
            entry,
          );
          return { entry, example };
        }),
      );
      if (!live) return;
      const loaded = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      examples = loaded.map((item) => item.example);
      entries = loaded.map((item) => item.entry);
      errors = results.flatMap((result, i) =>
        result.status === 'rejected' ? [`${catalog[i].title} could not load. Try again.`] : [],
      );
      if (!examples.length && !errors.length) errors = ['No local MIDI examples are available.'];
    } catch {
      if (live)
        errors = ['The examples could not load. Check the local demo server and try again.'];
    } finally {
      if (live) loading = false;
    }
  }
  onMount(() => {
    void fetch('/song-studies/songbook.json')
      .then(async (response) => {
        if (!response.ok) return;
        const catalog: { entries: { id: string; title: string; url: string }[] } =
          await response.json();
        const results = await Promise.allSettled(
          catalog.entries.map(async (entry) => {
            const response = await fetch(entry.url);
            if (!response.ok) throw new Error(entry.title);
            return (await response.json()) as MusicExample;
          }),
        );
        if (!live) return;
        songbookStudies = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );
        songbookErrors = results.flatMap((result, i) =>
          result.status === 'rejected' ? [`${catalog.entries[i].title} could not load.`] : [],
        );
        const requested = new URL(location.href).searchParams.get('study');
        if (songbookStudies.some((study) => study.id === requested))
          structureSelection = requested!;
      })
      .catch(() => {
        if (live) songbookErrors = ['The local songbook could not load.'];
      });
    void fetch('/song-studies/no-surprises.json')
      .then(async (response) => {
        if (!response.ok) return;
        const study: MusicExample = await response.json();
        if (!live) return;
        noSurprises = study;
        if (new URL(location.href).searchParams.get('study') === study.id)
          structureSelection = study.id;
      })
      .catch(() => {});
    void fetch('/song-studies/seven-nation-army.json')
      .then(async (response) => {
        if (!response.ok) return;
        const study: MusicExample = await response.json();
        if (!live) return;
        fullSongStudy = study;
        if (new URL(location.href).searchParams.get('study') === study.id)
          structureSelection = study.id;
      })
      .catch(() => {});
    void fetch('/song-studies/code-monkey.json')
      .then(async (response) => {
        if (!response.ok) return;
        const study: MusicExample = await response.json();
        if (!live) return;
        realStudy = study;
        // A direct link opens the real song without changing the existing demo's default.
        if (new URL(location.href).searchParams.get('study') === study.id)
          structureSelection = study.id;
      })
      .catch(() => {});
    void fetch('/repertoire/daft-get-lucky.mid')
      .then(async (response) => {
        if (!response.ok) return;
        const study = getLuckyStudy(importMidi(await response.arrayBuffer(), 'Get Lucky.mid'));
        if (!live) return;
        familiarStudy = study;
        if (new URL(location.href).searchParams.get('study') === study.id)
          structureSelection = study.id;
      })
      .catch(() => {});
    void load();
    return () => {
      live = false;
    };
  });
</script>

<div class="demo">
  <nav aria-label="Demo context">
    <span class="brand">patternverse</span><span>Music · local demo</span>
  </nav>
  <main>
    <header class="intro">
      <p class="eyebrow">Patterns you can hear</p>
      <h1>Hear the pattern.</h1>
      <p class="lead">Pick a passage. Follow its parts. Hear how the music fits together.</p>
      <div class="tags" aria-label="Demo features">
        <span>{loading ? 'Loading excerpts' : `${examples.length} song excerpts`}</span>
        <span>{compositionExamples.length} A/B comparisons</span>
        <span>Sampled piano</span><span>Local playback</span>
      </div>
    </header>
    {#if loading && library === 'songs'}
      <p class="loading" role="status">Preparing the musical examples…</p>
    {:else}
      <div class="libraries" role="group" aria-label="Example library">
        <button
          type="button"
          aria-pressed={library === 'structure'}
          onclick={() => (library = 'structure')}>Song structure</button
        >
        <button type="button" aria-pressed={library === 'songs'} onclick={() => (library = 'songs')}
          >Song excerpts ({examples.length})</button
        >
        <button
          type="button"
          aria-pressed={library === 'comparisons'}
          onclick={() => (library = 'comparisons')}
          >Pattern comparisons ({compositionExamples.length})</button
        >
        <button
          type="button"
          aria-pressed={library === 'chords'}
          onclick={() => (library = 'chords')}>Chord studies ({chordStudies.length})</button
        >
      </div>
      {#key `${library}:${structureSelection}`}
        <MusicPlayer
          examples={library === 'structure'
            ? [
                songStudy,
                recordingStudy,
                ...(realStudy ? [realStudy] : []),
                ...(fullSongStudy ? [fullSongStudy] : []),
                ...(noSurprises ? [noSurprises] : []),
                ...(familiarStudy && structureSelection === familiarStudy.id
                  ? [familiarStudy]
                  : []),
                ...songbookStudies,
              ]
            : library === 'songs'
              ? examples
              : library === 'chords'
                ? chordStudies
                : compositionExamples}
          initial={library === 'structure'
            ? structureSelection
            : library === 'songs'
              ? (examples.find((example) => example.id === 'sinatra-fly-me-to-the-moon')?.id ??
                examples[0].id)
              : library === 'chords'
                ? chordStudies[0].id
                : compositionExamples[0].id}
          allowEditing={library === 'comparisons'}
          showPartControls={false}
          rollHeight={320}
        />
      {/key}
      {#if library === 'chords'}<ChordEditor />{/if}
      {#if library === 'structure' && songbookStudies.length}
        <p class="songbook-status" role="status">
          {songbookStudies.length + (fullSongStudy ? 1 : 0) + (noSurprises ? 1 : 0)} MIDI arrangements.
          New section maps are working drafts; source-marker maps are identified in each study. Holocene
          and Happier Than Ever are pending a usable full MIDI.
        </p>
      {/if}
      {#if library === 'structure' && songbookErrors.length}
        <div class="load-error" role="status">
          {#each songbookErrors as error (error)}<p>{error}</p>{/each}
        </div>
      {/if}
    {/if}
    {#if errors.length}
      <div class="load-error" role="status">
        {#each errors as error (error)}<p>{error}</p>{/each}
        <button type="button" disabled={loading} onclick={() => void load()}>Try again</button>
      </div>
    {/if}
    <section class="pilot-links" aria-label="Guided lesson pilot">
      <h2>Try the guided lessons</h2>
      <p>
        Start with the general idea, then open a song study with listening, isolation and a musical
        variation.
      </p>
      <div>
        <a
          href="http://127.0.0.1:5198/pattern/songwriting-pitch-and-intervals"
          target="_blank"
          rel="noreferrer">Lean on Me · melodic distances ↗</a
        >
        <a
          href="http://127.0.0.1:5198/pattern/songwriting-borrow-a-chord"
          target="_blank"
          rel="noreferrer">No Surprises · borrowed chord ↗</a
        >
        <a
          href="http://127.0.0.1:5198/pattern/songwriting-syncopation-and-anticipation"
          target="_blank"
          rel="noreferrer">Superstition · syncopation ↗</a
        >
      </div>
    </section>
    <section class="how" aria-label="Ways to listen">
      <div>
        <span class="step">01</span>
        <h2>Find the relationship</h2>
        <p>Read the listening cue, then play the passage. Loop it to hear what repeats.</p>
      </div>
      <div>
        <span class="step">02</span>
        <h2>Follow a part</h2>
        <p>
          Each passage comes with its parts preselected. Follow the bass, melody or chord movement
          named in the listening cue.
        </p>
      </div>
      <div>
        <span class="step">03</span>
        <h2>Change your view</h2>
        <p>Use the piano roll or notation. Drum examples also have a beat grid.</p>
      </div>
    </section>
    <details class="coverage">
      <summary>Which lessons do these examples cover?</summary>
      <div class="coverage-scroll">
        <table>
          <thead
            ><tr
              ><th scope="col">Example</th><th scope="col">Listen for</th><th scope="col"
                >Related lessons</th
              ></tr
            ></thead
          >
          <tbody
            >{#each entries as entry (entry.id)}<tr
                ><th scope="row">{entry.title}</th><td>{entry.focus}</td><td
                  >{entry.lessons?.map((lesson) => lesson.title).join('; ')}</td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div>
    </details>
    <details class="sources">
      <summary>About these excerpts & sources</summary>
      <p>
        These are working MIDI excerpts for reviewing the player. They are not the original
        recordings. Timing and pitches come from the source files; notation is an automatic reading
        guide. Parts, passage boundaries and the stated relationship have been checked in the MIDI
        data. Full score/recording fidelity still needs editorial review.
      </p>
      {#each entries as entry (entry.id)}
        <article>
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- External catalog URL in a standalone Vite demo. -->
          <h3><a href={entry.source} target="_blank" rel="noreferrer">{entry.title} ↗</a></h3>
          <p>{entry.passage} · {entry.credit}. {entry.terms}.</p>
          {#if entry.terms.includes('ShareAlike')}<p>
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noreferrer">CC BY-SA 3.0</a
              >. Adapted here by trimming the passage and naming its parts; no notes are transposed
              or quantized.
            </p>{/if}
          {#if entry.note}<p>{entry.note}</p>{/if}
        </article>
      {/each}
    </details>
    <p class="next">
      Still being prepared: <strong>Videotape — Bonnaroo 2006</strong>. Its exact piano-and-beat
      relationship needs a checked transcription of that performance.
    </p>
  </main>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    min-width: 320px;
    background: #f5f6f1;
    color: var(--ink);
    font-family: var(--font-sans);
  }
  :global(button:focus-visible),
  :global(a:focus-visible),
  :global(select:focus-visible),
  :global(input:focus-visible),
  :global(summary:focus-visible) {
    outline: 3px solid var(--focus-color);
    outline-offset: 3px;
  }
  .demo {
    max-width: 1120px;
    margin: auto;
    padding: 0 40px 48px;
  }
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 26px 0;
    border-bottom: 1px solid #d6d9d0;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .brand {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.05em;
    color: var(--ink);
  }
  main {
    max-width: 900px;
    margin: auto;
  }
  .intro {
    padding: 48px 0 26px;
  }
  .eyebrow {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--green-dark);
  }
  h1 {
    font-size: clamp(2.5rem, 7vw, 4rem);
    line-height: 1.05;
    letter-spacing: -0.065em;
    margin: 12px 0 16px;
  }
  .lead {
    color: var(--muted);
    line-height: 1.6;
    font-size: 1rem;
    margin: 0 0 20px;
  }
  .tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tags span {
    font-size: 0.68rem;
    border: 1px solid #cfd6c9;
    padding: 6px 9px;
    background: #eef2e9;
  }
  .libraries {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 0 0 12px;
  }
  .libraries button {
    min-height: 44px;
    padding: 8px 14px;
    font: inherit;
    font-size: 0.78rem;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid #bbc5b7;
    cursor: pointer;
  }
  .libraries button[aria-pressed='true'] {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
  }
  .coverage {
    border-top: 1px solid #cfd6c9;
    padding: 20px 0;
  }
  .coverage summary {
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 700;
    min-height: 24px;
  }
  .coverage-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 620px;
    margin-top: 16px;
    font-size: 0.75rem;
    line-height: 1.6;
    text-align: left;
  }
  th,
  td {
    padding: 12px 12px 12px 0;
    border-bottom: 1px solid #d6d9d0;
    vertical-align: top;
  }
  tbody th {
    width: 29%;
    font-weight: 600;
  }
  td {
    color: var(--muted);
  }
  .loading,
  .load-error {
    background: var(--paper);
    padding: 24px;
    border: 1px solid #cfd6c9;
    line-height: 1.6;
  }
  .songbook-status {
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.65;
    margin: 16px 0;
  }
  .load-error button {
    min-height: 44px;
    padding: 8px 16px;
    font: inherit;
    border: 1px solid var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .how {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 28px;
    margin: 32px 0;
  }
  .pilot-links {
    margin: 1.5rem 0;
    padding: 1.2rem;
    background: var(--mint);
  }
  .pilot-links h2 {
    font-size: 1rem;
    margin: 0 0 0.4rem;
  }
  .pilot-links p {
    font-size: 0.82rem;
    line-height: 1.6;
    margin: 0 0 0.8rem;
  }
  .pilot-links div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }
  .pilot-links a {
    font-size: 0.78rem;
    line-height: 1.5;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .step {
    color: var(--green-dark);
    font-size: 0.7rem;
    font-weight: 800;
  }
  .how h2 {
    font-size: 0.88rem;
    margin: 10px 0 8px;
    letter-spacing: -0.02em;
  }
  .how p,
  .sources p,
  .next {
    font-size: 0.78rem;
    line-height: 1.65;
    color: var(--muted);
    margin: 0;
  }
  .sources {
    padding: 20px 0;
    border-top: 1px solid #cfd6c9;
    border-bottom: 1px solid #cfd6c9;
  }
  .sources summary {
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 700;
    min-height: 24px;
  }
  .sources > p {
    margin-top: 16px;
  }
  .sources article {
    margin: 20px 0 0;
  }
  .sources h3 {
    font-size: 0.8rem;
    margin: 0 0 6px;
  }
  a {
    color: var(--green-dark);
    text-underline-offset: 3px;
  }
  .next {
    margin-top: 20px;
  }
  @media (max-width: 600px) {
    .demo {
      padding: 0 16px 32px;
    }
    nav {
      padding: 20px 0;
    }
    .intro {
      padding-top: 32px;
    }
    .how {
      grid-template-columns: 1fr;
      gap: 20px;
    }
  }
</style>
