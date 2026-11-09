---
id: graphic-design-control-line-breaks
type: pattern
title: Control Line Breaks
summary: Choose where text continues onto a new line so phrasing, meaningful expressions and paragraph endings support the reading task without sacrificing adaptable layout.
status: published
verses: [graphic-design]
attribution: Original Patternverse article and fictional design examples. Existing generated photographs are reused unchanged with separately composed fixed-font typography. Only word allocation across lines changes; logical copy, type settings, column widths, anchors, baseline intervals and imagery remain fixed. No reader-performance measurements are claimed.
---

“Make room for / new ideas” is readable, but its ending leaves “for” waiting for the next line. “Make room / for new ideas” gives the two lines another useful relationship without changing a word.

Choose breaks for phrasing, expressions that belong together and the whole block’s shape. An ordinary wrap and a deliberate return differ from a new paragraph. Do not repair an awkward ending by silently shrinking, squeezing or deleting text.

## What to notice

![Matching workshop posters show Make room for new ideas on two lines. Before, for ends the first line. After, it begins the second line with new ideas. Font size, leading, first baseline, left edge, photograph and all supporting information remain unchanged.](../assets/graphic-design/breaks-phrase-poster.svg "Only the break changes: Make room for / new ideas becomes Make room / for new ideas. Size 64, leading 72 and measure 480 stay fixed.")

[Full-size comparison](../assets/graphic-design/breaks-phrase-poster.svg) · [Stacked narrow-screen view](../assets/graphic-design/breaks-phrase-poster-mobile.svg)

Move only “for” to the second headline line. Both arrangements fit the same 480-unit measure, with size 64, baseline interval 72 and identical anchors. The event’s £24 price and supporting details stay fixed.

The first line presents an action, the second its object. The changed pause supports a plausible phrasing without new punctuation. Line widths become less equal; that is acceptable. The original could serve an intentional second-line reveal of “new ideas.” There is no universal ban on prepositions at line endings.

## Two variations

### Keep a value with its unit

![Matching mug product cards show the same specification on two lines. Before, Each mug holds 320 is followed by ml. Dishwasher safe. After, Each mug holds is followed by 320 ml. Dishwasher safe. The revision keeps the number and unit together while making the line lengths less equal.](../assets/graphic-design/breaks-value-unit.svg "Only the break changes so value and unit share a line. All characters, size 28, leading 40, measure 300 and imagery stay fixed.")

[Full-size comparison](../assets/graphic-design/breaks-value-unit.svg) · [Stacked narrow-screen view](../assets/graphic-design/breaks-value-unit-mobile.svg)

Break before “320,” making the second specification line “320 ml. Dishwasher safe.” Preserve copy, size, leading, measure and the two-line block’s height. A meaningful expression stays together instead of being split to balance widths.

The longer second line uses more room. In live text, a nonbreaking space can protect just “320 ml” while surrounding words wrap; locking the whole sentence would be unnecessary. A narrower format may need more lines. Unicode documents no-break characters, but this artwork only demonstrates allocation.

### Recompose the ending as part of the paragraph

![Matching visitor guides show the same five-line paragraph. Before, reference. occupies the final line alone. After, your booking moves from the fourth line to the fifth, making the ending your booking reference. The first three lines and every other element remain unchanged.](../assets/graphic-design/breaks-paragraph-ending.svg "Only the final two lines are recomposed, ending your booking reference. Words, preceding lines, size 22, leading 31 and measure 460 stay fixed.")

[Full-size comparison](../assets/graphic-design/breaks-paragraph-ending.svg) · [Stacked narrow-screen view](../assets/graphic-design/breaks-paragraph-ending-mobile.svg)

The visitor-guide paragraph ends with “reference.” alone. Move “your booking” from line four to line five, leaving the first three lines and all type settings fixed. The final object, “your booking reference,” stays together without another line.

The preceding line becomes shorter. This is a preference, not an emergency: a short last line can be harmless or emphatic. If recomposition creates a worse gap or strained phrase, retain the original. Adobe distinguishes line-by-line fitting from paragraph composition that considers the block together.

## Useful when

Review breaks in short display phrases, specifications and conspicuous paragraph endings. Unicode identifies permissible opportunities; an allowed break need not be the best editorial choice. Read the words as well as their silhouette.

Control Line Length chooses the measure. This pattern chooses among endings that fit it, preserving wording and order. Neither equal line lengths nor punctuation at every ending is a general objective.

## Watch out for

Manual desktop returns can fail after copy, font, size or viewport changes. Browser wrapping and balancing can help short blocks but still need review. These illustrations store controlled arrangements; live text should adapt.

Limit unbreakable runs to what actually belongs together. WCAG’s Reflow criterion concerns preserving content and function without unnecessary two-dimensional scrolling at specified narrow equivalents. A preferred headline shape should not prevent that adaptation.

## Related patterns

- [[graphic-design-control-line-length|Control Line Length]] sets the measure that constrains endings.
- [[graphic-design-adjust-letter-spacing|Adjust Letter Spacing]] changes density, a separate intervention.
- [[graphic-design-adjust-line-spacing|Adjust Line Spacing]] sets the vertical relationship between lines.
- [[graphic-design-establish-a-clear-reading-order|Establish a Clear Reading Order]] coordinates movement between larger units.

## Sources and credits

[Unicode: Line Breaking Algorithm](https://www.unicode.org/reports/tr14/) · [Adobe: Text composition](https://helpx.adobe.com/indesign/desktop/format-and-style-text/composition-and-text-wrapping/set-text-composition.html) · [Unicode: Non-breaking characters](https://www.unicode.org/reports/tr14/#GL) · [MDN: text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap) · [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Content is fictional. Reused AI-generated photographs accompany licensed Source Sans 3 Regular. The static comparisons establish neither reader gains, responsive implementation, physical print results nor complete accessibility conformance.
