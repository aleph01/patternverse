---
id: dataviz-align-repeating-cycles
type: pattern
title: Align Repeating Cycles
summary: Align observations by their position within a recurring cycle to expose repeated structure.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Align observations by their position within a recurring cycle to expose repeated structure.

```patternverse-widget
{
  "src": "dataviz-align-repeating-cycles.html",
  "title": "Align Repeating Cycles explorer",
  "height": 800,
  "fallback": "Each of three weeks has lower weekend demand and a midweek peak. Aligning Monday with Monday reveals the recurring weekly pattern while preserving each week as a separate series. The full timeline retains the sequence between weeks."
}
```

## What to notice

**Continuous days** preserves the sequence of all three weeks. Peaks and troughs recur, but comparing corresponding weekdays requires looking back across the timeline.

Switch to **Aligned weeks**. Monday now lines up with Monday, and each week keeps its own identity. All three show a midweek peak and a weekend trough. Week two is consistently higher than the others. Alignment reveals both a recurring weekly shape and differences between particular weeks; it does not replace them with a single average.

## Useful when

Use this for daily demand, weekday activity, seasonal measurements, or repeating operational schedules. Choose a cycle supported by the process, and retain a continuous view when longer-term change or sequence matters.

## Watch out for

Cycle boundaries are a design choice. Holidays, variable-length months, daylight-saving changes, and local time zones can disrupt correspondence. Repeated-looking shapes do not establish a stable seasonal mechanism. Averaging cycles can hide exceptions or changing levels. Keep individual cycles visible when those differences matter, and do not join the end of one cycle to its beginning unless the boundary is meaningful.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-small-multiples|Small Multiples]]

## Sources

- [Further reading: Visualization of Time-Oriented Data](https://timeviz.net/)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
