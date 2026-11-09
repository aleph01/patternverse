<script lang="ts">
  import { base } from '$app/paths';
  import { operator } from '$lib/legal/operator';

  const roles = [
    {
      title: 'Verse expert',
      description:
        'Help a subject area grow. Review patterns, bring reliable sources, and share what works in practice.',
      action: 'Apply as a verse expert',
      subject: 'Joining Patternverse as a verse expert',
      body: 'Hi Julian,\n\nI’d like to help as a verse expert.\n\nMy subject area:\nMy experience or connection to it:\nHow I’d like to help:\nThe time I could offer:\n',
    },
  ];
</script>

<section class="team" aria-labelledby="team-heading">
  <div class="section-intro">
    <p class="eyebrow">The people behind Patternverse</p>
    <h2 id="team-heading">A small team. Room to grow.</h2>
    <p>
      Right now, Patternverse is a one-person project. I’d love to build it with people who care
      about making useful knowledge easier to find, understand, and put into practice.
    </p>
  </div>

  <div class="team-grid">
    <article class="person" aria-labelledby="julian-name">
      <div class="portrait">
        <img
          src={`${base}/team/julian-portrait.webp`}
          alt="Black-and-white illustrated portrait of Julian"
          width="640"
          height="640"
        />
      </div>
      <div class="person-details">
        <h3 id="julian-name">Julian</h3>
        <p class="role">Founder &amp; curator</p>
        <p class="person-note">Building the platform and shaping the library.</p>
      </div>
    </article>

    <article class="person open-place" aria-labelledby="your-place-heading">
      <div class="portrait silhouette" aria-hidden="true">
        <svg viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="88" r="39" fill="currentColor" />
          <path d="M40 220v-15c0-42 35-69 80-69s80 27 80 69v15" fill="currentColor" />
          <path d="M190 46v28m-14-14h28" stroke="var(--green-dark)" stroke-width="3" />
        </svg>
      </div>
      <div class="person-details">
        <h3 id="your-place-heading">Your place here</h3>
        <p class="role">Verse expert</p>
        <p class="person-note">Bring your knowledge and curiosity to a subject you care about.</p>
        <a class="join-link" href="#team-roles">Find your role <span aria-hidden="true">↓</span></a>
      </div>
    </article>
  </div>

  <div class="roles" id="team-roles">
    <h3>Help shape a verse</h3>
    <div class="role-grid">
      {#each roles as role (role.title)}
        <article class="role-option" aria-label={role.title}>
          <h4>{role.title}</h4>
          <p>{role.description}</p>
          <a
            href={`mailto:${operator.email}?subject=${encodeURIComponent(role.subject)}&body=${encodeURIComponent(role.body)}`}
          >
            {role.action} <span aria-hidden="true">↗</span>
          </a>
        </article>
      {/each}
    </div>
    <p class="invitation-note">
      Interested? Tell me a little about yourself and how you’d like to help. We’ll start with a
      conversation and find a role that fits. Have something else in mind? Use the form above.
    </p>
  </div>
</section>

<style>
  .team {
    margin-bottom: 3.5rem;
  }
  .section-intro {
    max-width: 42rem;
    margin-bottom: 1.75rem;
  }
  .eyebrow {
    margin: 0 0 0.625rem;
    color: var(--green-dark);
    font-size: 0.75rem;
    font-weight: 750;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: clamp(1.625rem, 4vw, 2rem);
    line-height: 1.2;
    letter-spacing: -0.04em;
  }
  p {
    margin: 0;
    line-height: 1.75;
  }
  .team-grid,
  .role-grid {
    display: grid;
    gap: 1.25rem;
  }
  .team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .person {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ink);
    background: var(--paper);
  }
  .portrait {
    display: grid;
    place-items: center;
    height: 250px;
    margin: 1.25rem 1.25rem 0;
    overflow: hidden;
  }
  .portrait img {
    display: block;
    width: 250px;
    height: 250px;
    max-width: 100%;
    object-fit: contain;
  }
  .person-details {
    padding: 1.5rem;
    border-top: 1px solid var(--ink);
  }
  h3 {
    margin: 0 0 0.375rem;
    font-size: 1.375rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
  .role {
    color: var(--green-dark);
    font-size: 0.875rem;
    font-weight: 700;
  }
  .person-note {
    margin-top: 0.75rem;
    color: var(--muted);
    font-size: 0.9375rem;
  }
  .open-place {
    border-style: dashed;
    background: #f6fbf8;
  }
  .open-place .person-details {
    border-top-style: dashed;
  }
  .silhouette {
    color: #c0d8cb;
  }
  .silhouette svg {
    width: 240px;
    height: 240px;
    max-width: 100%;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding-block: 0.5rem;
    font-size: 0.875rem;
    font-weight: 750;
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }
  a:hover {
    color: var(--green-dark);
  }
  .join-link {
    margin-top: 0.75rem;
  }
  .roles {
    margin-top: 2rem;
    scroll-margin-top: 2rem;
  }
  .roles > h3 {
    margin-bottom: 1.25rem;
    font-size: 1.125rem;
  }
  .role-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-top: 1rem;
    border-top: 1px solid var(--ink);
  }
  h4 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .role-option p {
    margin-bottom: 0.5rem;
    font-size: 0.9375rem;
  }
  .role-option a {
    margin-top: auto;
  }
  .invitation-note {
    margin-top: 1.25rem;
    color: var(--muted);
    font-size: 0.875rem;
  }
  @media (max-width: 540px) {
    .team-grid,
    .role-grid {
      grid-template-columns: 1fr;
    }
    .portrait {
      height: 220px;
    }
    .portrait img {
      width: 220px;
      height: 220px;
    }
    .silhouette svg {
      width: 210px;
      height: 210px;
    }
  }
</style>
