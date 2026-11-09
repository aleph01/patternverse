---
id: explore-an-internal-disagreement
type: practice
title: Explore an Internal Disagreement
summary: Give two perspectives a short written exchange, then notice what became clearer and what remains unresolved.
status: draft
tags:
  - parts-work
  - inner-conflict
verses:
  - therapy
implements:
  - internal-double-crux
duration_minutes: 15
attribution: "Original Patternverse educational adaptation of CFAR's Internal Double Crux. Uses a bounded exchange, optional questions, and an unresolved ending rather than requiring agreement."
---

Choose an ordinary, manageable disagreement within yourself. You will write both perspectives, with space to pause or leave questions unanswered. Allow about 10–15 minutes. This adaptation offers up to three exchanges and a closing reflection; you can leave the exchange earlier using Stop loop or end the practice at any time.

```patternverse-language
:language 1
:title "Explore an Internal Disagreement"
:output result

opening = !form {
  :title "Give both perspectives a fair hearing"
  !show {
Choose a small disagreement that feels manageable today. For example: you want to contribute to a project and also want to protect your free time. This exercise does not require you to choose a winner or feel resolved.

Name each perspective in words it could recognize. If one name sounds contemptuous, revise it. Either perspective can speak first; give the more urgent one the first turn if that fits. You can skip any question.
  }
  situation = !ask [optional] {
What specific choice or recurring situation brings up the disagreement?
  }
  first = !ask [optional] {
What is a fair name for the perspective that will speak first?
  }
  second = !ask [optional] {
What is a fair name for the other perspective?
  }
  concern = !ask [optional] {
Speak from the first perspective using “I.” What is one concern the other perspective seems to miss? A fragment, image description, or uncertainty is welcome.
  }
}

!show {
You can explore up to three exchanges. Use Stop loop whenever you want to move to the closing reflection. Reaching the end of the exchanges does not mean the conflict is resolved.

An acknowledgment can be small and specific. Do not invent agreement to move forward. If you cannot find anything to acknowledge, leave it blank or describe what makes acknowledgment difficult. Quietness, uncertainty, and concerns that are hard to express deserve room too.
}

?loop[3] previous = {acknowledgment: "", concern: opening.concern} {
  second_turn = !form {
    :title "Hear the second perspective"
    !show {
Situation: {{opening.situation}}

First perspective: {{opening.first}}

Second perspective: {{opening.second}}

What the first perspective acknowledged (blank on the opening turn):

{{previous.acknowledgment}}

The first perspective's latest concern:

{{previous.concern}}

Take a moment to speak from the second perspective. Check whether the words fit the experience rather than merely sounding reasonable.
    }
    acknowledgment = !ask [optional] {
From the second perspective, what seems true or understandable in that concern? If nothing does yet, record that or leave this blank.
    }
    concern = !ask [optional] {
Still speaking from the second perspective, what is one concern you want the first perspective to understand?
    }
  }
  first_turn = !form {
    :title "Return to the first perspective"
    !show {
First perspective: {{opening.first}}

Second perspective: {{opening.second}}

What the second perspective acknowledged:

{{second_turn.acknowledgment}}

The concern it added:

{{second_turn.concern}}

Return to the first perspective. Let this reply respond to what was actually said. There is no requirement to become more agreeable.
    }
    acknowledgment = !ask [optional] {
From the first perspective, what seems true or understandable in the second perspective's concern? If nothing does yet, record that or leave this blank.
    }
    concern = !ask [optional] {
Still speaking from the first perspective, what is one concern, clarification, or changed understanding to offer back?
    }
  }
  -> repeat first_turn
}

review = !form {
  :title "Step back from both perspectives"
  !show {
Leave the exchange and notice your surroundings for a moment. Agreement is optional. A concern that remains unclear or a genuine tradeoff can be part of an accurate ending.
  }
  learned = !ask [optional] {
What, if anything, became clearer? Did the original disagreement change shape?
  }
  unresolved = !ask [optional] {
What remains unresolved, difficult to express, or insufficiently heard? Was either perspective trying to produce a preferred answer?
  }
  reality = !ask [optional] {
What would need checking outside this conversation: actual time, energy, an agreement, another person's view, or something else?
  }
  next = !ask [optional] {
What would be a workable next response? It could be a small check, a boundary, rest, a decision with mixed feelings, or leaving the question open.
  }
}

result = {opening: opening, review: review}

!show {
Your disagreement

{{opening.situation}}

Perspectives

{{opening.first}}

{{opening.second}}

What became clearer

{{review.learned}}

What remains unresolved

{{review.unresolved}}

What needs checking

{{review.reality}}

Possible next response

{{review.next}}

You can keep the useful distinctions without treating this reflection as a final verdict. A change in feeling does not establish that the practical situation has changed.
}

-> end
```
