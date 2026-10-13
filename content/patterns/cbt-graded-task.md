---
id: cbt-graded-task
type: pattern
title: 'Graded Task Assignment'
summary: 'Break an overwhelming task into manageable steps and build from a small success.'
status: published
verses:
  - therapy
---

A graded task starts at a feasible level and increases gradually. The task is not a test of character, confidence, or worth. Success can mean learning that a step needs to be smaller.

## How to use it

1. What everyday task matters to you but feels overwhelming or hard to begin?
2. Break it into small steps in a workable order, from easiest to more demanding.
3. Choose the easiest useful first step. What version fits your current energy and resources?
4. When and where could you try it? What would count as starting, even if you stop there?
5. If you have tried it, what happened? Otherwise, decide when to review. Would you repeat, shrink the step, ask for support, or move to the next manageable step?

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.graded-task). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Graded Task Assignment"
:output outcome
!ask task {
    What everyday task matters to you but feels overwhelming or hard to begin?
}
!ask steps {
    Break it into small steps in a workable order, from easiest to more demanding.
}
!ask first {
    Choose the easiest useful first step. What version fits your current energy and resources?
}
!ask plan {
    When and where could you try it? What would count as starting, even if you stop there?
}
!ask review {
    If you have tried it, what happened? Otherwise, decide when to review. Would you repeat, shrink the step, ask for support, or move to the next manageable step?
}
!show {
    Your notes, in your own words:

    1. {{task}}
    2. {{steps}}
    3. {{first}}
    4. {{plan}}
    5. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
