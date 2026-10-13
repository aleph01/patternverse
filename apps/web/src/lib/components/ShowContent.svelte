<script lang="ts">
  import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
  import { isShowView } from '$lib/pattern-run/show-view';
  import { isPatternVideo } from '$lib/pattern-run/video';
  import { isPatternImage } from '$lib/pattern-run/image';
  import PatternImage from './PatternImage.svelte';
  import PatternVideo from './PatternVideo.svelte';
  import PatternShow from './PatternShow.svelte';
  let { effect, runningAllowed = true }: { effect: GuidedEffect; runningAllowed?: boolean } =
    $props();
  const view = $derived(effect.request.payload.view);
  const image = $derived(effect.request.payload.image);
  const video = $derived(effect.request.payload.video);
  const text = $derived(effect.request.payload.markdown);
</script>

{#if effect.request.kind === 'content.image' && isPatternImage(image)}<PatternImage
    {image}
    markdown={typeof text === 'string' ? text : ''}
  />
{:else if effect.request.kind === 'content.video' && isPatternVideo(video)}<PatternVideo
    {video}
    markdown={typeof text === 'string' ? text : ''}
    {runningAllowed}
  />
{:else if isShowView(view)}<PatternShow {view} />
{:else if typeof text === 'string'}<p class="show-text">{text}</p>{/if}

<style>
  .show-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
