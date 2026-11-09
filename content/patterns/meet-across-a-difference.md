---
id: meet-across-a-difference
type: pattern
title: Meet Across a Difference
summary: Explore the reasoning behind positions on a spectrum through voluntary encounters and reflection.
status: published
aliases: [Folding Spectrogram]
tags: [collaboration, perspective, dialogue]
verses: [collaboration]
attribution: "Adapted from Folding Spectrogram, whose source credits Nancy White and other Liberating Structures practitioners and notes a longer history of variations. Original Patternverse examples and physical-activity guide; CC BY-SA 4.0."
---

A volunteer group appears divided about expanding its activities. Some members sound enthusiastic and others cautious. In a discussion, those positions become identities: the ambitious people and the resistant people. When members explain their reasoning directly to one another, the division becomes less simple. One enthusiastic person wants a small trial. One cautious person would support expansion if the current work had a reliable owner.

A spectrum makes positions visible without claiming to explain them. An encounter across the line then gives people an opportunity to hear why someone stands where they do. The meaningful movement is from an assumed category to an actual account of another person's reasoning.

![Ten ordered positions form five pairs when the physical line folds. Numbers show order, not labels for people. Online adaptation omits the fold.](/diagrams/liberating-structures/meet-across-a-difference.svg "An encounter across positions. Ten ordered positions form five pairs when the physical line folds. Numbers show order, not labels for people. Online adaptation omits the fold.")

## Ask a question that permits a range

A useful statement concerns a specific issue and allows more than a binary response. It should be clear what the endpoints represent and what participants are expressing. Confidence in a proposal, willingness to try it, and perceived readiness are different questions. Mixing them can create a dramatic-looking distribution that nobody can interpret reliably.

For the volunteers, readiness to add an activity next month is more concrete than whether the group should be ambitious. Members may choose a middle position because they lack information, see mixed conditions, or hold a qualified view. The host should invite those distinctions rather than treating the middle as indecision.

The **Folding Spectrogram** Liberating Structure has people position along a line, hear a few accounts, and optionally fold the physical line to pair different positions. Its source suggests a minimum group of ten. The official online adaptation uses marks on a shared line and omits the fold. Nancy White and other LS practitioners adapted a family of activities with a longer history.

## Let a position remain provisional

A person's place on the line is an answer to this statement at this moment. It is not a diagnosis of personality, loyalty, or courage. People should be able to move after clarification without that movement being framed as defeat. They should also be able to keep their position after understanding another account more accurately.

Before pairing, hearing several perspectives from different parts of the line can expose assumptions about the question itself. One member may interpret expansion as a new permanent commitment while another imagines a single event. That difference needs clarification before a host treats the distance between them as a conflict of values.

The line can also show why a numerical summary is inadequate. A group clustered near the center may share moderate confidence or contain several very different uncertainties. Averaging positions would conceal those accounts. The physical arrangement is a prompt for inquiry rather than a vote or an authorized decision.

## Fold the line to create an encounter

In the physical fold, the ordered line bends so that people meet someone from another part of the spectrum. The arrangement reduces reliance on participants approaching familiar allies. Each partner needs time to explain what matters to them and to hear the other account without immediately preparing a rebuttal.

For the volunteer group, a participant learns that a cautious partner has been covering unfilled shifts. That information changes what expansion would require. The partner learns that enthusiasm concerns testing a short activity, not launching a permanent program. They can retain different positions while identifying a more precise question about staffing a trial.

The guide supports preparation and reflection around this actual encounter. Patternverse does not track participants or calculate pairs. Hosts need an accessible space and alternatives for people who cannot or prefer not to stand or move. Such accommodations should preserve choice and opportunities to exchange perspectives without pretending that everyone must perform the same physical movement.

## A second setting: a learning community

A group of tutors considers how much structure a study session needs. People place themselves between a fully planned sequence and an open participant-led session. In paired conversations, one tutor describes learners who appreciate predictable steps; another describes experienced learners whose questions are repeatedly interrupted by a fixed plan.

Their disagreement may depend partly on different contexts. The next inquiry can ask which learners and purposes the new session is meant to serve. A hybrid design might become useful, or the group may choose different arrangements for different sessions. The encounter has improved the information available without requiring a single compromise to satisfy every setting.

Choose topics appropriate to the relationships and setting. Public position-taking can expose people to pressure, especially where disagreement carries consequences. Participants need a genuine way to pass, choose a less revealing example, or decline an explanation. A host should not use an apparently playful activity to extract views people have not agreed to disclose.

## Carry understanding into a next question

A useful debrief identifies what someone understood differently, which assumption changed, and what the group still needs to learn. It should not require participants to report that they moved closer together. Greater clarity can reveal a real boundary as well as a possible agreement.

[[work-with-enduring-tensions]] helps explore legitimate opposing demands. [[think-alone-before-thinking-together]] can preserve an initial account before the line becomes socially influential. [[design-participation-before-the-agenda]] helps decide whether public positioning serves the actual purpose. The encounter succeeds when people have better grounds for their next conversation, not merely when the line looks less divided.


## Liberating Structures source and adaptation

[Folding Spectrogram](https://www.liberatingstructures.com/folding-spectrogram), credited by the source to Nancy White and other LS practitioners; variations have a longer history. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Prepare and Reflect on a Folded Spectrum

**Format:** Physical spectrum activity and voluntary conversation guide. **Time:** About 25 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Prepare and Reflect on a Folded Spectrum"
:output result

!show {
Prepare a physical Folding Spectrogram with at least ten participants, as suggested by the source. Participation and explanation are voluntary. The official online adaptation omits the fold.
}
plan = !form {
:title "Design a usable spectrum"
issue = !ask {
What appropriate issue will people explore?
}
statement = !ask {
What clear statement allows a range of responses rather than just yes or no?
}
endpoints = !ask {
What exactly do the two ends mean? Distinguish readiness, preference, and confidence.
}
access = !ask {
How can people participate comfortably, decline disclosure, or avoid physical movement?
}
}
!show {
Outside the app: explain the endpoints, invite people to position themselves, and hear a few perspectives across the line. Where useful and agreed, physically fold the ordered line so people meet a different position. Partners listen and explain rather than debate. A further fold can form quartets. Debrief what was understood differently; movement toward agreement is not required.
}
exchange_cue = !timer {
:duration 180
:blocking false
:sticky false
Optional three-minute paired-conversation cue.
}
activity = !choose {
What are you recording?
- performed: "The activity happened; I can reflect on it"
- planned: "Preparation only; the activity has not happened"
- passed: "I chose not to carry out the activity"
}
?match activity {
:case performed {
reflection = !form {
:title "Reflect on an actual encounter"
heard = !ask {
What reasoning did you actually hear, without claiming to know unspoken motives?
}
changed = !ask {
What did you understand differently? Your position need not change.
}
boundary = !ask {
What real disagreement, uncertainty, or boundary remains?
}
next_step = !ask {
What better question or responsible next step follows?
}
}
}
:case planned {
reflection = {heard: "", changed: "", boundary: "", next_step: ""}
}
:case passed {
reflection = {heard: "", changed: "", boundary: "", next_step: ""}
}
}
result = {preparation: plan, activity: activity, encounter: reflection}
!show {
Activity status: {{activity}}
Reasoning heard: {{reflection.heard}}
Understanding changed: {{reflection.changed}}
Remaining boundary: {{reflection.boundary}}
Next question: {{reflection.next_step}}
}
-> end
```
