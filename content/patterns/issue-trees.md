---
id: "issue-trees"
type: "pattern"
title: "Issue Trees"
summary: "Decompose a question into answerable branches and choose the evidence that will resolve the important ones."
status: "published"
aliases: []
tags: ["problem-solving", "thinking-tools", "issue-trees"]
verses: ["problem-solving"]
attribution: "Logic-tree tradition in structured problem solving; documented by Charles Conn and Hugo Sarrazin in McKinsey’s problem-solving discussion. No sole inventor asserted. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A small magazine has fewer paid renewals than last year. The team debates whether the writing has become less interesting, the reminder emails are ineffective, or subscribers are simply spending less. Each explanation could lead to expensive work. Before choosing one, the team needs to divide the question into parts that evidence can answer.

An issue tree decomposes a central question into branches and more specific subquestions. It helps organize an investigation, reveal gaps and overlap, and identify which unanswered issue deserves attention first. The tree is a working model of the question, not proof that the world itself has a neat branching structure.

Logic trees are widely used in structured problem solving. Charles Conn and Hugo Sarrazin describe this tradition in their discussion of systematic problem solving. No sole inventor is asserted here.

## Make the root answerable

“Why is the magazine struggling?” includes too much. A useful root might be “What explains the fall in paid renewals between these two comparable periods?” State what counts as a renewal, which subscriber group is included, and whether the comparison uses consistent records.

Before speculating about reader satisfaction, check the arithmetic. Fewer renewals might reflect fewer subscriptions reaching their renewal date, a lower proportion renewing, or a change in how payments are recorded. Those branches suggest different inquiries.

A useful first split preserves the meaning of the root. “Editorial, marketing, and everything else” may simply mirror departments. It can hide a payment fault that crosses several responsibilities. Choose a decomposition because it helps explain the outcome, not because it matches an organization chart.

## Expand only where it improves the investigation

Suppose the number eligible to renew is stable, but the renewal proportion has fallen. That branch could divide into people who did not receive a usable invitation, people who tried but could not complete payment, and people who chose not to renew after receiving an invitation.

These categories still need careful definitions. Someone may encounter a payment fault and later decide not to renew. The team can define the branches around the first known obstacle, or allow overlap and record it explicitly. Pretending the categories are mutually exclusive does not make them so.

Under payment problems, more specific questions could concern failed transactions, confusing instructions, or unsupported payment methods. Attach evidence sources to the leaves: payment logs, support messages, or a short test of the renewal process.

Stop decomposing when a question is specific enough to investigate at a useful cost. A tree with seven levels is not necessarily better than one with three. Excessive detail can make every branch appear equally important and delay the first informative check.

## Inspect coverage and overlap

Ask whether each set of children collectively addresses its parent. What plausible explanation has no place? What appears in two branches? Are some branches causes while others are symptoms or proposed solutions?

“Improve the newsletter” is not an explanatory branch under “Why did renewals fall?” It is an intervention. Keep solutions separate until the inquiry provides a reason to pursue them.

A mathematically complete split can be useful when the quantities genuinely support it. Other questions resist clean partitions. For social and organizational issues, state the limits rather than claiming perfect coverage. Interactions may matter: a confusing reminder can worsen a payment process that was already difficult.

[[ishikawa-diagram|Ishikawa Diagram]] is useful for collecting possible causes across categories. An issue tree is more explicitly an investigation structure: questions, subquestions, evidence, and priorities. [[connection-circles|Connection Circles]] can help when interactions and feedback are more explanatory than a hierarchy.

## Prioritize the next leaf

The magazine team notices a sharp increase in payment failures near a recent provider change. Checking that branch is quick, directly relevant, and potentially decisive. It investigates before commissioning a reader survey or redesigning the publication.

Prioritize using potential importance, uncertainty, and cost of investigation. A branch can be important but already sufficiently understood. Another may be uncertain but too minor to affect the decision. Record why the selected question comes first.

If the payment explanation is unsupported, that is useful information. Update the tree rather than treating the first hypothesis as a commitment. If the explanation is supported, still check whether it accounts for the size and timing of the decline.

## A personal application

A learner repeatedly misses a weekly practice goal. An issue tree could distinguish unavailable time, difficulty beginning, sessions that end early, and a goal whose definition is unclear. Each branch suggests different evidence: a calendar, brief session notes, or clarification of what counts as practice.

The tree should not turn a difficult week into a verdict about motivation. It helps replace a broad self-judgment with questions that might lead to a practical change. [[chunk-down|Chunk Down]] can help make an overly broad leaf answerable, while [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] helps select what to check first.

Keep the root, branches, assumptions about coverage, and investigation plan together. The result should make it easier to begin learning and easier to change direction when the evidence does not fit. A beautiful tree that never reaches an observation has organized speculation without resolving it.

## Sources

- [Charles Conn and Hugo Sarrazin: How to master the seven-step problem-solving process](https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/how-to-master-the-seven-step-problem-solving-process), including structured decomposition and prioritization of analysis.

## Practice — Build an Investigation Tree

**Purpose:** Decompose a question into answerable branches and choose the evidence that will resolve the important ones.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Build an Investigation Tree"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
root = !form {
:title "Bound the investigation"
question = !ask {
What specific question should the tree answer?
}
scope = !ask {
What definitions, population, time period, and boundaries apply?
}
}
branches = !collect {
:min 1
:max 5
entry = !form {
:title "Add an entry"
name = !ask {
Give this first-level branch a short unique name.
}
question = !ask {
What part of the root question does this branch address?
}
basis = !ask {
Why is this a useful decomposition rather than simply an organization chart?
}
}
-> yield entry
}
!show {{branches}} {

}
leaves = !collect {
:min 1
:max 10
entry = !form {
:title "Add an entry"
parent = !ask {
Copy the short name of its first-level branch.
}
question = !ask {
What answerable subquestion belongs under that branch?
}
evidence = !ask {
What evidence could answer it, and where could you obtain it?
}
standing = !choose {
What is currently known?
- observed: "Direct observations"
- indirect: "Indirect support"
- hypothesis: "A hypothesis to check"
}
}
-> yield entry
}
!show {{leaves}} {

}
review = !form {
:title "Check the structure and prioritize"
!show {
Parent names are copied manually. This worksheet records a two-level investigation, not an automatically validated editable tree.
}
coverage = !ask {
What plausible explanation is missing? Which branches overlap or mix causes with solutions?
}
revision = !ask {
How should you revise the tree in light of that check?
}
priority = !ask {
Which leaf should be investigated first, considering importance, uncertainty, and cost?
}
action = !ask {
What specific observation or analysis comes next, and what answer would change your plan?
}
}
result = {root: root, branches: branches, leaves: leaves, review: review}
!show {
Your priority investigation: {{review.priority}}
Next observation or analysis: {{review.action}}
Keep the coverage and overlap revisions beside the tree.
}
-> end
```
