<script lang="ts">
  import type { PracticeDefinition } from '@patternverse/schema';
  import { legacyPracticeSource } from '@patternverse/compiler/practice';
  import PatternRun from './PatternRun.svelte';

  // Import compatibility only. There is no YAML execution engine here.
  let {
    practiceId,
    practice,
    returnHref,
  }: {
    practiceId: string;
    practice: PracticeDefinition;
    markdownHtml?: Readonly<Record<string, string>>;
    returnHref: `/pattern/${string}` | `/practice/${string}`;
    returnLabel: string;
  } = $props();
  const data = $derived({
    pattern: { id: practiceId, title: practice.title, summary: '', type: 'practice' as const },
    languagePracticeSource: legacyPracticeSource(practice),
    techniqueId: '',
    modality: '',
    isTherapy: false,
    needsAi: false,
    aiReason: null,
    inputNames: [] as readonly string[],
    returnHref,
  });
</script>

{#key practiceId + data.languagePracticeSource}<PatternRun {data} />{/key}
