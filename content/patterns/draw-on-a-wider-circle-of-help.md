---
id: draw-on-a-wider-circle-of-help
type: pattern
title: Draw on a Wider Circle of Help
summary: Receive consultation from a central group while drawing on observations from a wider circle.
status: published
aliases: [Wise Crowds]
tags: [collaboration, consultation, listening]
verses: [collaboration]
attribution: "Adapted from Wise Crowds by Henri Lipmanowicz and Keith McCandless. Original Patternverse examples and guide for a real consultation; CC BY-SA 4.0."
---

A coordinator asks a room of colleagues for help with an overloaded service. The first suggestion arrives before the explanation is complete. Someone asks a long question that is really advice. Another person tells a related story. The coordinator spends the conversation correcting assumptions and defending previous decisions, then leaves with more material and little space to consider it.

A wider circle can be helpful when the arrangement separates describing a challenge, clarifying it, exploring possibilities, and choosing what to take away. People need different roles at different moments. The person receiving help needs an opportunity to listen without answering every suggestion as soon as it appears.

![A client clarifies a real challenge, central consultants explore it while the client listens, satellite groups add observations, and the client selects takeaways.](/diagrams/liberating-structures/draw-on-a-wider-circle-of-help.svg "Help from the center and the wider circle. A client clarifies a real challenge, central consultants explore it while the client listens, satellite groups add observations, and the client selects takeaways.")

## Bring a challenge that can receive help

A useful challenge is concrete enough for others to understand and open enough for their contribution to matter. Describe the situation, what has been tried, relevant constraints, and the question on which help would be valuable. An invitation to approve a decision already made is different from an invitation to consult.

The coordinator might explain that volunteer shifts are frequently uncovered, that a reminder system did not help, and that nobody has authority to require more hours. They might ask how to understand the pattern and design a manageable next inquiry. Those boundaries help consultants avoid spending the whole session recommending compulsory attendance.

The **Wise Crowds** Liberating Structure places a client with three central consultants while others observe. After clarification, the client listens silently while consultants develop possibilities. Satellite groups discuss observations, the wider gathering contributes selected insights, and the client identifies takeaways. The guide here supports that real-world arrangement. It is not a solo simulation or a replacement of the wider circle with generated advisers.

## Clarify before offering a solution

Clarification establishes what the account means. How often are shifts uncovered? Which responsibilities require continuity? What have volunteers actually said? A question about these details can change the usefulness of all subsequent advice. A question that embeds a preferred solution mainly changes who gets to make the next speech.

Consultants should retain uncertainty where information is absent. The coordinator may not know whether volunteers understand the schedule or find it impossible to meet. Naming both possibilities is more useful than choosing a motive on their behalf. Advice can be conditional on a fact that still needs investigation.

The client also needs to set limits on what can be discussed. A case may involve personal details about someone not present. Changing identifying details or focusing on arrangements may preserve the useful question without exposing another person's story. A wider audience is not automatically an appropriate audience for every kind of information.

## Listening changes the client's task

During consultation, the client can note a useful distinction, an unexpected possibility, or an assumption worth checking. They do not need to signal agreement with each contribution. Silent listening does not convert advice into an instruction or transfer the decision to the consultants.

For the coordinator, one suggestion may initially seem obvious: speak to volunteers who stopped taking shifts. Another consultant adds that the conversation should distinguish inconvenient times from responsibilities people no longer want. The distinction changes the proposed inquiry. If the client had interrupted to explain that interviews had already happened, the more specific idea might never have developed.

This protection should not become a demand to endure harmful or intrusive commentary. Agree in advance how someone can pause, correct a critical misunderstanding, or stop. The value lies in suspending routine defensiveness long enough to hear possibilities, not in removing the recipient's agency.

## Give the surrounding circle real work

Observers can notice repeated assumptions, missing perspectives, or helpful developments in the consultation. Satellite discussion lets them formulate those observations before a few voices dominate the whole-room response. Their role differs from waiting for a turn to provide more advice.

In the service example, an observer notices that all suggestions assume the same shift structure. A satellite group asks whether some tasks could be separated from fixed shifts. That observation widens the inquiry without proving that the current structure is wrong. The client can take it forward alongside the initial suggestions.

In a second setting, a person planning a community exhibition might receive help from experienced organizers while artists and volunteers observe. The surrounding circle may identify accessibility or installation issues that the central discussion misses. Its value depends on relevant experience and thoughtful participation, not simply on increasing the number of people present.

## Leave with a chosen response

At the end, the recipient selects what to keep, question, or set aside. A useful takeaway names a next inquiry or action within their responsibility. It can acknowledge a suggestion without promising to implement it. The guide records that chosen response rather than every piece of advice.

Use this pattern when a real challenge would benefit from several perspectives and the participants can respect the listening arrangement. It is not necessary for every small request for help. [[think-alone-before-thinking-together]] supports preparation, [[find-the-conditions-behind-success]] offers a different inquiry into actual experience, and [[act-within-your-discretion]] helps turn a chosen insight into a responsible first step.


## Liberating Structures source and adaptation

[Wise Crowds](https://www.liberatingstructures.com/wise-crowds), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Prepare and Receive Wise Crowds Consultation

**Format:** Guide for a real client, consultants, and satellite groups. **Time:** About 30 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Prepare and Receive Wise Crowds Consultation"
:output result

!show {
Arrange a client, three central consultants, and surrounding observers who form satellite groups. This guide prepares and debriefs one real consultation round.
}
brief = !form {
:title "Prepare a helpable challenge"
challenge = !ask {
What actual challenge needs help?
}
tried = !ask {
What has already been tried?
}
constraints = !ask {
What constraints and confidentiality boundaries matter?
}
question = !ask {
What help would be useful, beyond approval of a favored answer?
}
}
arrangement = !form {
:title "Arrange people and consent"
people = !ask {
Who has agreed to be client, central consultants, and satellite observers?
}
pause = !ask {
How can anyone pause or stop if a boundary is crossed?
}
sharing = !ask {
What notes or details may be retained or shared?
}
}
!show {
Conduct one round outside the app: the client describes the challenge (2 minutes); three consultants clarify (2). The client then turns away or switches off camera and listens while consultants explore possibilities (7). Satellite groups of two or three compare observations (4), selected insights return to the whole group (4), and the client names takeaways (1). Adjust the timing to suit the gathering.
}
consultation_cue = !timer {
:duration 420
:blocking false
:sticky false
Optional seven-minute cue for the silent-listening consultation.
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
:title "Select the client’s takeaways"
insight = !ask {
What did the client actually choose to keep?
}
uncertain = !ask {
What advice or assumption needs checking?
}
next_step = !ask {
What action or inquiry has the client chosen, within their authority?
}
}
}
:case planned {
reflection = {insight: "", uncertain: "", next_step: ""}
}
:case passed {
reflection = {insight: "", uncertain: "", next_step: ""}
}
}
result = {brief: brief, arrangement: arrangement, activity: activity, client_takeaways: reflection}
!show {
Activity status: {{activity}}
Chosen takeaway: {{reflection.insight}}
Still uncertain: {{reflection.uncertain}}
Client’s chosen next step: {{reflection.next_step}}
}
-> end
```
