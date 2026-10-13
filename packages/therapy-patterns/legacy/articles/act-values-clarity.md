---
id: act-values-clarity
type: pattern
title: "Clarify values"
summary: "Identify qualities of action you freely choose rather than imposed standards."
status: published
verses:
  - therapy
---

Identify qualities of action you freely choose rather than imposed standards.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. Which area of life would you like to reflect on?
2. How would you like to act there even when outcomes are outside your control?
3. Which qualities feel chosen, and which feel like obligations?
4. What small everyday action could express a chosen quality?

## With mira

[Open this technique in mira](/apps/mira?technique=act.values-clarity). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of ACT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Steven C. Hayes, Kirk D. Strosahl, and Kelly G. Wilson, *Acceptance and Commitment Therapy: The Process and Practice of Mindful Change*, 2nd edition (2012). [ACBS: the ACT model](https://contextualscience.org/about_act).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Clarify values"
:output outcome
= focus "Identify qualities of action you freely choose rather than imposed standards."
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
    Which area of life would you like to reflect on?
}
!ask step2 {
    How would you like to act there even when outcomes are outside your control?
}
!ask step3 {
    Which qualities feel chosen, and which feel like obligations?
}
!ask step4 {
    What small everyday action could express a chosen quality?
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
