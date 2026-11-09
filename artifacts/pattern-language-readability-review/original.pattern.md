:language 1
:title "The Work — investigate one thought"
:output outcome

!show {
    An independent Patternverse practice adaptation of The Work of Byron Katie.

    Choose a manageable everyday concern. This is a self-reflection exercise, not treatment. You can pause or end the practice at any time. Do not use it to deny an event, excuse harm, or take responsibility for another person's actions.

    Work at your own pace: about 15–25 minutes for one thought, or 25–40 minutes with the fuller opening. This practice is entirely self-guided, without AI assistance. You supply your own answers and examples. Answers remain in memory unless you explicitly save the run to your workspace.

    The four core questions follow Katie's method. The unresolved-answer options, optional notes, ability to leave turnarounds blank, and closing action reflection are Patternverse adaptations.
}

!choose entry {
    Where would you like to begin?

    - single: "I already have one stressful thought."
    - worksheet: "Help me explore a situation first."
    - leave: "Leave the practice here."
}
?match entry {
    :case single -> single_thought
    :case worksheet -> fuller_opening
    :else -> leave_practice
}

single_thought:
starting = !form {
    :title "Hold one thought in one situation"
    !ask situation {
        :required true
        :multiline true
        :placeholder "For example: Maya cancelled dinner an hour before we were due to meet."
        What happened? Name a specific moment and describe what you observed.
    }
    !ask thought {
        :required true
        :multiline true
        :placeholder "For example: Maya doesn't respect my time."
        What is the one stressful thought you want to explore? Write one statement in your own words.
    }
}
= situation starting.situation
= thought starting.thought
-> inquiry

fuller_opening:
worksheet = !form {
    :title "Explore a particular situation"
    !show {
        These original prompts follow the broad areas of Katie's Judge-Your-Neighbor worksheet. They are not the official form. Focus on one manageable scene with one person. Leave any optional field blank.
    }
    !ask situation {
        :required true
        :multiline true
        What happened in that particular scene? Describe the time, place, and observable event.
    }
    !ask judgment {
        :required false
        :multiline true
        What upset you about the person in that moment, and what did you feel?
    }
    !ask wishes {
        :required false
        :multiline true
        How did you want them to act differently?
    }
    !ask advice {
        :required false
        :multiline true
        What advice or instruction did you find yourself wanting to give them?
    }
    !ask needs {
        :required false
        :multiline true
        What did you believe you needed from them to feel okay in that scene?
    }
    !ask descriptions {
        :required false
        :multiline true
        What words did you use to describe them at the time? Record the judgments without treating them as verified facts.
    }
    !ask repeat {
        :required false
        :multiline true
        What part of the experience did you most want never to face again?
    }
}
selection = !form {
    :title "Choose just one statement"
    !show {
        Your scene
        {{worksheet.situation}}

        What upset you
        {{worksheet.judgment}}

        Wishes
        {{worksheet.wishes}}

        Advice
        {{worksheet.advice}}

        Needs
        {{worksheet.needs}}

        Descriptions
        {{worksheet.descriptions}}

        What you did not want repeated
        {{worksheet.repeat}}

        Choose one judgment, wish, or expectation about the person for this inquiry. Keep it to one sentence. No need to work through every note today. The final recurrence note provides context; the official worksheet's special turnaround for that item is outside this adaptation.
    }
    !ask thought {
        :required true
        :multiline true
        :placeholder "For example: Maya should have told me sooner."
        Which one statement will you explore?
    }
}
= situation worksheet.situation
= thought selection.thought
-> inquiry

inquiry:
!choose truth {
    **Your scene:** {{situation}}

    **Your thought:** {{thought}}

    **Question 1: Is it true?**

    Take a little time before answering. Katie's standard opening uses yes or no. The extra unresolved option below lets you continue without claiming certainty you do not have.

    - yes: "Yes"
    - no: "No"
    - unresolved: "I don't have an answer; continue without deciding."
}
?match truth {
    :case yes -> certainty
    :case no -> no_certainty
    :else -> unresolved_certainty
}

certainty:
!choose absolute {
    **Your thought:** {{thought}}

    **Question 2: Can you absolutely know that it's true?**

    An honest yes can stay yes. This is not a demand to disprove yourself. A lack of absolute certainty also does not erase evidence or a reason to protect yourself.

    - yes: "Yes"
    - no: "No"
    - unresolved: "I don't have an answer; continue without deciding."
}
= certainty_note absolute.label
-> reaction

no_certainty:
= certainty_note "Not asked: your No at question 1 leads directly to question 3 in the standard sequence."
-> reaction

unresolved_certainty:
= certainty_note "Left unresolved: this adaptation continued to question 3 without requiring a yes/no answer."
-> reaction

reaction:
response = !form {
    :title "Notice your experience with the thought"
    !show {
        **Your thought:** {{thought}}

        **Question 3: How do you react, what happens, when you believe that thought?**

        Keep returning to the same scene. You might notice tension, feelings, an imagined future, an impulse, or a change in how you act. A painful reaction is not proof that the thought is false.
    }
    !ask notes {
        :required false
        :multiline true
        What do you notice? Leave this blank if you prefer.
    }
}
without = !form {
    :title "Return to the same scene"
    !show {
        **Your scene:** {{situation}}

        **Your thought:** {{thought}}

        **Question 4: Who would you be without that thought?**

        Imagine this moment without this particular interpretation. Keep the event and relevant facts in place. You do not have to feel calm, approve of what happened, or make the thought disappear. If this is difficult to imagine, you can simply record that.
    }
    !ask notes {
        :required false
        :multiline true
        What, if anything, do you notice about your experience or possible response?
    }
}

