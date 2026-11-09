---
id: "hard-choice-model"
type: "pattern"
title: "Hard Choice Model"
summary: "Match the way you deliberate to the stakes and how meaningfully the alternatives can be compared."
status: "published"
aliases: []
tags: ["decision-making", "thinking-tools", "hard-choice-model"]
verses: ["decision-making"]
attribution: "Impact–comparability heuristic presented by Wes O’Haire in Mental models for designers; not a formal proof of decision quality. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A reading group has spent most of a meeting choosing the cover color for its newsletter. It then agrees in five minutes to replace its informal membership arrangement with a paid subscription. The decisions received attention in roughly the opposite proportion to their consequences.

The Hard Choice Model asks two questions before comparing alternatives: how consequential is this choice, and how meaningfully can its alternatives be compared? Their combination suggests what kind of deliberation will help. It does not tell you which option to choose.

Wes O’Haire presents this impact–comparability heuristic in his writing on mental models for designers. Treat it as a way to allocate attention, not as a validated instrument that can classify every decision precisely.

## Stakes and comparability are different

Stakes concern what the decision changes and for whom. Consider money, time, obligations, access, identity, and the cost of a mistake. Include the people who bear consequences but do not attend the decision meeting. A minor administrative choice for an organizer may determine whether someone else can participate.

Comparability concerns whether a shared basis supports a useful comparison. Two printing services may be comparable on turnaround, cost, and verified print quality. Two ways of organizing a community may embody different values: openness, stability, independence, or mutual obligation. Listing more criteria does not necessarily create agreement about how to trade those values.

Difficulty is not the same as lack of information. The group may simply need current printing quotes. Collecting that information can make the comparison easier. In contrast, no additional quote can decide whether a subscription’s financial stability is worth excluding people who cannot pay.

## Four useful responses, without hard borders

When consequences are modest and comparison is straightforward, choose using a simple rule. For the newsletter cover, readability and acceptable printing cost might be enough. A short deadline prevents a small preference difference from consuming the meeting.

When consequences are substantial and comparison is straightforward, do the analysis carefully. Replacing a failing boiler in a shared studio may justify checking installation requirements, total cost, service support, and energy use. A [[decision-matrix|Decision Matrix]] can make the judgments visible, provided mandatory requirements are checked first.

When consequences are modest but comparison is poor, experimentation or a satisfactory arbitrary choice may be reasonable. Two plausible discussion formats could each receive a trial session. The point is to learn or move forward at a cost proportionate to the issue.

When consequences are substantial and comparison is poor, more scoring may conceal the problem. Clarify commitments, involve affected people, explore alternatives, and examine what each option would make harder to reverse. The group’s subscription question belongs here if members disagree about what the group is for.

These are possible responses, not mechanically assigned instructions. A supposedly low-stakes trial can still be inappropriate if it imposes avoidable costs on others.

## Work through the membership decision

The reading group first states the actual choice: introduce a fixed fee, seek voluntary contributions, reduce costs, or change the activity. This already improves on treating the subscription as the only path to survival.

It then identifies the stakes. A fixed fee could provide predictable income and reduce the organizer’s unpaid work. It could also change who attends and whether newcomers feel welcome. The group lacks information about venue costs and members’ willingness to contribute. Those are researchable unknowns.

Other questions concern values: should access depend on payment, and how much unpaid administration is reasonable? These need discussion and agreement, not a more elaborate estimate. The group might adopt a three-month voluntary-contribution experiment with a spending limit, then review income and participation. It might instead conclude that a smaller activity fits its commitments better.

The model has helped choose a decision process. It has not proved that subscriptions are good or bad.

## Inspect the classification itself

Ask what makes you call the decision low-impact. Is the consequence small, or merely distant from you? Ask what makes the alternatives comparable. Do the people affected accept the criteria, or have you assumed your own preferences are universal?

A student choosing between two optional workshops may have a relatively easy comparison: prerequisites, timetable, and a concrete learning goal. A student choosing whether to interrupt study for a caring responsibility faces obligations and uncertainties that may resist a common scale. A spreadsheet can organize practical information without resolving the moral question.

Change the assessment when you learn more. A reversible-looking workshop choice may determine access to a later course. A dramatic-looking choice may become manageable once a short trial is possible.

## Pair it with other checks

[[separate-reversible-from-irreversible-decisions|Separate Reversible from Irreversible Decisions]] adds a distinct question: how costly is changing course? High stakes and reversibility are related but not identical. A reversible action can still harm someone before it is reversed.

[[define-the-decision-before-comparing-options|Define the Decision Before Comparing Options]] helps when the alternatives remain vague. [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] helps distinguish a researchable uncertainty from a disagreement that evidence alone cannot settle.

Finish by naming the process you will use, who should participate, what information is needed, and when a decision is due. Without those commitments, classifying the choice becomes one more attractive way to postpone it. The useful output is a proportionate next step toward deciding.

## Sources

- [Wes O’Haire: Mental models for designers](https://medium.com/dropbox-design/mental-models-for-designers-7c03d5e4a092), the impact–comparability heuristic discussed here.

## Practice — Choose How to Decide

**Purpose:** Match the way you deliberate to the stakes and how meaningfully the alternatives can be compared.

**Time:** About 10 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Choose How to Decide"
:output result

!show {
About 10 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Name the choice"
decision = !ask {
What choice do you need to make?
}
people = !ask {
Who experiences the consequences?
}
}
assessment = !form {
:title "Inspect the kind of difficulty"
stakes = !choose {
How consequential does the choice appear?
- modest: "Relatively modest consequences"
- substantial: "Substantial consequences"
- uncertain: "Stakes need clarification"
}
stakes_basis = !ask {
What concrete consequences support that view, including effects on others?
}
comparison = !choose {
How comparable are the alternatives?
- shared: "A meaningful shared basis is available"
- contested: "Important values or criteria resist a common comparison"
- unknown: "Comparison needs clarification"
}
comparison_basis = !ask {
What can evidence resolve, and what requires discussion of values?
}
reversibility = !ask {
How costly would changing course be? This is a separate check.
}
}
plan = !form {
:title "Choose a proportionate decision process"
method = !choose {
Which next process fits, after considering the evidence?
- simple: "A simple rule and deadline"
- analysis: "Focused investigation or comparison"
- trial: "A bounded, acceptable trial"
- deliberation: "Discussion of values, commitments, and affected people"
- clarify: "Clarify the question before choosing a process"
}
why = !ask {
Why does that process fit this choice?
}
next = !ask {
Who will do what next, by when, and what would change the process?
}
}
result = {choice: context, assessment: assessment, process: plan}
!show {
Your selected decision process: {{plan.method}}
Reason: {{plan.why}}
Next commitment: {{plan.next}}
}
-> end
```
