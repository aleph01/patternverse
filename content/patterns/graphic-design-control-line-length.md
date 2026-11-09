---
id: graphic-design-control-line-length
type: pattern
title: Control Line Length
summary: Set the width available to prose so lines support the reading task, allowing natural reflow while preserving readable type and accommodating the surrounding layout.
status: published
verses: [graphic-design]
attribution: Original Patternverse article and fictional design examples. Existing generated photographs are reused unchanged. Typography is composed separately with a fixed licensed font; only the prose measure and its necessary line wrapping change. Line counts describe the saved artwork, not measured reading performance.
---

A landscape guide sets prose across the full page. It looks economical, but every return to the next line travels a long distance. A care note has the opposite problem: a narrow column fragments connected sentences.

Adjust the **measure**, the width available to a line. Start with suitable letterforms and readable size, then narrow, widen or cap the prose independently of the surrounding page. Character targets guide inspection; they do not replace it.

## What to notice

![Two otherwise identical landscape visitor guides appear one above the other. Before, the paragraph spans almost the full page and occupies four lines. After, its left edge and first baseline stay fixed while a narrower measure produces six lines. The title, photograph, footer, type size and leading remain unchanged.](../assets/graphic-design/line-length-visitor-guide.svg "Only prose width changes, 725→480 units, with natural reflow. Copy, type size, leading, starting anchor and imagery stay fixed.")

[Full-size comparison](../assets/graphic-design/line-length-visitor-guide.svg) · [Stacked narrow-screen view](../assets/graphic-design/line-length-visitor-guide-mobile.svg)

Reduce the visitor-guide paragraph from 725 to 480 units, preserving size 20, leading 28, left edge, first baseline and every word. Four lines become six. Substantially filled lines fall from 83–85 characters to 52–57.

The return distance shortens while the photograph and page retain their breadth. This costs paragraph height and leaves space on the right. The original lies near the upper end of common guidance, not beyond a magical failure threshold; it might suit a brief caption or scanning task.

## Two variations

### Widen prose that breaks into fragments

![Two identical photographic mug-care cards show the same paragraph. Before, a narrow column produces eight lines of 14–18 characters. After, the column becomes wider and the same text occupies four lines. The left edge, first baseline, font, size, leading, image and footer remain unchanged.](../assets/graphic-design/line-length-care-note.svg "Only prose width changes, 180→390 units, with natural reflow. Copy, type size, leading, starting position and photograph stay fixed.")

[Full-size comparison](../assets/graphic-design/line-length-care-note.svg) · [Stacked narrow-screen view](../assets/graphic-design/line-length-care-note-mobile.svg)

Increase a mug-care paragraph’s width from 180 to 390 units, keeping size 22 and leading 30. Eight lines become four; filled lines grow from 14–18 characters to 38–40.

More of each sentence stays together before a return. A short care note need not imitate a book’s longer measure. A constrained package panel, marginal label or shaped verse may justify the narrow version. When width is genuinely unavailable, reconsider format or structure instead of forcing a target.

### Give prose and a table different widths

![Two identical landscape workshop reports appear vertically. Before, the summary uses the same broad width as the table. After, only the summary is capped to a narrower reading measure and wraps into four lines instead of three. The table, its columns and figures, the photograph, title and footer remain unchanged.](../assets/graphic-design/line-length-report-scope.svg "Only summary width changes, 725→480 units, with natural reflow. The table retains its full width, columns and values; other elements stay fixed.")

[Full-size comparison](../assets/graphic-design/line-length-report-scope.svg) · [Stacked narrow-screen view](../assets/graphic-design/line-length-report-scope-mobile.svg)

Cap the review summary at 480 units while its table retains 725. The summary grows from three lines to four; Clay’s 12 sessions/84 places and Print’s 12 sessions/96 places remain in their original columns.

The table keeps room for comparison while the paragraph gets a reading measure. Its right edge no longer matches the table, and it uses more height. Precise prose-to-column alignment might warrant another arrangement. These static pages do not implement a responsive maximum-width rule.

## Useful when

Adjust measure when reading involves unusually long sweeps or frequent, fragmenting returns. Longer lines increase return distance; very short ones require more returns. Typeface, size, language and leading change what any physical width contains.

USWDS offers 45–90 characters and a 66-character target for longer Latin-script text as guidance, with contextual exceptions. Examine several filled lines including spaces, not the short last line. Dyson and Haselgrove’s experiment found task-dependent differences; it does not establish one optimum for every screen, reader or script.

## Watch out for

Shrinking type changes legibility and characters per line together. Address width directly. Do not impose prose targets on headlines, tables or poetry, or freeze manual breaks to conceal an unsuitable measure. Live text should reflow as space changes.

WCAG’s Level AAA Visual Presentation criterion includes a mechanism for widths no greater than 80 characters/glyphs, or 40 for CJK, among other conditions. Those need not be authored defaults. One chosen column width is not an accessibility certificate and should not cause horizontal scrolling.

## Related patterns

- [[graphic-design-adjust-line-spacing|Adjust Line Spacing]] coordinates the return between lines.
- [[graphic-design-match-typeface-to-context|Match Typeface to Context]] changes what fits a given width.
- [[graphic-design-establish-a-grid|Establish a Grid]] supplies candidate spans.
- [[graphic-design-control-line-breaks|Control Line Breaks]] reviews useful endings within the chosen measure.

## Sources and credits

[USWDS: Measure](https://designsystem.digital.gov/components/typography/#measure-line-length) · [Dyson and Haselgrove, 2001](https://doi.org/10.1006/ijhc.2001.0458) · [W3C: Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html).

Content is fictional. Reused AI-generated photographs accompany licensed Source Sans 3 Regular; wrapping was measured with that font. No reader study, print trial, implemented responsive behavior or complete accessibility evaluation is claimed.
