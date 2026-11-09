---
id: dataviz-show-duration-explicitly
type: pattern
title: Show Duration Explicitly
summary: Represent an activity from its start to its finish when length and overlap matter.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Represent an activity from its start to its finish when length and overlap matter.

```patternverse-widget
{
  "src": "dataviz-show-duration-explicitly.html",
  "title": "Show Duration Explicitly explorer",
  "height": 800,
  "fallback": "Intake runs from hour 0 to 2, Review from 1 to 5, Build from 3 to 8, and Check from 7 to 9. Start markers omit duration. Intervals reveal overlaps, including Review and Build between hours 3 and 5."
}
```

## What to notice

**Start times** places each task at the hour it begins. It shows ordering, but not whether one task finishes before another starts.

Choose **Start to finish**. Intake spans hours zero to two, Review one to five, Build three to eight, and Check seven to nine. Bars preserve these intervals. Review and Build overlap from hour three to five; Build and Check overlap from seven to eight. Circles identify starts and squares identify finishes, while the common axis carries elapsed hours.

## Useful when

Use this for schedules, treatment episodes, sessions, running jobs, or any process where duration is part of the observation. Distinguish point events from intervals and label the time origin, unit, and endpoint conventions.

## Watch out for

An interval shows elapsed time, which may include waiting and pauses rather than continuous effort. Overlap does not prove that tasks share resources or depend on one another. Do not invent finish times for ongoing activities; mark an open endpoint instead. Dense schedules may need grouping or filtering. A display organized by task also differs from a resource calendar, even when both use horizontal bars.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-overview-plus-detail|Overview Plus Detail]]

## Sources

- [Further reading: Visualization of Time-Oriented Data](https://timeviz.net/)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/bar)
