---
id: dbt-check-the-facts
type: pattern
title: "Check the Facts: Examine the Story Around the Feeling"
summary: Separate what you observed from what you inferred, consider uncertainty, and reassess how an emotion fits the situation.
status: published
aliases:
  - Check the Facts
verses:
  - therapy
attribution: Original educational explanation and interactive adaptation of the DBT Check the Facts skill. Examples are fictional.
---

## A familiar moment

Your manager sends a short message: “Can we talk tomorrow?” Your stomach drops. You reread it and begin imagining a conversation about losing your job. Soon you are looking for signs that everyone has known something you missed.

The meeting request is real. The feared explanation is a possibility your mind supplied. Check the Facts helps you look at both carefully. It does not ask you to replace concern with a cheerful prediction. It asks what is known, what remains uncertain, and how you might respond to the situation you actually have.

## Understand the skill

Check the Facts is an emotion regulation skill in Dialectical Behavior Therapy, or DBT. Emotion regulation includes understanding emotions and choosing responses to them. This skill examines the interpretations that accompany a feeling and whether the emotion, its intensity, or its duration fits available information.

The feeling itself is part of your experience. Examining an interpretation does not mean denying that you feel afraid or hurt. It means distinguishing “I feel frightened” from “Something terrible will definitely happen.” An emotion can point to something worth investigating without establishing the conclusion on its own.

