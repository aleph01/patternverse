<script lang="ts">
  import { operator } from '$lib/legal/operator';
  import ContributionForm from '$lib/components/ContributionForm.svelte';
  import ContributeTeam from '$lib/components/ContributeTeam.svelte';
  import ArticleSuggestion from '$lib/components/ArticleSuggestion.svelte';

  const emailHref = `mailto:${operator.email}?subject=${encodeURIComponent('Contributing to Patternverse')}`;
</script>

<svelte:head>
  <title>Contribute — Patternverse</title>
  <meta
    name="description"
    content="Meet the people behind Patternverse. Join as a verse expert, share a pattern, or help improve the library."
  />
</svelte:head>

<main class="contribute-page" lang="en">
  <header>
    <p class="kicker">patternverse / contribute</p>
    <h1>Bring what you know.</h1>
    <p class="intro">
      Patternverse grows through people who know a field, practise a craft, or notice something
      useful in everyday life. If you have knowledge to share, an idea to explore, or something to
      improve, you’re welcome here.
    </p>
  </header>

  <ArticleSuggestion />

  <section aria-labelledby="ways-heading">
    <h2 id="ways-heading">A few ways to help</h2>
    <ul>
      <li>
        <strong>Share a pattern.</strong> Suggest an approach that helps in a recurring situation.
      </li>
      <li>
        <strong>Bring your expertise.</strong> Help review a topic, add sources, or explain where an approach
        is useful and where its limits lie.
      </li>
      <li>
        <strong>Make something clearer.</strong> Point out an error, offer a practical example, or share
        feedback from trying a pattern or practice.
      </li>
      <li>
        <strong>Suggest what’s missing.</strong> Tell us about a field, question, or perspective you’d
        like to see represented.
      </li>
    </ul>
  </section>

  <section class="invitation" aria-labelledby="start-heading">
    <h2 id="start-heading">Start with a conversation</h2>
    <p>
      Share what you’d like to contribute, your connection to the topic, and any examples or sources
      you have in mind. You can email us or use the form below. You don’t need a finished article,
      an account, or any technical knowledge.
    </p>
    <a class="email-link" href={emailHref}>{operator.email}</a>
  </section>

  <div class="feedback-form">
    <ContributionForm />
  </div>

  <ContributeTeam />
</main>

<style>
  .contribute-page {
    width: min(100% - 2rem, 800px);
    margin: 0 auto;
    padding: clamp(2.5rem, 6vw, 5rem) 0;
  }
  header {
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--ink);
  }
  .kicker {
    color: var(--green-dark);
    font-size: 0.8125rem;
    font-weight: 700;
  }
  h1 {
    margin: 0.75rem 0 1rem;
    font-size: clamp(2rem, 6vw, 3.5rem);
    line-height: 1.1;
    letter-spacing: -0.045em;
  }
  .intro {
    font-size: 1.0625rem;
  }
  .feedback-form {
    margin-bottom: 3.5rem;
    padding-bottom: 3.5rem;
    border-bottom: 1px solid var(--ink);
  }
  section {
    margin-bottom: 2.5rem;
  }
  section:last-child {
    margin-bottom: 0;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    line-height: 1.4;
    letter-spacing: -0.025em;
  }
  p,
  li {
    line-height: 1.75;
  }
  ul {
    padding-left: 1.25rem;
  }
  li + li {
    margin-top: 0.75rem;
  }
  .invitation {
    padding: 1.5rem;
    border-left: 3px solid var(--green-dark);
    background: var(--mint);
  }
  .email-link {
    display: inline-block;
    min-height: 44px;
    padding-block: 0.5rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    overflow-wrap: anywhere;
  }
  .email-link:hover {
    color: var(--green-dark);
  }
</style>
