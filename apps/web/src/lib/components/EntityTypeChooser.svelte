<script lang="ts">
  import type { EntityType } from '@patternverse/schema';
  import { EDITOR_ENTITY_TYPES } from '$lib/editor/entityTypes';

  let { onchange }: { onchange: (type: EntityType) => void } = $props();
</script>

<section class="entity-type-chooser" aria-label="Choose what to create">
  <div class="entity-type-grid">
    {#each EDITOR_ENTITY_TYPES as option, index (option.type)}
      <button
        type="button"
        class={`entity-type-option entity-type-option-${index + 1}`}
        aria-label={`Create a ${option.label}`}
        onclick={() => onchange(option.type)}
      >
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{option.label}</strong>
        <small>{option.description}</small>
        <span class="entity-type-arrow" aria-hidden="true">→</span>
      </button>
    {/each}
  </div>
</section>
