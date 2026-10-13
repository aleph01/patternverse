---
id: act-observer
type: pattern
title: "The noticing perspective"
summary: "See an experience as part of the moment, not the whole of who you are."
status: published
verses:
  - therapy
---

See an experience as part of the moment, not the whole of who you are.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. Name a thought, feeling, or role prominent right now.
2. Try: I notice that I am having this experience. Does that wording fit?
3. What else can you notice in the room? If things feel unreal or disorienting, stop and orient to your surroundings.
4. How could holding this experience as one part of the moment leave room for choice?

## With mira

[Open this technique in mira](/apps/mira?technique=act.observer). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of ACT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Steven C. Hayes, Kirk D. Strosahl, and Kelly G. Wilson, *Acceptance and Commitment Therapy: The Process and Practice of Mindful Change*, 2nd edition (2012). [ACBS: the ACT model](https://contextualscience.org/about_act).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "The noticing perspective"
:output outcome
= focus "See an experience as part of the moment, not the whole of who you are."
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
    Name a thought, feeling, or role prominent right now.
}
!ask step2 {
    Try: I notice that I am having this experience. Does that wording fit?
}
!ask step3 {
    What else can you notice in the room? If things feel unreal or disorienting, stop and orient to your surroundings.
}
!ask step4 {
    How could holding this experience as one part of the moment leave room for choice?
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
