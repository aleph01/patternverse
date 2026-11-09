---
id: "cynefin-framework"
type: "pattern"
title: "Cynefin Framework"
summary: "Choose a context-appropriate response while remaining open to changes in what kind of situation you face."
status: "published"
aliases: []
tags: ["decision-making", "thinking-tools", "cynefin-framework"]
verses: ["decision-making"]
attribution: "Dave Snowden developed Cynefin; current framing and domain distinctions are maintained by the Cynefin community. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

An event organizer faces three problems in the same week. A standard registration error needs a familiar correction. An unfamiliar sound-system fault needs a technician. Volunteer participation is declining for reasons nobody agrees about. Calling all three “problems to solve” hides the fact that the same response may not fit them.

Cynefin helps examine the context of a situation and choose a fitting way to act. Dave Snowden developed the framework, which has continued to evolve. Its domains concern the nature of relationships and what can be known about them, rather than numerical positions on two axes.

Use it as a sense-making framework, especially with people who hold different information. A short worksheet cannot diagnose a situation or provide certainty about the domain it occupies.

## Different situations support different responses

In a clear situation, a dependable relationship and an applicable practice are recognizable. The registration error may have an established correction that trained staff can use. Even here, check that the present case actually fits the conditions of the procedure.

In a complicated situation, relationships may be discoverable through investigation or expertise, but they are not obvious to everyone. The sound fault could require measurement, comparison, and a technician’s judgment. Several technically sound solutions may exist. “Complicated” does not mean merely annoying or large.

In a complex situation, outcomes emerge through interactions and cannot reliably be predicted by extending a complete analysis beforehand. Participation may depend on relationships, expectations, timing, and responses to previous changes. Small bounded probes can reveal patterns worth supporting or changing.

In a chaotic situation, the immediate need may be to establish enough stability for meaningful observation and further action. During an unfolding crowd hazard, waiting for a comprehensive explanation would be inappropriate. Follow relevant emergency responsibilities and expertise; a conceptual framework is not an emergency procedure.

There is also a central concern with situations that are not yet understood or differentiated. Different parts may need different treatment. Recent Cynefin language distinguishes useful uncertainty and confusion more carefully than older simplified diagrams suggest.

## Treat a domain as a working interpretation

Return to the volunteer problem. An organizer initially calls it clear: “People are forgetting their shifts; send more reminders.” Another person reports that shift swaps are difficult. A third notices that experienced volunteers have stopped inviting newcomers. These observations suggest that reminders alone may not address the situation.

The group should not vote on a domain label and consider its analysis complete. It can identify which elements are routine, which require investigation, and which depend on changing social responses. Correcting inaccurate shift records may be clear work inside a more complex participation problem.

For the complex part, a probe might offer a small team more control over swapping shifts for a month. It needs boundaries, permission, and observation of effects: participation, coordination burden, and whether flexibility for one team creates difficulties elsewhere. A successful probe is a reason to learn more, not proof that the same arrangement will work everywhere.

## Match inquiry to what is knowable

If a question can be resolved by a reliable procedure, do not replace that procedure with endless experimentation. If specialist analysis can establish an important constraint, obtain it. If interactions make outcomes uncertain, avoid demanding a detailed forecast that nobody can honestly provide.

The distinction changes the question you ask. “Which proven method applies?” differs from “What does expert investigation show?” Both differ from “What bounded interventions could reveal a useful pattern?”

[[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] helps develop a probe, but experimentation is not automatically the right response to every domain. [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] can identify a factual question that should be answered before interpreting the larger situation.

## Watch for movement and mismatch

Contexts can change. A familiar procedure may stop fitting when the environment changes. A chaotic situation may become sufficiently stable for investigation. A local pattern may become dependable enough to support a routine, while the broader situation remains complex.

This does not mean the goal is to move everything toward a single preferred domain. Complexity is not a defect that enough management can eliminate. Nor is calling something complex a reason to abandon evidence, accountability, or preparation.

Ask what observations would show that your current response is mismatched. Repeated exceptions to a routine, an analysis that never settles, or probes with unacceptable effects may require changing approach. Keep the classification provisional and tied to those observations.

## Avoid the attractive quiz

A domain is not determined by averaging answers to questions about uncertainty, urgency, or confidence. A confident group can misunderstand a complex situation. An urgent technical fault can still be complicated. An unfamiliar task can be clear to someone with the relevant training.

The practice below therefore asks for observations, competing interpretations, a provisional response, and signs that would challenge it. It offers named response options without calculating a domain score. Its output supports discussion; it does not confer an official Cynefin diagnosis.

Use the framework to improve the fit between context and action. If the label becomes more important than the observations and decisions it was meant to clarify, return to the concrete situation and ask what the next responsible action requires.

## Sources

- [Cynefin community: Cynefin](https://cynefin.io/wiki/Cynefin), current descriptions and further references. Domain terminology and the framework have evolved over time.

## Practice — Choose a Provisional Response

**Purpose:** Choose a context-appropriate response while remaining open to changes in what kind of situation you face.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Choose a Provisional Response"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Describe the situation before labeling it"
situation = !ask {
What concrete situation requires a response?
}
evidence = !ask {
Which observations show what is happening?
}
different = !ask {
What different interpretations do involved people hold?
}
}
sensemaking = !form {
:title "Examine the fit of possible approaches"
routine = !ask {
Which parts, if any, fit an established dependable procedure?
}
analysis = !ask {
Which parts could be understood through investigation or appropriate expertise?
}
emergence = !ask {
Which parts depend on interactions whose outcomes cannot reliably be predicted beforehand?
}
stability = !ask {
Is immediate stabilization necessary before useful inquiry? What responsibilities or expertise apply?
}
}
response = !form {
:title "Choose a provisional response"
!show {
This is a discussion aid, not a quiz that diagnoses a Cynefin domain. Different parts may need different responses.
}
approach = !choose {
Which response will you provisionally use for the focal part?
- clear: "Apply an appropriate established practice"
- complicated: "Seek analysis or expertise"
- complex: "Use bounded probes and observe emerging patterns"
- chaotic: "Establish stability through appropriate action"
- differentiate: "Differentiate the situation or clarify uncertainty first"
}
basis = !ask {
What observations justify this approach, and what uncertainty remains?
}
action = !ask {
What specific next action fits, with appropriate limits and participation?
}
challenge = !ask {
What observation would show the approach is mismatched or the context has changed?
}
}
result = {situation: context, inquiry: sensemaking, provisional_response: response}
!show {
Your provisional approach: {{response.approach}}
Next action: {{response.action}}
Evidence that would challenge its fit: {{response.challenge}}
}
-> end
```
