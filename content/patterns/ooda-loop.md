---
id: "ooda-loop"
type: "pattern"
title: "OODA Loop"
summary: "Update how you understand a changing situation as action produces new observations."
status: "published"
aliases: []
tags: ["decision-making", "thinking-tools", "ooda-loop"]
verses: ["decision-making"]
attribution: "John R. Boyd, The Essence of Winning and Losing; orientation shapes observation, decision, and action. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A volunteer radio station loses its usual interview location an hour before a broadcast. Someone starts calling alternative venues. Someone else rewrites the running order. A third person insists that the show cannot happen without the original room. They are taking action, but they are acting from different understandings of what the situation requires.

The OODA Loop connects observation, orientation, decision, and action. Its most useful question is often not “What should we do faster?” but “What picture of the situation is making this action seem appropriate?” Action then provides information that can change that picture.

John Boyd developed OODA in work on conflict and adaptation. His account includes feedback and connections among the elements, with orientation shaping how events are perceived and addressed. Reducing it to four boxes in a fixed sequence misses much of the method.


![Observation informs orientation. Decisions and actions produce feedback that can revise orientation as well as the next action.](/diagrams/thinking-tools/ooda-loop.svg "Orientation changes the loop. Observation informs orientation. Decisions and actions produce feedback that can revise orientation as well as the next action.")

## Observation is already selective

The station knows that the room is unavailable. It does not yet know whether the guest can join remotely, whether another quiet space is accessible, or whether listeners need a live interview rather than a recorded segment. These are observations to seek, not assumptions to hide inside the plan.

Record what has changed and distinguish direct information from reports and guesses. Include the timing and reliability of each observation when it matters. “The guest said they can use a telephone” differs from “we think the guest probably has suitable equipment.”

You cannot observe everything. Choose information that could alter the response, and leave room for something outside the current frame. Calling ten replacement venues may be wasted effort if the live-location requirement is unnecessary.

## Orientation gives observations meaning

Orientation includes experience, expectations, habits, values, and the way the current situation is understood. The station’s usual routine says that a successful interview requires everyone in the same room. That belief may reflect good reasons: sound quality, rapport, or accessibility. It may also be an outdated solution to a problem that has changed.

Make the working interpretation explicit: “We need an intelligible conversation that the guest can participate in comfortably; a shared physical room is one way to achieve it.” This does not remove the constraints. It separates the purpose from one implementation.

A different orientation might prioritize keeping the scheduled broadcast at any cost. Another might prioritize preserving the guest’s experience even if the interview moves. These differences should be discussed because they shape what counts as a good action.

## Choose an action that creates useful feedback

A decision is a provisional commitment under the current understanding. The station could run a short audio check with the guest from the available remote setup. The expected feedback is specific: intelligibility, delay, comfort, and whether someone can support the guest if the connection fails.

The test has a stopping point and a fallback. If sound is unusable after ten minutes, the team will use a prepared music segment and arrange a later interview. Those conditions keep the action from expanding into an indefinite rescue attempt.

After the test, revise orientation as well as the plan. Perhaps the guest prefers remote participation and future interviews could include people who cannot travel. A crisis response has revealed a broader opportunity. Perhaps the test instead exposes a limitation the team underestimated. Either outcome is learning if it changes the working model.

## A slower loop can still be appropriate

Consider a gardener investigating seedlings that fail after transplanting. Observations arrive over days rather than seconds. Orientation might initially blame watering, but records could show the pattern follows a particular planting area. A small comparison can test soil, shade, or handling explanations.

Moving faster is useful only relative to the situation’s actual feedback. Changing watering, soil, position, and fertilizer every day makes the result harder to interpret. Sometimes the disciplined action is to wait for a meaningful observation while keeping the comparison stable.

The loop does not excuse improvised intervention where an established procedure is required. Under immediate danger, protective action and appropriate expertise may take priority over an individual’s exploratory experiment.

## Make the next review real

Before acting, write the observation you expect, when it can appear, and what would make you change your interpretation. Afterward, compare the expected and actual result. “It worked” is incomplete if you do not know which assumption it supports or whether circumstances have changed.

The practice below records a cycle and a review plan. It does not wait in the background, observe the world, or schedule a reminder. Use its output when you return with actual evidence; do not fill the later review with an imagined success.

[[keep-a-decision-journal|Keep a Decision Journal]] preserves expectations for that comparison. [[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] helps design a proportionate action. [[ladder-of-inference|Ladder of Inference]] helps examine how observation became interpretation.

OODA is especially useful when conditions change while you work and the initial model may stop fitting. Its discipline is maintaining contact between the world, your understanding, and your actions. A rapid cycle built on an unexamined orientation can repeat the same mistake very efficiently.

## Sources

- [John R. Boyd: The Essence of Winning and Losing](https://ooda.de/media/john_boyd_-_the_essence_of_winning_and_losing.pdf), original presentation, including the expanded OODA diagram.

## Practice — Orient, Act, and Revisit

**Purpose:** Update how you understand a changing situation as action produces new observations.

**Time:** About 15 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Orient, Act, and Revisit"
:output result

!show {
About 15 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
prior = !form {
:title "Bring back a previous cycle if available"
expected = !ask [optional] {
What did a previous cycle predict? Leave blank for a new situation.
}
actual = !ask [optional] {
What actually happened? Use real observations, not an imagined future review.
}
learning = !ask [optional] {
What should change in your understanding because of that comparison?
}
}
observe = !form {
:title "Observe the present situation"
change = !ask {
What has happened or changed?
}
known = !ask {
Which observations are direct, which are reports, and which information is still missing?
}
}
orient = !form {
:title "Make your working model explicit"
interpretation = !ask {
How do you currently understand the situation and the goal?
}
assumptions = !ask {
Which habits, expectations, experience, or assumptions shape that understanding?
}
alternative = !ask {
What different interpretation could change the response?
}
}
act = !form {
:title "Commit to a bounded action"
decision = !ask {
What provisional action follows from this orientation?
}
limit = !ask {
What boundary, permission, or fallback makes it appropriate?
}
expected = !ask {
What observable feedback do you expect from the action?
}
review = !ask {
When could that feedback appear, and what result would change your orientation?
}
}
!show {
Keep this result. After acting, rerun the practice and use the prior-cycle fields to compare the actual result with {{act.expected}}. This practice does not run in the background or schedule the review.
}
result = {previous_review: prior, observations: observe, orientation: orient, action: act}
!show {
Your proposed action: {{act.decision}}
Expected feedback: {{act.expected}}
Review conditions: {{act.review}}
Keep this result. Return with actual observations and use the prior-cycle fields to compare prediction with outcome.
}
-> end
```
