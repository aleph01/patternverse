---
id: "ishikawa-diagram"
type: "pattern"
title: "Ishikawa Diagram"
summary: "Organize possible causes around a specific observed effect, then investigate the explanations that matter."
status: "published"
aliases: ["Fishbone Diagram", "Cause-and-effect Diagram"]
tags: ["problem-solving", "thinking-tools", "ishikawa-diagram"]
verses: ["problem-solving"]
attribution: "Kaoru Ishikawa; cause-and-effect diagram tradition described by the American Society for Quality. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A pottery studio opens its kiln to find a shelf of cracked bowls. The first explanation is that someone packed the kiln badly. The instructor disagrees: the clay delivery was different this month. Another potter remembers that the pieces were still damp. By the end of the conversation, three plausible explanations have become three competing loyalties. Nobody has yet established which bowls cracked, when, or under what conditions.

An Ishikawa diagram creates a place for those explanations before choosing among them. Also called a fishbone or cause-and-effect diagram, it organizes possible contributors to an observed effect. The method is associated with Kaoru Ishikawa's quality-improvement work. It is a way to structure an investigation, not a machine that discovers a root cause from the shape of a drawing.


![Possible contributors from materials, methods, measurement, and environment point toward an observed effect. Investigate the links rather than accepting the layout as proof.](/diagrams/thinking-tools/ishikawa-diagram.svg "A cause inventory is not a causal verdict. Possible contributors from materials, methods, measurement, and environment point toward an observed effect. Investigate the links rather than accepting the layout as proof.")

## Start with an effect you can recognize

“Bad firing” is too broad to investigate well. The studio can be more specific: bowls from the lower shelf developed cracks near their bases during the last two firings, while similar pieces on other shelves did not. That statement defines what needs explaining without declaring the cause.

This precision changes what belongs in the diagram. A general complaint about the studio's organization may be real but too remote to help. A change in the lower shelf's airflow, drying conditions, or temperature measurement has a clearer possible connection. The effect can be revised as evidence improves; it need not be perfectly understood before work begins.

The familiar fishbone shape places the effect at one end, with categories branching from a central line and possible causes beneath them. Categories can cover materials, equipment, procedures, people, measurement, and environment. They are prompts for looking in different directions. They are not a requirement that every problem must fit a manufacturing vocabulary.

## Turn explanations into a hypothesis inventory

For the studio, useful categories might be clay and glaze, drying, kiln operation, loading, and measurement. Under drying, the group records crowded shelves and thicker bases. Under kiln operation, it records a changed firing schedule and a suspected cold spot. Under measurement, it records that the temperature display describes one location, not every shelf. Each entry remains a possible contributor.

A cause can appear in more than one category if the overlap is meaningful. A thick base affects drying time and heat distribution. Forcing it into one branch for the sake of a tidy picture would remove a useful connection. The objective is to make explanations inspectable, including interactions, rather than to manufacture a perfectly exclusive classification.

Asking what could produce each contributor can uncover another layer. If pieces are still damp, perhaps the drying shelf is crowded because classes end just before the weekly firing. That does not establish that scheduling caused the cracks. It identifies a sequence the group can examine: class timing, drying time, moisture, and failure during firing.

## Evidence decides what happens next

The instructor checks the records and finds that one batch used the older clay. That weakens the claim that the new delivery alone explains the damage. Measurements also show that the lower drying shelf retains moisture longer. The next test can compare equally shaped pieces dried under two controlled conditions, with placement and firing settings recorded.

This is a better outcome than voting on the most convincing branch. A popular explanation can be wrong; a contributor suggested quietly can be important. The diagram helps the team choose observations that separate competing accounts. It does not convert plausibility into proof.

A useful inventory therefore includes evidence as well as causes: what is already observed, what is inferred, what would contradict an explanation, and what can reasonably be checked. An apparent cause may be an intermediate effect of another condition. Several causes may jointly be necessary. Some may matter only in combination, which makes testing one factor at a time insufficient unless the interaction is considered.

## A second setting: missed rehearsals

An amateur ensemble repeatedly starts late. “People are unreliable” turns a pattern into a judgment about character. A cause inventory opens other branches: unclear arrival expectations, travel connections, room access, instrument setup, and the rehearsal plan itself. Records show that several musicians arrive at the building on time but wait for the person with the key. Another group needs ten minutes to assemble equipment that was not included in the advertised start time.

The remedy may involve access and scheduling rather than a stricter warning. There can still be individual attendance problems, but they are no longer made to carry the whole explanation. The same method helps because the group can connect a specific observed delay to multiple testable contributors.

## Keep the diagram provisional

Use this pattern when a recurring failure has several plausible causes, especially when different people see different parts of the process. It is less useful when an urgent hazard first requires containment, or when direct evidence already establishes a simple fault. Investigation should not delay an obvious protective action.

Avoid categories that assign blame, such as “careless employees.” Record conditions and mechanisms instead. Also avoid treating the longest branch as the most important: it may simply reflect the experience of the people present. Invite missing perspectives and inspect branches with little evidence.

[[reframing-find-hidden-influence|Find Hidden Influences]] helps propose omitted contributors. [[issue-trees|Issue Trees]] structures answerable investigation questions. [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] helps choose the observation that could most change the next action. Together they move the diagram from a record of opinions toward a practical inquiry.

## Sources

The American Society for Quality's [fishbone diagram reference](https://asq.org/quality-resources/fishbone) describes the method and its association with Kaoru Ishikawa. Examples and participant-led procedures here are original.

## Practice — Build a Cause Inventory

**Purpose:** Organize possible causes around a specific observed effect, then investigate the explanations that matter.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Build a Cause Inventory"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Describe the effect"
effect = !ask {
What specific observable effect needs explaining?
}
boundary = !ask {
When, where, and for whom does it occur?
}
}
causes = !collect {
:min 1
:max 6
entry = !form {
:title "Add an entry"
cause = !ask {
What is one possible contributor to this effect?
}
category = !choose {
Which area should prompt investigation?
- materials: "Materials or inputs"
- methods: "Process or method"
- equipment: "Equipment or tools"
- people: "Roles, skills, or coordination"
- measurement: "Measurement or interpretation"
- environment: "Environment or context"
}
mechanism = !ask {
How could this contributor produce the effect?
}
status = !choose {
What is the evidence status?
- observed: "Direct observations"
- indirect: "Indirect support"
- hypothesis: "A hypothesis to check"
}
check = !ask {
What observation would strengthen or weaken this explanation?
}
}
-> yield entry
}
!show {{causes}} {
:group category
}
review = !form {
:title "Choose an investigation"
priority = !ask {
Which explanation is consequential enough to investigate first, and why?
}
test = !ask {
What bounded check would distinguish it from an alternative?
}
protection = !ask {
What immediate practical action is needed while investigation continues?
}
}
result = {effect: context, hypotheses: causes, investigation: review}
!show {
Investigate first: {{review.priority}}
Proposed check: {{review.test}}
Keep the cause inventory provisional until evidence supports a link.
}
-> end
```
