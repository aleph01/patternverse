# Website style ownership

`src/app.css` is the ordered composition root, imported once by the root layout.
It deliberately contains only imports. These files are **global CSS**, not scoped
component styles or independently loadable bundles. Moving rules into files does
not change their selector specificity, load order, or route availability.

| Owner                                                     | File(s), relative to this directory                 |
| --------------------------------------------------------- | --------------------------------------------------- |
| Shared design decisions                                   | `tokens.css`                                        |
| Reset, document, navigation, PWA status                   | `site.css`                                          |
| Home hero and feature cards                               | `features/home.css`, `features/home-responsive.css` |
| Library introduction                                      | `features/library-intro.css`                        |
| Workspace, organizer, OAuth callback                      | `features/workspace.css`                            |
| Shared section headings                                   | `headings.css`                                      |
| Verse tiles, colors, disclosures                          | `features/verses.css`                               |
| Library filters, search, entity lists                     | `features/library.css`                              |
| Entity editor, lookup, legacy practice builder            | `features/editor.css`                               |
| Entity headers, Markdown, diagrams, practice entry points | `features/article.css`                              |
| Practice preview, runner, timers, navigation              | `features/practice.css`                             |
| Usefulness and related-content panels                     | `features/relationships.css`                        |
| Footer                                                    | `footer.css`                                        |
| About and installation pages                              | `features/about.css`                                |
| Existing cross-feature breakpoints                        | `responsive-compatibility.css`                      |
| Mira base, before route-owned overrides                   | `../mira/base.css`                                  |
| Final shared reduced-motion overrides                     | `reduced-motion.css`                                |

## Cascade contract

The composition preserves the original ordered rules, declarations, and media
queries. Tokens precede foundations; bases precede responsive overrides; shared
reduced-motion rules come last. Do not alphabetize imports or add cascade layers.
The stylesheet composition tests guard the loading boundary; browser tests check
the resulting surfaces and breakpoints.

Some inherited selectors intentionally still span owners: home section spacing
also applies to library/workspace; library-intro retains the workspace surface;
workspace buttons share rules with usefulness controls; verse hover rules also
style Markdown links; article entry-point rules share practice heading styles;
practice includes the shared visually-hidden utility. These are compatibility
rules, not new duplicate definitions. Separating individual shared selectors is
a later, behavior-checked change, not part of this file-ownership extraction.

The existing mixed breakpoint blocks remain together in
`responsive-compatibility.css`. When changing a feature, check its corresponding
rules there too. Extract a breakpoint only after accounting for cross-feature
selectors and preserving the cascade; do not copy it into both files.

## What stays local

Existing Svelte `<style>` blocks, Mira's `workspace.css`, app-specific CSS,
`pattern-run.css`, worksheet styles, guide styles, and illustration styles keep
their current imports and overrides. In particular, Mira still needs `base.css`:
its route-owned stylesheet is an override, not a replacement. Embedded widgets
do not import this website composition root.

Add feature-only styling near its feature, and reusable design decisions to
`tokens.css` only when genuinely shared. Do not import the extracted bases again
from individual routes: duplicated or lazy loading would change cascade order.
