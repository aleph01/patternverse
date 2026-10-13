---
id: reframing-review-frame
type: pattern
title: "Review the Frame"
summary: "Make a quick scan for assumptions that could be narrowing a problem statement."
status: published
tags:
  - reframing
  - assumptions
  - diagnosis
  - problem-solving
verses:
  - creativity
attribution: "Original Patternverse adaptation inspired by Thomas Wedell-Wedellsborg, What's Your Problem? Not an official implementation."
---

Every problem statement carries a small theory of the situation. It may treat a report as a fact, a habit as a constraint, one actor as the cause, or a favored intervention as the only route forward. Review the Frame is a fast scan for such choices. It is a **diagnostic router**, not a giant questionnaire and not a demand to doubt everything at once. The useful outcome is to find one or two places where a closer look might change the problem.

Consider: “We need to hire more engineers because development is too slow.” Several lenses reveal different questions. What is the evidence for “too slow,” and compared with what? Hiring is already inside the sentence as a solution. Is coding slow, or does work wait for review, decisions, or release? Is the goal more output from engineers, or a shorter time from customer need to delivered value? None of those observations proves that hiring is wrong. They identify which assumption deserves a specialist check.

The scan can follow a practical sequence: mark strong factual claims; circle words such as “must” and “only”; underline proposed interventions; notice who is assigned responsibility; notice emotionally loaded judgments; and look for either-or choices. Do this quickly. If one signal stands out, use the matching operator rather than mechanically running every lens. A frame that survives a quick review is allowed to remain provisional and useful.

## The scan in other settings

> **Initial frame:** “My teenager never tells me anything because she does not trust me.”  
> **Possible opening:** “Never” and the reason for silence are both claims. What has she shared, when, and under which conditions?

This points toward [[reframing-verify-statement]] without dismissing the parent’s hurt.

> **Initial frame:** “I must finish this course before I can apply for better work.”  
> **Possible opening:** Is the course truly a requirement, or one possible route to demonstrating competence?

The word “must” suggests [[reframing-remove-constraints]] or a later look at higher goals.

> **Initial frame:** “Either our app stays simple or advanced users can customize it.”  
> **Possible opening:** Are simplicity and power competing everywhere, or only in the default screen?

That is a candidate for [[reframing-break-tradeoff]].

The pattern is most useful before a team commits resources, when a conversation keeps returning to familiar remedies, or when a statement feels unusually certain despite sparse evidence. Its main failure mode is making the review itself the project. One frame may contain many assumptions, but only a few are consequential enough to investigate now. A legal deadline, a genuine shortage, or a supported measurement should not be discarded merely because it appears in a sentence.

Reviewing a frame is different from analyzing it more deeply. Analysis asks for more detail *inside* the current boundaries; review asks whether those boundaries and premises deserve attention. [[reframing-explore-or-break]] makes that difference explicit. After a useful alternative emerges, [[reframing-validate-frame]] can turn it into an observable question rather than another opinion.

## Related patterns

[[reframing-verify-statement]] · [[reframing-remove-constraints]] · [[reframing-detect-baked-solution]]

## Source

Inspired by Thomas Wedell-Wedellsborg's *What's Your Problem?* This is an original Patternverse procedure, not reproduced book text or an official implementation.

## Executable Pattern Markdown

```text
:language 1
:title "Review the Frame"
:input frame text
:output candidate_frame

type FrameSignal = evidence | constraint | solution | form | agency | emotion | tradeoff | no_clear_signal
classifier frame_signal -> FrameSignal {
    :case evidence "A consequential factual claim or inferred motive is being treated as established."
    :case constraint "An apparent must, fixed boundary, or unnecessary restriction narrows the problem."
    :case solution "A proposed intervention is embedded in the problem statement."
    :case form "The statement's form as a pain, goal, solution, or specified problem is unclear or mixed."
    :case agency "Responsibility or causation is narrowly located in one actor or an abstract system."
    :case emotion "An emotionally loaded judgment carries an unexamined interpretation."
    :case tradeoff "The statement presents a possibly false either-or choice."
    :fallback no_clear_signal
}
signal = frame ?~ frame_signal
?match signal {
    :case evidence -> evidence
    :case constraint -> constraint
    :case solution -> solution
    :case form -> form
    :case agency -> agency
    :case emotion -> emotion
    :case tradeoff -> tradeoff
    :case no_clear_signal -> unsure
}
evidence:
!use reframing.verify-statement as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
constraint:
!use reframing.remove-constraints as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
solution:
!use reframing.detect-baked-solution as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
form:
!use reframing.identify-problem-form as form_finding {
    :with frame
}
= candidate_frame form_finding.candidate_frame
-> end
agency:
!use reframing.locate-problem as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
emotion:
!use reframing.inspect-emotion as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
tradeoff:
!use reframing.break-tradeoff as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
unsure:
= candidate_frame frame
!show {
    No single framing trap stands out yet. The current statement can remain provisional.
}
-> end
```
