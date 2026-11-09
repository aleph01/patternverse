# Hierarchical needs library

Dataset edition 0.2.0 · English · 2026-11-02. Article and practice added 2026-11-04.

The canonical dataset is [needs.json](../../content/assets/libraries/needs.json).
It contains **68 selectable needs**, **8 browsing areas**, and **22 subgroups**
(98 records altogether). The **Identify Needs** article uses it in a reference
browser and an interactive selection practice. The article belongs to the
**Self-Understanding** collection in Therapy & Wellbeing, alongside Identify
Cognitive Distortions and Identify Limiting Beliefs.

## Basis and editorial choices

The vocabulary starts from the Center for Nonviolent Communication's **Needs
Inventory**. The source presents a reflective inventory rather than an exhaustive
or definitive list. This dataset is an NVC-informed editorial adaptation, not an
official CNVC taxonomy or a validated assessment. The eight areas and intermediate
groups are new browsing arrangements; their nesting does not imply that one need
is more important, more fundamental, or a prerequisite for another.

Source: [CNVC-authored inventory, page 4, hosted by the University of British Columbia](https://allard.ubc.ca/sites/default/files/2021-08/NVC%20process%20with%20feelings%20and%20needs%20inventory.pdf).
The accompanying NVC process distinguishes needs and values from specific actions
or preferred strategies (page 1).

Source attribution, retained as requested by the inventory:

> © 2005 by Center for Nonviolent Communication  
> Website: www.cnvc.org · Email: cnvc@cnvc.org · Phone: +1.505-244-4041

The descriptions, recognition cues, aliases, IDs, and hierarchy are newly authored
for Patternverse. `source_terms` traces a record to source vocabulary, including
headings, without suggesting that CNVC supplied its definition or placement.
Empty `source_terms` marks an editorial addition: **Privacy and Solitude**.
The consent aspect of **Choice** is also an editorial extension of the source's
choice vocabulary. These additions make boundaries easier to find.

Some source terms are separated for selection, such as sleep and waking rest;
others are combined, such as learning/growth and efficacy/effectiveness. Care is a
broad entry drawing on love, nurturing, and compassion. These choices are editable
and do not assert that the terms are interchangeable in every context.

## Browsing hierarchy

The table shows each need in its first parent group. Additional placements are
listed afterward; they reference the same record rather than duplicate it.

| Area                         | Group                          | Selectable needs                                                             |
| ---------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Body and physical well-being | Basic sustenance               | Air, Food, Water, Shelter                                                    |
|                              | Rest and recovery              | Sleep, Rest                                                                  |
|                              | Movement and bodily connection | Movement, Touch, Sexual expression                                           |
| Safety and stability         | Protection from harm           | Physical safety, Emotional safety                                            |
|                              | Reliability and continuity     | Stability, Predictability, Trust                                             |
|                              | Dignity and fair treatment     | Respect, Fairness                                                            |
| Connection and belonging     | Having a place with others     | Belonging, Acceptance, Inclusion and participation, Companionship, Community |
|                              | Being understood               | Empathy, Being heard, Being seen and known                                   |
|                              | Care and closeness             | Affection, Intimacy, Care, Support, Reciprocity                              |
| Autonomy and freedom         | Choice and agency              | Choice, Freedom, Independence                                                |
|                              | Personal space and flexibility | Privacy, Personal space, Solitude, Spontaneity                               |
| Authenticity and expression  | Being true to oneself          | Authenticity, Integrity, Self-respect                                        |
|                              | Speaking and expressing        | Self-expression, Honesty                                                     |
| Understanding and growth     | Making sense of things         | Clarity, Understanding, Awareness and presence                               |
|                              | Learning and capability        | Learning and growth, Competence, Challenge, Effectiveness                    |
|                              | Discovery and invention        | Discovery, Creativity, Stimulation                                           |
| Meaning and contribution     | Direction and significance     | Purpose, Hope, Mattering                                                     |
|                              | Taking part and contributing   | Contribution, Cooperation, Appreciation                                      |
|                              | Making room for life events    | Celebration, Mourning                                                        |
| Play, beauty, and harmony    | Play and enjoyment             | Play, Joy, Humor                                                             |
|                              | Ease and peaceful surroundings | Peace, Ease, Order                                                           |
|                              | Beauty and wider connection    | Beauty, Inspiration, Connection with something larger                        |

Additional routes:

- **Care and closeness:** Touch, Emotional safety, Trust, Respect.
- **Taking part and contributing:** Fairness, Inclusion and participation.
- **Reliability and continuity:** Support.
- **Discovery and invention:** Self-expression.
- **Being understood:** Appreciation.
- **Having a place with others:** Connection with something larger.

## Data contract

The resource uses the existing Patternverse `record_type` / `records` format.
Every record has the same fields, so the current typed data-library mechanism can
load it without a new parser. Domain-specific constraints are described below;
the declared type itself only checks the text and list shapes.

| Field              | Meaning                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | Stable semantic ID, independent of label and placement.                                                                                      |
| `kind`             | `category` for navigation or `need` for a selectable entry.                                                                                  |
| `label`            | English display label.                                                                                                                       |
| `description`      | Short explanation to help distinguish neighboring entries.                                                                                   |
| `parent_ids`       | Ordered parent IDs. Empty for areas; one area for a subgroup; one or more subgroups for a need. The first is its default browsing placement. |
| `aliases`          | Search vocabulary; these are aids to discovery, not claims of exact synonymy.                                                                |
| `recognition_cues` | Two tentative first-person phrases for each need. Categories have none.                                                                      |
| `source_terms`     | Source inventory vocabulary used for the editorial adaptation. Categories have none.                                                         |

The graph has three levels: **area → subgroup → need**. Category IDs have `area_`
or `group_` prefixes. Need IDs have no placement prefix, so changing a category
does not rename a saved choice. All parent references must resolve to categories;
needs are leaves; cycles, duplicate IDs, and duplicate parent links are invalid.
Every category must contain at least one selectable descendant.

For example, `touch` has parents `group_embodiment` and `group_care_and_closeness`.
A participant browsing either branch selects the same `touch` record. Renderers
must deduplicate by ID and use a set of selected need IDs across all branches.
Array order is the editorial display order among siblings; search can use another
order without changing identity. Resolve references by ID, not array position;
additional parents may occur later in the file.

Need records are neutral: they do not encode whether a need is met, unmet, urgent,
or important to a particular person. Those judgments belong to practice answers.
Recognition cues are possible ways into a need, not rules for inferring it from a
person's words. Participants may select several entries, select none when the
practice permits it, or supply their own wording through a separate practice field.
Do not store “Other” or “Unsure” as canonical needs.

Only `kind: need` records should be selectable in this draft. Opening a category
must not silently select every descendant. Selecting a category as a broad need
would require a separate, explicit design decision.

## Article and practice registration

`content/patterns/identify-needs.md` declares the public `commons:needs` resource:

```yaml
libraries:
  - id: needs
    src: ../assets/libraries/needs.json
```

The compiler registers `commons:needs` through the existing mechanism.
Practices can import the typed records using:

```pattern
:import needs from "commons:needs"
```

See [reference data and structured results](../pattern-markdown/data-imports.md).
The practice uses the existing selector through the exact bundled import
`commons/needs-selector@0.1.0`. This ships with the app and requires no private
installation. It takes an optional situation, offers all 68 needs with the shared
24-word Simple view, and leaves two optional fields for personal wording and
contextual meaning. Selecting no entries is valid. No AI is used. Selected needs,
personal wording, situation, and meaning are typed outputs. The normal runner
handles confirmation, plain-checklist fallback, and optional practice-history saving.

`apps/web/src/lib/widgets/bundled.ts` provides only shipped packages. The local
dependency resolver includes these alongside installed immutable releases; local
packages cannot replace a shipped reference. Rendering without an installation
grant requires the complete package to match the shipped code, manifest, and data.
Merely copying its identity is insufficient. Checkpoints retain their package bytes;
changing a released bundled package requires a new exact version and retaining
older versions for existing practices.

The article reference browser is separate from the practice selector. It displays
meanings, related search vocabulary, and recognition phrases without collecting
answers. Search covers all 68 entries even in Simple. It reuses the selector's CSS
and shortlist, with the flat, light article presentation used by the belief browser.
It opens immediately inside the existing isolated article host, adjusts to its
content height, and makes no external requests or storage writes.

Edit the browser template at
`apps/web/src/lib/article-widgets/needs/browser.html`, then regenerate its bundled
asset with `node apps/web/scripts/build-needs-browser.mjs`. Both browsers share
`apps/web/src/lib/widgets/needs-starters.json`; regenerate after changing the
shortlist, shared CSS, or canonical data. The browser tests check for drift.

## Overlap cleanup in draft 0.2.0

Two entries have been consolidated while keeping the surviving IDs:

| Retired draft ID | Surviving ID | Result                                                                              |
| ---------------- | ------------ | ----------------------------------------------------------------------------------- |
| `participation`  | `inclusion`  | **Inclusion and participation**, reachable through both belonging and contribution. |
| `consent`        | `choice`     | **Choice**, including voluntary agreement, refusal, and changing one's mind.        |

These are explicit editorial merges, not assertions that every nuance is
synonymous. If importing answers from draft 0.1.0, map retired IDs as above,
deduplicate the resulting IDs, and resolve labels from this draft. Keep any original
saved snapshot intact. No runtime migration from draft answers is included.
Retired IDs must not be reused.

The remaining close neighbors have different selection purposes:

- **Choice** concerns meaningful options and voluntary decisions; **Freedom**
  concerns external restrictions on action and ways of living.
- **Clarity** concerns specific, unambiguous information; **Understanding** concerns
  making sense of how or why things happen.
- **Learning and growth** concerns developing abilities; **Competence** concerns
  having and using them; **Effectiveness** concerns influencing outcomes.
- **Respect** concerns treatment by others; **Self-respect** concerns treatment of
  oneself.

Aliases are related search phrases. They must not be displayed as a list of exact
synonyms. Broad **love** was removed as an alias of Care; **equality** and **equity**
were removed as aliases of Fairness because they name different ways of evaluating
fair treatment. The source term **equality** remains in `source_terms` for provenance.
The shared alias **dignity** was replaced by phrases that distinguish Respect from
Self-respect. Former labels **participation** and **voluntary participation** remain
searchable through the surviving entries.

## Maintaining the library

Review descriptions and close neighbors before changing IDs. Keep IDs when labels,
aliases, cues, or parent groups change. Do not reuse a retired ID for a different
meaning. Splits and merges need an explicit migration decision for saved answers.
Source wording remains in `source_terms`; new browsing vocabulary belongs in
`aliases`. Preserve the attribution when distributing this adaptation.

Validate field types, unique IDs, resolvable parents, three-level placement, absence
of cycles, category descendants, and two cues per need after editing. The file must
also stay within the existing library limits of 1,000 records and 1 MiB.

The needs selector is now available as a local widget template in My Workspace → Widgets. See
[Local widgets](../pattern-markdown/local-widgets.md) for authoring, practice insertion,
the canonical catalogue/shortlist separation, and the trusted checklist fallback.

## Recognition queries for editorial retrieval

- I know I am upset but cannot tell what I need.
- Everything feels like another demand.
- I want space but also want to feel close to people.
- I cannot tell whether I need rest or help.
- I keep agreeing and then feeling resentful.
- I need a better word for what matters here.
- I want to understand why that afternoon felt so good.
- I know the solution I want but not what I am hoping it will give me.
- I want to express a concern without telling someone what they must do.
- I want to browse needs without having AI interpret me.
