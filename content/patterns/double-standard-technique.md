---
id: double-standard-technique
type: pattern
title: Double Standard Technique
summary: Offer yourself the same fairness you would offer someone you care about.
status: published
verses:
  - therapy
---

You have spent much of the day resting, and the things you hoped to do remain unfinished. “I’m wasting my life,” you think. Yet if a friend were ill and disappointed by how little they could manage, you might see their situation quite differently. You would notice their exhaustion, their wish to contribute, and the effort it takes to get through the day. Those facts become strangely easy to overlook when the person struggling is you.


The Double Standard Technique, taught and adapted by psychiatrist David D. Burns, brings this discrepancy into view. You imagine a dear friend facing the same circumstances, respond honestly to that person, and consider whether your response also applies to you. Burns credits an early demonstration by psychiatrist Maxie Maultsby as an influence on his approach.


## Keep the circumstances the same


The comparison works best when the imagined friend has the same difficulties, choices, and limitations. If you quietly give them a more understandable history or greater suffering, you have changed the case. In Burns’s role-play version, a therapist takes the part of this closely matched friend. The person then supplies the compassionate response themselves and examines whether they actually believe it. A written exercise can use the same perspective shift.


One way to understand the exercise is that another person’s situation can make context easier to see. An unfinished task becomes an unfinished task, rather than a verdict on an entire life. The useful response is specific enough to be credible: what happened, what it means, and what it does not establish.


## When illness changes what is possible


Imagine someone recovering from an operation who thinks, “I only answered one message today. I’m useless.” Their first response to a friend might be, “You’re doing amazingly!” But they do not really believe that, and the praise misses their disappointment. A more grounded response could be: “I understand why you wish you could do more. Your capacity is limited right now. Answering one message still counts, and you don’t have to prove your value by getting things done.”


Turning this into the first person might produce: “I’m disappointed by how little I can do. That describes my current capacity; it doesn’t establish that I’m useless.” The disappointment may remain. The shift is that it no longer has to carry a judgment about the whole person.


## Fairness can include responsibility


Suppose you miss a deadline and inconvenience a colleague. “I’m completely unreliable” might be your immediate conclusion. To a friend, you could say: “You missed something important. Let them know, acknowledge the impact, and make a realistic new agreement. This deserves attention, but one missed deadline doesn’t tell the whole story of how you work.”


The same response gives you something concrete to do. It allows regret and repair without turning the mistake into a permanent identity. If a problem keeps recurring, fairness also means recognizing the pattern and changing the conditions that sustain it.


## When the kind response does not land


“I’d say that to a friend, but I wouldn’t mean it” is useful information. Revise the response until it contains something you believe. “Everything will be fine” may be impossible to defend; “I cannot know the outcome yet” may be accurate. If your objection is “The rules are different for me,” explore what makes them different and whether that difference actually supports the harsher judgment.


This approach is most relevant when you can offer others understanding that you withhold from yourself. If you judge everyone equally harshly, the comparison may reveal little. If the exercise becomes another argument you must win, pause. A lack of immediate relief does not mean you have failed.


This article and practice are an original educational adaptation. The linked demonstrations explain the technique; they do not establish the effectiveness of this particular self-guided exercise. Useful neighboring approaches include examining the evidence, identifying cognitive distortions, and planning a concrete repair when an action has caused harm.

## Sources and attribution

1. David D. Burns, [Feeling Good Podcast 084: Paradoxical Double-Standard Technique](https://feelinggood.com/2018/04/16/084-paradoxical-double-standard-technique/) (2018). Includes Burns’s account of learning from Maultsby and adapting the method, including keeping the imagined friend’s circumstances the same and checking that the compassionate response is honestly believed.
2. Feeling Good Institute, [Double Standard Technique](https://feelinggoodinstitute.com/technique-video/the-feeling-good-therapist--double-standard-technique), demonstrated by Shiveta Gandotra and Richard Lam.

The examples and practice wording are original educational adaptations, not quotations or an official Burns worksheet. These demonstrations do not establish the effectiveness of this particular self-guided exercise.

## Related patterns

[[cbt-thought-record]] helps examine the evidence behind a judgment. [[cbt-thinking-patterns]] helps notice when one event becomes a global label. [[cbt-problem-solving]] helps plan a concrete repair when something needs attention.

## Practice — Use one fair standard

Allow 5–10 minutes. You can skip any question or stop at any point. The optional belief ratings are observations, not a score. No change is a valid result.

```patternverse-language
:language 1
:title "Use one fair standard"
:output outcome
judgment = !form {
    :title "Name the judgment"
    !show {
        Choose one specific situation where you are judging yourself more harshly than you would judge someone you care about. You can skip any question or stop at any time. No AI is used.
    }
    !ask situation {
        :required false
        :multiline true
        :placeholder "For example: I needed to rest and left several tasks unfinished."
        What happened? Describe one specific situation.
    }
    !ask thought {
        :required false
        :multiline true
        :placeholder "Write the actual words of the self-critical thought."
        What are you saying about yourself?
    }
    !ask before {
        :required false
        :multiline false
        :placeholder "A number from 0 to 100, or leave blank."
        How much do you believe that thought? (0–100)
    }
}
friend = !form {
    :title "Give a friend the same circumstances"
    !show {
        Imagine a person you care about with the same history, resources, limitations, and actions. They tell you what happened and say this about themselves:

        **Situation**

        {{judgment.situation}}

        **Self-critical thought**

        {{judgment.thought}}

        If you left either question blank, imagine your friend expressing the same self-judgment in the situation you chose.
    }
    !ask response {
        :required false
        :multiline true
        :placeholder "Speak directly to them using “you.” Acknowledge the difficulty and explain how you see it."
        What would you honestly say to them?
    }
}
credibility = !form {
    :title "Check that you mean it"
    !show {
        Your response to a friend:

        {{friend.response}}

        Keep the parts you believe. Include any real responsibility without condemning the whole person.
    }
    !ask check {
        :required false
        :multiline true
        Why is your response true? What would you change if you were being polite rather than honest?
    }
    !ask objection {
        :required false
        :multiline true
        :placeholder "If a different rule appears, ask what justifies it. You do not have to resolve every objection."
        Is there a reason you think this would apply to them but not to you?
    }
}
inclusion = !form {
    :title "Include yourself"
    !show {
        Use only what feels accurate. You can acknowledge pain, uncertainty, limitations, or a mistake.

        The original self-critical thought:

        {{judgment.thought}}

        The ratings are observations, not a score. No change is a valid result.
    }
    !ask fair {
        :required false
        :multiline true
        Write a response to yourself, using “I.”
    }
    !ask after {
        :required false
        :multiline false
        :placeholder "A number from 0 to 100, or leave blank."
        How much do you believe the original self-critical thought now? (0–100)
    }
    !ask next {
        :required false
        :multiline true
        :placeholder "Perhaps rest, acknowledge an effort, repair a mistake, ask for help, or take no further action today."
        What would fit this fairer response now?
    }
}
!show {
    Your reflection

    Situation

    {{judgment.situation}}

    Original self-critical thought

    {{judgment.thought}}

    Belief before (0–100)

    {{judgment.before}}

    Response to a friend

    {{friend.response}}

    What makes the response credible

    {{credibility.check}}

    Objection or different rule

    {{credibility.objection}}

    Fair response to myself

    {{inclusion.fair}}

    Belief after (0–100)

    {{inclusion.after}}

    Possible next step

    {{inclusion.next}}

    Keep the wording that feels true. You do not have to force yourself to feel better. Copy anything you want to keep into a notebook or document. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
```
