<script lang="ts">
  import { onMount, type ComponentProps } from 'svelte';
  import { resolve } from '$app/paths';
  import PatternRun from '$lib/components/PatternRun.svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { editorValuesFromEntity } from '$lib/editor';
  import { sourcePracticeNeedsAi } from '$lib/pattern-run/source-practice';
  let runData = $state<ComponentProps<typeof PatternRun>['data'] | null>(null),
    error = $state('');
  onMount(() => {
    let alive = true;
    void (async () => {
      const id = new URLSearchParams(location.search).get('id');
      if (!id) throw Error('Choose a saved practice from your editor or practice history.');
      const entity = await (await getLocalWorkspace()).getEntity(id);
      if (!entity || (entity.type !== 'pattern' && entity.type !== 'practice'))
        throw Error('This private practice is not available on this device.');
      const values = editorValuesFromEntity(entity);
      if (!values.languagePracticeSource) throw Error('This item has no interactive practice.');
      if (alive)
        runData = {
          pattern: {
            id: entity.id,
            title: entity.title,
            summary: entity.summary || '',
            sourceId: entity.sourceId,
            type: entity.type,
            verseIds: [...(entity.verses || [])],
          },
          languagePracticeSource: values.languagePracticeSource,
          techniqueId: '',
          modality: '',
          needsAi: sourcePracticeNeedsAi({
            languagePracticeSource: values.languagePracticeSource,
            tags: entity.tags,
          }),
          aiReason: null,
          inputNames: [],
          returnHref: `/editor?id=${encodeURIComponent(entity.id)}`,
          isTherapy: entity.verses?.includes('therapy') ?? false,
        };
    })().catch((c) => {
      if (alive) error = c instanceof Error ? c.message : 'Could not open this practice.';
    });
    return () => {
      alive = false;
    };
  });
</script>

{#if runData}{#key runData.pattern.id}<PatternRun data={runData} />{/key}
{:else}<main style="max-width:720px;margin:3rem auto;padding:1rem">
    {#if error}<p role="alert">{error}</p>
      <a href={resolve('/my')}>Back to workspace</a>{:else}<p>
        Opening your private practice…
      </p>{/if}
  </main>{/if}
