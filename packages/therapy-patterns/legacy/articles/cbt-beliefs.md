---
id: cbt-beliefs
type: pattern
title: "Explore a recurring belief"
summary: "Examine a belief tentatively, without searching for trauma or imposing labels."
status: published
verses:
  - therapy
---

Examine a belief tentatively, without searching for trauma or imposing labels.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. What repeated belief about yourself, others, or life would you like to understand?
2. When does it appear, and when is it less convincing?
3. What experiences support it and what makes it less absolute?
4. What flexible belief might fit? You may leave this unresolved or discuss it with a therapist.

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.beliefs). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Explore a recurring belief"
:output outcome
= focus "Examine a belief tentatively, without searching for trauma or imposing labels."
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
    What repeated belief about yourself, others, or life would you like to understand?
}
!ask step2 {
    When does it appear, and when is it less convincing?
}
!ask step3 {
    What experiences support it and what makes it less absolute?
}
!ask step4 {
    What flexible belief might fit? You may leave this unresolved or discuss it with a therapist.
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
