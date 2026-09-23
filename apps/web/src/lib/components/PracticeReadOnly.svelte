<script lang="ts">
  import type { PracticeDefinition } from '@patternverse/schema';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  let {
    practice,
    markdownHtml,
  }: {
    practice: PracticeDefinition;
    markdownHtml: Readonly<Record<string, string>>;
  } = $props();
</script>

<div class="practice-readonly">
  {#each practice.steps as step, index (step.id)}
    <section class="practice-step-preview" aria-labelledby={`practice-step-${step.id}`}>
      <span>{String(index + 1).padStart(2, '0')}</span>
      <h2 id={`practice-step-${step.id}`}>{step.title ?? `Step ${index + 1}`}</h2>

      <div class="practice-blocks">
        {#each step.blocks as block (block.id)}
          {#if block.type === 'markdown'}
            <MarkdownRenderer html={markdownHtml[block.id] ?? ''} />
          {:else if block.type === 'text-input'}
            <div class="practice-field-preview">
              <strong>{block.label}</strong>
              {#if block.placeholder}<span>{block.placeholder}</span>{/if}
            </div>
          {:else}
            <div class="practice-timer-preview">
              <strong>{block.label ?? 'Timer'}</strong>
              <span>{Math.ceil(block.defaultDurationSeconds / 60)} minutes</span>
            </div>
          {/if}
        {/each}
      </div>
    </section>
  {/each}
</div>
