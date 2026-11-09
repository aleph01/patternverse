---
id: "conflict-resolution-diagram"
type: "pattern"
title: "Conflict Resolution Diagram"
summary: "Separate opposing proposals from the needs and assumptions connecting them to a shared objective."
status: "published"
aliases: ["Evaporating Cloud"]
tags: ["collaboration", "thinking-tools", "conflict-resolution-diagram"]
verses: ["collaboration"]
attribution: "Eliyahu M. Goldratt’s Theory of Constraints thinking processes; also called the Evaporating Cloud. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

The rehearsal needs to finish at nine. The director wants another hour because the final scene is unreliable. The performers need to leave because their transport and caring arrangements depend on the agreed finish. “Stay” and “leave” appear to exhaust the possibilities. Repeating either proposal more firmly does little to improve the scene or the relationship.

A conflict resolution diagram makes the reasoning beneath opposing proposals explicit. Each side is trying to protect something. Each assumes that its preferred action is necessary to protect it. Those assumptions can sometimes change even when the needs remain important.

Eliyahu M. Goldratt developed this thinking process within the Theory of Constraints. It is also called an Evaporating Cloud. The name expresses a possibility, not a promise that every conflict will disappear. Some disagreements involve scarce resources, unequal power, or incompatible aims that require a negotiated allocation or a boundary.


![A shared objective connects to two needs, each linked to a proposal. Test the assumptions on those connections before treating proposals as necessary.](/diagrams/thinking-tools/conflict-resolution-diagram.svg "Examine the connections. A shared objective connects to two needs, each linked to a proposal. Test the assumptions on those connections before treating proposals as necessary.")

## Draw the reasoning, not the personalities

Start with an objective both parties can endorse without surrendering their concerns. In the rehearsal, that might be “put on a dependable performance without making participation unworkable.” This is more useful than “everyone agrees to the director’s plan.” A shared objective that quietly contains one side’s proposal is not shared.

Name a necessary condition on each side. One is that the scene receives enough effective practice. The other is that participants can rely on workable commitments. Then write the proposals: extend tonight’s rehearsal; finish at nine.

The diagram connects objective to needs and needs to proposals. The important work happens on those connections. Why is an extra hour tonight necessary for effective practice? Perhaps everyone is already present, the room is available, and there is supposedly no other rehearsal slot. Why is leaving at nine necessary for workable commitments? Perhaps the last bus leaves shortly afterward and alternative travel would impose real costs.

These are claims about circumstances. They can be examined without asking anyone to admit that their need is foolish.

## Look for the assumption that creates necessity

A useful question is: “What would have to be true for this proposal to be the only acceptable way of meeting this need?” List several answers before choosing one to challenge.

The director may discover that the difficult scene involves four people, not the whole cast. Its problem may be unclear entrances rather than insufficient repetition. A short rehearsal with those four before the next session, plus a corrected cue sheet, could address the weakness. The original choice between keeping everyone late and abandoning preparation was partly produced by a mistaken scope assumption.

Check the new proposal against both needs. A separate session that the same four people cannot attend has merely moved the conflict. A recording that fails to capture stage positions may not provide the required practice. Ask the people affected rather than declaring the cloud dissolved from a distance.

If no alternative meets both conditions, make the remaining trade-off visible. Perhaps the production must simplify the scene. That is an artistic cost, but it can be a more honest decision than transferring all the cost to participants with the least flexibility.

## A second example: access and quiet

Two housemates disagree about using the shared room for online lessons. One wants evening access because that is when students are available. The other wants quiet because evening is the only reliable study period. “Teach there” and “do not teach there” conceal the actual requirements: usable paid teaching time and usable concentration time.

They should test whether the room is uniquely necessary, whether every lesson needs the same setup, and whether every study task needs silence. A portable teaching kit might enable some sessions elsewhere. A predictable schedule could protect two study evenings. Neither idea is automatically fair; room quality, income, and the inconvenience of moving still matter.

The diagram helps them examine a concrete assumption rather than debate who is more considerate. It does not decide what each person owes the other.

## When to use it

Use this method when two clear proposals recur and conversation keeps cycling through the same arguments. It works best when participants can describe their needs and examine their own assumptions. A facilitator can help keep the objective neutral and distinguish a requirement from a preferred implementation.

Prepare your own diagram before a conversation if that helps, but treat your account of the other party’s needs as provisional. “They need control” is an accusation disguised as analysis. “They say they need a predictable delivery date” is an inspectable starting point.

The existing [[reframing-break-tradeoff|Break a False Trade-Off]] invites a broader search for preserving benefits. This pattern adds a specific structure: objective, two needs, opposing proposals, and assumptions on the links. [[find-the-positive-intention|Find the Positive Intention]] can help formulate a possible need, but it cannot establish another person’s motives without inquiry.

## Do not make cooperation a hidden obligation

A genuine conflict may remain after every weak assumption is removed. Two projects may require the same indivisible resource at the same time. Parties may disagree about the objective itself. Someone may reasonably refuse a new arrangement even if it appears efficient to everyone else.

In those cases, the useful output is a clearer account of what cannot be jointly satisfied and what decision process is needed. Negotiation, authority, consent, or a protective boundary may be more appropriate than another round of reframing.

Keep the tested assumptions and the rejected alternatives. They explain why the eventual agreement was chosen and make future revision easier when circumstances change. The practical achievement is a better-founded proposal or an honestly stated conflict, not an attractive diagram with all the disagreement erased.

## Sources

- [Goldratt’s Theory of Constraints: Evaporating Cloud](https://www.toc-goldratt.com/en/toc-application/evaporating-cloud), the named thinking process. The examples and participant-led application here are original.

## Practice — Examine the Conflict’s Assumptions

**Purpose:** Separate opposing proposals from the needs and assumptions connecting them to a shared objective.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Examine the Conflict\u2019s Assumptions"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Describe both proposals"
!show {
Describe the other person’s needs as provisional until they confirm them.
}
situation = !ask {
What concrete disagreement keeps returning?
}
objective = !ask {
What objective could both sides genuinely endorse?
}
need_a = !ask {
What need does the first side say it must protect?
}
proposal_a = !ask {
What action does that side propose?
}
need_b = !ask {
What need does the other side say it must protect?
}
proposal_b = !ask {
What opposing action does that side propose?
}
}
assumptions = !collect {
:min 1
:max 6
entry = !form {
:title "Add an entry"
connection = !choose {
Which connection are you examining?
- objective_a: "Objective requires need A"
- objective_b: "Objective requires need B"
- need_a: "Need A requires proposal A"
- need_b: "Need B requires proposal B"
- conflict: "The two proposals cannot coexist"
}
claim = !ask {
What assumption makes this connection seem necessary?
}
status = !choose {
What supports that assumption?
- observed: "Direct observations"
- indirect: "Indirect support"
- hypothesis: "A hypothesis to check"
}
alternative = !ask {
What evidence or alternative arrangement could challenge it?
}
}
-> yield entry
}
!show {{assumptions}} {
:group connection
}
review = !form {
:title "Develop an honest next step"
candidate = !ask {
What alternative could meet both needs, or what genuine trade-off remains?
}
check = !ask {
How will you check the proposal with the affected people?
}
boundary = !ask {
What consent, resource limit, or boundary must remain explicit?
}
}
result = {conflict: context, assumptions: assumptions, proposal: review}
!show {
Your candidate or remaining trade-off: {{review.candidate}}
Check with affected people: {{review.check}}
Respect this boundary: {{review.boundary}}
}
-> end
```
