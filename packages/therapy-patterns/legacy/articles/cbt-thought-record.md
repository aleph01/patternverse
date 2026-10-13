---
id: cbt-thought-record
type: pattern
title: "Balanced thought record"
summary: "Bring a situation, thought, feeling, evidence, and response into one short record."
status: published
verses:
  - therapy
---

Bring a situation, thought, feeling, evidence, and response into one short record.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. Name the situation, automatic thought, and feeling or intensity.
2. What observations support the thought and what complicates it?
3. Write a balanced response acknowledging difficulty and uncertainty, not forced optimism.
4. How do you feel now, if different at all? What response would you choose?

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.thought-record). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Balanced thought record"
:output outcome
= focus "Bring a situation, thought, feeling, evidence, and response into one short record."
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
    Name the situation, automatic thought, and feeling or intensity.
}
!ask step2 {
    What observations support the thought and what complicates it?
}
!ask step3 {
    Write a balanced response acknowledging difficulty and uncertainty, not forced optimism.
}
!ask step4 {
    How do you feel now, if different at all? What response would you choose?
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
