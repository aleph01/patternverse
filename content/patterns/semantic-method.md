---
id: semantic-method
type: pattern
title: Semantic Method
summary: Rephrase self-directed shoulds into believable wishes, concerns, or responsibilities.
status: published
aliases:
  - Rephrase a Should
verses:
  - therapy
---

“I should have done more.” The sentence arrives after an unfinished afternoon, a missed opportunity, or another day with less energy than expected. It sounds like a useful reminder, but it can leave you with little to do except accuse yourself. What mattered, what prevented it, and what might help next remain unclear.

The Semantic Method offers a small intervention: change the wording of the thought so it expresses your concern more accurately and less harshly. David Burns describes replacing self-scolding demands with gentler statements of preference. A wish to improve can then become something specific enough to work with. [1]

## From demand to meaning

A self-directed “should” can contain several different messages. “I should have called” might mean that you wanted contact, that you broke a promise, or that you fear being a bad friend. Those meanings call for different responses. One may need an invitation, another an apology, and another a closer look at how you judge yourself.

Reformulating the sentence makes those differences visible. “I wanted to call because our friendship matters to me” names a value. “I promised to call and forgot; I want to acknowledge that” names a responsibility. Both are more informative than repeatedly telling yourself that you should have behaved differently.

Possible openings include “I would like to…,” “I wish I had…,” “It would have helped to…,” and “I regret…”. These are starting points. The useful wording is whatever you can sincerely endorse.

## What the wording can change

The rationale is that the way a thought is expressed contributes to its emotional meaning. “I must never make mistakes” presents an impossible condition for being acceptable. “I want to handle this carefully, and I can correct mistakes when they happen” leaves room for both care and fallibility. Changing the sentence may loosen the demand enough to make a practical response possible.

This is a modest intervention. Saying a kinder sentence does not guarantee that you believe it. Sometimes the revised wording reveals a deeper conviction: “If I do less, I am worth less.” That conviction may need further exploration. Burns describes the Semantic Method as one tool within a broader therapeutic approach, rather than a complete treatment by itself. [1]

## When capacity falls short of intention

Imagine someone recovering from illness who planned to cook, answer messages, and work on a personal project. By evening, they have managed a meal and a shower. Their thought is, “I should have achieved more. I wasted the day.”

An initial revision might be, “I would have liked to achieve more.” It sounds gentler, but still leaves the actual circumstances out. A more complete version could be: “I wanted to work on my project, and I’m disappointed that I couldn’t. My energy was limited today. I can make tomorrow’s plan smaller.”

The disappointment can remain. The revised sentence gives it a specific object and includes information that the accusation omitted. It also allows a smaller plan to count as an adjustment to capacity.

## When there was a real mistake

Suppose you put off replying to an invitation until the deadline passes. “I shouldn’t have done that” may be a reasonable expression of regret, but repeating it does not tell you how to respond. “I wish I had answered sooner. I left my friend uncertain, and I can apologize for the delay” makes the responsibility concrete.

You do not need to add “I did my best” if you do not believe it. An honest revision might acknowledge avoidance: “I delayed because I felt awkward about saying no. Next time, I want to give a brief answer sooner.” Accuracy gives the new sentence credibility.

## When the feeling itself becomes the target

The same approach can apply to “I shouldn’t be anxious” or “I should be over this by now.” These thoughts add an expectation about how quickly emotions ought to change. An alternative might be, “I wish this felt easier. I’m still anxious, and I can decide what support or preparation would help.”

The sentence does not establish whether a fear is realistic. It simply makes room to examine the difficulty without also treating the existence of the feeling as a personal failure.

## Keep the revision believable

A common mistake is exchanging vocabulary while retaining the same verdict: “I would prefer to do everything perfectly, and I’m worthless if I don’t.” Another is creating a new rule about performing the exercise correctly. Noticing another “should” is an opportunity to understand the thought, not another failure.

Burns explicitly notes that the aim is not to eliminate the word “should” from speech. Context and meaning matter. Ethical responsibilities and useful advice do not become invalid because they contain that word. [2]

If a gentler formulation feels dangerous because it seems to permit laziness or irresponsibility, explore that concern. A cost-benefit analysis can examine what the strict rule promises; the Double-Standard Technique can reveal whether you impose a harsher standard on yourself than on someone in the same circumstances. These are neighboring approaches, rather than additional steps required every time.

## Sources and scope

1. David D. Burns, [Should Statements: Is there a moral / ethical dimension?](https://feelinggood.com/2017/01/05/should-statements-is-there-a-moral-ethical-dimension/), January 5, 2017.

2. David D. Burns and Rhonda Barovsky, [Episode 216: Cool Questions about Should Statements!](https://feelinggood.libsyn.com/216-cool-questions-about-should-statements).

These sources describe the technique; they do not establish its standalone efficacy. The examples and accompanying practice are original educational adaptations, not a verbatim Burns protocol or a validated treatment.

```patternverse-language
:language 1
:title "Rephrase a Should"

step_1 = !form {
  :title "Name the thought"
  !show {
A short reflection, about 3–5 minutes. Choose one everyday self-directed should, must, or ought. You can pause or stop at any point.
  }
  !ask thought {
    :required true
    :multiline true
What are you telling yourself you should have done, should do, or should feel?
  }
}

step_2 = !form {
  :title "Keep what matters"
  !show {
Look for the wish, concern, or responsibility within the thought. Include relevant circumstances, such as your health, available time, or what you knew then.
  }
  !ask meaning {
    :required true
    :multiline true
What matters to you here, and what circumstances does the thought leave out?
  }
}

step_3 = !form {
  :title "Rephrase it"
  !show {
Try beginning with “I would like to…”, “I wish I had…”, or “I regret…”. Keep any real responsibility. Use wording you believe; you do not need to excuse everything.

For example: “I wish I had replied sooner. I can acknowledge the delay and answer now.”
  }
  !ask revision {
    :required true
    :multiline true
How could you express the thought more accurately and less harshly?
  }
}

step_4 = !form {
  :title "Notice the difference"
  !show {
Read both versions. Notice any difference in pressure, guilt, or clarity; no change is also useful information. If the new version feels untrue, consider what it misses.
  }
  !ask reflection {
    :required true
    :multiline true
What changes, if anything, when you read the revised version? Adjust it here if needed.
  }
  !show {
You may choose a small next step, a repair, or rest. You do not have to feel better or take action to complete this reflection.
  }
}

-> end
```
