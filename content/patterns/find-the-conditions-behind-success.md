---
id: find-the-conditions-behind-success
type: pattern
title: Find the Conditions Behind Success
summary: Reconstruct a successful episode and investigate the conditions worth supporting or testing elsewhere.
status: published
aliases: [Appreciative Interviews]
tags: [collaboration, inquiry, learning]
verses: [collaboration]
attribution: "Adapted from Appreciative Interviews by Henri Lipmanowicz and Keith McCandless, whose source acknowledges David Cooperrider's work. Original Patternverse examples and reflection practice; CC BY-SA 4.0."
---

The repair café usually ends with a queue of unfinished jobs and a hurried cleanup. One Saturday feels different. Visitors understand what can be repaired, volunteers ask for help early, and the final hour is calm. At the next meeting, someone describes it as a good team on a lucky day. The explanation is pleasant and almost impossible to use.

A successful episode can be investigated with the same care usually reserved for failure. What happened before the doors opened? Which information reached the right person? Who noticed a difficulty and what did they do? The useful material lies in the conditions and actions that made the result possible, including modest arrangements that participants no longer notice.

## Start with an episode rather than a virtue

An episode has a setting, a sequence, and an outcome. A claim that the café values teamwork gives little guidance. A recollection that each repair was briefly described at the entrance, then directed to a volunteer with the appropriate tools, begins to explain the calmer day. Specificity makes the account open to questions and comparison.

Ask the storyteller what counted as success and for whom. A shorter queue might reflect efficient work, but it might also reflect fewer visitors or early refusal of difficult jobs. Volunteers and visitors can experience the same event differently. Investigating success should expand the account rather than protect a preferred story from inconvenient information.

The Liberating Structure **Appreciative Interviews** uses interviews about successful experiences, retelling, and discussion of enabling conditions. Its group form makes room for other listeners to notice patterns in the stories. The personal practice here is a reflection or partner-interview adaptation. It does not claim that one person's recollection establishes a group's shared experience.

## Look behind the visible performance

At the café, the volunteers reconstruct the morning. A sign explained the limits of the service. Tools were sorted before opening. A new volunteer could ask one clearly identified person for assistance. There was also a practical advantage: several experienced repairers were available. Each detail suggests a different kind of investment.

Some conditions are reproducible with little effort. Sorting tools and naming a contact person can become part of preparation. Others depend on resources the organizers cannot assume, such as an unusually experienced volunteer roster. The exercise is useful when it distinguishes those conditions, rather than turning all of them into a demand that every future Saturday feel equally smooth.

A surprising contributor may be the removal of a routine. That morning the coordinator skipped a lengthy opening announcement and instead made a short check at each table. Volunteers heard information relevant to their tasks. A success inquiry can therefore reveal things to stop as well as things to add. It need not become an inventory of positive behaviors only.

## Compare a second case before generalizing

A student remembers one seminar in which they participated confidently. It would be easy to conclude that confidence came from being better prepared. Closer reconstruction shows that the tutor circulated a question beforehand, allowed a minute for writing, and invited examples before abstract claims. The student had also slept well and knew another participant.

These are possible contributors, not established causes. The student could try preparing one concrete example before another seminar, or ask whether questions can be circulated early. They cannot reproduce every feature of the remembered class. A second episode may reveal that familiarity mattered less than having time to formulate a contribution.

The distinction between discovery and testing matters. A vivid story helps generate useful hypotheses. A small change in another setting helps investigate whether a condition transfers. The original episode can remain valuable even if the first attempt to recreate it fails. Perhaps the explanation was incomplete or the new context lacked an important support.

## An interview is not a search for the approved answer

Listen for particulars rather than steering toward familiar values. Questions about timing, resources, decisions, and interactions usually reveal more than requests to confirm that good communication mattered. A listener may help reconstruct the sequence without substituting their own explanation for the storyteller's account.

Retelling requires care. A person may be willing to discuss an experience with a partner without wanting identifying details repeated to a whole room. Ask what can be shared, let the storyteller correct the retelling, and focus on useful conditions rather than personal exposure. These choices help preserve the quality of the inquiry as well as the person's agency.

This pattern is useful when a group knows more about its failures than its functioning strengths, when a practice works inconsistently, or when an improvement effort needs concrete examples. It is less useful as a compulsory positivity exercise. People should be able to describe mixed outcomes and ongoing difficulties without being treated as obstacles to an appreciative tone.

## Invest in a condition and inspect the result

Choose one condition worth supporting, explain the link you expect, and identify what you will observe. The café might try the entrance explanation for two sessions and ask visitors whether it made the service easier to navigate. That is a more useful result than a general instruction to celebrate success.

[[look-for-the-exception]] examines cases that challenge an overgeneralized claim. [[think-alone-before-thinking-together]] can preserve independent recollections before a shared story forms. [[prefer-the-smallest-useful-experiment]] helps turn an attractive explanation of success into a limited test.


## Liberating Structures source and adaptation

[Appreciative Interviews](https://www.liberatingstructures.com/appreciative-interviews), credited by the source to Henri Lipmanowicz and Keith McCandless. Source procedure reviewed 21 October 2026. This article and practice use independently written examples and are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), following the current [Liberating Structures license](https://www.liberatingstructures.com/cc-license). Personal worksheets and facilitator guides are labeled adaptations, not official implementations.

## Practice — Investigate One Successful Episode

**Format:** Individual reflection or real partner interview. **Time:** About 20 minutes; external activities may take longer.

```patternverse-language
:language 1
:title "Investigate One Successful Episode"
:output result

!show {
Choose an actual episode. You may reflect alone or interview a willing partner outside the app. Record only material you have permission to retain; a vivid story generates hypotheses rather than proving causes.
}
episode = !form {
:title "Reconstruct the event"
setting = !ask {
When and where did this happen, and whose account is it?
}
sequence = !ask {
What happened, in order?
}
success = !ask {
What counted as success and for whom?
}
limits = !ask {
What mixed results or missing perspectives belong in the account?
}
}
conditions = !collect {
:min 1
:max 5
entry = !form {
:title "Investigate a possible enabling condition"
condition = !ask {
What person, action, resource, timing, or arrangement may have helped?
}
evidence = !ask {
Which detail supports that link?
}
transfer = !ask {
What would differ if you tried to recreate it elsewhere?
}
}
-> yield entry
}
!show {{conditions}} {

}
investment = !form {
:title "Choose a condition to test"
chosen = !ask {
Which condition is worth supporting or testing?
}
action = !ask {
What specific change could you make?
}
signal = !ask {
What observation would support or weaken your explanation?
}
sharing = !ask {
What may be shared, and whose permission is needed?
}
}
result = {episode: episode, possible_conditions: conditions, next_test: investment}
!show {
Condition to explore: {{investment.chosen}}
Proposed change: {{investment.action}}
Evidence to watch: {{investment.signal}}
Sharing boundary: {{investment.sharing}}
}
-> end
```
