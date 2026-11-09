---
id: "first-principles-thinking"
type: "pattern"
title: "First-principles Thinking"
summary: "Rebuild a solution from established requirements and constraints after separating them from inherited conventions."
status: "published"
aliases: []
tags: ["problem-solving", "thinking-tools", "first-principles-thinking"]
verses: ["problem-solving"]
attribution: "Long philosophical and scientific tradition, including Aristotle’s Physics, Book I. No modern sole inventor asserted. The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

A community choir assumes that every singer needs a printed score for every rehearsal. Printing costs are rising, so the committee debates cheaper paper and a new printer. Nobody asks which parts of the arrangement are required for learning the music and which are inherited conventions.

First-principles thinking separates established requirements and constraints from assumptions, then rebuilds a solution from what remains. The constructive step matters. Questioning everything without producing a workable alternative is only half the task.

Reasoning from foundations has a long philosophical and scientific history, including Aristotle’s treatment of principles. No modern entrepreneur or profession owns the general method. In practical work, the challenge is deciding which claims are sufficiently established for the purpose and which still need evidence.

## Distinguish facts from familiar arrangements

The choir has real requirements: singers need access to the correct material, annotations must remain usable, licensing conditions must be respected, and rehearsals must work for people with different access needs. “Everyone receives a fresh paper copy each week” is one implementation of those requirements.

Make the status of each claim explicit. Some are legal or contractual obligations. Some are physical constraints. Others are observations about the present group. “Three singers cannot comfortably read the current print size” is an observation to address. “Digital scores are always more convenient” is a generalization that needs checking.

Do not promote a preference into a principle because it is strongly held. Equally, do not dismiss a legitimate requirement merely because it is social rather than physical. Consent, accessibility, fairness, and an agreed budget can be essential design constraints.

## Ask what must be true for success

Define the desired function independently of the existing arrangement. The choir needs each singer to follow and retain the material required for their part, with a reliable way to handle changes.

That description opens several possibilities: reusable folders, a stable master edition with limited update sheets, larger-print copies where needed, permitted digital versions, or section-specific material for some rehearsals. Each possibility must still be checked against the retained requirements.

The point is not to remove paper for its own sake. A mixed arrangement may serve the group better than either universal printing or universal screens. First principles can lead back to part of the existing design when it satisfies real needs well.

## Rebuild and test

The choir proposes a stable set of licensed scores in reusable folders, with a clear version marker and a limited process for distributing corrections. Singers who need larger print keep an appropriate edition. Digital access remains an option where permitted and practical.

Now test the design against each requirement. Can singers identify the current version? Can the folder arrangement survive missed rehearsals? Who updates the copies? Does reduced printing create hidden work for a volunteer? Does the licensing arrangement permit the proposed use?

A short trial with one piece can reveal whether the reconstruction works. The trial should preserve a fallback so that a failed experiment does not leave singers without usable material. Success would justify expanding the arrangement, not assuming that every future piece has identical constraints.

## Another example: transporting a display

A small exhibition team believes it needs a van to move a display. Breaking the task down reveals the actual requirements: protect several fragile objects, move two large panels, meet a setup time, and provide people to carry safely.

The inherited bundle is “one van moves everything.” Alternatives might separate objects from panels, rent transport only for the large items, redesign panels into smaller sections, or change the installation schedule. Some choices introduce unacceptable handling or assembly risks and should be rejected.

This is practical decomposition, not an invitation to ignore expertise about transport and installation. A claimed physical constraint can be checked with someone who understands the objects. A constraint that is expensive to change may still be worth retaining.

## Avoid the fantasy of starting from nothing

You will rely on knowledge you have not personally re-derived. That is unavoidable. Record important dependencies and use credible expertise where needed. “I questioned the assumption” is not evidence that the assumption was false.

First-principles thinking can become arrogant when it treats accumulated practice as mere habit. Existing arrangements may encode lessons, obligations, and failure protections that are not obvious to a newcomer. Investigate why a convention exists before removing it.

It can also become impractical when the inquiry expands endlessly. Bound the question, retain well-supported constraints for the current decision, and identify which uncertainties are worth checking now. Foundations are relative to the problem you are solving, not a demand to reconstruct all human knowledge.

## Connect challenge to construction

[[reframing-remove-constraints|Remove Constraints]] helps challenge a frame that feels unnecessarily fixed. This pattern requires the next step: design an alternative that satisfies the requirements you retain. [[abstraction-laddering|Abstraction Laddering]] can clarify the function behind a requested implementation. [[issue-trees|Issue Trees]] can organize the investigation when several foundational claims need evidence.

Finish with three things: the claims retained as constraints, the conventions reconsidered, and the reconstructed proposal. Add the check that could expose its most important weakness. That output makes the reasoning available to others and prevents “first principles” from becoming a label attached to an unsupported personal preference.

## Sources

- [Aristotle: Physics, Book I](https://classics.mit.edu/Aristotle/physics.1.i.html), a historical foundation for reasoning about principles. The contemporary design procedure and examples here are original practical applications, not a claim that Aristotle prescribed this worksheet.

## Practice — Rebuild From What Must Be True

**Purpose:** Rebuild a solution from established requirements and constraints after separating them from inherited conventions.

**Time:** About 20 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Rebuild From What Must Be True"
:output result

!show {
About 20 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Separate function from implementation"
current = !ask {
What familiar arrangement or proposed solution are you examining?
}
function = !ask {
What function must it actually provide, for whom?
}
}
claims = !collect {
:min 1
:max 7
entry = !form {
:title "Add an entry"
claim = !ask {
State one requirement, constraint, or inherited convention.
}
kind = !choose {
What is its current status?
- requirement: "A necessary requirement or obligation"
- supported: "A well-supported constraint or observation"
- convention: "An inherited arrangement or preference"
- uncertain: "A claim to investigate"
}
basis = !ask {
What evidence, agreement, or authority supports that classification?
}
implication = !ask {
What happens if you retain, change, or remove it?
}
}
-> yield entry
}
!show {{claims}} {
:group kind
}
rebuild = !form {
:title "Construct an alternative"
retained = !ask {
Which requirements and supported constraints will you retain for this decision?
}
proposal = !ask {
What different arrangement could provide the function while respecting them?
}
comparison = !ask {
How does it compare with the existing arrangement, including transferred work or costs?
}
test = !ask {
What bounded check could expose the reconstruction’s most important weakness?
}
}
result = {context: context, foundational_claims: claims, reconstruction: rebuild}
!show {
Your reconstructed proposal: {{rebuild.proposal}}
Retained requirements: {{rebuild.retained}}
Next test: {{rebuild.test}}
}
-> end
```
