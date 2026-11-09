# Identify Limiting Beliefs

The CBT article at `/pattern/identify-limiting-beliefs` embeds a bundled reference
browser. It starts immediately and uses the existing isolated article-widget host
and content sizing. It has no AI calls, free-text interpretation, accounts, answer
storage, or external dependencies. Browsing state lasts for the mounted document.

## AI-assisted practice

The same article now also offers **Explore Possible Beliefs**, a separate authored
Pattern Language practice. One required description produces a structured list of
zero to three matches. When the first match attempt is empty, a separate text
generation asks one short, neutral clarification question. Its single answer is
optional; the practice then matches once more using both participant responses and
the full library. A second empty result ends with the no-match message. There is
no automatic interview loop. The question generator may consider tentative
hypotheses privately but must not embed an assumed belief in the question. Its
question is not supplied as evidence to the retry. The existing provider integration
handles these requests; the library browser itself remains offline. No fit ratings
or required acceptance step are added. **Add more context** uses the
runner's existing response editing and replay, regenerating downstream suggestions.

The article declares `commons:limiting-beliefs` as a public JSON resource. The
practice imports all 185 records, including meanings, variants, questions,
alternative readings, open parameters and non-entailments. AI returns typed library
references, quoted evidence, an expressed/hypothesis basis, tentative connections
and explicit unconfirmed assumptions. The matcher seeks plausible candidates with
a specific inferential bridge; it does not require the participant to have already
endorsed the whole canonical proposition. An unconfirmed premise is exposed rather
than automatically excluding the candidate. Arbitrary associations, contradicted
readings and invented personal history remain grounds for exclusion. Canonical wording, theme,
family and meaning come from lookup. Unknown IDs, extra fields and lists over three
entries are rejected. An empty retry has an explicit no-match message. These checks
establish structure and membership, not relevance. See
[reference data and structured results](../pattern-markdown/data-imports.md).

The `ai-assisted` article tag declares model use to the article, practice chooser
and run routes. Existing AI release settings, provider connection/consent, limits,
privacy handling and optional practice-history saving continue to apply. Tests use
the real Rust runtime and mocked model replies; they do not establish live model
quality. A new backend manifest is needed before a deployed free-AI service can
offer this new practice; existing OpenRouter/local routes do not need a new service.

The source catalogue is
`apps/web/src/lib/article-widgets/beliefs/library-v0.8.json`. It preserves all 185
canonical IDs, statements, wording variants and clarification questions from the
approved prototype: 7 themes, 27 families and 111 subfamilies. The 32 records with
71 possible readings retain those alternatives without selecting one. Open meaning
parameters and non-entailments remain visible. Context notes are also displayed.

`recognition-cues.json` adds two editorial retrieval cues for every stable ID. These
370 phrases are included in the generated AI resource, separate from canonical
statements and variants; the approved 0.8 catalogue remains unchanged. Cues suggest
possible connections and never establish that a person holds a belief. Regenerate
the exported resource with the existing browser build script after editing cues.

See [matching evaluation](matching-evaluation.md) for a repeatable live-model check
of indirect descriptions, the P0065 regression and bounded practical concerns.

This is an editorially audited candidate library. The eight overlapping structure
tags are manually authored navigation aids, not diagnoses, scores or inferred
personal beliefs. They do not select a reading or establish a proposition's accuracy.

The catalogue was imported from the conversation's library 0.8, dated 2026-10-31.
Its original full library SHA-256 is
`83e10ae9c8dc1343ae363081b847725f84e5f813b37132b802e3366a03595658`.
Source connections in that research library do not establish validity of each
prototype; the compact browser does not present inventory-derived test results.

Edit `browser.html` for behavior or presentation, then run from the repository root:

```sh
node apps/web/scripts/build-belief-browser.mjs
pnpm --filter @patternverse/web exec vitest run src/lib/article-widgets/beliefs
```

The generated asset is checked in under `content/assets/widgets/` like other article
widgets. Its isolated document repeats the site's light surface, sans-serif type,
black rules, green interaction color and blue focus treatment from the shared
design tokens. It deliberately omits the prototype's dark, rounded field-guide shell.
The parent article retains the site's navigation, typography and CBT collection context.

Recognition queries for editorial retrieval:

- I keep thinking I have to earn my worth.
- I want to understand the rule behind my reaction.
- I worry that showing effort will make people dislike me.
- I feel I must never show anger.
- I don't know whether this is a prediction or a belief about myself.
- I think asking for help makes me weak.
- I want to find wording for an assumption that feels familiar.
- I struggle to tell a real constraint from a rule I impose on myself.