!choose turnaround_route {
    Would you like to explore turnarounds of this thought?

    A turnaround reverses its direction: toward the opposite, toward yourself, or toward the other person. Explore each only where the words fit. The next page gives an example for each direction. You write your own versions; no system generates or verifies them.

    - explore: "Explore possible turnarounds."
    - skip: "Leave turnarounds for now and reflect on what I noticed."
}
?match turnaround_route {
    :case explore -> turnarounds
    :else -> skip_turnarounds
}

turnarounds:
opposite = !form {
    :title "A possible opposite"
    !show {
        **Original thought:** {{thought}}

        For example, “Maya doesn't respect my time” could become “Maya respects my time.” This is a possibility to examine, not a conclusion.

        Katie's instructions invite three specific examples for a turnaround where possible. Here all fields are optional: keep only observations that fit the situation. You do not have to produce three examples or make the opposite true.
    }
    !ask wording {
        :required false
        :multiline true
        What is a possible opposite of your statement? Leave blank if no useful wording occurs to you.
    }
    !ask examples {
        :required false
        :multiline true
        Are there up to three specific examples supporting that possibility? Keep them distinct from guesses about someone's motives.
    }
    !ask limits {
        :required false
        :multiline true
        What facts, limits, or counterexamples should remain visible?
    }
}
self = !form {
    :title "A possible turnaround toward yourself"
    !show {
        **Original thought:** {{thought}}

        For example, “Maya doesn't respect my time” could become “I don't respect my time.” This might concern how you use your own time. It does not make you responsible for Maya's actions.

        Leave this direction blank if it feels inaccurate, confusing, or blaming. Recognizing something within your influence is different from causing someone else's behavior.
    }
    !ask wording {
        :required false
        :multiline true
        Is there a meaningful version directed toward yourself?
    }
    !ask examples {
        :required false
        :multiline true
        What specific observations, if any, support it? You may note up to three; do not manufacture examples.
    }
    !ask limits {
        :required false
        :multiline true
        What does this version leave out, and what is not your responsibility?
    }
}
other = !form {
    :title "A possible turnaround toward the other person"
    !show {
        **Original thought:** {{thought}}

        For example, “Maya doesn't respect my time” could become “I don't respect Maya's time.” Some statements do not have a useful version in this direction.

        Only consider your actual choices. No confession, apology, or contact with the other person is required.
    }
    !ask wording {
        :required false
        :multiline true
        Is there a meaningful version with the direction between you and the other person reversed?
    }
    !ask examples {
        :required false
        :multiline true
        What specific observations, if any, support it? Up to three are enough; leaving this blank is also valid.
    }
    !ask limits {
        :required false
        :multiline true
        Which facts or differences prevent this from becoming a false equivalence?
    }
}
!show {
    Your turnaround notes

    Possible opposite
    {{opposite.wording}}
    {{opposite.examples}}
    Limits: {{opposite.limits}}

    Toward yourself
    {{self.wording}}
    {{self.examples}}
    Limits: {{self.limits}}

    Toward the other person
    {{other.wording}}
    {{other.examples}}
    Limits: {{other.limits}}

    A supported detail is not the whole story. An unconvincing version can be set aside.
}
= turnaround_note "You explored possible turnarounds. Your notes remain above; none has been treated as a verified conclusion."
-> integration

skip_turnarounds:
= turnaround_note "You chose to leave turnarounds for now."
-> integration

integration:
closing = !form {
    :title "Notice what remains"
    !show {
        This closing reflection is a Patternverse addition. It is fine to leave with the same view, an unresolved question, or no next step.

        **Original thought:** {{thought}}
    }
    !ask noticed {
        :required false
        :multiline true
        Did anything change in how you understand the thought or your reaction? What remains uncertain?
    }
    !ask preserve {
        :required false
        :multiline true
        What facts, responsibilities, needs, or boundaries still matter?
    }
    !ask next {
        :required false
        :multiline true
        Is there a small response you want to consider, such as asking a question, making a request, keeping a boundary, resting, or doing nothing further today?
    }
}
!show {
    Your inquiry

    **Scene**
    {{situation}}

    **Original thought**
    {{thought}}

    **First answer**
    {{truth.label}}

    **Certainty answer**
    {{certainty_note}}

    **Experience while believing the thought**
    {{response.notes}}

    **Experience imagining the scene without it**
    {{without.notes}}

    **Turnarounds**
    {{turnaround_note}}

    **What you noticed**
    {{closing.noticed}}

    **What still matters**
    {{closing.preserve}}

    **Possible response**
    {{closing.next}}

    Your answers are observations, not a diagnosis or a verdict. No emotional change is required. Nothing has been sent, scheduled, or carried out for you. You can copy notes you want to keep or explicitly choose Save to workspace.
}
= outcome "reflected"
-> end

leave_practice:
!show {
    You chose to leave before beginning the inquiry. No conclusion is needed.
}
= outcome "left-before-inquiry"
-> end
