---
id: reframing-identify-problem-form
type: pattern
title: "Identify the Problem Form"
summary: "Notice whether a statement is mainly a pain point, goal, proposed solution, or specified problem."
status: published
tags:
  - reframing
  - routing
  - goals
  - problem-solving
verses:
  - creativity
attribution: "Original Patternverse adaptation inspired by Thomas Wedell-Wedellsborg, What's Your Problem? Not an official implementation."
---

People bring problems in different shapes. “I feel stuck” is a pain point; “I want to work independently” is a goal; “I need a newsletter” is a proposed solution; “This API handles 300 requests per second but must handle 500” is closer to a specified performance problem. Identify the Problem Form notices the shape before choosing a thinking move. The labels are soft routing aids, not diagnoses or permanent categories.

A pain point usually needs a provisional statement of what is happening. A goal may need an examination of why it matters and which routes could reach it. A solution-first request benefits from recovering the need underneath. A well-specified problem may need a direct test or implementation rather than another round of abstract reframing. Many real statements mix forms, and that is useful information too.

> **Pain point:** “I feel completely stuck in my career.”  
> **Next frame:** “I am unsure which part of my current work feels limiting—learning, income, autonomy, or direction.”  
> The move is to make the experience discussable without inventing a cause.

> **Goal:** “I want to become self-employed within two years.”  
> **Next question:** “Which outcomes does self-employment promise—flexibility, ownership, income, or a different kind of work?”  
> The goal remains legitimate while its purposes become clearer.

> **Solution-first:** “I need to start a newsletter.”  
> **Next frame:** “I want a reliable way to reach people who might benefit from my writing.”  
> A newsletter can still be chosen, but it is now one path among several.

> **Specified problem:** “This API must process 500 requests per second but currently processes 300 under the expected load.”  
> **Next move:** Establish how throughput was measured and investigate the bottleneck. A sweeping reframe may add little.

A mixed sentence might be “I am overwhelmed, so I need to quit my job.” It contains a painful experience and a proposed remedy. Treating it as only one category would miss the uncertainty: what is causing the overload, and what would quitting change?

Use this pattern when a group talks past itself because one person is describing distress while another is debating a plan. The danger is making the classification more important than the person’s actual concern. If the statement is mixed or ambiguous, say so and choose a modest next question. [[reframing-frame-problem]] serves pain points, [[reframing-detect-baked-solution]] serves solution-first requests, and [[reframing-rethink-goal]] serves goals. The classification simply helps choose among them.

## Related patterns

[[reframing-frame-problem]] · [[reframing-rethink-goal]] · [[reframing-detect-baked-solution]]

## Source

Inspired by Thomas Wedell-Wedellsborg's *What's Your Problem?* This is an original Patternverse procedure, not reproduced book text or an official implementation.

## Executable Pattern Markdown

```text
:language 1
:title "Identify the Problem Form"
:input frame text
:output form
:output candidate_frame

type ProblemForm = pain | goal | solution | specified | mixed
classifier problem_form -> ProblemForm {
    :case pain "The statement mainly describes a difficulty or felt pain without a clear outcome or mechanism."
    :case goal "The statement mainly describes an outcome the person wants."
    :case solution "The statement mainly prescribes an intervention or artifact."
    :case specified "The statement describes a clear, bounded problem with relevant evidence."
    :fallback mixed
}
form = frame ?~ problem_form
!show {
    One tentative reading of this statement is {{form}}. A statement can fit more than one form; use this only to choose a useful next question.
}
?match form {
    :case pain -> pain
    :case goal -> goal
    :case solution -> solution
    :case specified -> specified
    :case mixed -> mixed
}
pain:
!use reframing.frame-problem as pain_frame {
    :with problem = frame
}
= candidate_frame pain_frame.frame
-> end
goal:
!use reframing.rethink-goal as goal_frame {
    :with frame
}
= candidate_frame goal_frame.candidate_frame
-> end
solution:
!use reframing.detect-baked-solution as solution_frame {
    :with frame
}
= candidate_frame solution_frame.candidate_frame
-> end
specified:
= candidate_frame frame
-> end
mixed:
!use reframing.frame-problem as mixed_frame {
    :with problem = frame
}
= candidate_frame mixed_frame.frame
-> end
```
