---
id: cbt-problem-solving
type: pattern
title: 'Problem Solving'
summary: 'Define a practical problem, compare options, try one manageable action, and review it.'
status: published
verses:
  - therapy
---

When a difficulty is practical and changeable, the most useful response may be a plan rather than examining whether your thoughts are distorted. Focus on the parts you can influence.

## How to use it

1. Define one concrete practical problem. What is happening, and which parts are within your influence?
2. What realistic improvement would be enough for now?
3. Generate several possible actions without deciding yet. Include asking for support or reducing the scope.
4. Compare the likely benefits, costs, constraints, and risks of the options.
5. Choose one manageable action. When and where could you try it, and what would a useful result look like?
6. If you have tried it, what happened and what would you adjust? Otherwise, choose a review point and what you will look for.

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.problem-solving). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.cci.health.wa.gov.au/Resources/For-Clinicians/Generalised-Anxiety-and-Worry). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Problem Solving"
:output outcome
!ask problem {
    Define one concrete practical problem. What is happening, and which parts are within your influence?
}
!ask goal {
    What realistic improvement would be enough for now?
}
!ask options {
    Generate several possible actions without deciding yet. Include asking for support or reducing the scope.
}
!ask compare {
    Compare the likely benefits, costs, constraints, and risks of the options.
}
!ask plan {
    Choose one manageable action. When and where could you try it, and what would a useful result look like?
}
!ask review {
    If you have tried it, what happened and what would you adjust? Otherwise, choose a review point and what you will look for.
}
!show {
    Your notes, in your own words:

    1. {{problem}}
    2. {{goal}}
    3. {{options}}
    4. {{compare}}
    5. {{plan}}
    6. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
