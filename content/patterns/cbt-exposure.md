---
id: cbt-exposure
type: pattern
title: 'Exposure'
summary: 'Plan a gradual approach to a safe, everyday situation you fear or avoid.'
status: published
verses:
  - therapy
---

Exposure means approaching feared situations gradually instead of organizing life around avoidance. Clinical exposure can also involve sensations, memories, or uncertainty. This self-help pattern is deliberately narrower: it supports planning for manageable, objectively safe everyday situations, not trauma processing, deliberately induced physical symptoms, or a do-it-yourself OCD treatment.

## How to use it

1. What objectively safe, everyday situation are you avoiding? Do not choose real danger, abuse, traumatic memories, medical risks, or anything that disregards another person's consent.
2. List a few possible approach steps from easier to harder. You may add rough difficulty ratings from 0 to 100. Keep the steps voluntary and manageable.
3. Which easiest step feels workable? What do you predict will happen, and what would you like to learn?
4. When and where might you try that step? What appropriate support would help? Do not remove genuine safety precautions or change prescribed treatment.
5. If you have tried the step, what actually happened? Otherwise, leave a plan for what to observe. Learning matters more than forcing anxiety to drop.
6. Would you repeat, make the step smaller, pause, or seek qualified support? You control the pace. If distress is overwhelming or this involves trauma, OCD, or physical symptoms, seek professional guidance.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.exposure). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/facing-your-fears/). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Exposure"
:output outcome
!ask situation {
    What objectively safe, everyday situation are you avoiding? Do not choose real danger, abuse, traumatic memories, medical risks, or anything that disregards another person's consent.
}
!ask ladder {
    List a few possible approach steps from easier to harder. You may add rough difficulty ratings from 0 to 100. Keep the steps voluntary and manageable.
}
!ask first {
    Which easiest step feels workable? What do you predict will happen, and what would you like to learn?
}
!ask plan {
    When and where might you try that step? What appropriate support would help? Do not remove genuine safety precautions or change prescribed treatment.
}
!ask observed {
    If you have tried the step, what actually happened? Otherwise, leave a plan for what to observe. Learning matters more than forcing anxiety to drop.
}
!ask next {
    Would you repeat, make the step smaller, pause, or seek qualified support? You control the pace. If distress is overwhelming or this involves trauma, OCD, or physical symptoms, seek professional guidance.
}
!show {
    Your notes, in your own words:

    1. {{situation}}
    2. {{ladder}}
    3. {{first}}
    4. {{plan}}
    5. {{observed}}
    6. {{next}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
