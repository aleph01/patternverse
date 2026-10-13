<script lang="ts">
  import LegalPage from '$lib/legal/LegalPage.svelte';
  import { operator } from '$lib/legal/operator';
</script>

<LegalPage
  title="Privacy notice"
  intro="Local storage, website visits, and the optional use of external services."
  lang="en"
>
  <section aria-labelledby="controller-heading">
    <h2 id="controller-heading">1. Data controller and contact</h2>
    <address>{operator.name}<br />{operator.street}<br />{operator.city}<br />Germany</address>
    <p>Privacy enquiries: <a href={`mailto:${operator.email}`}>{operator.email}</a>.</p>
    <p>
      This notice describes Patternverse and Mira on patternverse.org. External services also have
      their own privacy notices.
    </p>
  </section>
  <section aria-labelledby="hosting-heading">
    <h2 id="hosting-heading">2. Website hosting and security</h2>
    <p>
      The website is delivered through Cloudflare Pages and the Cloudflare network (Cloudflare,
      Inc., 101 Townsend Street, San Francisco, CA 94107, USA). When you visit, Cloudflare processes
      technical connection data, including your IP address, requested URL, time of access, browser
      and device information, and, where applicable, security-related events. This is necessary for
      delivering, troubleshooting, and protecting the website. The legal basis is Article 6(1)(f)
      GDPR; the legitimate interest is providing a secure and functioning service.
    </p>
    <p>
      No separate central conversation database is operated for Mira. Conversation content is sent
      directly from your browser to the selected AI service, not to a Patternverse chat server.
      Technical website requests are separate from this. Technical logs are processed under the
      retention rules of the relevant Cloudflare service; retention depends in particular on
      operational needs, security purposes, and legal requirements. Details are available in
      <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy notice</a>.
    </p>
  </section>
  <section aria-labelledby="local-heading">
    <h2 id="local-heading">3. Data on your device</h2>
    <p>
      Your personal workspace and settings are stored in your browser, including through IndexedDB.
      Offline functionality stores website files in browser caches. Mira stores sessions,
      conversations, settings, and the AI connection encrypted in your browser. The associated
      device key is also stored on your device. This encryption therefore does not protect against
      every person or program with access to your unlocked browser.
    </p>
    <p>
      This storage supports the functions you request, such as session history, your personal
      workspace, and offline use. Access to necessary device storage is based on Section 25(2),
      point 2 of the German TDDDG. Where personal data is processed to provide requested functions,
      the legal basis is Article 6(1)(b) GDPR. No advertising trackers or analytics scripts are
      embedded in the application code.
    </p>
    <p>
      Locally stored data remains until you delete it in the application, clear website data in your
      browser, or the browser removes it. There is no automatic time-based deletion of Mira
      sessions. Individual sessions can be deleted from the history. Clearing all website data also
      removes settings, connection keys, and offline files. Backups you have downloaded must be
      deleted separately; Mira exports are password-encrypted and do not contain an API key.
    </p>
    <p>
      Workspace backups are unencrypted binary files. They include your private articles, verses,
      collections, saved library items, usefulness ratings, and saved practice responses, but
      exclude Mira conversations, device preferences, and AI credentials. Backup and restoration
      happen on your device without uploading the file. Before replacement, the application keeps
      one unencrypted local recovery copy of the previous workspace. The next restore replaces that
      copy; clearing browser data also removes it. Download it separately if you want to retain it.
    </p>
  </section>
  <section class="legal-notice" aria-labelledby="models-heading">
    <h2 id="models-heading">4. AI on the web: data leaves your device</h2>
    <p>
      Mira chat replies on the web require an OpenRouter connection that you connect yourself
      (OpenRouter, Inc., USA). When you send a message, your message, recent conversation context,
      system instructions, and any selected pattern context are transmitted directly to OpenRouter
      and a provider for the selected model. AI-assisted exercises may include relevant answers and
      exercise instructions. The providers also receive technical connection and usage data.
      Connection, model, and cost queries also go to OpenRouter; account sign-in takes place on its
      website.
    </p>
    <p>
      The application code requests Zero Data Retention routing and prohibits model-provider data
      collection in the request. This is not a guarantee of complete anonymity, EU-only processing,
      or deletion of all account, billing, and security metadata. Your OpenRouter account settings
      and the actual providers' policies also matter.
    </p>
    <p>
      Transmission serves the reply you request (Article 6(1)(b) GDPR). The service is not intended
      for transmitting medical records or other particularly sensitive information. In particular,
      please do not enter identifying health information or confidential data about other people.
      Use the library or exercises without AI if you do not want external processing. You can
      disconnect the connection in Mira and also revoke the key in your OpenRouter account. This
      does not recall data already transmitted.
    </p>
    <p>
      Further information: <a href="https://openrouter.ai/privacy">OpenRouter privacy</a> and
      <a href="https://openrouter.ai/docs/guides/features/zdr">Zero Data Retention</a>. The actual
      model providers depend on your model and OpenRouter's routing. Your own accounts are also
      subject to their terms.
    </p>
    <p>
      Where enabled, published guided practices also offer optional free AI through Cloudflare
      Workers AI. This is not available for Mira chat. You must choose this option for the practice
      before any answers are sent. The practice checkpoint, including confirmed answers and
      progress, is sent to the Patternverse backend to validate the published practice and its
      current step. Only the step’s relevant context and authored instructions are submitted to the
      model. Patternverse does not persist or log these answers or model prompts on the backend.
      This option is not covered by OpenRouter’s Zero Data Retention routing.
    </p>
    <p>
      To enforce the limited free allowance, the backend temporarily stores daily pseudonymous
      network identifiers and usage counters. These are derived from connection addresses using a
      secret and expire at the next UTC day boundary. People on a shared network may share a limit.
      Cloudflare still processes connection and service usage data under its own policies. Free AI
      does not switch to your paid OpenRouter account automatically. See
      <a href="https://developers.cloudflare.com/workers-ai/platform/data-usage/"
        >Cloudflare Workers AI data usage</a
      >.
    </p>
  </section>
  <section aria-labelledby="optional-heading">
    <h2 id="optional-heading">5. Optional features and external sources</h2>
    <p>
      Additional features may be available depending on the version. Browser speech recognition may
      send audio to the browser's or operating system's speech recognition service; it is not
      covered by the Zero Data Retention setting for text models. In the desktop app, local models
      and local transcription can run on your device. Downloading a model requires a connection to
      its download provider.
    </p>
    <p>
      If you connect optional Dropbox synchronisation, Dropbox (Dropbox International Unlimited
      Company or the provider responsible for your account) receives the workspace data selected for
      synchronisation and account information. Mira conversations are not automatically synchronised
      with the public workspace. You can disconnect in the synchronisation settings. Copies in your
      Dropbox account and its trash must be managed separately there. The
      <a href="https://www.dropbox.com/privacy">Dropbox privacy notice</a> also applies.
    </p>
    <p>
      In versions offering Dropbox sign-in-only sync, the private workspace, saved practice
      responses, ratings, situations, and saved Mira conversations are stored as readable data in
      your Dropbox app folder, without Patternverse's additional encryption. Dropbox and anyone with
      access to that account can read the synced content. Device settings and AI credentials are
      excluded. Automatic sync is on by default in sign-in-only versions while the app is open,
      online, and connected to Dropbox. You can disable it in Workspace → Sync & backup and use
      “Sync now” instead. Conflicts pause for review; an already-running sync finishes safely when
      automatic sync is disabled. Earlier encrypted sync archives are not automatically decrypted,
      converted, or replaced by this mode.
    </p>
    <p>
      When loading subscribed public sources or external images, the respective host receives
      technical connection data, including your IP address. External links open services with their
      own privacy notices. These functions serve the use you request; their additional provider
      rules apply independently of local storage.
    </p>
  </section>
  <section aria-labelledby="contact-data-heading">
    <h2 id="contact-data-heading">6. Email contact</h2>
    <p>
      When you contact us, your sender address, message content, and technical email data are
      processed to handle your enquiry. The domain address is forwarded through Squarespace and its
      forwarding service Mailgun to a Google/Gmail mailbox. Please do not send conversation logs,
      medical records, or other sensitive content unless necessary for your enquiry.
    </p>
    <p>
      The legal basis is Article 6(1)(b) GDPR for contract-related enquiries, otherwise Article
      6(1)(f) GDPR with the legitimate interest of answering your enquiry. Correspondence is
      retained as long as necessary to handle the enquiry and meet any applicable legal retention or
      evidence obligations, and then deleted. The privacy policies of
      <a href="https://www.squarespace.com/privacy">Squarespace</a>,
      <a href="https://www.mailgun.com/legal/privacy-policy/">Mailgun</a>, and
      <a href="https://policies.google.com/privacy">Google</a> explain their further processing.
    </p>
  </section>
  <section aria-labelledby="transfers-heading">
    <h2 id="transfers-heading">7. Processing outside the EU</h2>
    <p>
      The services mentioned may process data outside the EU and EEA, particularly in the USA. Zero
      Data Retention is not a commitment to European processing locations. Cloudflare explains its
      use of the EU–US Data Privacy Framework and Standard Contractual Clauses for relevant
      transfers in its privacy notice. Information about other recipients, retention periods, and
      transfer safeguards is available in the provider notices linked above. Questions about
      processing by Patternverse can be directed to the data controller.
    </p>
  </section>
  <section aria-labelledby="rights-heading">
    <h2 id="rights-heading">8. Your rights</h2>
    <p>
      Under the GDPR, you have rights of access, rectification, erasure, restriction of processing,
      and data portability, subject to its conditions. You can object to processing based on
      legitimate interests on grounds relating to your particular situation. You can withdraw
      consent with effect for the future. This does not affect the lawfulness of earlier processing.
    </p>
    <p>
      Use the contact above to exercise these rights. The operator cannot remotely access or delete
      data stored exclusively on your device. For your own accounts with external services, you can
      also use their privacy contacts. You have the right to lodge a complaint with a data
      protection supervisory authority, in particular the
      <a href="https://www.baden-wuerttemberg.datenschutz.de/"
        >State Commissioner for Data Protection and Freedom of Information Baden-Württemberg</a
      >.
    </p>
    <p>
      Patternverse does not make automated decisions with legal or similarly significant effects
      under Article 22 GDPR. AI answers are non-binding prompts for reflection. Entering personal
      content is voluntary; using AI on the web involves an external AI service, including when you
      choose free AI for a guided practice.
    </p>
  </section>
</LegalPage>
