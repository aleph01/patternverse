---
id: cbt-thought-record
type: pattern
title: 'Thought Record / Cognitive Restructuring'
summary: 'Examine a distressing situation, automatic thoughts, emotions, and evidence to find a more balanced alternative.'
status: published
verses:
  - therapy
---

A thought record separates what happened from what it meant to you. The aim is a believable, balanced interpretation—not forced positivity or denying a real difficulty.

## How to use it

1. Describe a manageable, recent situation. What happened, where, and with whom? Separate observations from interpretations.
2. What automatic thought or image came up? Write it in your own words. If helpful, note how strongly you believe it from 0 to 100.
3. What emotions and body sensations did you notice? If useful, rate each emotion's intensity from 0 to 100.
4. What observable evidence supports the thought? Distinguish facts from guesses.
5. What observable evidence does not fit the thought? Include positive evidence you might have dismissed; it still counts.
6. What more balanced alternative includes both sides and acknowledges what remains uncertain? It should feel believable, not merely cheerful.
7. How believable is the alternative? How do you feel now, if different at all, and what response would you choose?

## With mira

[Open this pattern in mira](/apps/mira?technique=cbt.thought-record). Review the selection before starting. This guided practice works offline and makes no AI requests. In Mira, your answers remain in the session's encrypted exercise state; they are not automatically added to ordinary AI chat. The standalone run keeps answers only for the current page.

## Scope and sources

An original self-help adaptation, not diagnosis, treatment, or a clinically validated chatbot intervention. Choose manageable everyday material. You may stop or pause at any time. Seek qualified support for overwhelming distress, trauma, OCD, or uncertainty about suitability. In immediate danger, contact local emergency services.

[Background resource](https://www.cci.health.wa.gov.au/Resources/For-Clinicians/Anxiety). The wording and guided sequence here are original, not a reproduction of a clinical worksheet.

## Executable Pattern Markdown

The exact source below is bundled in the guided practice; displaying it does not start an exercise.

```text
:language 1
:title "Thought Record / Cognitive Restructuring"
:output outcome
!ask situation {
    Describe a manageable, recent situation. What happened, where, and with whom? Separate observations from interpretations.
}
!ask thought {
    What automatic thought or image came up? Write it in your own words. If helpful, note how strongly you believe it from 0 to 100.
}
!ask emotions {
    What emotions and body sensations did you notice? If useful, rate each emotion's intensity from 0 to 100.
}
!ask for {
    What observable evidence supports the thought? Distinguish facts from guesses.
}
!ask against {
    What observable evidence does not fit the thought? Include positive evidence you might have dismissed; it still counts.
}
!ask balanced {
    What more balanced alternative includes both sides and acknowledges what remains uncertain? It should feel believable, not merely cheerful.
}
!ask review {
    How believable is the alternative? How do you feel now, if different at all, and what response would you choose?
}
!show {
    Your notes, in your own words:

    1. {{situation}}
    2. {{thought}}
    3. {{emotions}}
    4. {{for}}
    5. {{against}}
    6. {{balanced}}
    7. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
