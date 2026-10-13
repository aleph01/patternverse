---
id: cbt-downward-arrow
type: pattern
title: 'Downward Arrow'
summary: 'Gently explore what an automatic thought might mean to uncover a deeper assumption or belief.'
status: published
verses:
  - therapy
---

The downward arrow follows a thought's personal meaning. Possible beliefs are hypotheses, not facts or diagnoses. There is no need to reach a core belief, uncover memories, or keep digging when the exercise feels unhelpful.

## How to use it

1. Choose a manageable automatic thought. What went through your mind?
2. If that thought were true, what would it mean to you about yourself, other people, or the world?
3. If that meaning were true, what would be significant about it? You can stop or write that you have gone far enough.
4. What tentative rule, assumption, or belief seems to be showing up? Leave it uncertain if nothing useful emerges.
5. How could you respond to that belief with accuracy and compassion? A belief is not a verdict about you. Stop here if it brings up overwhelming material.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.downward-arrow). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.cci.health.wa.gov.au/Resources/For-Clinicians/Anxiety). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Downward Arrow"
:output outcome
!ask thought {
    Choose a manageable automatic thought. What went through your mind?
}
!ask meaning {
    If that thought were true, what would it mean to you about yourself, other people, or the world?
}
!ask deeper {
    If that meaning were true, what would be significant about it? You can stop or write that you have gone far enough.
}
!ask belief {
    What tentative rule, assumption, or belief seems to be showing up? Leave it uncertain if nothing useful emerges.
}
!ask response {
    How could you respond to that belief with accuracy and compassion? A belief is not a verdict about you. Stop here if it brings up overwhelming material.
}
!show {
    Your notes, in your own words:

    1. {{thought}}
    2. {{meaning}}
    3. {{deeper}}
    4. {{belief}}
    5. {{response}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
