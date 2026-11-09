<script lang="ts">
  import MusicConcept from './MusicConcept.svelte';
  import { musicConcepts } from './concepts';
  import MusicPlayer from './MusicPlayer.svelte';
  import type { GuidedMusicLesson } from './lesson-pilot';
  let { lesson }: { lesson: GuidedMusicLesson } = $props();
  let index = $state(0);
  let exampleOpen = $state(false);
  const step = $derived(lesson.steps[index]);
  const uid = $props.id();
</script>

<section class="guided-music" aria-label={lesson.title}>
  <MusicConcept concept={musicConcepts[lesson.articleId]} />
  <button
    class="explore"
    type="button"
    aria-expanded={exampleOpen}
    aria-controls={`${uid}-example`}
    onclick={() => {
      exampleOpen = !exampleOpen;
      index = 0;
    }}
  >
    {exampleOpen ? 'Close the song example' : 'Explore a song example →'}
  </button>
  {#if exampleOpen}
    <div class="song-example" id={`${uid}-example`}>
      <p class="eyebrow">In a song · listen · isolate · notice · try</p>
      <h2 id={`${uid}-title`}>{lesson.title}</h2>
      <p class="introduction">{lesson.introduction}</p>
      <div class="steps" role="group" aria-label="Listening steps">
        {#each lesson.steps as item, i (item.id)}
          <button type="button" aria-pressed={i === index} onclick={() => (index = i)}
            ><span>{i + 1}</span>{item.label}</button
          >
        {/each}
      </div>
      <div class="guidance" aria-live="polite">
        <h3>{step.label}</h3>
        <p>{step.instruction}</p>
        <p class="listen-for"><strong>Listen for:</strong> {step.listenFor}</p>
      </div>
      {#key step.id}
        <MusicPlayer
          examples={[step.example]}
          initial={step.example.id}
          allowEditing={false}
          showSelector={false}
          showPartControls={false}
          rollHeight={260}
        />
      {/key}
      {#if index < lesson.steps.length - 1}
        <button class="next" type="button" onclick={() => (index += 1)}
          >Next: {lesson.steps[index + 1].label} →</button
        >
      {:else}
        <p class="transfer"><strong>Use it in your music:</strong> {lesson.transfer}</p>
      {/if}
      <details class="sources">
        <summary>Source & comparison notes</summary>
        <p>{lesson.sourceNote}</p>
        <ul>
          {#each lesson.references as reference (reference.url)}
            <li>
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- Curated external reference URL. -->
              <a href={reference.url} target="_blank" rel="noreferrer">{reference.label} ↗</a>
            </li>
          {/each}
        </ul>
      </details>
    </div>
  {/if}
</section>

<style>
  .guided-music {
    margin: 0 0 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #d6d9d0;
    font-family: var(--font-sans);
    min-width: 0;
  }
  .explore {
    margin: 1.25rem 0 0;
    background: var(--ink);
    color: var(--paper);
  }
  .song-example {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #d6d9d0;
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  .eyebrow {
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--green-dark);
  }
  h2 {
    margin: 0.4rem 0 0.75rem;
    font-size: clamp(1.35rem, 4vw, 1.75rem);
    line-height: 1.2;
    letter-spacing: -0.035em;
  }
  .introduction,
  .guidance p,
  .transfer,
  .sources {
    font-size: 0.85rem;
    line-height: 1.6;
  }
  .introduction {
    color: var(--ink-muted);
    margin: 0 0 1rem;
  }
  .steps {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  button {
    min-height: 44px;
    padding: 9px 13px;
    border: 1px solid #bbc5b7;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .steps button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .steps button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  .steps span {
    font-size: 0.65rem;
    opacity: 0.75;
  }
  .guidance {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--mint);
  }
  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.9rem;
  }
  .guidance p {
    margin: 0.4rem 0;
  }
  .listen-for {
    color: var(--green-dark);
  }
  .next {
    margin-top: -1rem;
  }
  .sources {
    margin-top: 1rem;
    font-size: 0.75rem;
  }
  summary {
    min-height: 32px;
    cursor: pointer;
    font-weight: 600;
  }
  .sources p {
    margin: 0.5rem 0;
  }
  .sources ul {
    padding-left: 1.2rem;
  }
  a {
    color: var(--green-dark);
    text-underline-offset: 3px;
  }
  @media (max-width: 450px) {
    .steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .guidance {
      padding: 0.8rem;
    }
  }
</style>
