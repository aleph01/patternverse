---
id: cbt-activity-mood
type: pattern
title: 'Activity–Mood Monitoring'
summary: 'Record activities alongside mood, energy, pleasure, and mastery to notice useful patterns.'
status: published
verses:
  - therapy
---

A brief activity log can show connections that are hard to remember. Observations suggest possibilities, not proof of causation or a requirement to be productive. Include rest, ordinary tasks, care, and connection.

## How to use it

1. Choose a short period to observe, such as part of today. What activities did you do, and roughly when?
2. Alongside each activity, note mood and energy from 0 to 10 if useful. You can also note pleasure and mastery or accomplishment. Use the same meaning for your ratings each time.
3. What else was relevant, such as sleep, company, pain, or demands? Include rest and care rather than treating them as inactivity.
4. Across these observations, what seems associated with feeling better, worse, or unchanged? One entry cannot establish a reliable pattern.
5. What small activity would you like to repeat, adjust, or observe again? Keep monitoring brief and stop if it becomes burdensome.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.activity-mood). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.cci.health.wa.gov.au/Resources/For-Clinicians/Depression). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Activity–Mood Monitoring"
:output outcome
!ask period {
    Choose a short period to observe, such as part of today. What activities did you do, and roughly when?
}
!ask ratings {
    Alongside each activity, note mood and energy from 0 to 10 if useful. You can also note pleasure and mastery or accomplishment. Use the same meaning for your ratings each time.
}
!ask context {
    What else was relevant, such as sleep, company, pain, or demands? Include rest and care rather than treating them as inactivity.
}
!ask patterns {
    Across these observations, what seems associated with feeling better, worse, or unchanged? One entry cannot establish a reliable pattern.
}
!ask next {
    What small activity would you like to repeat, adjust, or observe again? Keep monitoring brief and stop if it becomes burdensome.
}
!show {
    Your notes, in your own words:

    1. {{period}}
    2. {{ratings}}
    3. {{context}}
    4. {{patterns}}
    5. {{next}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
