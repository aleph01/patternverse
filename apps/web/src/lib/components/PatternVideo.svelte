<script lang="ts">
  import { checkVideoDuration, clipPosition, type PatternVideo } from '$lib/pattern-run/video';
  import { mountVideoPlayer } from '$lib/pattern-run/video-player';
  import { onDestroy } from 'svelte';
  import PracticeMarkdownPreview from './PracticeMarkdownPreview.svelte';
  let {
    video,
    markdown = '',
    runningAllowed = true,
  }: {
    video: PatternVideo;
    markdown?: string;
    runningAllowed?: boolean;
  } = $props();
  let host = $state<HTMLDivElement>();
  let native = $state<HTMLVideoElement>();
  let error = $state('');
  let player = $state<ReturnType<typeof mountVideoPlayer>>();
  let boundaryBusy = false;
  onDestroy(() => native?.pause());
  $effect(() => {
    const config = video;
    error = '';
    if (!host || config.provider === 'file') return;
    const mounted = mountVideoPlayer(
      host,
      config,
      () => runningAllowed && !error,
      (message) => {
        error = message;
      },
      import.meta.env.VITE_DAILYMOTION_PLAYER_ID ?? '',
    );
    player = mounted;
    return () => {
      mounted.destroy();
      player = undefined;
    };
  });
  $effect(() => {
    if (!runningAllowed || error) {
      native?.pause();
      player?.pause();
    }
  });
  function metadata() {
    if (!native) return;
    try {
      checkVideoDuration(video, native.duration);
      native.currentTime = video.start_seconds;
    } catch (cause) {
      error = (cause as Error).message;
      native.pause();
    }
  }
  function position(ended = false) {
    if (!native || boundaryBusy) return;
    if (!runningAllowed || error) {
      native.pause();
      return;
    }
    const boundary = ended ? 'end' : clipPosition(video, native.currentTime);
    if (!boundary) return;
    boundaryBusy = true;
    if (boundary === 'end') native.pause();
    native.currentTime = video.start_seconds;
    if (boundary === 'end' && video.loop_video) void native.play().catch(() => {});
    boundaryBusy = false;
  }
</script>

<section class="pattern-video" aria-label={video.title ?? 'Video'}>
  {#if video.title}<h3>{video.title}</h3>{/if}
  <div class="player">
    {#if video.provider === 'file'}
      <video
        bind:this={native}
        src={video.url}
        controls
        playsinline
        muted={video.muted}
        autoplay={video.autoplay && runningAllowed}
        preload="metadata"
        aria-label={video.title ?? 'Video'}
        onloadedmetadata={metadata}
        ontimeupdate={() => position()}
        onplay={() => position()}
        onseeking={() => position()}
        onended={() => position(true)}
        onerror={() => {
          error = 'Could not load this video.';
        }}
      >
      </video>
    {:else}<div class="provider-player" bind:this={host}></div>{/if}
  </div>
  {#if error}<p role="alert">{error}</p>{/if}
  <p class="source">
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- External provider URL validated by the compiler. -->
    <a href={video.url} target="_blank" rel="noopener noreferrer">Open source video</a>
  </p>
  {#if markdown}<PracticeMarkdownPreview {markdown} />{/if}
</section>

<style>
  .pattern-video {
    margin: 1rem 0;
  }
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
  }
  .player {
    width: 100%;
  }
  video {
    display: block;
    width: 100%;
    max-height: 70vh;
    aspect-ratio: 16 / 9;
    background: #111;
  }
  .provider-player :global(iframe) {
    display: block;
    width: 100%;
    min-height: 200px;
    aspect-ratio: 16 / 9;
    border: 0;
  }
  .source {
    margin: 0.5rem 0;
    font-size: 0.8rem;
  }
</style>
