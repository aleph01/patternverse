---
id: compare-how-we-experience-collaboration
type: pattern
title: Compare How We Experience Collaboration
summary: Examine four dimensions of a working relationship and use differing perceptions as a starting point for inquiry.
status: published
aliases: [Generative Relationships STAR, STAR Compass]
tags: [collaboration, relationships, reflection]
verses: [collaboration]
attribution: "Based on Generative Relationships STAR, developed by Brenda Zimmerman and adapted by Henri Lipmanowicz and Keith McCandless. Original Patternverse examples and individual reflection; CC BY-SA 4.0."
---

Two colleagues describe their partnership differently. One says it is excellent because conversations are easy and disagreements are rare. The other says it is frustrating because little work reaches completion. They may both be reporting something real. Their disagreement partly concerns which aspect of collaboration they are evaluating.

A broad judgment such as good teamwork compresses several questions. How different are the participants' experiences and perspectives? How well do they understand one another? What do they actually accomplish together? Why does working together matter? Separating these questions creates a more useful conversation than deciding whose overall rating is correct.

![Separateness concerns difference, tuning concerns mutual understanding, action concerns joint work, and reason concerns why collaboration matters. Each assessment needs examples.](/diagrams/liberating-structures/compare-how-we-experience-collaboration.svg "Four questions, no combined quality score. Separateness concerns difference, tuning concerns mutual understanding, action concerns joint work, and reason concerns why collaboration matters. Each assessment needs examples.")

## Four dimensions, four kinds of evidence

The **Generative Relationships STAR** framework was developed by Brenda Zimmerman and adapted into Liberating Structures by Henri Lipmanowicz and Keith McCandless. Its four dimensions are **Separateness**, **Tuning**, **Action**, and **Reason to work together**. The group method compares individual assessments on a shared compass and explores implications and possible changes.

Separateness concerns differences in people and perspectives, rather than a requirement to work apart. Tuning concerns mutual understanding and connection. Action concerns acting together. Reason concerns the importance and clarity of working together. The personal worksheet uses an explicitly illustrative scale and examples; it does not produce a validated team diagnosis or a collective assessment.

For each dimension, ask what experience supports the view. A team can contain diverse job titles while repeatedly excluding unfamiliar interpretations. Friendly conversation can coexist with weak understanding of another person's constraints. A completed project can depend on parallel individual effort rather than useful joint action. A slogan about purpose may conceal different accounts of why the work matters.

## Inspect a working relationship

The two colleagues coordinate a community learning program. One recruits speakers and the other handles logistics. They enjoy planning together, but speakers often arrive before anyone has checked equipment needs. Their ease with each other is real. So is an incomplete handoff between their responsibilities.

On tuning, they can name conversations in which each understood the other's concerns. On action, they can identify an unresolved transfer of information. On reason, they discover a difference: one wants a varied program while the other wants a reliable experience for a stable audience. That difference can improve the work if it becomes discussable.

An action might be a brief shared review of each session's audience, equipment, and purpose before confirmation. The idea is tied to observed work rather than a demand to improve every compass point. The colleagues can later inspect whether the review reduces avoidable surprises while preserving the variety they value.

## A profile is a question, not a verdict

Numbers can help someone express a distinction, but their apparent precision can exceed the account behind them. A rating of four from one person and three from another does not establish a measurable unit of relational difference. Ask which events made each assessment seem appropriate.

Likewise, avoid adding the four ratings into a single quality score. Different profiles can imply different questions, and a total can hide those differences. A high score on one dimension does not mechanically compensate for a problem elsewhere. The framework's value lies in directing inquiry toward relationships between dimensions and actual outcomes.

The individual practice ends with one perspective, a focused question, and a proposed experiment. If others later complete their own reflections, compare their accounts with permission. Do not enter imagined answers on their behalf or assume that agreement is the required endpoint. A difference in experience may reveal information about access, responsibilities, or whose work is visible.

