<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { resolveReleaseFeatures } from '$lib/release-features';
  import '$lib/guide.css';

  let desktop = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
  });
</script>

<svelte:head>
  <title>About mira — Patternverse</title>
  <meta
    name="description"
    content="A visual guide to mira: conversations, therapy approaches, and privacy."
  />
</svelte:head>

<main class="mira-guide">
  <section class="mira-guide-hero" aria-labelledby="mira-guide-heading">
    <div class="mira-guide-hero-copy">
      <p class="guide-kicker">Patternverse / mira</p>
      <h1 id="mira-guide-heading">A conversation with room to move.</h1>
      <p>
        mira is the companion inside Patternverse. Begin with what is on your mind, then choose an
        approach when it feels useful. Mira is AI for reflection and self-help, not psychotherapy,
        medical advice, or emergency care. <a href={resolve('/legal')}
          >Read the safety and usage notes.</a
        >
      </p>
      <div class="guide-hero-actions">
        <a class="guide-action" href={resolve('/mira')}
          >Open mira <span aria-hidden="true">↗</span></a
        >
        <a class="guide-text-link" href="#mira-start"
          >Explore the guide <span aria-hidden="true">↘</span></a
        >
      </div>
    </div>
    <div class="mira-guide-hero-art" aria-hidden="true">
      <div class="mira-illustration-top">patternverse / mira <span>•••</span></div>
      <div class="mira-illustration-chat">
        <small>You</small>
        <p>Something has been on my mind.</p>
      </div>
      <div class="mira-illustration-reply">
        <small>mira</small>
        <p>Where would you like to begin with it?</p>
      </div>
      <div class="mira-illustration-composer">
        <span>Message mira…</span><span>↑</span>
      </div>
    </div>
  </section>

  <nav id="mira-start" class="guide-chapters guide-chapters--mira" aria-label="About mira chapters">
    <p class="guide-kicker">Start here, or return to any chapter</p>
    <a href="#mira-conversations"
      ><span>01</span> Begin a conversation <span aria-hidden="true">↗</span></a
    >
    {#if features.guidedExercises}<a href="#mira-patterns"
        ><span>02</span> Shape the conversation <span aria-hidden="true">↗</span></a
      >{/if}
    {#if features.voice}<a href="#mira-voice"
        ><span>03</span> Speak when you prefer <span aria-hidden="true">↗</span></a
      >{/if}
    <a href="#mira-privacy"
      ><span>{features.voice ? '04' : features.guidedExercises ? '03' : '02'}</span> Know where it
      goes <span aria-hidden="true">↗</span></a
    >
  </nav>

  <section
    id="mira-conversations"
    class="mira-guide-chapter"
    aria-labelledby="mira-conversations-heading"
  >
    <div class="mira-guide-copy">
      <p class="guide-kicker">01 / Begin</p>
      <h2 id="mira-conversations-heading">Start with your own words.</h2>
      <p>
        Open a session, write what you want to explore, and send when you are ready. NARM is the
        first therapy approach; you can change it during a session without losing the conversation.
      </p>
      <p>
        Past sessions are available through the history control. You can return to them, rename
        them, or delete them.
      </p>
      <a class="guide-action" href={resolve('/mira')}
        >Start a conversation <span aria-hidden="true">↗</span></a
      >
    </div>
    <div
      class="mira-guide-figure mira-guide-figure--session"
      aria-label="Illustration of a mira session with a therapy approach selected"
    >
      <div class="mira-figure-heading"><span>New session</span><span>history ◷</span></div>
      <div class="mira-figure-space">What would you like to explore?</div>
      <div class="mira-figure-footer">
        {#if features.guidedExercises}<span>＋</span>{/if}<span>NARM ⌄</span><span
          >Message mira…</span
        ><span>↑</span>
      </div>
      <div class="mira-figure-caption">A session can change approach as you go.</div>
    </div>
  </section>

  {#if features.guidedExercises}<section
      id="mira-patterns"
      class="mira-guide-chapter mira-guide-chapter--reverse"
      aria-labelledby="mira-patterns-heading"
    >
      <div class="mira-guide-copy">
        <p class="guide-kicker">02 / Shape</p>
        <h2 id="mira-patterns-heading">Choose what fits this moment.</h2>
        <p>
          The <strong>＋</strong> control opens patterns and therapy techniques. Search, select a
          result to preview it, then use the play control when you want to begin. On a keyboard,
          <kbd>Shift</kbd>
          + <kbd>Space</kbd> opens the same selector.
        </p>
        <p>
          A library pattern gives mira context for the conversation. A guided therapy technique
          takes you through an exercise. Available techniques follow the approach selected for that
          session.
        </p>
        <a class="guide-action" href={resolve('/mira')}
          >Try the selector <span aria-hidden="true">↗</span></a
        >
      </div>
      <div
        class="mira-guide-figure mira-guide-figure--pattern"
        aria-label="Illustration of selecting and previewing a pattern before starting it"
      >
        <div class="mira-figure-heading">
          <span>Patterns &amp; therapy techniques</span><span>×</span>
        </div>
        <div class="mira-figure-search">Find a pattern… <span>⌕</span></div>
        <div class="mira-figure-result">
          <span>01</span><strong>A pattern worth trying</strong><small>library pattern</small>
        </div>
        <div class="mira-figure-preview">
          <small>Selected for preview</small><strong>A pattern worth trying</strong><span
            >▶ &nbsp; ×</span
          >
        </div>
        <div class="mira-figure-caption">Select first. Begin only when you choose to.</div>
      </div>
    </section>{/if}

  {#if features.voice}<section
      id="mira-voice"
      class="mira-guide-chapter"
      aria-labelledby="mira-voice-heading"
    >
      <div class="mira-guide-copy">
        <p class="guide-kicker">03 / Speak</p>
        <h2 id="mira-voice-heading">Two ways to use your voice.</h2>
        <p>
          The <strong>microphone</strong> dictates into the message box so you can review and edit
          before sending. The <strong>waveform</strong> starts voice control: speak a draft, say “send”
          when it is ready, or ask to open and search patterns.
        </p>
        <p>
          Voice control keeps listening while mira is in the foreground until you stop it. The
          speaker control beside a reply reads that reply aloud; listening pauses during readback.
        </p>
        <a class="guide-action" href={resolve('/mira')}
          >Explore voice controls <span aria-hidden="true">↗</span></a
        >
      </div>
      <div
        class="mira-guide-figure mira-guide-figure--voice"
        aria-label="Illustration comparing dictation and voice control"
      >
        <div class="mira-voice-row">
          <span class="mira-voice-symbol">♩</span>
          <div>
            <strong>Dictation</strong><small
              >Speech appears in the composer. You send it yourself.</small
            >
          </div>
        </div>
        <div class="mira-voice-row">
          <span class="mira-voice-symbol">≋</span>
          <div>
            <strong>Voice control</strong><small>“Open patterns” · “the first one” · “send”</small>
          </div>
        </div>
        <div class="mira-voice-row">
          <span class="mira-voice-symbol">◖</span>
          <div>
            <strong>Read aloud</strong><small>Hear a reply and keep its text in the chat.</small>
          </div>
        </div>
        <div class="mira-figure-caption">
          Feedback appears on screen, without spoken confirmations.
        </div>
      </div>
    </section>{/if}

  <section id="mira-privacy" class="mira-guide-privacy" aria-labelledby="mira-privacy-heading">
    <div class="mira-guide-privacy-intro">
      <p class="guide-kicker">
        {features.voice ? '04' : features.guidedExercises ? '03' : '02'} / Privacy &amp; processing
      </p>
      <h2 id="mira-privacy-heading">Know where a reply comes from.</h2>
      <p>
        Your sessions are kept in private app storage. The model that processes a message depends on
        where you use mira.
      </p>
    </div>
    <div class="mira-privacy-cards">
      <article>
        <span>desktop app</span>
        <h3>On this Mac.</h3>
        <p>With a local model installed, replies and voice transcription run on your computer.</p>
      </article>
      <article>
        <span>web app</span>
        <h3>Through OpenRouter.</h3>
        <p>
          Connect with OpenRouter to use your selected model. Mira requests zero data retention and
          disables provider fallback. The request still goes to a remote provider.
        </p>
      </article>
      {#if features.voice}<article>
          <span>browser voice</span>
          <h3>A separate speech service.</h3>
          <p>
            Web dictation and voice control use the browser’s speech recognition, which may process
            audio remotely. Its privacy policy is separate from OpenRouter’s.
          </p>
        </article>{/if}
    </div>
    <p class="mira-privacy-note">
      Your OpenRouter spending overview and monthly warning threshold are in mira’s Settings. The
      threshold warns you; it does not block requests.
    </p>
  </section>

  <section class="mira-guide-end" aria-labelledby="mira-guide-end-heading">
    <p class="guide-kicker">Ready when you are</p>
    <h2 id="mira-guide-end-heading">Begin wherever you are.</h2>
    <a class="guide-action" href={resolve('/mira')}>Open mira <span aria-hidden="true">↗</span></a>
    <a class="guide-text-link" href={resolve('/#home-about')}
      >Explore Patternverse <span aria-hidden="true">↗</span></a
    >
  </section>
</main>
