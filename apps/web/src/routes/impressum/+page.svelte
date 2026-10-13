<script lang="ts">
  import { resolve } from '$app/paths';
  import LegalPage from '$lib/legal/LegalPage.svelte';
  import { operator } from '$lib/legal/operator';
</script>

<LegalPage
  title="Legal notice"
  intro="Legal notice and contact information for patternverse.org and Mira."
  lang="en"
>
  <section aria-labelledby="operator-heading">
    <h2 id="operator-heading">Website operator</h2>
    <address>
      {operator.name}<br />
      {operator.street}<br />
      {operator.city}<br />
      Germany
    </address>
    <p>Patternverse and Mira are operated by {operator.name} as an individual.</p>
  </section>
  <section aria-labelledby="contact-heading">
    <h2 id="contact-heading">Contact</h2>
    <p>Email: <a href={`mailto:${operator.email}`}>{operator.email}</a></p>
    <p>This email address does not provide counselling and is not monitored for emergencies.</p>
  </section>
  <section aria-labelledby="purpose-heading">
    <h2 id="purpose-heading">About this service</h2>
    <p>
      Patternverse provides a knowledge library and tools for reflection. Mira is an AI-powered tool
      for personal reflection and self-help, not a medical or psychotherapy service.
    </p>
    <p>
      For the service's limitations, see <a href={resolve('/legal')}>Safety &amp; use</a>. For
      information about how data is processed, see the
      <a href={resolve('/privacy')}>Privacy notice</a>.
    </p>
  </section>
</LegalPage>
