<script lang="ts">
  import PatternIcon from './PatternIcon.svelte';
  import { generatePatternMark, type PatternMarkSpec } from './pattern-marks';
  let { spec, decorative = false }: { spec: PatternMarkSpec; decorative?: boolean } = $props();
  const icon = $derived(generatePatternMark(spec));
</script>

<PatternIcon {icon} title={spec.title} {decorative} />
