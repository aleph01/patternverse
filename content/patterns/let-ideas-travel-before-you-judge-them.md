---
id: let-ideas-travel-before-you-judge-them
type: pattern
title: Let Ideas Travel Before You Judge Them
summary: Circulate concise proposals through independent judgments before discussing which deserve further attention.
status: published
aliases: [25/10 Crowdsourcing]
tags: [decision-making, facilitation, idea-selection]
verses: [decision-making]
attribution: "Adapted from 25/10 Crowdsourcing by Henri Lipmanowicz and Keith McCandless. Original Patternverse examples and physical-activity guide; CC BY-SA 4.0."
---

An idea session produces two dozen proposals. The confident presenter receives several immediate endorsements. A quieter participant's proposal receives little discussion, although it might address the same concern more directly. Once a few people announce their preferences, later judgments become difficult to separate from the emerging social story.

Letting ideas travel creates a period in which a proposal can receive attention without its author continually explaining or defending it. Independent judgment does not remove differences in knowledge or preference. It changes the procedure through which those differences first enter the selection process.

![A card with an idea and first step receives five independent one-to-five ratings before scores are totaled. Totals guide attention rather than determine objective value.](/diagrams/liberating-structures/let-ideas-travel-before-you-judge-them.svg "Five independent readings, then discussion. A card with an idea and first step receives five independent one-to-five ratings before scores are totaled. Totals guide attention rather than determine objective value.")

## Make the proposal inspectable

A short proposal needs both an idea and a plausible first step. A wish to improve local transport is hard to evaluate. A proposal to test a clearly signed pickup point for one community event gives readers something more concrete to consider. Brevity exposes whether the idea depends on explanation that only its author possesses.

The **25/10 Crowdsourcing** Liberating Structure uses physical cards, repeated blind exchanges, and five ratings from one to five. Readers decide before inspecting previous scores; totals can reach twenty-five. A countdown surfaces leading ideas, followed by attention to intriguing lower-scoring possibilities. The current source advises against an online version because of the logistics. The practice here guides the physical activity and records selected human-supplied results afterward.

That procedure is not the same as one person ranking a list. The movement, exposure to different proposals, and independent assessments are part of the activity. A worksheet can explain the steps and help preserve results, but it cannot manufacture a crowd by asking one facilitator to supply several imagined votes.

## Preserve independence where it matters

If a reader sees enthusiastic earlier scores before deciding, the resulting rating may partly reflect those scores. The same concern applies to hearing a respected colleague endorse a proposal. Concealment is procedural: people need a practical way to avoid inspecting the back until their decision is made.

Independence is not a claim that every rater understands an idea equally well. A proposal with specialist implications may receive favorable scores because readers miss a constraint. An unfamiliar but valuable idea may receive low scores because its wording is unclear. The scores show how these cards were received by these participants under this procedure.

The facilitator therefore needs to explain the invitation and the meaning of the scale. Are readers considering potential contribution to a shared challenge, willingness to help, or something else? Changing the interpretation halfway through makes the totals harder to understand. A clear common invitation helps without pretending that all personal judgments have become identical measurements.

## A neighborhood example

A group exploring a vacant square writes proposals ranging from a seasonal market to a shaded seating area. One card describes a temporary seating trial with borrowed furniture during two afternoons. Another proposes a complete redesign with no first step. The concise trial receives interest because people can imagine participating, but that response says little about longer-term costs or access requirements.

During the discussion, someone holding a lower-scoring card mentions a route through the square that wheelchair users find difficult. Its author had written a technical description that many readers did not understand. Treating the first scores as a binding decision would exclude important information. A wild-card discussion brings the issue back into the investigation.

The group can combine what it learned: a temporary seating trial should preserve the access route, and the route itself needs better evidence. The activity has helped direct attention, not selected a fully designed intervention. The next decision may require affected people who were not in the room.

## A second setting and a boundary

