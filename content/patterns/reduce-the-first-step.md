---
id: reduce-the-first-step
type: pattern
title: Reduce the First Step
summary: Lower the initial commitment until starting becomes easy.
status: published
aliases:
  - Tiny First Step
verses:
  - learning
---

When beginning feels disproportionately difficult, the apparent size of the commitment can create
resistance.

## Pattern

Reduce the first action until it feels almost trivial. Treat beginning as a separate task from
finishing.

## Example

Opening the document and writing one deliberately imperfect sentence may be enough.

## Connections

The technique works partly by reducing the demands placed on [[working-memory]].

```patternverse-language
:language 1
:title "Reduce the First Step Practice"

step_1 = !form {
  :title "Name the task"
  !show {
Find a beginning small enough to try without committing to the whole task.
  }
  !ask task {
    :required true
    :multiline true
What are you finding hard to start?
  }
}

step_2 = !form {
  :title "Reduce the commitment"
  !show {
Separate beginning from finishing. Choose an action you could do in a minute or two,
even if you stop immediately afterwards.
  }
  !ask first-step {
    :required true
    :multiline true
What is one very small first action?
  }
}

step_3 = !form {
  :title "Try or adjust"
  !show {
Try the first action when you are ready. If it still feels too large, make it smaller.
You do not need to promise yourself that you will finish the whole task.
  }
  !ask adjustment {
    :required false
    :multiline true
What did you notice, or how could you make the first action smaller?
  }
}

-> end
```
