---
id: "connection-circles"
type: "pattern"
title: "Connection Circles"
summary: "Turn a changing situation into a small set of variables and inspectable causal relationships."
status: "published"
aliases: []
tags: ["systems-thinking", "thinking-tools", "connection-circles"]
verses: ["systems-thinking", "learning"]
attribution: "Julia Hendrix conceived the connection circle; Alan Ticotsky and Rob Quaden refined it, with Debra Lyneis. Source: Janice Molloy’s adaptation of The Shape of Change. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A neighborhood garden has fewer volunteers than it did in spring. The first explanation is that people have become less committed. Then someone points out that the remaining volunteers face more work, maintenance sessions feel less welcoming, and newcomers rarely receive an introduction. Those conditions may be connected. If extra work makes sessions less welcoming, which reduces participation and creates still more work, the garden has a possible feedback loop rather than a collection of unrelated complaints.

Connection Circles help turn a changing situation into variables and causal hypotheses. The variables are arranged around a circle and connected where a change in one might influence another. The circle itself has no causal meaning. Its role is to keep several elements visible while people explore connections among them.


![More experienced volunteers may improve repair success, which may support recommendations and recruitment. Every return link needs evidence.](/diagrams/thinking-tools/connection-circles.svg "A proposed path must return. More experienced volunteers may improve repair success, which may support recommendations and recruitment. Every return link needs evidence.")

## Choose things that can change

“Volunteers” names a group, but “number of active volunteers” names a variable. “Welcoming atmosphere” is vague; “time spent introducing newcomers” is easier to observe. Useful variables can increase or decrease and have a meaning that remains consistent throughout the discussion.

The garden begins with active volunteers, work per volunteer, time for introductions, newcomer return rate, and unfinished maintenance. This is a small model, not a claim to describe the whole garden. Weather, transport, and other demands on people's time may also matter. A boundary makes inquiry possible while leaving room to add an omitted influence when evidence calls for it.

The method's documented educational lineage credits Julia Hendrix with conceiving the connection circle, and Alan Ticotsky and Rob Quaden with refining its use. Janice Molloy's adaptation of *The Shape of Change*, written with Debra Lyneis, describes its use as a route toward causal-loop thinking. It is not merely an unlabeled mind map.

## Read each arrow as a claim

An arrow should support a sentence. “As work per volunteer increases, time for introductions tends to decrease, other things being equal” is a causal hypothesis. It includes both direction and a condition. A line labeled only “related” does not explain what someone expects to happen.

A same-direction relationship means that increasing the source tends to increase the target, and decreasing it tends to decrease the target. An opposite-direction relationship means that increasing one tends to reduce the other. These descriptions concern the relationship, not whether its effects are desirable. Increased maintenance work can be bad for morale while still having a positive, same-direction effect on fatigue.

The garden's chain might be: fewer active volunteers increase work per volunteer; greater workload reduces time for introductions; less introduction reduces newcomer return; fewer returning newcomers reduce active volunteers. The path closes. The interpretation remains provisional until the links are examined, but the group can now explain what would keep the decline going.

## Evidence can disagree with an attractive loop

The group looks at attendance and discovers that several sessions had enough experienced volunteers but almost no newcomers. That suggests an additional factor: the invitation reached existing members but not neighbors who had recently moved in. The first loop may explain retention after arrival while missing the reason few people arrive at all.

This is a useful correction. A diagram's explanatory elegance should not make it immune to evidence. Each link can be marked as observed, supported indirectly, or speculative. Delays also matter. A welcoming session may affect return the following week, while visibly improved beds may attract people only over a season.

Choosing a small number of important links prevents the exercise from turning into a drawing in which everything affects everything. If a relationship is indirect, the missing intermediate variable may deserve a place. If no plausible mechanism can be described, leave the connection as an open question rather than adding an authoritative arrow.

## From a loop to an intervention

The garden can try a greeter role that remains protected even when the maintenance list is long. The anticipated effect is more consistent introductions, followed by a higher newcomer return rate. It can watch whether that happens and whether remaining workers experience an unreasonable burden. This creates a specific test of one connection rather than a general campaign to increase commitment.

A household can use the same reasoning for clutter. More unfinished sorting creates fewer usable surfaces; fewer usable surfaces make sorting harder; harder sorting increases the unfinished pile. The intervention may be one permanently clear work surface, not another request to tidy everything. But the loop will not explain clutter caused mainly by inadequate storage unless that condition enters the model.

## Keep the drawing subordinate to understanding

Use Connection Circles when a story contains interacting changes and simple explanations keep failing. The method can be useful individually, but discussion with people who see different parts of the situation often exposes weak links. It is less useful when there is no meaningful variation or when an urgent problem already requires a clear immediate response.

The current practice records variables and structured relationship statements, then asks the participant to identify a closed path. It does not claim automatic causal discovery or draw signed arrows that the renderer cannot yet represent. A readable record of a disputed connection is more valuable than a polished but misleading network.

[[reinforcing-feedback-loops|Reinforcing Feedback Loops]] examines amplifying closed paths; [[balancing-feedback-loops|Balancing Feedback Loops]] examines corrective ones. [[concept-mapping|Concept Mapping]] connects ideas through many kinds of relationship, which need not be causal. [[reframing-find-hidden-influence|Find Hidden Influences]] helps question what the current circle excludes.

## Sources

Janice Molloy, [Learning About Connection Circles](https://thesystemsthinker.com/learning-about-connection-circles/), adapted from Rob Quaden and Alan Ticotsky with Debra Lyneis, *The Shape of Change*. The garden and household examples are original.

## Practice — Trace a Possible Feedback Loop

**Purpose:** Turn a changing situation into a small set of variables and inspectable causal relationships.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Trace a Possible Feedback Loop"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Choose a changing situation"
situation = !ask {
What situation or recurring change do you want to understand?
}
boundary = !ask {
What people, place, and time period are inside this inquiry?
}
}
variables = !collect {
:min 1
:max 8
entry = !form {
:title "Add an entry"
name = !ask {
Name a variable that can increase or decrease, such as number of active volunteers.
}
meaning = !ask {
How would you recognize an increase or decrease in it?
}
}
-> yield entry
}
!show {{variables}} {

}
relationships = !collect {
:min 1
:max 10
entry = !form {
:title "Add an entry"
source = !ask {
Copy the name of a source variable from your list.
}
target = !ask {
Copy the name of the variable it could affect.
}
direction = !choose {
If the source increased, what would the target tend to do, other things equal?
- same: "Increase: same-direction link"
- opposite: "Decrease: opposite-direction link"
- unclear: "Relationship unclear"
}
mechanism = !ask {
Why could that influence occur?
}
evidence = !choose {
What supports this link?
- observed: "Direct observations"
- indirect: "Indirect support"
- hypothesis: "A hypothesis to check"
}
delay = !ask {
When might the effect become visible? Say if unknown.
}
}
-> yield entry
}
!show {{relationships}} {
:group evidence
}
review = !form {
:title "Inspect a closed path"
!show {
Relationships are recorded as statements. Names are not automatically matched and causal-loop polarity is not automatically inferred.
}
loop = !ask {
Which sequence returns to its starting variable? If none is supported, record that instead.
}
missing = !ask {
Which weak link or omitted variable most needs checking?
}
intervention = !ask {
What small intervention or observation would help test the account?
}
expected = !ask {
What change would you expect, and when?
}
}
result = {context: context, variables: variables, relationships: relationships, review: review}
!show {
Your proposed intervention or observation: {{review.intervention}}
Expected change and timing: {{review.expected}}
The relationships remain hypotheses to check.
}
-> end
```
