---
id: design-participation-before-the-agenda
type: pattern
title: Design Participation Before the Agenda
summary: Connect each meeting step to a purpose, invitation, participation arrangement, and useful output.
status: published
aliases: [Design Storyboards]
tags: [collaboration, meeting-design, facilitation]
verses: [collaboration]
attribution: "Adapted from Design Storyboards by Henri Lipmanowicz, Nancy White, and Keith McCandless. Original Patternverse examples and meeting-planning worksheet; CC BY-SA 4.0."
---

The agenda looks respectable: introductions, project update, discussion, next steps. An hour later, the update has consumed most of the time, the discussion has been led by two people, and the next steps are deferred. The topics were relevant. What was missing was a design for how participants would contribute to the work.

A meeting step needs more than a title and a duration. It needs a purpose, an invitation people can respond to, an arrangement for participation, and a way to use what emerges. Designing those elements makes the agenda a plan for shared work rather than a list of subjects to mention.

![Purpose informs an invitation, participation arrangement, and output that the next step can use. Timing, hosts, access, and alternatives support the whole sequence.](/diagrams/liberating-structures/design-participation-before-the-agenda.svg "Give every agenda step a job. Purpose informs an invitation, participation arrangement, and output that the next step can use. Timing, hosts, access, and alternatives support the whole sequence.")

## Begin with the change the gathering should make

Ask what should become possible because these people meet. Learning what happened, generating alternatives, resolving a defined decision, and coordinating responsibilities are different purposes. A meeting may include several, but treating them as one undifferentiated discussion makes it harder to choose a useful format.

A library team planning a new evening service needs to understand demand, identify constraints, and choose a small trial. An update on current opening hours is supporting information. It should not automatically occupy the largest part of the meeting simply because someone has prepared slides about it.

The **Design Storyboards** Liberating Structure connects purpose and stakeholders to a sequence of participation structures, invitations, hosts, timing, alternatives, and evaluation. Its storyboard is a design for a gathering, not a comic-strip account of a user's journey. The worksheet here produces a personal draft for a real meeting; the draft still needs agreement from the people who will host and participate.

## Make the invitation do useful work

An invitation specifies what participants should consider or contribute. Discuss the evening service is broad enough to produce almost anything. Identify one observation about unmet demand and one uncertainty gives people a clearer task. The next step can then ask which uncertainty matters most for a trial.

Avoid disguising a predetermined answer as an open invitation. If the opening hours are fixed by a decision already made, say so and invite work within that boundary. Participants can then examine staffing or access arrangements without discovering halfway through that their main suggestions were never eligible.

Also identify who is missing. A meeting about evening access may need information from people who cannot attend during working hours. Inviting the current staff alone cannot establish what potential visitors need. Preparation might include a small inquiry beforehand, a different meeting time, or a way to bring relevant accounts into the discussion with permission.

## Choose participation to fit the task

Independent reflection can preserve different observations before a shared account forms. Small groups can develop options. A short plenary can compare them. A decision step may need the person with authority to explain how the result will be used. These arrangements serve different functions and should not be selected merely for variety.

For the library meeting, the facilitator could start with a brief factual account, invite individual notes, compare observations in pairs, and collect unresolved questions. A later step develops one trial around the most important uncertainty. The design explains why each stage exists and how its output informs the next one.

Include transition time. A sequence that fits only when nobody asks a question and every group moves instantly is not a usable plan. Distinguish essential work from material that can move elsewhere. If time runs short, a meaningful closing commitment may be more valuable than beginning an additional activity that cannot be completed.

## A second example: a small learning gathering

A group studying photography plans to discuss composition. A topic-led agenda might contain a presentation followed by general questions. A participation-led design asks each person to bring one image with a specific difficulty, examine it individually, compare possible changes with a partner, and choose one experiment for the next shoot.

The presentation can become a short explanation at the moment a concept is needed. The gathering's output is a set of inspectable experiments rather than evidence that everyone listened to the same account. The designer can evaluate whether participants left with a useful next attempt, while acknowledging that learning will depend on what happens afterward.

The two examples also show why a format cannot guarantee a result. Pair discussion can be unhelpful if the invitation is unclear. A technically correct sequence can fail if participants lack necessary information. The storyboard is a hypothesis about how participation will serve the purpose, and evaluation should be able to change it.

## Plan alternatives and responsibilities

For each step, record who will host, what materials or access are needed, what to do if the preferred arrangement fails, and what output matters. A backup might be paper instead of a shared board or trios instead of pairs. It should preserve the step's purpose rather than simply occupy the same number of minutes.

[[think-alone-before-thinking-together]] offers one participation pattern, [[exchange-ideas-through-rotating-stations]] another. [[let-participants-build-the-agenda]] fits gatherings where participants should determine the subjects. [[separate-observation-meaning-and-action]] supports evaluation afterward. A good agenda connects such choices into a coherent route and remains adaptable when the actual gathering teaches the host something unexpected.


## Liberating Structures source and adaptation

[Design Storyboards](https://www.liberatingstructures.com/design-storyboards), credited by the source to Henri Lipmanowicz, Nancy White, and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Build a Participation Storyboard

**Format:** Individual meeting-design worksheet. **Time:** About 25 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Build a Participation Storyboard"
:output result

!show {
Create a draft meeting design. Confirm proposed roles, responsibilities, and follow-ups with the relevant people before treating them as agreed.
}
context = !form {
:title "Define the gathering"
purpose = !ask {
What should become possible because people meet?
}
participants = !ask {
Who needs to contribute, whose account is missing, and what access matters?
}
boundary = !ask {
What is already decided, and what can participants genuinely influence?
}
}
agenda = !collect {
:min 1
:max 6
entry = !form {
:title "Design an agenda step"
purpose = !ask {
What does this step contribute to the overall purpose?
}
invitation = !ask {
What precise invitation will people respond to?
}
format = !ask {
What participation arrangement fits the task?
}
minutes = !rate 1..120 {
:low "Little or absent"
:high "Strongly present"
How many minutes, including transitions?
}
host = !ask {
Who could host this step, subject to agreement?
}
output = !ask {
What usable output should feed the next step?
}
fallback = !ask {
What backup preserves the purpose if the format fails?
}
}
-> yield entry
}
!show {{agenda}} {

}
review = !form {
:title "Inspect the whole route"
coherence = !ask {
How do outputs connect across steps, and what can be omitted if time runs short?
}
logistics = !ask {
Which materials, access, and host agreements need confirmation?
}
evaluation = !ask {
How will you learn whether the gathering served its purpose?
}
next_step = !ask {
What planning conversation comes next?
}
}
result = {gathering: context, proposed_agenda: agenda, review: review}
!show {
Meeting purpose: {{context.purpose}}
Sequence check: {{review.coherence}}
Confirm logistics: {{review.logistics}}
Evaluation: {{review.evaluation}}
Next planning action: {{review.next_step}}
}
-> end
```
