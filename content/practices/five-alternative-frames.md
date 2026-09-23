---
id: five-alternative-frames
type: practice
title: Five Alternative Frames
summary: Generate several interpretations of the same situation.
status: published
verses:
  - creativity
implements:
  - creative-reframing
duration_minutes: 10
---

Use this practice when one interpretation of a situation has started to feel inevitable.

## Instructions

Describe the current frame, then deliberately produce five alternatives. Do not evaluate them until
all five exist.

```patternverse-practice
title: Five Alternative Frames Practice
introduction: Generate several interpretations before evaluating any of them.
steps:
  - id: describe
    title: Describe the situation
    blocks:
      - id: situation
        type: text-input
        label: Describe the situation you are working with.
        multiline: true
        required: true
  - id: current-frame
    title: Name the current frame
    blocks:
      - id: current-frame-response
        type: text-input
        label: What is your current interpretation?
        multiline: true
        required: true
  - id: alternatives
    title: Generate alternatives
    blocks:
      - id: alternatives-response
        type: text-input
        label: Write five substantially different ways to frame the same situation.
        multiline: true
        required: true
```
