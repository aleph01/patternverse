# AI Usage collection

**Thinking with Language Models** contains eight patterns in the **AI Usage** verse. The six original articles have been rewritten around a shared field-guide structure. **Draft the Prompt Together** and **Work in Inspectable Steps** cover prompt co-writing and staged collaboration. **Attack, Then Repair** now includes focused audit passes for factual support, completeness, and usability, alongside adversarial review of proposals.

## Shared article structure

Each article has an unheaded opening situation, followed by:

1. The core idea
2. Why it works
3. How to use it
4. A worked example
5. When it helps—and where it falls short
6. Related patterns

The explanation of why a pattern works distinguishes changes in the immediate model task from opportunities for human inspection and steering. It does not claim that clearer prompts, more steps, or repeated self-review establish correctness. Worked examples include remaining errors, tradeoffs, or checks rather than presenting the pattern as a guarantee.

## Content and metadata

- Canonical IDs, URLs, existing summaries, and title aliases remain stable. Collection items and pattern links use the existing content schema.
- `ai-usage.json` is a metadata sidecar, not a second content import. It contains the current article prose without diagrams, related-pattern sections, or worksheets; corresponding hashes and word counts; authoring metadata; diagram descriptions; and eight recommendation queries per article.
- The sidecar's `editorial_revision` records the shared structure and the previous six article hashes. `source_sha256` and the reconciliation body hashes remain historical provenance for the original import and practice migration; they are not hashes of the rewritten prose.
- “Look for the Decisive Unknown” remains the existing record in both Decision Making and AI Usage, with “Expose the Decisive Unknown” retained as an alias. Its original prose and AI supplement have been integrated into one article. Its existing practice instructions and six-form Pattern Language worksheet are preserved unchanged.
- No additional practices are introduced. Short prompt examples explain the patterns within the articles; they are not separate executable exercises.
- Recommendation queries remain metadata for future use. The existing full-text library indexes the articles, collection, verse, and aliases; no separate recommendation engine is added.

## Visuals and evidence

The six existing article diagrams are retained. The two new articles have explanatory process diagrams using the same accessible 720 × 470 SVG treatment, local image paths, descriptive alternative text, captions, dark-mode styling, and isolated IDs. Both new patterns also have explicit authored concept marks in the existing registry.

The new prompt-writing article links to Anthropic's prompt-generator announcement. The staged-work article links to its prompt-chaining workflow description. The audit article links to Self-Refine and research on intrinsic reasoning self-correction, presenting their findings with task and model limitations rather than generalizing them to every current model.

## Validation scope

The compiler integration tests check all eight records, ordered collection membership, verse membership, the shared article structure, sidecar/body agreement, related links, recommendation queries, safe diagrams, and the unchanged executable worksheet hash. Web integration tests check established article rendering and discovery through titles, aliases, the collection, and the verse. Authored concept-mark coverage and geometry are checked by the existing registry tests.

This is a local editorial revision. Publication and deployment are separate actions.
