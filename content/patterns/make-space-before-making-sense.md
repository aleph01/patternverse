---
id: make-space-before-making-sense
type: pattern
title: Make Space Before Making Sense
summary: Use a slow drawing ritual and private prompts to notice what deserves attention before deciding what it means.
status: published
aliases: [Spiral Journal]
tags: [learning, reflection, creativity]
verses: [learning, creativity]
attribution: "Adapted from Spiral Journal by Fisher Qua and Anna Jackson, with inspiration from Lynda Barry as credited by the source. Original Patternverse examples and paper-based personal adaptation; CC BY-SA 4.0."
---

Someone arrives at a planning conversation directly from a difficult call. Their attention is still occupied by the last exchange, but the meeting's first question asks for a confident view of the coming month. They answer with the concern nearest to hand. Later, they realize that several quieter observations never had a chance to become explicit.

A short preparation ritual can create a different entry into the work. Drawing slowly and responding privately to a few open prompts gives attention something concrete to do before it has to produce a polished explanation. The result may be a new idea, a clearer uncertainty, or a decision to leave something unresolved.

## Give attention a modest task

The **Spiral Journal** Liberating Structure begins with paper divided into four quadrants and a slowly drawn spiral from the center. A host offers four prompts for private writing. Participants select one or two noteworthy ideas in each quadrant and may share those selected ideas with others. Fisher Qua and Anna Jackson developed the method with inspiration from Lynda Barry.

The personal practice here retains the paper, spiral, four prompts, and selective capture. Sharing is optional and happens outside the app. The full page stays with its author unless they choose otherwise. The drawing is a ritual for this exercise, not an artwork to assess or evidence of a particular psychological effect.

Someone may find the spiral helpful, distracting, or simply ordinary. No special state needs to occur. A wobbly line is adequate. If drawing creates a barrier, the participant can use another comfortable mark-making movement or choose a different reflection practice; the adaptation should remain clear rather than claiming that every variation is identical to the source method.

## Invite material before organizing it

Open prompts can make different aspects of a situation available. A person preparing for a project transition might explore what they notice, what they are assuming, what they wonder, and what they might try. These are prompts written for this adaptation, not a required interpretation of every spiral page.

The aim is to let several observations appear before selecting the main account. A note about a difficult conversation can sit beside a practical concern about timing and a possibility for new work. The writer need not immediately combine them into a coherent story. Apparent inconsistency may contain useful information about the situation.

Selecting afterward is different from editing while generating. A person can circle something surprising or important without declaring it correct. An unexpected idea may deserve a question rather than an action. The page can preserve more complexity than the short insight eventually entered into the practice.

## A transition example

A designer changing roles begins with a familiar story: they need to become more strategic. Their first quadrant records a series of small interruptions. Another contains an assumption that strategic work must happen alone. A later quadrant includes a question about who currently receives important information first.

The selected insight is not a grand statement of purpose. It is a more specific concern: useful context may be arriving after decisions have already narrowed. The designer can ask about an earlier conversation or clarify which decisions their role should inform. The reflection has helped formulate an inquiry that the original self-description obscured.

The insight still needs contact with the world. A quiet page does not establish why interruptions happen or what colleagues intend. The designer can use it to prepare a question and remain open to a different account. That distinction keeps the exercise from becoming a private explanation that hardens before anyone else can contribute relevant information.

## A second example: preparing creative work

A photographer feels that a familiar location has nothing left to offer. Before going out, they draw and respond to prompts about what they overlook, what assumption limits them, what changes with time, and what they are curious to follow. One small note concerns reflections in windows after rain.

They choose that detail as a direction for the next visit. The exercise has not guaranteed interesting photographs. It has changed what the photographer is ready to notice. A later review can compare the original expectation with the actual encounter, including discoveries that had nothing to do with the selected idea.

This is also why a next action should not be compulsory in every reflection. Sometimes the useful result is that the question needs time or that the person does not want to share the material. A practice can acknowledge a chosen insight or a decision to keep the page private without presenting either as a failed exercise.

## Distinguish preparation from agreement

In a gathering, people may share selected notes in pairs or trios and notice themes. They should retain control over what leaves the page. Similar themes do not automatically establish a shared priority, and a facilitator's summary should not imply that everything written privately has become collective material.

[[think-alone-before-thinking-together]] concerns preserving independent contributions before discussion. Spiral Journal gives a particular physical and reflective form to preparation. [[tell-the-story-without-words]] explores visual stories through another person's interpretation. [[separate-observation-meaning-and-action]] helps investigate a selected insight when it is time to form explanations and choose a response. The ritual creates room for that work without needing to complete it all at once.


## Liberating Structures source and adaptation

[Spiral Journal](https://www.liberatingstructures.com/spiral-journal), credited by the source to Fisher Qua and Anna Jackson, with inspiration from Lynda Barry. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — A Spiral and Four Private Prompts

**Format:** Personal paper-based Spiral Journal adaptation. **Time:** About 15 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "A Spiral and Four Private Prompts"
:output result

!show {
Use a sheet of paper and a comfortable pen. Fold into four quadrants, mark the center, and slowly draw a spiral outward for one or two minutes. There is no required feeling or drawing quality. Keep the full page private; record only insights you choose.
}
context = !form {
:title "Choose a gentle focus"
focus = !ask {
What work, transition, or question would you like to prepare for?
}
spiral_cue = !timer {
:duration 120
:blocking false
:sticky false
Optional two-minute pause while you draw the spiral.
}
}
prompts = ["What am I noticing?", "What am I assuming?", "What am I wondering?", "What might I try or leave open?"]
insights = each prompt in prompts {
quadrant = !form {
:title "Write on paper, then choose what to retain"
writing_cue = !timer {
:duration 120
:blocking false
:sticky false
Optional two minutes for this quadrant: {{prompt}}
}
selected = !ask [optional] {
After writing privately for {{prompt}}, what insight, if any, do you choose to enter? Leave blank to keep it private.
}
}
-> yield {prompt: prompt, selected: quadrant.selected}
}
!show {{insights}} {

}
closing = !form {
:title "Choose what follows"
intention = !choose {
What would you like to do with the reflection?
- private: "Keep the reflection private"
- question: "Carry one question into later work"
- share: "Choose selected insights to share with willing people"
- open: "Leave it unresolved for now"
}
next_step = !ask [optional] {
Any question or next step you choose to retain? Optional.
}
}
result = {focus: context.focus, chosen_insights: insights, closing: closing}
!show {
Your chosen intention: {{closing.intention}}
Selected next question or step: {{closing.next_step}}
Only deliberately entered insights are included; your full paper journal is not.
}
-> end
```
