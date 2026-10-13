---
id: cbt-worry-time
type: pattern
title: 'Worry Time / Stimulus Control for Worry'
summary: 'Give your what-if thoughts space in an adjustable timed writing session.'
status: published
verses:
  - therapy
---

This version of worry time is a writing session you can do here and now. Give your what-if thoughts a bounded space, rather than trying to solve every concern as it appears. You can explore several worries and follow their possible consequences: if something you fear happened, what might follow, and what would you be afraid of then?

The practice combines a timed worry period with optional exploration of a worry chain. It does not ask you to schedule a future session or complete a problem-solving or review step.

## How to use it

1. **Start your worry time.** The timer defaults to 10 minutes and can be adjusted from 1 to 30 minutes before starting. Continue to the writing prompt while it runs. You can pause or finish early.
2. **Give your worries some space.** Write down the "what if" thoughts on your mind. You can explore several worries. To follow one further, ask: "If that happened, what might happen next? What would I be afraid of then?" Let the chain of worries unfold without needing to solve it or reassure yourself as you write.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.worry-time). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background on scheduled worry postponement](https://www.cci.health.wa.gov.au/-/media/CCI/Mental-Health-Professionals/Generalised-Anxiety/Generalised-Anxiety---Worksheets/Generalised-Anxiety-Worksheet---01---Postpone-your-Worry.pdf). The timed writing and worry-chain sequence here is an original adaptation, not a reproduction of that worksheet or a full worry-exposure treatment protocol.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Worry Time / Stimulus Control for Worry"
:output outcome
!timer period {
    :duration 600
    :adjustable true
    :min 60
    :max 1800
    :blocking false
    Start your worry time

    The timer defaults to 10 minutes. Adjust it before starting if you prefer, then continue to write while it runs. You can pause or finish early.
}
!ask worries {
    Give your worries some space

    Write down the "what if" thoughts on your mind. You can explore several worries. To follow one further, ask: "If that happened, what might happen next? What would I be afraid of then?"

    Let the chain of worries unfold without needing to solve it or reassure yourself as you write.
}
!show {
    Your worry notes, in your own words:

    {{worries}}
}
= outcome "reflected"
-> end
```