## A second setting: a creative partnership

Two musicians meet regularly and generate many ideas but rarely finish a piece. They share an interest in collaboration while imagining different results: one enjoys improvisation itself, the other wants material for a performance. Their apparently weak action may partly reflect an unexamined difference in reason.

They can decide to protect some sessions for exploration and use another for developing one selected piece. This arrangement does not mean that improvisation was unproductive. It distinguishes two worthwhile purposes and gives each an appropriate place. A later reflection can ask whether the arrangement still serves both people.

The framework can also reveal when more collaboration is unnecessary. Some tasks benefit from independent work and a clear handoff. A desire to raise every rating can create meetings or shared decisions that add little. Ask what the relationship needs to accomplish before interpreting any particular profile as deficient.

## Make improvement observable

Use STAR when an overall impression of teamwork conceals different experiences, when a partnership feels comfortable but ineffective, or when joint work needs a clearer purpose. It is poorly suited to ranking people or labeling personalities. One person's assessment should remain explicitly their perspective until others contribute their own accounts.

Choose a change, the dimension or relationship it addresses, and a sign worth reviewing. [[find-the-conditions-behind-success]] can investigate an episode when the partnership worked well. [[work-with-enduring-tensions]] helps when difference and coordination both matter. [[act-within-your-discretion]] keeps the next step within actual authority while leaving room to request an agreement.


## Liberating Structures source and adaptation

[Generative Relationships STAR](https://www.liberatingstructures.com/generative-relationships-star), credited by the source to Brenda Zimmerman; adapted by Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Reflect on One Working Relationship

**Format:** Individual STAR reflection; no team diagnosis. **Time:** About 18 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Reflect on One Working Relationship"
:output result

!show {
This is your perspective on one working relationship. The 1–5 reflection scale is an authoring aid, not a validated instrument. Do not invent other people’s ratings or add the dimensions into a team-quality score.
}
context = !form {
:title "Choose a working relationship"
relationship = !ask {
Which collaboration and period are you examining?
}
purpose = !ask {
What does working together need to make possible?
}
}
profile = !form {
:title "Your STAR profile"
separateness = !rate 1..5 {
:low "Little or absent"
:high "Strongly present"
Separateness: how much difference in perspective is available and actually heard?
}
separateness_example = !ask {
What actual example supports your view of difference?
}
tuning = !rate 1..5 {
:low "Little or absent"
:high "Strongly present"
Tuning: how well do you understand and connect with each other?
}
tuning_example = !ask {
What actual example supports your view of mutual understanding?
}
action = !rate 1..5 {
:low "Little or absent"
:high "Strongly present"
Action: how much useful action do you take together?
}
action_example = !ask {
What actual result or handoff supports your view of joint action?
}
reason = !rate 1..5 {
:low "Little or absent"
:high "Strongly present"
Reason to work together: how important and clear is the shared purpose?
}
reason_example = !ask {
What actual example supports your view of purpose?
}
}
experiment = !form {
:title "Choose a focused inquiry"
focus = !choose {
Which dimension or relationship between dimensions deserves attention?
- difference: "Separateness and heard differences"
- understanding: "Tuning and mutual understanding"
- joint_action: "Joint action"
- purpose: "Reason to work together"
- combination: "A relationship between dimensions"
}
question = !ask {
What would you ask another person rather than assume their experience?
}
change = !ask {
What change could you propose or test?
}
signal = !ask {
What observable sign and review condition would help you learn?
}
}
result = {perspective: context, individual_profile: profile, experiment: experiment}
!show {
Relationship: {{context.relationship}}
Your ratings, kept separate: S {{profile.separateness}}, T {{profile.tuning}}, A {{profile.action}}, R {{profile.reason}}
Question for another person: {{experiment.question}}
Proposed change: {{experiment.change}}
Review: {{experiment.signal}}
}
-> end
```
