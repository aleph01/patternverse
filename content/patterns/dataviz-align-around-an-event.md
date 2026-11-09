---
id: dataviz-align-around-an-event
type: pattern
title: Align Around an Event
summary: Shift each timeline to a shared event origin to compare its surrounding trajectory.
status: published
verses: [data-visualization]
tags: [data-visualization, visual-lessons]
---

Shift each timeline to a shared event origin to compare its surrounding trajectory.

```patternverse-widget
{
  "src": "dataviz-align-around-an-event.html",
  "title": "Align Around an Event explorer",
  "height": 800,
  "fallback": "Atlas launches on calendar day 4; Birch on day 10. Both are observed from two days before to three days after launch. Aligning launch at zero reveals similarly rising trajectories, without demonstrating that launch caused the changes."
}
```

## What to notice

In **Calendar day**, Atlas launches on day four and Birch on day ten. Their rising readings appear in separate sections of the horizontal axis. Dashed lines mark the two launch dates.

Switch to **Days since launch**. Both events now occur at zero. The same observations span two days before to three days after each launch, revealing similarly shaped rises. Negative positions mean before launch and positive positions after it. The readings and their elapsed spacing stay unchanged; only the time origin moves.

## Useful when

Use this to compare launches, repairs, admissions, outages, or other episodes occurring at different dates. Define the event precisely and show sufficient context before and after it. Preserve calendar dates in supporting data when wider conditions matter.

## Watch out for

Alignment alone cannot show that the event caused a change. Calendar conditions, selection, prior trends, and different event definitions may explain apparent similarities. Repeated events need a rule for assigning observations to episodes. Unequal follow-up should appear as missing coverage, not invented values. Avoid averaging aligned trajectories without also showing how much evidence supports each relative time.

## Related patterns

[[dataviz-preserve-elapsed-time|Preserve Elapsed Time]] [[dataviz-compare-cohorts-at-equal-age|Compare Cohorts at Equal Age]]

## Sources

- [Further reading: Visualization of Time-Oriented Data](https://timeviz.net/)
- [Observable Plot documentation](https://observablehq.github.io/plot/marks/line)