A volunteer association can use the activity to surface small experiments for welcoming new members. People know enough about the shared work to recognize promising first steps. The result can guide which proposals receive a short follow-up conversation and who might help develop them.

It is less suitable as the sole basis for deciding an individual's rights, evaluating staff, or allocating resources with serious unequal consequences. Popularity among attendees is not a substitute for legitimate decision authority, appropriate expertise, or the involvement of people affected. An engaging procedure does not supply those missing conditions.

## Turn attention into investigation

After the activity, record selected ideas, the actual totals when available, and why a lower-scoring proposal still deserves attention. Identify the next step as proposed, accepted, or needing agreement. A high total does not create volunteers, approval, or resources.

Common mistakes include presenting the scores as objective quality, discarding every unusual low-scoring idea, and holding the activity when participants cannot physically exchange cards comfortably. An alternative discussion format may fit better in that situation; it should be labeled as an alternative rather than the same method without its defining mechanics.

[[separate-exploration-from-selection]] explains why generating possibilities and judging them benefit from different conditions. [[make-trade-offs-explicit]] can support later comparison, and [[prefer-the-smallest-useful-experiment]] helps turn a promising first step into evidence. The result of circulation is a better-informed place to begin that work.


## Liberating Structures source and adaptation

[25/10 Crowdsourcing](https://www.liberatingstructures.com/25-10-crowdsourcing), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Guide Physical 25/10 Crowdsourcing

**Format:** Physical card-activity guide and human-supplied results. **Time:** About 30 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Guide Physical 25/10 Crowdsourcing"
:output result

!show {
Prepare the physical activity with participants, cards, and pens. Afterward, record actual results. Scores guide attention; they do not establish objective quality or decision authority.
}
plan = !form {
:title "Prepare the invitation"
challenge = !ask {
What shared challenge invites bold actionable ideas?
}
scale = !ask {
What shared interpretation of 1 (low) through 5 (high) will you explain?
}
access = !ask {
How will people exchange cards comfortably and avoid seeing earlier scores?
}
}
!show {
Outside the app: each person writes one bold idea and first step on a card. Demonstrate blind exchanges while moving. Signal five rounds: stop, read the card, decide a 1–5 rating before looking at earlier scores, write it on the back, and signal readiness. After five rounds, participants total the scores, count down from 25 to surface up to ten leading ideas, and invite intriguing lower-scoring wild cards. Never invent a missing rating.
}
round_cue = !timer {
:duration 60
:blocking false
:sticky false
Optional one-minute movement cue; repeat it manually for each real round.
}
activity = !choose {
What happened?
- performed: "The physical activity happened; record actual results"
- planned: "Preparation only; there are no results yet"
- passed: "The activity was not carried out"
}
?match activity {
:case performed {
cards = !collect {
:min 0
:max 10
entry = !form {
:title "Record a card with five actual ratings"
idea = !ask {
What idea is on this card?
}
total = !rate 5..25 {
:low "Little or absent"
:high "Strongly present"
What is its human-supplied total from five 1–5 ratings?
}
first_step = !ask {
What first step is written on it?
}
}
-> yield entry
}
}
:case planned {
cards = []:{idea: text, total: number, first_step: text}
}
:case passed {
cards = []:{idea: text, total: number, first_step: text}
}
}
!show {{cards}} {
:order total desc
}
review = !form {
:title "Preserve judgment beyond the scores"
wild_card = !ask [optional] {
Any actual wild-card idea worth investigating? Leave blank if none or not performed.
}
limits = !ask {
What knowledge, affected people, or approval is missing?
}
next_step = !ask {
What investigation or preparation follows?
}
}
result = {preparation: plan, activity: activity, recorded_cards: cards, review: review}
!show {
Activity status: {{activity}}
Wild card, if supplied: {{review.wild_card}}
Limits of the scores: {{review.limits}}
Next inquiry: {{review.next_step}}
}
-> end
```
