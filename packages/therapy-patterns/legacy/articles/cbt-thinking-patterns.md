---
id: cbt-thinking-patterns
type: pattern
title: "Thinking-pattern checklist"
summary: "Use thinking-pattern labels as hypotheses, not verdicts."
status: published
verses:
  - therapy
---

Use thinking-pattern labels as hypotheses, not verdicts.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. Write one thought you want to examine.
2. Which patterns might fit: all-or-nothing, overgeneralizing, mind-reading, predicting, disqualifying or discounting the positive, should rules, emotional reasoning? None or uncertain is fine.
3. What in the wording suggests those possibilities? What might the labels miss?
4. How could you restate the thought more precisely while respecting the real difficulty?

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.thinking-patterns). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Thinking-pattern checklist"
:output outcome
= focus "Use thinking-pattern labels as hypotheses, not verdicts."
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
    Write one thought you want to examine.
}
!choose step2 [multi, min=0, prefer=checklist] {
    Which tentative labels might fit? Select none if unsure. Labels are not a diagnosis.
    - all-or-nothing: "All-or-nothing thinking"
    - generalizing: "Overgeneralizing"
    - mind-reading: "Mind-reading"
    - predicting: "Predicting without enough evidence"
    - discounting: "Disqualifying or discounting the positive"
    - should: "Rigid should rules"
    - emotional-reasoning: "Treating a feeling as proof"
}
!ask step3 {
    What in the wording suggests those possibilities? What might the labels miss?
}
!ask step4 {
    How could you restate the thought more precisely while respecting the real difficulty?
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
