---
id: let-participants-build-the-agenda
type: pattern
title: Let Participants Build the Agenda
summary: Establish a shared purpose and let participants propose and choose the conversations they can make useful.
status: published
aliases: [Options Place]
tags: [collaboration, facilitation, self-organization]
verses: [collaboration]
attribution: "Adapted from Options Place by Nancy White and Keith McCandless. Their source acknowledges Harrison Owen's Open Space Technology and Lean Coffee by Jim Benson and Jeremy Lightsmith. Original Patternverse examples and facilitator guide; CC BY-SA 4.0."
---

A regional gathering has invited people who work on the same broad issue in very different circumstances. The organizers can predict several important topics, but not the question a small rural service is facing or the connection a new participant hopes to make. A complete agenda prepared in advance may be orderly while overlooking the conversations people most need.

A participant-built agenda gives those concerns a route into the gathering. The host establishes a purpose and usable boundaries. Participants propose sessions they are prepared to help make worthwhile, then choose where to learn or contribute. The result depends on invitations and initiative rather than a promise that every useful subject can be anticipated centrally.

## A clear container supports open content

Self-selection needs a recognizable purpose. A gathering about improving neighborhood food access gives proposals a shared reference. Anything anyone wants to discuss may produce interesting conversations, but it gives participants less help deciding where to spend limited time. Boundaries can include available rounds, spaces, accessibility arrangements, and what decisions the gathering can actually make.

The **Options Place** Liberating Structure adapts participant-proposed sessions to the LS repertoire. People post a topic with their name, select sessions, move when they are no longer learning or contributing, and preserve useful notes. Its source acknowledges Open Space Technology and Lean Coffee. These are related traditions, not interchangeable names for every informal discussion.

The practice here is a facilitator preparation and delivery guide. A paper agenda board or an external collaboration space can hold proposals and locations. Patternverse does not create rooms, reserve places, or track where people go. The guide records the host's plan and chosen learning afterward.

## A proposal is an invitation to work

A useful session proposal makes a question visible and identifies someone willing to initiate the exchange. Solving food access is broad. Comparing ways to reach people who cannot visit during opening hours offers a more concrete invitation. The proposer need not be the expert with an answer; they need to help the conversation begin.

At the regional gathering, someone proposes delivery coordination, another asks about preserving dignity in eligibility processes, and a third wants to discuss volunteers' travel costs. The third topic was absent from the organizers' original list. Its presence does not establish that it is the most important issue, but it makes an actual concern available to people who recognize it.

Hosts should explain what a proposed session entails. People may assume that posting a topic commits them to a polished presentation. A short example of an exploratory conversation can make participation more accessible. Likewise, a proposer should know whether they are expected to preserve notes, name a next step, or simply convene inquiry.

## Movement needs social permission and practical access

The invitation to move supports responsible use of attention. Someone can leave a conversation that no longer fits and join one where their experience matters. The host should explain this norm before sessions begin so that departure is less likely to be interpreted as an insult or a judgment of the proposer.

Practical access still matters. A distant room, a noisy space, or an inaccessible digital board can make nominal freedom uneven. Movement can be voluntary without requiring everyone to move physically. A host can provide clear information, reachable alternatives, and assistance without choosing people's interests for them.

Self-selection can also reproduce familiar networks. Colleagues may cluster together while newcomers struggle to identify a useful entry point. Clear proposals and a visible agenda help, but the host should notice whether some people need support navigating the arrangement. That support differs from directing them toward the organizer's preferred conversation.

## A second setting: an established working group

A small association holds a quarterly learning afternoon. Routine decisions remain on the formal committee agenda. The open gathering concerns practical questions members want to explore: welcoming first-time volunteers, making equipment easier to find, or sharing a new skill. Keeping that distinction explicit prevents an informal session from being mistaken for an authorized policy decision.

One conversation produces a promising storage experiment. Its notes identify the proposal, who expressed interest, and what still needs agreement. Another session ends with a better question but no action. Both can be useful outcomes. Requiring every conversation to produce an initiative can create unnecessary work and discourage honest exploration.

The closing synthesis should help people discover what happened elsewhere without recreating every session in plenary. A concise question, insight, or proposed next step is often enough. Participants can then choose whether a follow-up conversation matters to them.

## Use openness where it serves the purpose

This pattern fits gatherings with diverse experience, emerging questions, and room for participant initiative. It is less suitable when everyone must learn the same essential information or when a tightly defined decision requires a specific process. A host can combine a necessary common opening with participant-led exploration, provided the boundaries remain clear.

[[design-participation-before-the-agenda]] helps establish the container. [[exchange-ideas-through-rotating-stations]] fits a known set of initiatives better than open session proposals. [[act-within-your-discretion]] helps turn an insight into a responsible next action without treating enthusiasm in a conversation as a commitment by everyone present.


## Liberating Structures source and adaptation

[Options Place](https://www.liberatingstructures.com/options-place), credited by the source to Nancy White and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Prepare a Participant-Built Agenda

**Format:** Facilitator guide for external self-selected sessions. **Time:** About 25 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Prepare a Participant-Built Agenda"
:output result

!show {
Prepare an Options Place gathering using a physical or external agenda board. Define the container, guide participant-led sessions, and capture selected learning afterward.
}
container = !form {
:title "Define the open container"
purpose = !ask {
What shared purpose or theme makes a proposal relevant?
}
boundaries = !ask {
What time, spaces, access arrangements, and decision limits apply?
}
rounds = !ask {
How many rounds and minutes per round are available?
}
invitation = !ask {
How will you explain that proposing a question does not require being its expert?
}
}
logistics = !form {
:title "Prepare navigation and capture"
board = !ask {
How can participants post a topic with their name and find session locations?
}
movement = !ask {
How will you invite people to move when not learning or contributing, with accessible alternatives?
}
notes = !ask {
How will session leads record permitted insights, unresolved questions, and proposed next steps?
}
closing = !ask {
How will you share a concise synthesis without replaying every session?
}
}
!show {
Outside the app: participants propose sessions on the agenda board, choose where to attend, and may move when another conversation would be more useful. Session leads initiate inquiry and capture appropriate notes. A proposal or offer is not an authorized decision or accepted commitment.
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
:title "Debrief actual sessions"
emerged = !ask {
What participant-proposed question or session emerged?
}
learning = !ask {
What actual insight or unresolved question matters?
}
agreement = !ask {
What next step is proposed, and what agreement is still needed?
}
next_step = !ask {
What action can you responsibly take now?
}
}
}
:case planned {
reflection = {emerged: "", learning: "", agreement: "", next_step: ""}
}
:case passed {
reflection = {emerged: "", learning: "", agreement: "", next_step: ""}
}
}
result = {container: container, logistics: logistics, activity: activity, synthesis: reflection}
!show {
Activity status: {{activity}}
Question that emerged: {{reflection.emerged}}
Learning: {{reflection.learning}}
Agreement still needed: {{reflection.agreement}}
Next action: {{reflection.next_step}}
}
-> end
```
