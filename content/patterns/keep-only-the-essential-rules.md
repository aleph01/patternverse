---
id: keep-only-the-essential-rules
type: pattern
title: Keep Only the Essential Rules
summary: Test requirements against a clear purpose and retain only the boundaries that genuinely need to hold.
status: published
aliases: [Min Specs, Minimum Specifications]
tags: [collaboration, constraints, governance]
verses: [collaboration]
attribution: "Adapted from Min Specs by Henri Lipmanowicz and Keith McCandless; their source points to Paul Plsek and Brenda Zimmerman's work. Original Patternverse examples and requirement review; CC BY-SA 4.0."
---

A volunteer newsletter has acquired fourteen requirements. Every issue needs three sections, two reviews, a particular image format, a quote, and approval from a person who is often unavailable. Most rules once answered a real concern. Together they make a short useful update difficult to publish. The group has preserved its procedure while losing sight of the service the procedure should provide.

Minimum specifications connect boundaries to purpose. Instead of asking how to obey an inherited list more efficiently, ask which requirements must remain for the work to succeed responsibly. Removing an unnecessary requirement can create useful discretion without removing the conditions that protect people or make the result usable.

![An expansive rule list passes through a removal test. Keep necessary rules, propose removing others, and verify uncertain obligations.](/diagrams/liberating-structures/keep-only-the-essential-rules.svg "Test what each requirement protects. An expansive rule list passes through a removal test. Keep necessary rules, propose removing others, and verify uncertain obligations.")

## State what the rules are for

The newsletter's purpose might be to give members timely, accurate information about upcoming activities. That is different from producing a particular page layout or satisfying every person's preference. Without a clear purpose, deletion becomes a contest between people who like rules and people who dislike them.

Identify obligations that are not yours to waive. A permission requirement for publishing an identifiable photograph is different from a preference for landscape images. An accessibility requirement is different from a decorative convention. Both may appear as short lines on a checklist, but they carry different reasons and decision authority.

The **Min Specs** Liberating Structure begins with an expansive list of requirements, then asks groups to remove nonessential items and consolidate the necessary minimum. The personal practice here reviews a bounded set of rules and records keep, remove, or verify decisions. A proposed removal is not permission to disregard an obligation or somebody else's authority.

## Test removal with a counterfactual

For each rule, ask what would fail if it were absent. The answer needs a mechanism. The newsletter's mandatory quote may make an issue warmer, but timely accurate information could still reach members without it. A requirement to verify dates protects a central function. A second identical approval may add delay without providing a distinct check.

Sometimes the problem lies in the wording rather than the existence of a rule. Requiring every update to pass through one named editor may be a brittle way to require factual checking. A more useful boundary could specify that dates and contact information are verified by someone other than the author, with a clear alternative when the usual editor is absent.

This distinction preserves the protected function while allowing different implementations. A minimum specification should make necessary conditions legible enough that participants can improvise within them. If a rule requires a long explanation of exceptions every time it is used, it may be concealing several different requirements that deserve separate examination.

## A second setting: a personal routine

A person wants to practice drawing regularly. Their routine requires a full hour, a cleared desk, a particular sketchbook, and a finished page. On busy days those conditions rarely coincide. The underlying purpose is sustained observation and practice, not producing a daily artifact under ideal conditions.

They retain a modest boundary: choose an actual subject and spend focused time looking and drawing. A short sketch on ordinary paper can satisfy it. A polished page copied mechanically from an old exercise may not. Fewer rules have made the purpose more specific rather than merely making the routine easier to declare complete.

The person can still prefer a certain sketchbook or enjoy a long session. Removing something from the minimum does not forbid it. It distinguishes an enriching option from a condition that must be present before useful work can begin. That distinction often preserves valuable activities that become fragile under accumulated expectations.

## Check for costs moved elsewhere

A requirement can appear unnecessary from one position because somebody else quietly absorbs the failure it prevents. Removing a clear labeling convention may save the author a minute while costing the next reader ten. Before discarding it, ask who depends on the rule and what evidence they can provide about its function.

Likewise, a rule may distribute authority rather than improve immediate efficiency. Another person's review can protect participation or accountability. That purpose deserves explicit consideration. A minimum is relative to the actual shared purpose, which may include fairness and explainability as well as speed.

The review should therefore have a verify category. When the obligation, dependency, or consequence is uncertain, find out who can clarify it. Forced classification into keep or delete can turn an exercise in judgment into careless simplification. Uncertainty is a useful result if it leads to a specific inquiry.

## Make the new minimum usable

Write retained rules in plain language, with a short account of what each protects. Name what participants can now choose for themselves. For the newsletter, contributors might choose length and layout while preserving verified dates, readable text, and consent for personal material. A review after a few issues can reveal whether a deleted convention had an unnoticed function.

Use this pattern when processes have become difficult to explain, when work stalls on inherited requirements, or when a new initiative needs clear boundaries without excessive prescription. Avoid equating the shortest list with the best design. [[reframing-remove-constraints]] broadens the search for possibilities; [[work-with-enduring-tensions]] helps hold necessary consistency and discretion together; [[act-within-your-discretion]] identifies what can responsibly change now.


## Liberating Structures source and adaptation

[Min Specs](https://www.liberatingstructures.com/min-specs), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Test the Minimum Specifications

**Format:** Individual requirement review. **Time:** About 20 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Test the Minimum Specifications"
:output result

!show {
Review requirements against a clear purpose. Keep legal, safety, consent, and other binding obligations in view. A proposed removal is not authorization to disregard another person’s boundary or decision.
}
purpose = !form {
:title "Define the purpose"
outcome = !ask {
What should this process make possible?
}
protected = !ask {
Which obligations, dependencies, and affected people must be considered?
}
}
rules = !collect {
:min 1
:max 6
entry = !form {
:title "Test a requirement"
rule = !ask {
What is the current must-do or must-not-do requirement?
}
counterfactual = !ask {
What would fail if this requirement were absent?
}
dependency = !ask {
Who depends on it, and what evidence supports its function?
}
decision = !choose {
What is your provisional decision?
- keep: "Keep: necessary to the purpose or obligation"
- remove: "Propose removal: no necessary function identified"
- verify: "Verify: authority or consequence remains uncertain"
}
reason = !ask {
Why, and whose agreement is needed?
}
}
-> yield entry
}
!show {{rules}} {
:group decision
}
minimum = !form {
:title "Write the usable minimum"
retained = !ask {
What justified minimum rules would you retain?
}
freedom = !ask {
What can people now choose for themselves?
}
verification = !ask {
Which uncertain requirements need clarification before change?
}
review = !ask {
What evidence after a trial would justify revisiting the minimum?
}
}
result = {purpose: purpose, reviewed_rules: rules, proposed_minimum: minimum}
!show {
Proposed minimum: {{minimum.retained}}
Discretion it permits: {{minimum.freedom}}
Verify before changing: {{minimum.verification}}
Review: {{minimum.review}}
}
-> end
```
