---
id: reframing-rethink-goal
type: pattern
title: "Rethink the Goal"
summary: "Examine whether the stated objective is the best route to the outcome that matters."
status: published
tags:
  - reframing
  - goals
  - strategy
  - decision-making
verses:
  - creativity
attribution: "Original Patternverse adaptation inspired by Thomas Wedell-Wedellsborg, What's Your Problem? Not an official implementation."
---

People often treat a goal as fixed and define the problem as whatever blocks it. “Make approvals faster” leads to queue dashboards and extra reviewers. “Get promoted” leads to interview preparation and visibility work. Those may be sensible. Rethink the Goal asks what the target is *for*, whether reaching it would produce the desired outcome, and whether another route could serve that outcome better.

This is not an invitation to question every wish indefinitely. The useful level is usually one or two steps above the immediate target—high enough to reveal alternatives, concrete enough to guide a decision. Three related moves help: surface higher-level goals, inspect the causal link between the goal and those outcomes, and compare alternative paths.

Consider an approval process:

> **Original goal:** Reduce approval time from five days to two.  
> **Higher-level goal:** Let safe changes reach customers quickly.  
> **Question:** Which changes actually need approval?  
> **Reframe:** “How can low-risk changes move quickly while high-risk changes receive careful review?”

Optimizing the five-day queue might help, but it would leave unnecessary approvals untouched. The new frame creates room for risk-based rules, delegated authority, or clearer criteria. Those options still need testing.

A personal example begins with “I need a promotion.” The person may want higher income, more autonomy, harder work, or recognition. If the available promotion adds managerial duties but little autonomy, achieving the target may not produce the most important outcome. A reframe might be “How can I gain more control over my work and increase income?” Negotiation, a specialist role, or a different employer could then be compared with promotion. The original goal may still be best.

A third example: “I must run every morning” might serve the deeper goal of consistent movement and better energy. If mornings repeatedly fail because of caregiving responsibilities, changing the time or form of activity could be more effective than optimizing the morning routine.

Reach for this pattern when substantial effort is spent improving a process nobody can explain, when a target was inherited from elsewhere, or when success on the stated metric would not obviously resolve the concern. Its misuse is climbing toward vague abstractions such as “I ultimately want happiness.” Such a statement may be meaningful, but it rarely distinguishes next steps. Stop at outcomes that can guide options and observations.

[[reframing-surface-higher-goals]] reveals what the target is meant to achieve; [[reframing-challenge-goal-logic]] tests the assumed link; [[reframing-alternative-paths]] looks for other routes. Rethink the Goal coordinates those questions, then hands promising frames to [[reframing-validate-frame]] rather than continuing to ask “why?” forever.

## Related patterns

[[reframing-surface-higher-goals]] · [[reframing-challenge-goal-logic]] · [[reframing-alternative-paths]]

## Source

Inspired by Thomas Wedell-Wedellsborg's *What's Your Problem?* This is an original Patternverse procedure, not reproduced book text or an official implementation.

## Executable Pattern Markdown

```text
:language 1
:title "Rethink the Goal"
:input frame text
:output candidate_frame

!use reframing.surface-higher-goals as higher {
    :with frame
}
!choose direction {
    :option logic "Test whether the immediate goal leads to that outcome"
    :option paths "Look for another path to that outcome"
    An underlying outcome might be: {{higher.candidate_frame}}

    Which question would help now?
}
?match direction {
    :case logic -> logic
    :else -> paths
}
logic:
!use reframing.challenge-goal-logic as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
paths:
!use reframing.alternative-paths as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
```
