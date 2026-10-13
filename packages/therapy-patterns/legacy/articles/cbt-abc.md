---
id: cbt-abc
type: pattern
title: "ABC diary"
summary: "Separate an activating event, an interpretation, and its consequences."
status: published
verses:
  - therapy
---

Separate an activating event, an interpretation, and its consequences.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. Describe a manageable event in observable terms.
2. What belief, meaning, or prediction came to mind? It need not be wrong.
3. Which feelings and actions followed? Separate these from the event itself.
4. Where might there be room for a different response?

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.abc). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "ABC diary"
:output outcome
= focus "Separate an activating event, an interpretation, and its consequences."
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
    Describe a manageable event in observable terms.
}
!ask step2 {
    What belief, meaning, or prediction came to mind? It need not be wrong.
}
!ask step3 {
    Which feelings and actions followed? Separate these from the event itself.
}
!ask step4 {
    Where might there be room for a different response?
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