[DBT Self Help's guide](https://dbtselfhelp.com/check-the-facts/) describes six questions, including examining threats and feared outcomes. The result can be reassurance, a more specific concern, or recognition that there is a real problem to address. Uncertainty is a legitimate conclusion.

## When to use it

Try it when you notice mind-reading, certainty about a prediction, or a broad conclusion from limited information. Examples include a delayed reply becoming “They don't care,” feedback becoming “I'm incapable,” or an ambiguous expression becoming “They're angry with me.”

The skill also applies when a concern may be accurate. Evidence of mistreatment, discrimination, danger, or loss deserves attention. You do not have to invent an innocent explanation for harm. If immediate protective action is needed, act first. If detailed reflection turns into repeated reassurance-seeking, set a boundary around the exercise and consider support rather than checking indefinitely.

## How to practice

Use the established six questions in order. You can leave an answer open when information is missing.

1. **Which emotion are you examining?** Name it as specifically as you can. Optionally note intensity without making the number a score.
2. **What prompted it?** Describe what you saw, heard, or otherwise observed. Separate judgments and predictions from those observations.
3. **What interpretations did you add?** Identify assumptions, then consider other explanations supported by what is known. Include a concerning explanation if it remains plausible.
4. **Are you assuming a threat?** Name the predicted harm. What evidence supports it, what evidence limits it, and how much can you reasonably know about its likelihood?
5. **What is the feared catastrophe?** If useful and manageable, briefly identify the feared outcome and one way you could obtain support or respond. You do not need a vivid worst-case simulation.
6. **Does the emotion fit the facts?** Consider its type, intensity, and duration. Choose a revised assessment that preserves uncertainty where needed.

[Linehan's emotion regulation teaching notes](https://www.guilford.com/add/linehan7_old/lin-p-3teaching.pdf?t=1) place checking facts alongside responding to real problems. This is an examination, not a requirement to conclude that your emotion is excessive.

## See it in action

For the meeting message, the emotion is fear. The observation is simply the request to talk tomorrow. The interpretation is, “I'm about to be dismissed.” You remember that the manager also schedules brief conversations about planning and client requests.

Other explanations include a new task, feedback, or a concern about your work. None is established. The predicted threat is losing income. You have not received a warning, but you also cannot guarantee what the conversation will contain.

You keep the feared-outcome question brief: “If there is difficult feedback, I can ask for specifics and time to understand it. If the issue is more serious, I can seek advice afterward.” You do not need to solve every possible employment problem tonight.

Your revised assessment is: “A conversation is scheduled. I don't know its subject. Some anxiety makes sense; certainty that I'm being dismissed goes beyond the message.” You reply, “Sure—anything I should prepare?” The manager may not answer until morning. The uncertainty remains, with a more accurate description around it.

## Try it yourself

**Observation, Interpretation, Assessment** takes about 8–12 minutes. Use a manageable situation, keep details in your own notes, or choose the meeting example. You will work through the six questions and create a brief revised assessment.

You will leave with observations, interpretations, remaining unknowns, and a possible next response. The interactive format is an original adaptation. It does not decide whether a concern is true, estimate probabilities for you, or interpret another person's motives.

## When it feels difficult

**“Considering alternatives feels like dismissing myself.”** Keep the concerning possibility on the page alongside the others. Ask what supports each account. A smaller first step is writing only the observation and your interpretation, without trying to change either feeling or belief.

**“I need to know for certain.”** State the limit directly: “I don't know yet.” Choose one appropriate way to clarify, then stop checking for now. Your first step might be identifying what information would actually change the assessment.

**“Thinking about the catastrophe makes things worse.”** Skip vivid detail. Name the concern in a few words and identify one support, or leave the question blank. You can pause and attend to your surroundings. The exercise does not require proving that you could handle every imaginable outcome.

## Bring it into daily life

Try one brief distinction after an ambiguous everyday event: “What happened?” and “What meaning did I add?” Continue with the other questions only when useful. If the facts reveal a problem, let that finding guide practical action.

What can you say accurately without requiring the situation to be either harmless or disastrous?

“When I notice myself treating a prediction as certain, I can try separating the observation from the story I added.”

## Sources and related patterns

- [DBT Self Help: Check the Facts](https://dbtselfhelp.com/check-the-facts/) — the six questions and evaluating emotional fit.
- [Marsha M. Linehan: emotion regulation teaching notes, Guilford Press](https://www.guilford.com/add/linehan7_old/lin-p-3teaching.pdf?t=1) — checking appraisals and distinguishing fact checking from solving a real problem.

The example and interactive format are original educational adaptations. [[dbt-opposite-action]] may help when changing an emotional response is appropriate; [[cbt-problem-solving]] helps address a practical difficulty revealed by the facts.

## Practice — Observation, Interpretation, Assessment

Separate observations from interpretation and reassess emotional fit Allow 8–12 minutes. Leave with a revised assessment that can include uncertainty. All personal text is optional; pause or end whenever needed. This is an original educational adaptation.

```patternverse-language
:language 1
:title "Observation, Interpretation, Assessment"

!show {
Examine a story accompanying a feeling and leave with an assessment that respects known facts and uncertainty.

Allow 8–12 minutes. Leave with observations, interpretations, a revised assessment, and a possible response. This is an original educational adaptation; no AI is used.

Every text answer is optional. You can leave it blank, write “unsure,” or use your own notes without sharing details. Use the runner’s pause or end controls whenever needed. Ending a run does not erase previously entered answers. Choose an ordinary, manageable situation and avoid unnecessary identifying details.

Take urgent protective action first if needed. You do not have to find a harmless explanation for mistreatment. Keep feared outcomes brief; skip detail or stop if it increases distress.
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

Your manager writes, “Can we talk tomorrow?” You feel afraid and predict you will lose your job. You have not received a warning. Your manager also schedules conversations about tasks and planning. The subject of tomorrow’s conversation is not known.

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
  :title "A. Choose a situation"
  situation = !ask [optional] {
What situation are you examining? Keep details brief or private.
  }
}
emotion = !form {
  :title "B. 1 — Identify the emotion"
  name = !ask [optional] {
Which emotion do you want to understand or change? Example: fear.
  }
  intensity = !ask [optional] {
Optional: how strong does it feel, in words or on a 0–10 scale? You may leave this blank; it is an observation, not a score.
  }
}
facts = !form {
  :title "C. 2 — Describe the prompting event"
  observed = !ask [optional] {
What did you actually see, hear, or otherwise observe? Example: My manager requested a conversation tomorrow. Leave judgments and predictions for the next question.
  }
}
story = !form {
  :title "C. 3 — Identify interpretations"
  interpretation = !ask [optional] {
What are you assuming or predicting? Example: I’m going to be dismissed.
  }
  alternatives = !ask [optional] {
What other explanations fit what is known? Include a concerning possibility if it remains plausible. You do not need to invent a positive explanation.
  }
}
!show {
**Your notes so far**

Situation: {{setup.situation}}

Emotion: {{emotion.name}}

Initial intensity, if reported: {{emotion.intensity}}

Observations: {{facts.observed}}

Interpretation: {{story.interpretation}}

Other possibilities: {{story.alternatives}}

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
threat = !form {
  :title "C. 4 — Examine the threat"
  prediction = !ask [optional] {
What harm are you predicting, if any?
  }
  evidence = !ask [optional] {
What evidence supports that threat, what limits it, and what is unknown? Describe likelihood only as far as the information allows; no percentage is required.
  }
}
catastrophe_route = !choose {
C. 5 — Would you like to briefly name the feared outcome and a possible support?
- brief: "Use a brief, manageable description"
- skip: "Skip this question"
}
?match catastrophe_route {
  :case brief {
feared = !form {
  :title "C. 5 — Keep the feared outcome bounded"
  outcome = !ask [optional] {
What is the feared outcome, in a few words? No vivid simulation is needed.
  }
  support = !ask [optional] {
If it occurred, what is one source of support or response you could consider? You do not need to solve every possible problem.
  }
}
  }
  :case skip {
feared = {outcome: "", support: ""}
  }
}
fit = !choose {
C. 6 — How does the emotion fit the facts you have?
- fits: "The emotion seems to fit a real concern"
- partly: "Some fits; intensity, duration, or certainty may go beyond what I know"
- not_fit: "The interpretation supporting this emotion is not supported by the available facts"
- unsure: "I’m not sure"
}
?match fit {
  :case fits {
!show {
A fitting emotion can call for practical action, protection, support, or acceptance of something painful. You do not have to argue it away.
}
  }
  :case partly {
!show {
Keep the part that fits and name the uncertainty. Feeling an emotion and treating every prediction as certain are different.
}
  }
  :case not_fit {
!show {
You can revise the interpretation while acknowledging the feeling that is present. No emotional change is required before you choose a response.
}
  }
  :case unsure {
!show {
You can leave the assessment uncertain. Consider one appropriate clarification or support rather than checking indefinitely.
}
  }
}
assessment = !form {
  :title "C. Write a revised assessment"
  revised = !ask [optional] {
What can you now say accurately? Example: A meeting is scheduled; its subject is unknown. Some anxiety makes sense, but dismissal is not established.
  }
  unknown = !ask [optional] {
What remains unknown, and what information would actually help?
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
What response fits your revised assessment? You could clarify once, address a real problem, seek support, wait for information, or leave the choice open. When might you do that?
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

Situation: {{setup.situation}}

Emotion: {{emotion.name}}

Initial intensity, if reported: {{emotion.intensity}}

Observations: {{facts.observed}}

Interpretation: {{story.interpretation}}

Other possibilities: {{story.alternatives}}

Predicted threat: {{threat.prediction}}

Evidence and uncertainty: {{threat.evidence}}

Feared outcome, if entered: {{feared.outcome}}

Possible support: {{feared.support}}

Fit assessment selected: {{fit.label}}

Revised assessment: {{assessment.revised}}

Remaining unknowns: {{assessment.unknown}}

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
