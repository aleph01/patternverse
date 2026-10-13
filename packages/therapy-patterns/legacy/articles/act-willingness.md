---
id: act-willingness
type: pattern
title: "Explore willingness"
summary: "Consider whether making room for discomfort serves a freely chosen direction."
status: published
verses:
  - therapy
---

Consider whether making room for discomfort serves a freely chosen direction.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. What matters to you in this everyday situation?
2. What uncomfortable thought or feeling shows up when you move toward it?
3. What discomfort, if any, are you willing to make room for? This is not an obligation to endure danger.
4. What smaller action or support respects your choice and limits?

## With mira

[Open this technique in mira](/apps/mira?technique=act.willingness). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of ACT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Steven C. Hayes, Kirk D. Strosahl, and Kelly G. Wilson, *Acceptance and Commitment Therapy: The Process and Practice of Mindful Change*, 2nd edition (2012). [ACBS: the ACT model](https://contextualscience.org/about_act).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Explore willingness"
:output outcome
= focus "Consider whether making room for discomfort serves a freely chosen direction."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask step1 {
    What matters to you in this everyday situation?
}
!ask step2 {
    What uncomfortable thought or feeling shows up when you move toward it?
}
!ask step3 {
    What discomfort, if any, are you willing to make room for? This is not an obligation to endure danger.
}
!ask step4 {
    What smaller action or support respects your choice and limits?
}
!show {
    Your reflection, in your own words:

    1. {{step1}}
    2. {{step2}}
    3. {{step3}}
    4. {{step4}}

    You may leave this here. Nothing needs to feel resolved.
}
= outcome "reflected"
-> end
support:
!show {
    Stop the exercise. If anyone is in immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support if you can. This exercise cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish.
}
= outcome "declined"
-> end
```
