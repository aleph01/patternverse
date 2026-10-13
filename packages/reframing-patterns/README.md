# Reframing patterns

This package contains 23 original Pattern Markdown language-1 procedures. Each source under `patterns/` is an independently executable root. `catalog.json` records the stable ID, adaptation version, collection, tags, declared inputs and outputs, exact source path, and static child calls. The Rust host pins the source closure when a run starts; a later edit does not change an in-progress run.

The public mini-articles, examples, and editable source blocks live in `../../content/patterns/reframing-*.md`. The ordered browsing groups live in `../../content/collections/reframing*.md`. The article ID uses the Commons form (`reframing-break-tradeoff`); its executable ID uses the Pattern Markdown namespace form (`reframing.break-tradeoff`). The content compiler validates articles, and host tests compile every executable root. Keep the article's fenced source synchronized with its package source.

## How to use the collection

Start `reframing.rapid-reframe` when the problem is still vague. It asks for a provisional statement, runs one relevant frame check, selects one additional lens where useful, presents a few genuinely different candidate frames, lets the participant choose or revise, then seeks a small test in the world. It does not force all 23 operators into one interview. Any smaller operator may be run on its own with a `frame` input. The package deliberately avoids treating a candidate as the singular “real problem.”

## AI and participant contracts

Semantic classifiers have closed declared variants and a fallback. The host must return only one declared variant. `!agent` calls declare either `text` or bounded `choices`; the host must return the declared type. Pattern Markdown validates the typed receipt. Generated claims about motives, causes, constraints, or goals are hypotheses, not facts. Participant `!choose` and `!ask` effects control the final selection and next step. Web generation uses the selected OpenRouter model under the existing ZDR route; desktop generation uses the selected local model. There is no silent provider fallback.

## Composition

The main flow uses explicit, compile-time `!use` calls and semantic routing. Dynamic imports are not needed: an operator is selected from a finite authored branch set. `review-frame` routes among frame checks, `look-outside-frame` routes among context checks, and `rethink-goal` composes the goal operators. The catalog's `dependencies` fields describe direct calls, not every transitive dependency. Cycle and missing-child checks are performed by the Pattern Markdown compiler.

## Attribution

Inspired by Thomas Wedell-Wedellsborg's _What's Your Problem?_. These are original Patternverse adaptations, not reproduced book text or official implementations by the author.
