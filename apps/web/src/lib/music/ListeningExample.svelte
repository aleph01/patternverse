<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Recording links are curated external YouTube URLs, not application routes. */
  import { onMount, untrack } from 'svelte';
  import { Headphones, ExternalLink, Play, RotateCcw, X } from '@lucide/svelte';
  import { listeningVideo, recordingLink, passageTime, type ListeningStudy } from './listening';
  import { mountListeningPlayer } from './listening-player';
  import type { VideoPlayer } from '$lib/pattern-run/video';
  import { claimMusicPlayback, releaseMusicPlayback, stopMusicPlayback } from './playback-focus';

  let { study }: { study: ListeningStudy } = $props();
  const uid = $props.id();
  let versionId = $state(untrack(() => study.versions[0].id));
  let passageId = $state(untrack(() => study.versions[0].passages[0]?.id ?? 'whole'));
  let ready = $state(false);
  let loaded = $state(false);
  let playerReady = $state(false);
  let loadId = $state(0);
  let host = $state<HTMLDivElement>();
  let error = $state('');
  let player: VideoPlayer | undefined;
  const recording = $derived(
    study.versions.find((version) => version.id === versionId) ?? study.versions[0],
  );
  const passage = $derived(recording.passages.find((item) => item.id === passageId));
  const video = $derived(listeningVideo(study, recording, passage));

  function closePlayer() {
    player?.destroy();
    player = undefined;
    loaded = false;
    playerReady = false;
    releaseMusicPlayback(closePlayer);
  }
  $effect(() => {
    const config = video;
    const element = host;
    const requested = loaded;
    void loadId;
    if (!element || !requested) return;
    playerReady = false;
    error = '';
    const mounted = mountListeningPlayer(
      element,
      config,
      () => !document.hidden && !error,
      () => {
        playerReady = true;
      },
      (message) => {
        error = message;
      },
    );
    player = mounted;
    return () => {
      mounted.destroy();
      if (player === mounted) player = undefined;
    };
  });
  onMount(() => {
    ready = true;
    const hide = () => {
      if (document.hidden) closePlayer();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', closePlayer);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', closePlayer);
      closePlayer();
    };
  });
  function loadPlayer() {
    if (!ready) return;
    claimMusicPlayback(closePlayer);
    error = '';
    playerReady = false;
    loadId += 1;
    loaded = true;
  }
  function chooseVersion(id: string) {
    if (id === versionId) return;
    stopMusicPlayback();
    versionId = id;
    passageId = study.versions.find((item) => item.id === id)?.passages[0]?.id ?? 'whole';
    error = '';
  }
  function choosePassage(id: string) {
    if (id === passageId) return;
    const wasLoaded = loaded;
    stopMusicPlayback();
    passageId = id;
    error = '';
    if (wasLoaded) loadPlayer();
  }
  function replay() {
    if (!playerReady || error) return;
    player?.seek(video.start_seconds);
    player?.play();
  }
</script>

