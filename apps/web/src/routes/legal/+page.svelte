<script lang="ts">
  import { resolve } from '$app/paths';
  import LegalPage from '$lib/legal/LegalPage.svelte';
</script>

<LegalPage
  title="Safety & use"
  intro="What Patternverse and Mira can offer — and where their limits lie."
  lang="en"
>
  <section class="legal-notice" aria-labelledby="emergency-heading">
    <h2 id="emergency-heading">In immediate danger</h2>
    <p>
      Mira is not a crisis or emergency service. If you or someone else is in immediate danger, call <a
        href="tel:112">112</a
      > in Germany. Outside Germany, contact your local emergency service.
    </p>
    <p>
      For a confidential conversation during an emotional crisis, you can reach
      <a href="https://www.telefonseelsorge.de/telefon/">TelefonSeelsorge</a> free of charge in
      Germany at <a href="tel:116123">116 123</a>, <a href="tel:08001110111">0800 1110111</a>, or
      <a href="tel:08001110222">0800 1110222</a>. In immediate danger, call the emergency service.
    </p>
  </section>
  <section aria-labelledby="reflection-heading">
    <h2 id="reflection-heading">Reflection and self-help, not treatment</h2>
    <p>
      Patternverse and Mira support learning, personal reflection, and general self-help. Mira is an
      artificial intelligence, not a person, doctor, or psychotherapist. The service is not intended
      to diagnose, monitor, treat, or prevent illnesses. It does not replace professional
      assessment, advice, or therapy.
    </p>
    <p>
      Names such as CBT or NARM refer to approaches that may inspire reflection questions. They do
      not mean that professional psychotherapy is offered or that a treatment outcome is guaranteed.
    </p>
    <p>
      Do not change medication or ongoing treatment because of an answer from Mira. Discuss health
      concerns and important medical decisions with qualified professionals. You do not have to
      answer any question and can stop any exercise. Stop using the service if it overwhelms you or
      makes you feel worse.
    </p>
  </section>
  <section aria-labelledby="ai-heading">
    <h2 id="ai-heading">AI answers can be wrong</h2>
    <p>
      Mira can misunderstand context, invent information, and make unsuitable suggestions. Answers
      are prompts for reflection, not professional findings or reliable grounds for decisions.
      Verify important information independently. There is no human supervision or reliable crisis
      detection in the chat.
    </p>
  </section>
  <section aria-labelledby="data-heading">
    <h2 id="data-heading">Be mindful of personal information</h2>
    <p>
      Locally stored conversations are not the same as locally processed conversations. On the web,
      sending a message transmits content to OpenRouter and a model provider. Please avoid
      identifying details, medical records, and information about other people. See the
      <a href={resolve('/privacy')}>Privacy notice</a> for more details.
    </p>
  </section>
  <section aria-labelledby="availability-heading">
    <h2 id="availability-heading">Availability and backups</h2>
    <p>
      Features may fail or change. Availability and completeness are not guaranteed features of the
      service. Browser data may be lost, for example when clearing website data or changing devices.
      Keep any exports you need in a safe place. Costs for a model account you connect yourself are
      governed by that provider's terms.
    </p>
  </section>
  <section aria-labelledby="rights-heading">
    <h2 id="rights-heading">Rights and responsibility</h2>
    <p>
      Statutory liability rules apply. In particular, these notices do not exclude statutory
      liability for harm to life, body, or health, or for intentional or grossly negligent conduct.
      Mandatory legal rights remain unaffected. Using the service does not require you to waive
      those rights.
    </p>
    <p>
      When reusing library content, observe the sources and licences provided for that content.
      Linked external services have their own operators and terms. If you notice an error or
      problematic content, use the <a href={resolve('/impressum')}>contact in the Legal notice</a>.
    </p>
  </section>
</LegalPage>
