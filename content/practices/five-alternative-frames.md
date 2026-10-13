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

```patternverse-language
:language 1
:title "Five Alternative Frames Practice"

step_1 = !form {
  :title "Describe the situation"
  !show {
Generate several interpretations before evaluating any of them.
  }
  !ask situation {
    :required true
    :multiline true
Describe the situation you are working with.
  }
}

step_2 = !form {
  :title "Name the current frame"
  !ask current-frame-response {
    :required true
    :multiline true
What is your current interpretation?
  }
}

step_3 = !form {
  :title "Generate alternatives"
  !ask alternatives-response {
    :required true
    :multiline true
Write five substantially different ways to frame the same situation.
  }
}

-> end
```