<section class="listening-example" aria-labelledby={`${uid}-title`} data-study={study.id}>
  <header>
    <span class="eyebrow"><Headphones size={15} strokeWidth={1.7} /> Listen in context</span>
    <h2 id={`${uid}-title`}>{study.title}</h2>
    <p class="recording">{study.artist} · {recording.release} · {recording.year}</p>
  </header>
  <div class="listening-note">
    <strong>Listen for</strong>
    <p>{study.listen_for}</p>
  </div>
  {#if study.versions.length > 1}
    <div class="versions" role="group" aria-label={`${study.title} recording version`}>
      {#each study.versions as version (version.id)}
        <button
          type="button"
          aria-pressed={version.id === recording.id}
          disabled={!ready}
          onclick={() => chooseVersion(version.id)}>{version.label}</button
        >
      {/each}
    </div>
  {/if}
  <div class="passages" role="group" aria-label={`${study.title} listening passage`}>
    {#each recording.passages as item (item.id)}
      <button
        type="button"
        aria-pressed={passage?.id === item.id}
        disabled={!ready}
        onclick={() => choosePassage(item.id)}>{item.label} <span>{passageTime(item)}</span></button
      >
    {/each}
    <button
      type="button"
      aria-pressed={!passage}
      disabled={!ready}
      onclick={() => choosePassage('whole')}>Whole recording</button
    >
  </div>
  {#if passage}
    <p class="passage-cue">{passage.listen_for}</p>
    <p class="timing-note">
      Playback is set to {passageTime(passage)}. YouTube timing is approximate. The external link
      starts here but continues beyond the passage.
    </p>
  {/if}
  <div class="actions">
    {#if !loaded || error}
      <button class="primary" type="button" disabled={!ready} onclick={loadPlayer}>
        <Play size={14} />
        {error ? 'Retry YouTube player' : 'Load YouTube player'}
      </button>
    {:else}
      <button class="primary" type="button" disabled={!playerReady} onclick={replay}>
        <RotateCcw size={14} />
        {passage ? 'Play / replay passage' : 'Play / restart recording'}
      </button>
    {/if}
    <a
      class="quiet"
      href={recordingLink(recording, passage)}
      target="_blank"
      rel="noopener noreferrer"
      onclick={stopMusicPlayback}>Open on YouTube <ExternalLink size={13} /></a
    >
    {#if loaded}<button class="quiet" type="button" onclick={closePlayer}
        ><X size={14} /> Close player</button
      >{/if}
  </div>
  <p class="provider-note">
    YouTube may show ads or restrict playback. The video loads only when you request it.
  </p>
  {#if loaded}
    <div class="provider-player" bind:this={host}></div>
    {#if !playerReady && !error}<p class="feedback" role="status">Loading YouTube player…</p>{/if}
    {#if playerReady && !error}<p class="feedback">
        Press play in the video or use the replay button above.
      </p>{/if}
  {/if}
  {#if error}<p class="player-error" role="alert">
      {error} Use “Open on YouTube” to try the recording there.
    </p>{/if}
  <details class="study-notes">
    <summary>About this comparison</summary>
    <p>{study.perspective}</p>
    <p><strong>Original comparison.</strong> {study.original_comparison}</p>
  </details>
  <noscript
    ><p>
      Video controls need JavaScript. The YouTube link and written listening cues remain available.
    </p></noscript
  >
</section>

<style>
  .listening-example {
    margin: 1.5rem 0;
    padding: 1.35rem;
    border: 1px solid var(--border, #ddd);
    border-top: 3px solid var(--green-dark);
    border-radius: 6px;
    background: var(--paper);
    color: var(--ink);
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--green-dark);
    font-size: 0.73rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0.6rem 0 0.25rem;
    font-size: 1.4rem;
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  p {
    margin: 0;
  }
  .recording,
  .provider-note {
    font-size: 0.82rem;
    color: var(--ink-muted);
  }
  .listening-note {
    margin: 1.2rem 0;
    padding-left: 0.85rem;
    border-left: 2px solid var(--green-dark);
    font-size: 0.87rem;
  }
  .listening-note strong {
    display: block;
    margin-bottom: 0.2rem;
    font-weight: 600;
  }
  .listening-note p {
    color: var(--ink-muted);
  }
  button,
  a {
    font: inherit;
  }
  button {
    cursor: pointer;
    color: inherit;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .versions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.2rem;
    border-bottom: 1px solid var(--border, #ddd);
  }
  .versions button {
    padding: 0.2rem 0 0.65rem;
    min-height: 44px;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    font-size: 0.8rem;
    color: var(--ink-muted);
  }
  .versions button[aria-pressed='true'] {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
  .passages {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .passages button {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem 0.5rem;
    min-height: 44px;
    padding: 0.5rem 0.7rem;
    font-size: 0.8rem;
    border: 1px solid var(--border, #ddd);
    border-radius: 4px;
    background: transparent;
    text-align: left;
  }
  .passages button[aria-pressed='true'] {
    color: var(--green-dark);
    border-color: var(--green-dark);
    background: color-mix(in srgb, var(--green-dark) 7%, var(--paper));
  }
  .passages span {
    font-variant-numeric: tabular-nums;
  }
  .passage-cue {
    margin-top: 0.8rem;
    font-size: 0.85rem;
    color: var(--ink-muted);
  }
  .timing-note,
  .feedback {
    margin-top: 0.45rem;
    font-size: 0.73rem;
    color: var(--ink-muted);
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem 1rem;
    margin-top: 1rem;
  }
  .primary,
  .quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    text-decoration: none;
    min-height: 44px;
  }
  .primary {
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--ink);
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 600;
  }
  .quiet {
    padding: 0.3rem 0;
    border: 0;
    background: none;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .provider-note {
    margin-top: 0.6rem;
    font-size: 0.73rem;
  }
  .provider-player {
    margin-top: 1rem;
  }
  .provider-player :global(iframe) {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    min-height: 200px;
    border: 0;
    border-radius: 4px;
    background: #111;
  }
  .player-error {
    margin-top: 0.8rem;
    padding-left: 0.8rem;
    border-left: 2px solid var(--ink-muted);
    font-size: 0.83rem;
  }
  .study-notes {
    margin-top: 1.1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border, #ddd);
    font-size: 0.83rem;
  }
  .study-notes summary {
    cursor: pointer;
  }
  .study-notes p {
    margin-top: 0.65rem;
    color: var(--ink-muted);
  }
  .study-notes strong {
    font-weight: 600;
  }
  @media (max-width: 480px) {
    .listening-example {
      padding: 1rem;
    }
  }
</style>
