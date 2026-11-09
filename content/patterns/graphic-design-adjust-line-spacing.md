---
id: graphic-design-adjust-line-spacing
type: pattern
title: Adjust Line Spacing
summary: Set the interval between lines to support the reading task, separating lines enough to follow while keeping connected text cohesive.
status: published
verses: [graphic-design]
attribution: Original Patternverse article and fictional design examples. Existing generated photographs are reused unchanged; typography is composed separately. Only the designated baseline intervals and consequent line positions change. No reader-performance measurements are claimed.
---

A journal paragraph looks dense even though its letters are large enough. On a care card, the opposite happens: generous gaps make one paragraph look like separate strips. Adjust the interval between lines so readers can distinguish them without losing the connection.

In typography, **leading** is the baseline-to-baseline interval, not the visible white gap between letter shapes. A 12/16 setting means 12-point type on 16-point baselines. Keep type size and leading separate when diagnosing the problem.

## What to notice

![Two matching studio journal pages show a workspace photograph above six lines of prose. Before, the lines form a dense block. After, their baseline interval increases while the first baseline, line breaks, font, letter size, photograph and all other elements stay fixed.](../assets/graphic-design/leading-journal.svg "Only baseline interval changes, 23→33 units at size 22. All six lines, words, starting anchors and imagery stay fixed.")

[Full-size comparison](../assets/graphic-design/leading-journal.svg) · [Stacked narrow-screen view](../assets/graphic-design/leading-journal-mobile.svg)

Common’s journal uses size-22 text on a 23-unit interval. Increase only the interval to 33: the six lines separate while the font, line breaks and first baseline stay fixed. Across five intervals, the paragraph becomes 50 units taller. That additional space reduces its density but also brings it closer to the footer; a fuller page would need room to expand.

The useful relationship is **separation within a cohesive block**. More leading is helpful only while the lines still belong together. USWDS recommends different settings for sustained prose and short headings, rather than one multiplier everywhere. [Typography guidance](https://designsystem.digital.gov/components/typography/#line-height).

## Two variations

### Bring loose prose together

![Two matching mug-care cards retain the same photograph and four lines of instructions. Before, a 48-unit baseline interval spreads the prose into widely separated strips. After, a 33-unit interval brings it into a more cohesive paragraph. Font size, line breaks and first baseline remain fixed.](../assets/graphic-design/leading-care-card.svg "Only baseline interval changes, 48→33 units at size 22. Copy, four lines, starting position and photograph stay fixed.")

[Full-size comparison](../assets/graphic-design/leading-care-card.svg) · [Stacked narrow-screen view](../assets/graphic-design/leading-care-card-mobile.svg)

Field’s care instructions use a 48-unit interval at size 22. “Dry before” and “storing the mug” are separated by a conspicuous gap even though the sentence continues. Reducing leading to 33 brings the four lines into one paragraph and saves 45 units of height. Wider spacing could be appropriate for independent entries, annotations or a reader who prefers an expanded setting.

### Keep a short headline connected

![Two matching workshop posters show the title Make something, followed by with your hands. Before, the title lines have a wide 91-unit baseline interval. After, the interval is 58 units. Their size, wording and first baseline stay fixed, as do the studio photograph and event details below.](../assets/graphic-design/leading-workshop-poster.svg "Only headline baseline interval changes, 91→58 units at size 52. Both lines, first baseline, supporting text and imagery stay fixed.")

[Full-size comparison](../assets/graphic-design/leading-workshop-poster.svg) · [Stacked narrow-screen view](../assets/graphic-design/leading-workshop-poster-mobile.svg)

The workshop title “Make something / with your hands.” inherits a loose 91-unit interval at size 52. Reducing it to 58 moves only the second line upward by 33 units. The invitation becomes a closer pair, followed by a larger pause before the unchanged event details. Check accents and descenders before tightening another title; this setting is specific to these letterforms.

## Useful when

Adjust leading when successive lines are difficult to distinguish or connected prose looks fragmented. Judge actual copy at its intended size, alongside the typeface and line length. These artwork values demonstrate relationships, not prescribed print sizes.

For digital text, a unitless CSS `line-height` scales with the element’s own font size. [MDN explains the inheritance behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-height).

## Watch out for

Leading cannot repair tiny letters, poor contrast or an excessively wide column. Use paragraph spacing to separate paragraphs; increasing every line gap changes the wrong relationship. A generous display treatment can also be intentional when separate phrases deserve separate attention.

Allow layouts to expand with user settings. WCAG’s Text Spacing criterion requires supported text to survive combined spacing overrides without losing content or functionality. Its 1.5× line-height value is part of that test, not a mandatory authored default. [W3C: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

## Related patterns

- [[graphic-design-control-line-length|Control Line Length]] adjusts the horizontal distance a reader must traverse.
- [[graphic-design-match-typeface-to-context|Match Typeface to Context]] selects letterforms whose proportions affect apparent openness.
- [[graphic-design-establish-a-type-scale|Establish a Type Scale]] sets recurring sizes; leading needs its own role-specific settings.
- [[graphic-design-use-spacing-to-express-relationships|Use Spacing to Express Relationships]] handles distances between content groups.

Further comparison: [relate leading to type size](../assets/graphic-design/proportion-material-study.svg) · [stacked view](../assets/graphic-design/proportion-material-study-mobile.svg).

## Sources and credits

USWDS supplies design guidance, MDN documents CSS, and W3C defines the accessibility test. The chosen settings are editorial examples; reader outcomes have not been measured.

All content is fictional. AI-generated photographs and licensed Source Sans 3 Regular are reused unchanged. These static comparisons do not establish print or implementation accessibility.
