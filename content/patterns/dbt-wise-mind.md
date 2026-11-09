---
id: dbt-wise-mind
type: pattern
title: "Wise Mind: Bringing Feelings and Facts Together"
summary: Make room for emotional experience and practical information together before choosing a response that fits what matters.
status: published
aliases:
  - Wise Mind
verses:
  - therapy
attribution: Original educational explanation and interactive adaptation of DBT Wise Mind. The brief sequence below is an adaptation, not a fixed DBT protocol.
---

## A familiar moment

A friend invites you away for the weekend. You have been lonely and want to say yes immediately. Then you look at the cost and remember how tired you are. One line of thought says, “Go—you need this.” Another says, “It's inefficient and expensive. Stay home.” You keep switching between them, as though one side must defeat the other.

Wise Mind offers a way to hold more of the situation at once. The wish for connection matters. So do money, energy, and the choices available. The next step may emerge from taking each seriously.

## Understand the skill

Dialectical Behavior Therapy, or DBT, describes **Emotion Mind**, **Reasonable Mind**, and **Wise Mind** as ways of approaching experience. Emotion Mind emphasizes feeling and its urgencies. Reasonable Mind emphasizes facts, analysis, and practical calculations. Each can offer useful information; either can leave something important out when it dominates.

Wise Mind brings these perspectives together with an experiential sense of what fits. [DBT Self Help's explanation](https://dbtselfhelp.com/wise-mind/) introduces this relationship. It is a mindfulness practice, meaning that you pay attention to present experience rather than automatically following the loudest thought.

Wise Mind is not a requirement to split every difference or discover an infallible inner answer. A strong feeling can be informative without proving an external fact. A quiet conviction can still need checking. You may reach a tentative decision, recognize a need for information, or decide that you are not ready to choose.

## When to use it

Try this when you feel pulled between an emotional wish and a practical concern: accepting a commitment, replying to criticism, spending money, or deciding how much contact you want. Cues include repeatedly arguing with yourself, dismissing a feeling as irrelevant, or treating an urgent feeling as a command.

Choose a manageable decision for a first practice. A brief reflection cannot replace expert information for medical, financial, or legal decisions. If you need immediate protection, take protective action first. If turning inward makes you feel more disoriented or overwhelmed, keep your eyes open, attend to the room, or pause. You do not have to use body sensations or breathing as an anchor.

## How to practice

DBT includes several ways to practise Wise Mind. The following is an original sequence that combines attention, reflection, and a small next step. It is informed by the integration described in [this Wise Mind lesson](https://dialecticalbehaviortherapy.com/mindfulness/wise-mind/).

1. **Arrive in the present.** Notice a stable feature of your surroundings, the support beneath you, or an ordinary breath. Let yourself take a moment without solving anything.
2. **Hear the emotional perspective.** What are you feeling, wanting, fearing, or protecting? Use words that describe your experience without treating it as a verdict.
3. **Hear the reasonable perspective.** What do you know? What are the constraints, available options, and gaps in your information?
4. **Invite an integrated response.** Ask, “Taking both into account, what response fits my values and this situation?” Wait briefly. A useful answer may be a question rather than a decision.
5. **Choose a tentative next step.** Check that it is safe, realistic, and open to revision. You can gather information or return later.

## See it in action

With the weekend invitation, you begin by looking around the kitchen and noticing the chair supporting you. You do not try to make yourself enthusiastic or sensible.

The emotional perspective becomes: “I miss having relaxed time with friends. I'm afraid I'll keep saying no until people stop inviting me.” The practical perspective becomes: “The full weekend would cost more than I have set aside. I also need rest. I don't yet know whether I could visit for one day.”

Holding both suggests an inquiry: “I'd love to see you. Could I join on Saturday rather than stay the whole weekend?” That respects the wish for company while checking an option that may fit your circumstances.

Your friend might say that transport makes a day visit impractical. You could then look for another plan together. Wise Mind does not make constraints disappear. It helps the decision remain connected to what you feel and what is actually possible, including the disappointment of an option that does not work.

## Try it yourself

**Hear Both, Choose One Step** takes about 5–8 minutes. Use an ordinary decision, keep the details private, or work with the weekend example. You will spend a brief period attending to the present, record both perspectives if you wish, and allow time for an integrated response.

You will leave with the wording you entered and a tentative next step. The exercise does not label your answer as wise or infer a decision from your feelings. Nothing emerging during the pause is required to be accepted as true.

## When it feels difficult

**“I can't find a special feeling of certainty.”** You do not need one. Look for a response that accounts for more of the situation. A smaller first step is naming one feeling and one relevant fact, then leaving the decision open.

**“The practical voice says my feelings are ridiculous.”** Describe the feeling before evaluating the action it suggests. “I want connection” provides information that “I'm being needy” hides. Begin by changing one judgment into a statement of experience.

**“The emotion is too loud to hear anything else.”** Reduce the demand. Orient to something outside you, take a break, or seek support before reflecting further. Your first step might be noticing that now is a difficult time to decide. Waiting can be a considered choice when circumstances allow it.

## Bring it into daily life

Try one small check-in before an everyday commitment. Ask what you feel, what you know, and what matters beyond this moment. Make room for “I need to check” as well as yes or no.

What becomes visible when neither the emotional perspective nor the practical perspective has to disappear?

“When I notice myself arguing between what I feel and what seems practical, I can try hearing both before choosing one next step.”

## Sources and related patterns

- [DBT Self Help: Wise Mind](https://dbtselfhelp.com/wise-mind/) — the three states of mind and their relationship.
- [DialecticalBehaviorTherapy.com: Wise Mind](https://dialecticalbehaviortherapy.com/mindfulness/wise-mind/) — combining emotional awareness, information, and values in reflection.

The examples, five-part sequence, and interactive practice are original educational adaptations. [[dbt-stop]] can create room for reflection; [[dbt-check-the-facts]] can help clarify a claim that appears during it.

## Practice — Hear Both, Choose One Step

Hear both emotional and practical perspectives before choosing Allow 5–8 minutes. Leave with a tentative response and an available next step. All personal text is optional; pause or end whenever needed. This is an original educational adaptation.

```patternverse-language
:language 1
:title "Hear Both, Choose One Step"

!show {
Make room for emotional experience and practical information together.

Allow 5–8 minutes. Leave with both perspectives and a tentative next step. This is an original educational adaptation; no AI is used.

Every text answer is optional. You can leave it blank, write “unsure,” or use your own notes without sharing details. Use the runner’s pause or end controls whenever needed. Ending a run does not erase previously entered answers. Choose an ordinary, manageable situation and avoid unnecessary identifying details.

A brief reflection does not replace needed expert information. If turning inward feels uncomfortable, use an external anchor or stop. No feeling of certainty is required.
}
route = !choose {
A. Choose how to practise.
- own: "Use my own manageable situation"
- private: "Keep my situation in my own notes"
- example: "Use a fictional example"
- finish: "Finish before beginning"
}
?match route {
  :case finish {
!show {
You chose to finish before beginning. There are no personal responses or outcomes to summarize. You can return with an example or a manageable situation another time.
}
-> end
  }
  :case example {
!show {
**Fictional example**

A friend invites you away for a weekend. You miss having company and want to accept. The cost is higher than you planned, and you need rest. You do not yet know whether joining for one day is possible.

Use this example in the questions if you wish. Your later entries concern this example, not a claim about your own experience. The summary will repeat only what you enter or select.
}
  }
  :case private {
!show {
Keep details in your own notes or think through them silently. Leave text fields blank whenever you prefer. The summary cannot recover your private notes.
}
  }
  :case own {
!show {
Use one situation you can work with at your own pace. You can omit any details or stop.
}
  }
}
setup = !form {
  :title "A. Choose one question"
  situation = !ask [optional] {
What ordinary decision or question are you bringing? Example: How could I see my friend while respecting my energy and budget?
  }
}
arrive = !form {
  :title "B. Arrive in the present"
  !show {
Before answering, take a few moments to notice something stable: a shape in the room, the support beneath you, or an ordinary breath if comfortable. Let attention return once when it wanders. Keep your eyes open if you prefer; you do not need to relax or empty your mind.
  }
  anchor = !ask [optional] {
What did you attend to, if anything? You may simply continue without describing it.
  }
}
emotion = !form {
  :title "B. Hear the emotional perspective"
  message = !ask [optional] {
What are you feeling, wanting, fearing, or protecting? Example: I want company and worry about drifting away from friends. Describe the experience without treating a prediction as proven.
  }
}
reason = !form {
  :title "B. Hear the reasonable perspective"
  facts = !ask [optional] {
What do you know about the practical circumstances? What remains unknown? Example: the weekend cost exceeds my budget; a day visit might be possible.
  }
  values = !ask [optional] {
What matters beyond immediate relief or efficiency? Example: connection, rest, and keeping financial commitments.
  }
}
!show {
**Your notes so far**

Question: {{setup.situation}}

Attention report: {{arrive.anchor}}

Emotional perspective: {{emotion.message}}

Practical information: {{reason.facts}}

What matters: {{reason.values}}

Blank entries remain unreported; no missing details have been inferred.
}
checkpoint = !choose {
Would you like to continue?
- continue: "Continue with the skill"
- finish: "Finish with these notes"
}
?match checkpoint {
  :case finish {
!show {
You took time to consider these questions and chose to stop here. Your entered notes are above. No further action or change is assumed. Copy anything you want to keep.
}
-> end
  }
  :case continue {
  }
}
!show {
**C. Invite a response that includes both**

Your emotional perspective: {{emotion.message}}

Your practical information: {{reason.facts}}

What matters: {{reason.values}}

For a short pause, ask yourself: “Taking these together, what response fits this situation?” Let a sentence, question, or uncertainty arise without forcing an answer. A feeling of certainty is not proof that a claim is true. It is fine to notice no answer.
}
integrating_choice = !choose {
Would a short optional timer help with this activity?
- timed: "Use a 30-second timer"
- untimed: "Continue at my own pace or skip the activity"
}
?match integrating_choice {
  :case timed {
integrating = !timer {
  :duration 30
  :blocking true
  :sticky false
Attend to the present and gently return to the question. You can stop the exercise if needed.
}
  }
  :case untimed {
!show {
Use as much or as little time as fits. You may skip this activity and continue to the observation question. No activity is assumed to have been completed.
}
  }
}
integration = !form {
  :title "C. Put the response into words"
  response = !ask [optional] {
What response, question, or uncertainty appeared? Example: ask whether a one-day visit is possible. “No answer” is welcome.
  }
  check = !ask [optional] {
Does this response account for feelings, facts, and what matters? What information or support is still needed?
  }
}
reflection = !form {
  :title "D. Reflect"
  noticed = !ask [optional] {
What did you notice, understand, or find difficult? “Nothing changed,” “I’m not sure,” and “I did not try it” are valid observations.
  }
}
reflect_direction = !choose {
What fits now?
- continue: "Choose something to take forward"
- finish: "Finish with my reflection"
- uncomfortable: "I feel uncomfortable and want to stop"
}
?match reflect_direction {
  :case uncomfortable {
!show {
Stop the exercise and notice your present surroundings. Look around or notice the support beneath you if comfortable. You can seek support from someone you trust. There is no need to finish now.

Your reflection: {{reflection.noticed}}

Your earlier entries remain your working notes. No improvement or next action is assumed.
}
-> end
  }
  :case finish {
!show {
You chose to finish after considering the practice. Your entries above remain working notes.

Your reflection: {{reflection.noticed}}

No next action is assumed. Copy what you want to keep.
}
-> end
  }
  :case continue {
  }
}
forward = !form {
  :title "E. Take forward"
  next = !ask [optional] {
What is one next action you choose, if any? When might you try it? Leaving this open is an option.
  }
  cue = !ask [optional] {
Complete the first part of a reminder, if useful: “When I notice…”
  }
  action = !ask [optional] {
Complete the second part: “I can try…”
  }
}
?match route {
  :case example {
!show {
**Your notes on the fictional example**

This summary concerns the example you selected. It is not a record of your own behavior or feelings.
}
  }
  :case private {
!show {
**Your entered notes**

Details kept in your own notes are not included. Blank entries remain unreported.
}
  }
  :case own {
!show {
**Your working notes**

This summary repeats your entries. It does not fill gaps or decide what your experience means.
}
  }
  :case finish {
  }
}
!show {
You took time to consider the practice. No particular emotional change is required.

Question: {{setup.situation}}

Attention report: {{arrive.anchor}}

Emotional perspective: {{emotion.message}}

Practical information: {{reason.facts}}

What matters: {{reason.values}}

Integrated response or uncertainty: {{integration.response}}

Further check: {{integration.check}}

Reflection: {{reflection.noticed}}

Next action: {{forward.next}}

A plan, a rehearsal, and an action in daily life are different. Nothing has been sent, scheduled, or carried out for you. Copy the wording you want to keep into your own notes.
}
?branch {
  :when trim(forward.cue) != "" and trim(forward.action) != "" {
!show {
**Your reminder**

When I notice {{forward.cue}}, I can try {{forward.action}}.
}
  }
  :else {
!show {
**Your reminder fragments**

When I notice: {{forward.cue}}

I can try: {{forward.action}}

You can leave the reminder unfinished.
}
  }
}
-> end
```
