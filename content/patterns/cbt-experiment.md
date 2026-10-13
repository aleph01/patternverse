---
id: cbt-experiment
type: pattern
title: 'Behavioral Experiment'
summary: 'Test a belief with a small, safe real-world experiment and review what actually happens.'
status: published
verses:
  - therapy
---

An experiment asks what can be learned from an observation. It is not a way to prove yourself wrong, demand certainty, or turn a feared prediction into a dangerous test.

## How to use it

1. What specific everyday belief or prediction would you like to test? If useful, rate your confidence from 0 to 100.
2. What small, low-risk action could give you information? For example, make one short contribution in a routine meeting. Never test physical danger, medical advice, abuse, or another person's consent.
3. What observable outcome would support the prediction, and what would weaken it? How could you avoid treating a guess about someone's thoughts as an observation?
4. When could you try it? What appropriate support, stop condition, and review time would help? Nothing is carried out or scheduled automatically.
5. If you have already tried it, record what actually happened. Otherwise, note what you will observe and return after the experiment; do not invent a result.
6. Compare the observation with the prediction. What did you learn, including mixed or inconclusive evidence? Would you revise the belief or try a different safe test?

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.experiment). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.cci.health.wa.gov.au/Resources/For-Clinicians/Anxiety). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Behavioral Experiment"
:output outcome
!ask belief {
    What specific everyday belief or prediction would you like to test? If useful, rate your confidence from 0 to 100.
}
!ask test {
    What small, low-risk action could give you information? For example, make one short contribution in a routine meeting. Never test physical danger, medical advice, abuse, or another person's consent.
}
!ask evidence {
    What observable outcome would support the prediction, and what would weaken it? How could you avoid treating a guess about someone's thoughts as an observation?
}
!ask plan {
    When could you try it? What appropriate support, stop condition, and review time would help? Nothing is carried out or scheduled automatically.
}
!ask observed {
    If you have already tried it, record what actually happened. Otherwise, note what you will observe and return after the experiment; do not invent a result.
}
!ask learning {
    Compare the observation with the prediction. What did you learn, including mixed or inconclusive evidence? Would you revise the belief or try a different safe test?
}
!show {
    Your notes, in your own words:

    1. {{belief}}
    2. {{test}}
    3. {{evidence}}
    4. {{plan}}
    5. {{observed}}
    6. {{learning}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
