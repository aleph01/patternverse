---
id: reframing-look-outside-frame
type: pattern
title: "Look Outside the Frame"
summary: "Search beyond the current boundary for context that could change what the problem means."
status: published
tags:
  - reframing
  - systems-thinking
  - context
  - perspective
verses:
  - creativity
attribution: "Original Patternverse adaptation inspired by Thomas Wedell-Wedellsborg, What's Your Problem? Not an official implementation."
---

A frame works like a crop around a photograph. It makes details inside the boundary easier to inspect, but it also hides nearby information. Look Outside the Frame is a deliberate zoom-out before another round of detailed analysis. It searches for four kinds of omission: the solver’s favored tool, events outside the visible time window, wider contextual influences, and overlooked properties of resources already present.

Imagine a company says, “New hires keep leaving within six months.” A detailed analysis *inside* that frame might compare exit dates, managers, and job titles. That can be useful. A wider look asks what the frame omitted.

- **Preferred tool:** An HR team may immediately propose a new onboarding program because onboarding is the intervention it knows how to design. The question is whether the departures are actually about orientation, or about work conditions after orientation.
- **Earlier events:** What were candidates promised during recruitment? A mismatch may begin before the first day. The visible “six-month turnover” episode is not the whole timeline.
- **Hidden influences:** Pay, workload, supervisor availability, team norms, or an unstable schedule could affect retention. These are hypotheses to investigate, not causes established by the exit rate.
- **Overlooked resources:** Existing interview notes, support requests from new hires, or informal peer networks may already contain useful evidence or support. The organization may not need to invent a wholly new data collection process.

Those four lenses could produce several frames: “We select people for a role different from the work they encounter,” “new hires lack decisions they can make independently,” or “the schedule makes the role unsustainable for some people.” Each frame suggests different observations and possible responses. The point is not to adopt all of them.

The move works elsewhere. “I am bad at keeping a writing habit” may look different if the person examines what happens before the planned writing time, the expectation of producing polished work, and the notes already collected. “Our checkout page loses buyers” may involve promises made before the page, delivery conditions outside the interface, or data already present in customer questions.

Reach for this pattern when a discussion has become impressively detailed yet remains stuck, or when every proposed remedy belongs to one discipline. Do not turn zooming out into unlimited speculation. Pick a few plausible omissions and ask what observation would make one matter. Looking outside the frame does not prove that the visible problem is irrelevant; sometimes the original boundary was well chosen.

The four specialist patterns—[[reframing-escape-hammer]], [[reframing-expand-time-window]], [[reframing-find-hidden-influence]], and [[reframing-find-hidden-properties]]—can be used independently. [[reframing-explore-or-break]] helps decide whether this contextual expansion is enough or whether the central goal itself needs reconsideration.

## Related patterns

[[reframing-escape-hammer]] · [[reframing-expand-time-window]] · [[reframing-find-hidden-influence]] · [[reframing-find-hidden-properties]]

## Source

Inspired by Thomas Wedell-Wedellsborg's *What's Your Problem?* This is an original Patternverse procedure, not reproduced book text or an official implementation.

## Executable Pattern Markdown

```text
:language 1
:title "Look Outside the Frame"
:input frame text
:output candidate_frame

type OutsideLens = hammer | time | influence | properties | uncertain
classifier outside_lens -> OutsideLens {
    :case hammer "A favored method, discipline, or tool appears to define the problem."
    :case time "The frame concentrates on one episode and nearby before or after may matter."
    :case influence "Omitted social, organizational, environmental, or economic conditions may matter."
    :case properties "Existing resources or information may have overlooked properties."
    :fallback uncertain
}
lens = frame ?~ outside_lens
?match lens {
    :case hammer -> hammer
    :case time -> time
    :case influence -> influence
    :case properties -> properties
    :case uncertain -> uncertain
}
hammer:
!use reframing.escape-hammer as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
time:
!use reframing.expand-time-window as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
influence:
!use reframing.find-hidden-influence as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
properties:
!use reframing.find-hidden-properties as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
uncertain:
!use reframing.find-hidden-influence as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
```
