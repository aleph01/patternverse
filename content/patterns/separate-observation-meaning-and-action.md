---
id: separate-observation-meaning-and-action
type: pattern
title: Separate Observation, Meaning, and Action
summary: Debrief an experience by distinguishing what happened, what it might mean, and what to do next.
status: published
aliases: [What So What Now What, W3]
tags: [learning, reflection, evidence]
verses: [learning]
attribution: "Adapted from What, So What, Now What by Henri Lipmanowicz and Keith McCandless; their source connects the method to Chris Argyris's Ladder of Inference. Original Patternverse examples and individual debrief; CC BY-SA 4.0."
---

After a disappointing handoff, someone says the other team does not care about quality. Another person proposes a mandatory checklist. Within a few minutes, an interpretation has become a verdict and a proposed remedy has become the center of the discussion. Nobody has yet established what information was missing, who received it, or what actually happened next.

A useful debrief gives three different questions their own space. What happened? What might it mean? What response follows? Keeping them distinct makes the reasoning inspectable. People can agree about an observation while offering different explanations, or accept an explanation while proposing different actions.

![An observation, a possible interpretation, and a proposed action remain distinct: owner missing, role unclear, test an owner field.](/diagrams/liberating-structures/separate-observation-meaning-and-action.svg "Keep the reasoning visible. An observation, a possible interpretation, and a proposed action remain distinct: owner missing, role unclear, test an owner field.")

## What: make an account someone could examine

An observation identifies a particular event or experience. In the handoff, the delivery note omitted an owner, a clarification request arrived at 16:20, and the recipient did not have access to one document. Each statement can be investigated. An assertion that nobody cared compresses those details into a judgment about motives.

Observations can include personal experience, but name its source. Feeling anxious during the handoff is an account of your experience. Claiming that everyone was anxious requires information about other people. A recollection is also different from a timestamped record. The aim is useful clarity, not a demand that every human experience become a numerical measurement.

Missing information belongs here too. Perhaps nobody knows whether the recipient tried the document link before the call. A debrief can retain that gap. Filling it with a plausible story makes the account smoother while making the reasoning weaker. A useful record distinguishes what was observed, what was reported, and what remains unknown.

## So what: develop interpretations as interpretations

The same facts support several possibilities. The missing owner may reflect an unclear responsibility, an outdated template, or an unusual case that did not fit the normal arrangement. The inaccessible document may be a permissions issue rather than evidence of indifference. These explanations suggest different checks and interventions.

An interpretation earns attention by connecting to the observations and surviving alternatives. Ask which details it explains, what it leaves unexplained, and what else could produce the same result. This does not require an exhaustive investigation before making a modest change. It does require avoiding certainty that the available account cannot support.

The **W3** Liberating Structure repeats this progression through individual reflection, small-group exchange, and plenary sharing. The practice here is an individual incident debrief. It can prepare someone for a conversation or support learning afterward, but it cannot establish what the whole group believes. Its output is a personal account with explicit uncertainties.

## Now what: make the response traceable

An action should have a reason connected to the earlier stages. If the proposed explanation concerns unclear responsibility, the team could try an explicit owner field on the next two handoffs. If the explanation concerns access, checking permissions before the transfer may be more appropriate. Introducing every imaginable safeguard would make it harder to learn which one matters.

State what useful change you expect and when to review it. An action can be provisional without being vague. Trying one revised handoff and checking whether the recipient can name the next owner is inspectable. Improving communication is an intention that still needs translation into behavior.

Authority remains relevant. A personal debrief can produce an action you own, a proposal to discuss, or a question to investigate. It does not create a commitment for another person. The difference should remain visible in the final record so that an attractive plan is not mistaken for an agreed arrangement.

## A second example: learning from a class

A learner leaves a language class thinking they are getting worse. Their observations are more specific: they struggled with two unfamiliar listening exercises, answered familiar written questions successfully, and asked for repetition three times. The class also introduced a new speaker with a different accent.

One interpretation is that listening under unfamiliar conditions needs practice. Another is that fatigue contributed. Neither establishes a general decline. The learner chooses a short listening exercise with the new accent and compares performance when rested. They also retain the observation that written comprehension remained available, which the initial verdict had erased.

This example shows why the order matters. Starting with an action such as studying harder could increase effort without identifying the difficulty. Starting with reassurance could dismiss a real learning need. A separated account can acknowledge disappointment while making the next inquiry more precise.

## Keep the boundaries permeable enough to learn

The stages are distinctions, not sealed compartments. A proposed action may reveal that an important observation is missing. A new explanation may prompt someone to check a record. Returning to an earlier question is sensible; silently rewriting the original account to fit the preferred action is not.

Use W3 after a meaningful event, a trial, a disagreement, or a recurring difficulty. Avoid turning every minor experience into a lengthy review. Common mistakes include labeling motives as facts, collecting observations without ever making a judgment, and calling an action successful before checking its effect.

[[reframing-verify-statement]] sharpens individual claims. [[ladder-of-inference]] examines how selected observations become conclusions. [[keep-a-decision-journal]] preserves expectations before outcomes are known. Together they support a debrief that produces learning rather than a retrospective story in which the answer was obvious all along.


## Liberating Structures source and adaptation

[What, So What, Now What](https://www.liberatingstructures.com/what-so-what-now-what), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Debrief an Incident with W3

**Format:** Individual incident debrief. **Time:** About 18 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Debrief an Incident with W3"
:output result

!show {
A personal adaptation of What, So What, Now What. Keep observation, possible meaning, and chosen response separate. Another person’s motive is not an observation.
}
context = !form {
:title "Choose an incident"
incident = !ask {
What event or trial will you examine?
}
scope = !ask {
Whose experience can you actually speak for?
}
}
observations = !collect {
:min 1
:max 5
entry = !form {
:title "What happened?"
observation = !ask {
What did you see, hear, or experience?
}
basis = !choose {
How do you know?
- direct: "Direct observation or personal experience"
- record: "A record I can check"
- reported: "Reported by someone else"
}
gap = !ask [optional] {
What remains unknown?
}
}
-> yield entry
}
!show {{observations}} {

}
meanings = !collect {
:min 1
:max 3
entry = !form {
:title "What might it mean?"
interpretation = !ask {
What is one possible explanation?
}
support = !ask {
Which observation supports it?
}
alternative = !ask {
What else could account for the observations?
}
uncertainty = !ask {
What should remain uncertain?
}
}
-> yield entry
}
!show {{meanings}} {

}
action = !form {
:title "Now what?"
step = !ask {
What action, proposal, or inquiry follows?
}
basis = !ask {
Which observations and interpretations support it?
}
authority = !ask {
What can you own, and what needs someone else’s agreement?
}
signal = !ask {
What would show whether it helped?
}
review = !ask {
When or under what condition will you review it?
}
}
result = {incident: context, observations: observations, interpretations: meanings, response: action}
!show {
Response: {{action.step}}
Reasoning: {{action.basis}}
Authority and agreement: {{action.authority}}
Review: {{action.review}}
}
-> end
```
