---
id: "iceberg-model"
type: "pattern"
title: "Iceberg Model"
summary: "Connect a visible event with recurring patterns, enabling structures, and assumptions worth examining."
status: "published"
aliases: []
tags: ["systems-thinking", "thinking-tools", "iceberg-model"]
verses: ["systems-thinking"]
attribution: "A systems-thinking teaching heuristic; no single originator asserted. Related foundations in Donella Meadows’s systems work. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

The food pantry runs out of familiar ingredients every other Saturday. Volunteers work harder, improvise substitutions, and apologize to the last families in the queue. Each shortage receives an explanation: a late van, an unusually busy morning, a missing delivery. Those explanations may be accurate. They still leave a question unanswered: why does an exceptional Saturday keep returning?

The Iceberg Model organizes that question into levels. The visible event is one shortage. The pattern is repeated shortages at a particular time. Structures include ordering rules, delivery schedules, storage limits, and the information available to volunteers. Mental models include assumptions about what service should look like and what changes are considered acceptable. Moving between these levels broadens the investigation beyond the episode that demanded attention.


![A visible event leads to questions about recurrence, arrangements, and sustaining assumptions. Each level needs evidence.](/diagrams/thinking-tools/iceberg-model.svg "Four levels of inquiry. A visible event leads to questions about recurrence, arrangements, and sustaining assumptions. Each level needs evidence.")

## Four levels of inquiry, not four proven causes

The iceberg is a teaching metaphor from systems thinking, rather than a literal account of where causes are hidden. Its levels help separate questions that are often mixed together. What happened? What has happened repeatedly? What arrangements could generate that recurrence? What beliefs or priorities help sustain those arrangements?

A deeper-looking statement is not automatically more accurate. “The organization undervalues people” may sound profound while being much less useful than a verified delivery mismatch. Mental models require evidence just as operational claims do. People may be following a rule because they lack authority to change it, not because they believe the rule is good.

Donella Meadows's work on system structure and leverage provides an important foundation for this way of examining behavior. The iceberg itself has circulated through systems education in several forms; this article does not assign it a single unverified inventor.

## Follow the pantry's recurrence

The volunteers compare six weeks rather than debating the latest morning. They find that shortages happen when a neighborhood event ends early and families arrive before the second delivery. On other Saturdays the same amount of food is sufficient. The pattern changes the question from “Why did someone fail today?” to “How does our replenishment schedule match actual arrival times?”

At the structural level, they discover that the order is based on an average Saturday. The storage room cannot hold a full additional delivery, and the supplier requires advance notice. A solution must account for all three conditions. Simply ordering more may create spoilage on quieter weeks while leaving the timing mismatch unresolved.

At the assumptions level, an old practice also becomes visible: volunteers believe changing the public opening time would be unfair, so they have never considered staggered collection or a separate early delivery of the most frequently requested ingredients. That belief protects a legitimate concern about access. Examining it does not mean dismissing it. The team can ask which forms of scheduling would preserve access while making demand more predictable.

## Intervention can happen at several levels

The immediate shortage still needs a response. A systems perspective should not become a reason to withhold practical help until a complete explanation is available. Event-level action can stabilize the situation while other work addresses recurrence.

Different levels suggest different interventions. A reserve supply addresses a near-term event. Recording arrival times improves understanding of the pattern. A revised delivery arrangement changes structure. Discussing what fairness requires examines the assumptions constraining possible arrangements. Several interventions may be necessary, and each can be tested on its own terms.

A useful experiment might reserve one compact set of popular ingredients for the early rush on event days. Volunteers can monitor shortages, waste, and whether later visitors lose access. The experiment does not prove a universal theory of the pantry. It tests a particular structural explanation under observable conditions.

## A personal pattern without a character verdict

Someone repeatedly misses an evening language class. At the event level, there is always a reason: a late call, a forgotten meal, a train delay. Across a month, the pattern shows that absence follows days with meetings after five. Structurally, the person has no travel buffer or prepared dinner. An assumption also contributes: leaving work before everyone else feels like poor commitment, even when the class has been agreed in advance.

A reminder alone may not help much. Protecting a departure time and arranging food could change the pattern. A conversation about the departure agreement may matter more than another attempt to become “more disciplined.” The model has widened the account without claiming that the person has discovered a hidden psychological cause.

## Use depth to improve the next question

This pattern is useful when incidents recur, explanations keep changing, or fixes repeatedly restore the same unstable arrangement. It can be less useful when the event is genuinely isolated or when the available evidence is too thin to establish a pattern. In that case, gathering a few observations is a better next step than inventing a system story.

The most common mistake is turning the four levels into a ladder of moral sophistication. Immediate action is not shallow when someone needs help, and structural language is not evidence. Another mistake is assuming that every visible failure reflects one belief shared by everyone involved. Different people can sustain the same arrangement for different reasons.

[[reframing-expand-time-window|Expand the Time Window]] helps reveal recurrence and context. [[ishikawa-diagram|Ishikawa Diagram]] organizes competing explanations. [[balancing-feedback-loops|Balancing Feedback Loops]] and [[reinforcing-feedback-loops|Reinforcing Feedback Loops]] explain particular mechanisms that can produce patterns over time. The iceberg helps decide which of those questions is currently missing from the conversation.

## Sources

See Donella Meadows, [Leverage Points: Places to Intervene in a System](https://donellameadows.org/archives/leverage-points-places-to-intervene-in-a-system/), for the relationship between arrangements, behavior, goals, and assumptions. The four-level educational application and examples here are independently written.

## Practice — Look Beneath a Recurring Event

**Purpose:** Connect a visible event with recurring patterns, enabling structures, and assumptions worth examining.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Look Beneath a Recurring Event"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
event = !form {
:title "Describe one event"
observation = !ask {
What happened, without explaining why yet?
}
boundary = !ask {
Where, when, and to whom did it happen?
}
}
pattern = !form {
:title "Look across occasions"
recurrence = !ask {
What has happened across several occasions? Say if recurrence is not established.
}
evidence = !ask {
What records, examples, or contrasts support that pattern?
}
}
structure = !form {
:title "Inspect arrangements"
arrangements = !ask {
What rules, timing, information, resources, or relationships could generate the pattern?
}
alternative = !ask {
What competing structural explanation could fit?
}
}
assumptions = !form {
:title "Examine sustaining assumptions"
belief = !ask {
What assumption or priority might keep the arrangement in place?
}
basis = !ask {
Who has actually expressed this, and what remains your interpretation?
}
}
test = !form {
:title "Choose a proportionate response"
immediate = !ask {
What immediate need requires attention now?
}
change = !ask {
Which structural change is worth testing?
}
observation = !ask {
What would you observe to assess the explanation, including unintended effects?
}
}
result = {event: event, recurrence: pattern, structures: structure, assumptions: assumptions, response: test}
!show {
Your proposed structural test: {{test.change}}
Observe: {{test.observation}}
Immediate need: {{test.immediate}}
}
-> end
```
