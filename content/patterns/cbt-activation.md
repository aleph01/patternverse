---
id: cbt-activation
type: pattern
title: 'Behavioral Activation'
summary: 'Schedule a small, meaningful or rewarding activity rather than waiting for motivation.'
status: published
verses:
  - therapy
---

Low mood and withdrawal can make starting harder. Behavioral activation invites a small action connected to care, pleasure, connection, or meaning, without making productivity or improved mood a test of your worth.

## How to use it

1. What part of your day could use some care, enjoyment, connection, or meaning?
2. Choose one small, safe activity that fits your energy and circumstances. Rest and support can also be meaningful choices.
3. When and where could you try it? Choose a realistic time or an ordinary event to link it to.
4. What might get in the way? What smaller version or support would make it more manageable?
5. If you have tried the activity, what did you notice about mood, pleasure, or accomplishment? Otherwise, when could you review it? A lack of improvement is information, not failure.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.activation). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Behavioral Activation"
:output outcome
!ask direction {
    What part of your day could use some care, enjoyment, connection, or meaning?
}
!ask activity {
    Choose one small, safe activity that fits your energy and circumstances. Rest and support can also be meaningful choices.
}
!ask timing {
    When and where could you try it? Choose a realistic time or an ordinary event to link it to.
}
!ask fallback {
    What might get in the way? What smaller version or support would make it more manageable?
}
!ask review {
    If you have tried the activity, what did you notice about mood, pleasure, or accomplishment? Otherwise, when could you review it? A lack of improvement is information, not failure.
}
!show {
    Your notes, in your own words:

    1. {{direction}}
    2. {{activity}}
    3. {{timing}}
    4. {{fallback}}
    5. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
