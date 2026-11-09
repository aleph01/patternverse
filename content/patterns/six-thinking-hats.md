---
id: "six-thinking-hats"
type: "pattern"
title: "Six Thinking Hats"
summary: "Separate modes of thinking so facts, feelings, benefits, risks, and alternatives each receive attention."
status: "published"
aliases: []
tags: ["decision-making", "thinking-tools", "six-thinking-hats"]
verses: ["decision-making", "collaboration"]
attribution: "Edward de Bono; Six Thinking Hats (1985). The article, examples, diagrams, and participant-led practice are original Patternverse adaptations."
---

The museum's evening opening is popular with visitors and exhausting for the staff. At the planning meeting, every suggestion meets an immediate objection. More volunteers might help, but training takes time. Shorter hours might protect the team, but visitors travel after work. Someone says the atmosphere feels wrong, and someone else asks for evidence. Everyone is contributing something relevant, yet the contributions keep cancelling one another before they can be examined.

Six Thinking Hats, developed by Edward de Bono, gives those contributions separate space. The hats represent modes of attention: information, feeling, caution, benefit, possibility, and management of the thinking process. Their value comes from deliberately changing the kind of question being considered. A concern can receive a hearing without becoming the permanent position of the person who raised it.

## Give each kind of contribution a turn

Ordinary discussions often require people to generate ideas, assess evidence, defend their preferences, and anticipate failure simultaneously. A promising suggestion may disappear because it arrives before its evidence; an important feeling may be dismissed because it is presented as a factual claim. Separating the modes makes it easier to see which kind of contribution is being offered and what would make it useful.

For the museum, an information-focused pass establishes what is known: attendance by hour, the number of staff needed, how often volunteers cancel, and what remains unmeasured. A feeling-focused pass allows the team to acknowledge dread about another demanding season without pretending that dread proves the opening should end. A benefits pass considers what the evening makes possible. A caution pass examines plausible difficulties. An alternatives pass explores arrangements that do not simply reproduce the current schedule. A process pass asks what the group needs to do next.

These are commonly associated with white, red, yellow, black, green, and blue respectively. The colors are memory aids, not personality types. Someone who is good at identifying risks should still be invited to explore possibilities. Calling a colleague “a black hat person” turns a temporary thinking role into an identity and can make the original conversational problem worse.

## A shared lens rather than six permanent camps

In a group, it can be useful for everyone to use the same lens at the same time. During the information pass, the question is what evidence the group has, not whether each participant can defend a proposal. During the alternatives pass, everyone helps develop possibilities. A facilitator may change the sequence, return to a mode that needs attention, or stop when more discussion would add little.

The museum discovers that the final hour creates most of the staffing difficulty but relatively few additional visits. During the alternatives pass, someone proposes keeping the exhibition open while closing the hands-on studio earlier. The benefits pass identifies the value of access after work. The caution pass notices that a partial closure could confuse visitors. The next information question becomes whether visitors mainly want the exhibition or the studio. The meeting now has a specific observation to gather rather than another argument about whether evening openings are good.

Nothing in the sequence establishes the right answer. It improves the material available for judgment. A clear financial constraint still matters, and a person's employment conditions do not become negotiable merely because the group has explored several perspectives.

## Using the method alone

A student considering a public performance can use the same separation. The information pass records the available rehearsal time and the event's requirements. The feeling pass acknowledges excitement and embarrassment. The benefits pass identifies the value of finishing a piece for an audience. The caution pass notices that two difficult passages remain unreliable. The alternatives pass generates a shorter program, a duet, or a later performance. The process pass chooses the next rehearsal task and a date for reviewing readiness.

This is more useful than asking whether the student feels “confident enough.” Different concerns now point to different actions. Uncertain technique calls for practice; fear of judgment may call for a small audience first; missing event details call for a question to the organizer. More optimism would not resolve all three.

## What the structure cannot do

The method works best when a conversation repeatedly mixes facts, feelings, and evaluations, or when one mode dominates. It can be excessive for a simple choice with clear criteria. A short pass through two neglected modes may be enough; an elaborate ritual can consume the attention it was supposed to organize.

Do not force a positive interpretation of a serious problem or use a feeling round to extract personal disclosures. People can say that they have nothing to add. Caution should identify mechanisms and conditions, rather than produce an unlimited catalogue of imagined disasters. Likewise, an information round should label missing knowledge instead of filling gaps with confident guesses.

The useful outcome is often an altered question, a new option, or one piece of evidence to gather. [[try-another-model-of-the-world|Try Another Model of the World]] changes whose assumptions you explore; this pattern changes the thinking task. [[separate-exploration-from-selection|Separate Exploration from Selection]] protects idea generation from premature evaluation. [[run-a-premortem|Run a Premortem]] gives the caution mode a more focused procedure when a favored plan needs stress testing.

## Sources

Edward de Bono, *Six Thinking Hats* (1985). The [de Bono Group's program overview](https://www.debonogroup.com/services/core-programs/six-thinking-hats/) describes the framework. The museum and performance examples, and the practice below, are original educational applications.

## Practice — Six Lenses, One Decision

**Purpose:** Separate modes of thinking so facts, feelings, benefits, risks, and alternatives each receive attention.

**Time:** About 15 minutes. The practice produces a reflection or plan; it does not execute actions for you.

```patternverse-language
:language 1
:title "Six Lenses, One Decision"
:output result

!show {
About 15 minutes. Work with one manageable situation. This participant-led practice needs no AI. Review each group before Continue. The result is a reflection or plan; actions are not carried out or scheduled for you.
}
context = !form {
:title "Name the decision"
decision = !ask {
What decision or proposal will you examine?
}
constraints = !ask {
What requirements or boundaries must remain visible?
}
}
facts = !form {
:title "Information"
notes = !ask {
What is known, and which consequential facts are missing?
}
}
feelings = !form {
:title "Feelings"
notes = !ask [optional] {
What is your immediate emotional response? You can decline to elaborate.
}
}
benefits = !form {
:title "Benefits"
notes = !ask {
What useful outcomes could this proposal make possible?
}
}
risks = !form {
:title "Caution"
notes = !ask {
What plausible mechanism could prevent it working?
}
}
possibilities = !form {
:title "Alternatives"
notes = !ask {
What genuinely different options or changes deserve consideration?
}
}
process = !form {
:title "Choose what happens next"
change = !ask {
Which contribution changed your understanding?
}
next_step = !ask {
What decision, question, or bounded test should happen next?
}
revisit = !ask {
What new evidence would justify another review?
}
}
result = {decision: context, information: facts, feelings: feelings, benefits: benefits, caution: risks, alternatives: possibilities, next: process}
!show {
Your next step: {{process.next_step}}
Revisit when: {{process.revisit}}
}
-> end
```
