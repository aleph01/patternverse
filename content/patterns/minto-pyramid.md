---
id: "minto-pyramid"
type: "pattern"
title: "Minto Pyramid"
summary: "Organize a message around an answer, coherent supporting reasons, and evidence for those reasons."
status: "published"
aliases: ["Pyramid Principle"]
tags: ["collaboration", "thinking-tools", "minto-pyramid"]
verses: ["collaboration"]
attribution: "Barbara Minto, The Minto Pyramid Principle; original explanatory examples and practice. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

The repair cooperative receives a long proposal about opening on Sundays. It begins with attendance records, describes several conversations, explains staffing problems, and eventually asks for a three-month trial. By the time the request appears, readers have already formed different ideas about what they are being asked to decide.

The Minto Pyramid organizes a message around the answer to a reader’s question. Supporting reasons sit beneath that answer, and evidence supports the reasons. The structure helps a reader see both the proposal and the argument they would need to accept it.

Barbara Minto developed the Pyramid Principle. The application here is an introductory way to organize a practical message, not a replacement for her full method or a claim that every conversation should follow the same script.


![One answer is supported by two distinct reasons. Evidence supports each reason; weak joins require revision.](/diagrams/thinking-tools/minto-pyramid.svg "An answer with inspectable support. One answer is supported by two distinct reasons. Evidence supports each reason; weak joins require revision.")

## Find the question before writing the answer

A message needs a situation the reader recognizes and a reason the issue now requires attention. For the cooperative, members know the workshop opens on weekdays. New attendance records show that several members with weekday jobs cannot use it. The decision question is whether a Sunday opening trial is justified and under what conditions.

That question is more precise than “What should we do about access?” It also prevents the writer from answering a question nobody asked, such as whether the cooperative should expand permanently.

Draft the answer in a sentence: “Run a three-month Sunday trial with two trained volunteers per session and a fixed spending limit.” The sentence can be provisional. Its purpose is to make the current recommendation inspectable, not to conceal uncertainty behind a confident opening.

## Group reasons by the claim they support

The proposal might rest on three reasons: the trial addresses a documented access problem; the required staffing is feasible; and a bounded trial can produce information before a permanent commitment.

Under the access reason, include the relevant attendance records and member requests. Under staffing, include actual volunteer availability and training requirements. Under learning, specify what the trial will measure and how the cooperative will review the result.

These are reasons, not merely topics. “Attendance, volunteers, and money” is an index. “Members who cannot attend on weekdays have expressed a specific unmet need” makes a claim that evidence can support or weaken.

Check that each supporting group belongs under its parent claim. If volunteer availability is still unknown, the staffing reason is not established. The answer may need to become “Confirm staffing for a bounded trial before authorizing the opening,” rather than treating an unresolved dependency as supporting evidence.

## Examine the joins

Read downward: does each reason explain why the answer makes sense? Read upward: do the details justify the reason above them? Then inspect the set of reasons. Are they different enough to avoid repetition, and together do they address the reader’s important concerns?

The cooperative’s first draft may say the trial is both “small” and “low-cost” as separate reasons, when both depend on the same spending limit. Meanwhile, it may omit safeguarding and key-holder responsibilities. A tidy shape has not made the argument complete.

Evidence also needs the right scope. Three enthusiastic messages show that some members are interested. They do not establish that Sunday attendance will justify the staffing burden. State the uncertainty and explain why a trial is an appropriate way to investigate it.

## Use the structure for explanation as well as persuasion

A tutor explaining why a student’s experiment produced inconsistent results might lead with: “The measurements cannot yet distinguish the two explanations.” Supporting reasons could concern an unstable setup, too few observations, and a variable that changed between trials. The details then show exactly how each issue affects interpretation.

This is useful even when the answer is “we do not know.” The structure can make uncertainty clearer by separating what is established from what remains unresolved. It need not turn every message into a sales pitch.

[[feynman-technique|Feynman Technique]] tests whether you can explain an idea plainly. The pyramid addresses a different problem: how a reader should encounter an answer and its support. [[issue-trees|Issue Trees]] can help investigate the underlying question before the argument is ready to communicate.

## Choose a humane delivery

Answer-first writing is often useful for busy readers who need to decide. It is not a universal rule for sensitive conversations, exploratory workshops, stories, or situations where the audience needs context before receiving a consequential conclusion. Consider what the reader needs to understand and what kind of interaction is appropriate.

Avoid compressing a disputed value judgment into a supposedly obvious headline. “We must reduce access to remain sustainable” can hide both alternative proposals and disagreement about the objective. Show the premise, the trade-off, and who is affected.

The pyramid organizes reasoning; it cannot supply missing evidence or make an unfair proposal acceptable. Keep important qualifications close to the claim they limit. An accurate opening with visible uncertainty is more useful than a decisive sentence whose conditions are buried below.

Finish by stating the actual request: approve a bounded trial, provide missing information, challenge a premise, or choose among options. The reader should know what response would help and which parts of the argument remain open to revision. When the message can be shortened without breaking those relationships, shorten it.

## Sources

- [Barbara Minto: The Minto Pyramid Principle](https://www.barbaraminto.com/concept), the author’s description of the framework.

## Practice — Build an Answer and Its Support

**Purpose:** Organize a message around an answer, coherent supporting reasons, and evidence for those reasons.

**Time:** About 15 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Build an Answer and Its Support"
:output result

!show {
About 15 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Locate the audience\u2019s question"
audience = !ask {
Who needs this message, and what do they need to decide or understand?
}
situation = !ask {
What shared situation and complication make a response necessary?
}
question = !ask {
What precise question should the message answer?
}
answer = !ask {
What is your current answer, including important qualifications?
}
}
reasons = !collect {
:min 1
:max 4
entry = !form {
:title "Add an entry"
claim = !ask {
State one reason that supports the answer, as a claim rather than a topic.
}
evidence = !ask {
What evidence supports this reason? Say if support is missing.
}
limit = !ask {
What qualification or counterevidence should the reader see?
}
}
-> yield entry
}
!show {{reasons}} {

}
review = !form {
:title "Test the argument"
joins = !ask {
Do the reasons support the answer, and does the evidence support each reason? Where is a join weak?
}
coverage = !ask {
Which important concern is missing, and which reasons overlap?
}
revision = !ask {
How should the answer or its support change?
}
}
message = !form {
:title "Make the request clear"
opening = !ask {
Write the opening answer with its essential qualifications.
}
support = !ask {
Arrange the revised supporting reasons in a coherent order.
}
request = !ask {
What response or action do you actually need from the reader?
}
}
result = {context: context, supporting_reasons: reasons, review: review, message: message}
!show {
Your revised opening: {{message.opening}}
Supporting reasons: {{message.support}}
Your actual request: {{message.request}}
}
-> end
```
