---
id: "situation-behavior-impact"
type: "pattern"
title: "Situation–Behavior–Impact"
summary: "Make feedback specific by separating the occasion, observable behavior, and experienced impact."
status: "published"
aliases: ["SBI", "SBII"]
tags: ["collaboration", "thinking-tools", "situation-behavior-impact"]
verses: ["collaboration"]
attribution: "Situation–Behavior–Impact (SBI) is a Center for Creative Leadership framework; inquiry about intent extends the conversation. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A workshop organizer tells a volunteer, “You were disrespectful.” The volunteer remembers a lively discussion and hears a judgment about their character. The organizer remembers being interrupted while explaining an important change. Both now have a second problem: the feedback itself is difficult to discuss.

Situation–Behavior–Impact gives feedback a more inspectable shape. Identify the occasion, describe what someone did, and explain its effect. Keep the observation separate from your account of why it happened. The other person can then understand the concern, correct the record, and contribute information you do not have.

The Center for Creative Leadership developed SBI. Its extension toward inquiry about intent is often called SBII. Neither version guarantees agreement. It provides a disciplined starting point for a conversation that still requires listening.

## Make the occasion recognizable

A situation anchors the feedback in time and context: “During the opening briefing on Saturday, while I was explaining the new check-in arrangement.” That is specific enough for the other person to locate the event. “You always do this in meetings” asks them to defend an entire history before a particular concern can be examined.

Describe behavior in terms that could in principle be observed. “You began speaking three times before I had finished the explanation” is different from “you wanted to undermine me.” Count only if you actually know the count. False precision weakens otherwise useful feedback.

Then explain the impact you can support. The organizer might say, “I lost my place and did not explain who would cover the late arrivals. Two volunteers later asked me for that information.” The first statement is their experience; the second is a reported consequence. Neither requires pretending to know the volunteer’s intention.

## Keep impact proportional to evidence

Impact can concern attention, emotion, work, relationships, or results. It does not have to be a measurable business outcome to matter. “I felt embarrassed and became reluctant to ask another question” is legitimate feedback about your experience.

The distinction is between owning an experience and claiming an unsupported causal chain. “Everyone lost confidence in the project because of you” attributes other people’s feelings and a broad consequence without necessarily knowing either. “Two people asked whether the schedule was still agreed” describes evidence; “I worry that the uncertainty reduced confidence” identifies an interpretation.

In the workshop example, a useful draft is: “During Saturday’s briefing, you started speaking while I was explaining the check-in change. I lost my place, and the late-arrival arrangement was left unclear. What were you trying to make sure we addressed?”

The inquiry is real. The volunteer might have been trying to correct an accessibility problem before people were assigned to an unsuitable entrance. That information does not erase the interruption’s impact. It changes the next conversation: how can urgent corrections be raised while the briefing remains understandable?

## Feedback can identify what to continue

A music teacher notices that a learner has changed their rehearsal habits. “Good work” is pleasant but leaves the useful behavior unnamed. A more actionable response is: “During the last two rehearsals, you stopped after an uncertain entrance, checked the preceding cue, and played the transition again. The next attempt was steadier, and we could continue without replaying the whole section.”

The learner can now repeat a specific practice rather than guess what earned approval. Ask about their process if it would help: perhaps they developed a marking system the rest of the group could use.

Positive feedback should be as accurate as corrective feedback. Do not invent an impact to make praise sound consequential. A simple observation of something helpful can be enough.

## Prepare the message, then prepare to revise it

Write the three components separately before combining them. Underline words that describe personality, motives, or universals such as “always.” Replace them with observations where possible. If the concern is an actual repeated pattern, identify several occasions rather than suppressing the pattern or exaggerating it.

Read the draft from the other person’s position. Can they recognize the event? Can they distinguish the action you mean? Is the claimed impact something you know, experienced, or merely infer? This review often reveals that more observation is needed before the conversation.

Choose a setting that permits a response. A carefully written SBI message delivered as a public rebuke may still humiliate someone. A long list of incidents can feel like a prosecution even when every sentence follows the format.

[[reframing-verify-statement|Verify the Statement]] helps inspect questionable claims before using them. [[ladder-of-inference|Ladder of Inference]] examines the reasoning that turns an observation into a conclusion. SBI turns that care into a concrete message and an invitation to discuss what happened.

## Beyond the opening sentence

The framework does not supply a complete resolution. After listening, agree on what should happen next when appropriate: a signal for urgent corrections, a changed handoff, a clearer expectation, or a further conversation. Distinguish a request from a demand and make actual responsibilities clear.

Power matters. A supervisor’s apparently casual inquiry may be heard as compulsory. A person receiving feedback may need time to think, an opportunity to correct the record privately, or support in raising their own concern. Repeated harmful conduct can require a formal process rather than another polished conversation starter.

Use the structure to make the account more discussable. Keep enough openness to discover that the event, its impact, or your proposed next step needs revision. Good preparation makes listening easier; it should not make the message immune to correction.

## Sources

- [Center for Creative Leadership: closing the gap between intent and impact](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/), the SBI framework and inquiry about intent.

## Practice — Draft Feedback That Can Be Discussed

**Purpose:** Make feedback specific by separating the occasion, observable behavior, and experienced impact.

**Time:** About 12 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Draft Feedback That Can Be Discussed"
:output result

!show {
About 12 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
draft = !form {
:title "Describe the event"
situation = !ask {
What specific occasion should the person recognize?
}
behavior = !ask {
What did they observably do? Avoid character judgments and inferred motives.
}
impact = !ask {
What effect did you experience or directly observe? Distinguish it from an inferred wider consequence.
}
}
review = !form {
:title "Inspect what you know"
inference = !ask {
Which part of your account, if any, assumes an intention or unobserved effect?
}
correction = !ask {
How would you revise it to distinguish observation, experience, and interpretation?
}
inquiry = !ask [optional] {
What sincere question could invite their account of the event or intent?
}
}
!show {
Your initial account: {{draft.situation}} / {{draft.behavior}} / {{draft.impact}}. Use your review to revise it before a conversation.
}
message = !form {
:title "Prepare a discussable message"
text = !ask {
Write the feedback as you would actually say it, incorporating your review.
}
setting = !ask {
What timing and setting would allow a real response?
}
next = !ask {
What request or next discussion, if any, should follow?
}
}
result = {observations: draft, review: review, message: message}
!show {
Your prepared message: {{message.text}}
Proposed setting: {{message.setting}}
Next discussion: {{message.next}}
}
-> end
```
