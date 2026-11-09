---
id: act-within-your-discretion
type: pattern
title: Act Within Your Discretion
summary: Find a useful next action within the authority, resources, and choices already available to you.
status: published
aliases: [15% Solutions, 15 Percent Solutions]
tags: [collaboration, agency, action]
verses: [collaboration]
attribution: "Adapted from 15% Solutions by Henri Lipmanowicz and Keith McCandless; their source acknowledges Gareth Morgan's work. Original Patternverse examples and personal worksheet; CC BY-SA 4.0."
---

A support specialist sees customers repeatedly confused by an installation step. The documentation team has a backlog, a product change needs approval, and a new onboarding system is months away. Those constraints are real. They can still conceal a smaller question: what can this person do within the work they already own?

They can record the exact wording customers stumble over, improve a response they are authorized to send, and bring a short evidence-based proposal to the documentation owner. None of those actions solves onboarding. Each can reduce confusion or make a later decision easier. Limited agency can support useful action without being mistaken for unlimited control.

## Identify discretion rather than assume it

Discretion is the space in which you can make a choice without obtaining new resources or permission. It might concern your preparation, a reversible arrangement within your responsibility, the questions you ask, or the evidence you gather. It depends on actual agreements and consequences, not on whether an action feels small.

The Liberating Structure **15% Solutions** asks people to identify what they can do with the freedom and resources already available, then refine those ideas through peer coaching. The number is a framing device. Nobody needs to estimate that precisely fifteen percent of a problem is under their control. This personal worksheet adapts the agency inquiry and leaves optional coaching to real conversations.

Writing down the boundary helps. The support specialist owns their individual responses but cannot change a published installation requirement. They can ask customers which instruction was unclear; they cannot promise a product fix on behalf of another team. An action may be easy to perform and still exceed the person's authority.

## Separate action, influence, and requests

Three categories are useful: actions you can take, changes you can influence, and changes that require another person's decision. The categories are provisional. If authority is unclear, clarification can itself be the next action. The purpose is to find a responsible route forward rather than a clever way to bypass someone affected.

For the specialist, a personal evidence log belongs in the first category. A short proposal supported by examples belongs to influence. A permanent change to the product belongs to someone else's decision. Keeping these separate prevents a list of things to do from quietly becoming a list of promises other people have never accepted.

Available resources include time, attention, access, and trust as well as money. A five-minute experiment that repeatedly interrupts a busy colleague may use resources you do not control. A new personal routine that shifts unpaid work onto someone else also needs examination. Discretion is relational even when the action appears individual.

## A second example: a difficult shared space

A resident wants a courtyard to be more welcoming. Major planting requires landlord approval, and building repairs depend on a budget meeting. The resident can photograph access problems, learn when neighbors use the space, and ask whether people would welcome a short cleanup. They can arrange their own belongings more considerately immediately.

They should not assume that moving shared furniture is harmless because it is reversible. Another resident may depend on its location. The useful distinction is between changing what one owns and changing a shared arrangement. Asking an affected neighbor can convert an imagined action into a properly agreed one.

The eventual first step might be a conversation with two neighbors about one obstructed route. That is modest, but it creates information and possible cooperation. It is more grounded than waiting for a complete redesign or independently implementing a preferred courtyard plan. The resident retains the larger concern while choosing a responsible entry point.

## Small agency is not a substitute for structural change

This pattern can be misused to tell people that every systemic difficulty is their responsibility to fix locally. A worker can improve a handoff and still need a workload decision. A resident can tidy a corner and still need a repair. Recording the larger dependency alongside the immediate action keeps the distinction visible.

Likewise, an action within your discretion is not automatically worth taking. It may have little connection to the desired result or consume attention needed elsewhere. Ask what useful effect you expect, what would show it, and whether another available action would be better. Activity is not the same as progress.

[[reduce-the-first-step]] addresses the effort or friction of beginning. This pattern addresses permission and resources. A tiny first step can exceed your authority; a larger preparation task can fall squarely within it. The two approaches complement each other when an authorized action still feels difficult to begin.

## End with a bounded commitment

Describe what you will do, when you can begin, and what you will inspect afterward. Include the condition that would make you stop or seek agreement. The support specialist might revise one authorized reply, use it for a few relevant cases, and note whether the same follow-up question returns.

Peer coaching can improve this plan by questioning hidden dependencies. The coach should help verify the boundary rather than take ownership of the action. [[keep-only-the-essential-rules]] can examine a restriction that appears unnecessary; [[prefer-the-smallest-useful-experiment]] can help make the available action informative. The immediate result is a responsible commitment, not proof that the larger problem has been solved.


## Liberating Structures source and adaptation

[15% Solutions](https://www.liberatingstructures.com/15-percent-solutions), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Find Your Available Next Action

**Format:** Individual agency worksheet. **Time:** About 12 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Find Your Available Next Action"
:output result

!show {
15% is a framing device, not a calculated quota. Distinguish personal discretion from influence and requests. Keep larger structural dependencies visible rather than taking responsibility for everything.
}
context = !form {
:title "Locate the concern"
situation = !ask {
What feels blocked?
}
resources = !ask {
What authority, time, resources, and agreements do you actually have?
}
}
possibilities = !collect {
:min 1
:max 5
entry = !form {
:title "Examine an action"
action = !ask {
What useful action could you consider?
}
route = !choose {
What does this action require?
- own: "Within my current authority and resources"
- request: "Another person’s decision or resources"
- clarify: "Authority or dependencies need clarification"
}
basis = !ask {
What supports that classification, including effects on other people?
}
}
-> yield entry
}
!show {{possibilities}} {
:group route
}
commitment = !form {
:title "Choose a responsible first step"
step = !ask {
Choose an action within your discretion, or a request to clarify authority.
}
start = !ask {
When can you begin?
}
effect = !ask {
What useful effect do you expect?
}
boundary = !ask {
What condition would make you stop or seek agreement?
}
larger_dependency = !ask {
What larger issue remains outside this action?
}
}
result = {context: context, possibilities: possibilities, next_action: commitment}
!show {
Your next action or request: {{commitment.step}}
Start: {{commitment.start}}
Boundary: {{commitment.boundary}}
Larger dependency retained: {{commitment.larger_dependency}}
}
-> end
```
