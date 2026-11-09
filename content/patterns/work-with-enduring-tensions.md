---
id: work-with-enduring-tensions
type: pattern
title: Work With Enduring Tensions
summary: Hold two legitimate demands together and look for arrangements that respect both.
status: published
aliases: [Wicked Questions]
tags: [collaboration, tensions, decision-making]
verses: [collaboration]
attribution: "Adapted from Wicked Questions by Henri Lipmanowicz and Keith McCandless. The source also points to Brenda Zimmerman's work on paradox. Original Patternverse examples and individual worksheet; CC BY-SA 4.0."
---

A neighborhood workshop wants more people to use its tools independently. It also needs a reliable way to prevent dangerous mistakes. One faction asks for fewer restrictions; another asks for stricter supervision. Every proposal appears to betray one side. The discussion repeats because both groups are protecting something the workshop needs.

Some difficulties remain difficult because they involve demands that cannot sensibly be discarded. Access matters, and safe use matters. The useful question becomes how to expand independent participation while maintaining conditions for responsible use. That question does not resolve the design. It prevents a legitimate concern from disappearing before the design begins.

![Independent access and responsible use both feed into an arrangement to test. Review evidence for both concerns.](/diagrams/liberating-structures/work-with-enduring-tensions.svg "Design for two legitimate demands. Independent access and responsible use both feed into an arrangement to test. Review evidence for both concerns.")

## Give each side a fair account

An enduring tension contains two claims that deserve serious consideration. Describe each in terms its supporters could recognize. A wish for responsible use is more informative than a caricature of people who love rules. A wish for independent access is more informative than an accusation of recklessness.

Then ground both demands in actual circumstances. Which tools create significant hazards? Which restrictions exclude experienced users unnecessarily? Who bears the consequences when a procedure fails? Without particulars, a balanced-sounding question can conceal a badly unbalanced arrangement. Equal grammatical treatment is not evidence that two demands have equal weight in every decision.

The Liberating Structure **Wicked Questions** invites people to articulate apparently opposing realities or strategies that must coexist, then refine the question with others. This article's individual worksheet is an adaptation for examining one tension before a conversation. It preserves the two-sided inquiry without claiming that a person alone has represented everybody affected.

## Design an arrangement, not a slogan

For the workshop, independent access could depend on demonstrated familiarity with a particular tool. Supervision could remain necessary for unfamiliar or unusually hazardous operations. A short orientation could make expectations legible without turning membership into a lengthy examination. There may be a trial period with explicit review of near misses, access problems, and participant feedback.

None of these arrangements maximizes every value simultaneously. The point is to identify how a concrete choice serves both concerns, where it falls short, and what would justify a change. A vague commitment to freedom and safety does none of that work. The arrangement needs owners, conditions, and attention to consequences.

This way of thinking can also reveal a third concern. An orientation requirement might protect users while making access difficult for people whose work hours conflict with the only training session. Accessibility now deserves its own consideration. Holding two demands together is a useful entry into a situation, not proof that its complexity fits a pair forever.

## A personal example: commitment and flexibility

A writer wants to protect a regular practice while responding to the changing needs of a household. An inflexible schedule repeatedly fails. A wholly flexible intention repeatedly disappears. Describing the tension as serious work versus family makes the choice unnecessarily hostile. Both sustained attention and responsiveness can be legitimate commitments.

The writer experiments with a protected short morning session, two longer sessions agreed in advance, and a clear way to renegotiate when something unexpected happens. They track whether writing actually occurs and whether the arrangement shifts burdens onto somebody else. The experiment may need revision; a new routine is not validated by its attractive description.

The enduring question remains useful after the first solution. During a busy month, it can guide a smaller commitment. During a quieter period, it can support a longer one. A recurring tension need not indicate a failure of character or an inability to make decisions. It may indicate that the conditions require continuing adjustment.

## Recognize a false pair or a real limit

[[reframing-break-tradeoff|Break a False Trade-Off]] examines whether the apparent opposition depends on an avoidable assumption. Sometimes it does. A new arrangement can make two benefits compatible, and the supposed dilemma can dissolve. An enduring tension remains worth revisiting even after such improvements because different conditions may bring it back.

Other conflicts require a firm priority or boundary. A promise to balance everything must not excuse preventable harm, ignore a person's refusal, or conceal a binding obligation. A decision can acknowledge a legitimate cost while choosing one course. This pattern broadens judgment; it does not suspend responsibility to decide.

Watch for questions that disguise blame: how can people be responsible while continuing to be irresponsible? That gives one side no legitimate standing. Also watch for treating every disagreement as a profound paradox. A missing fact, a negotiable allocation, or an incompatible preference may call for evidence or negotiation instead.

## Keep the tension useful

End with an action and two kinds of feedback: what would show that each concern is receiving appropriate attention? In the workshop, access statistics without incident information are incomplete, and incident counts without information about exclusion are incomplete. The review can retain uncertainty and still lead to a practical adjustment.

[[conflict-resolution-diagram]] makes needs, proposals, and assumptions explicit when a disagreement has hardened around opposing solutions. [[keep-only-the-essential-rules]] helps examine whether a particular restriction is necessary. [[prefer-the-smallest-useful-experiment]] supports a bounded trial when the proposed balance remains uncertain.


## Liberating Structures source and adaptation

[Wicked Questions](https://www.liberatingstructures.com/wicked-questions), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Hold Both Demands in View

**Format:** Individual tension worksheet. **Time:** About 15 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Hold Both Demands in View"
:output result

!show {
Examine two demands that may both remain legitimate. This is an individual adaptation of Wicked Questions; check other people’s accounts with them rather than claiming to represent them.
}
context = !form {
:title "Ground both sides"
situation = !ask {
What situation contains the tension?
}
first_demand = !ask {
What does the first demand protect?
}
first_evidence = !ask {
What actual example shows why it matters?
}
second_demand = !ask {
What does the other demand protect?
}
second_evidence = !ask {
What actual example shows why that matters?
}
}
inquiry = !form {
:title "Form a question that holds both"
question = !ask {
How can you state both legitimate demands in one question without blaming either side?
}
boundary = !ask {
What obligation, refusal, or limit cannot be negotiated away?
}
assumption = !ask {
Could an avoidable assumption be creating part of the opposition?
}
}
trial = !form {
:title "Choose an arrangement to inspect"
action = !ask {
What action could respect both demands?
}
first_signal = !ask {
What would show the first demand is receiving attention?
}
second_signal = !ask {
What would show the other is receiving attention?
}
review = !ask {
When or under what condition will you reconsider it?
}
}
result = {situation: context, tension: inquiry, experiment: trial}
!show {
Your tension: {{inquiry.question}}
Proposed action: {{trial.action}}
Inspect both: {{trial.first_signal}} / {{trial.second_signal}}
Review: {{trial.review}}
}
-> end
```
