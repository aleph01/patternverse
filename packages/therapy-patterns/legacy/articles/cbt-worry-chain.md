---
id: cbt-worry-chain
type: pattern
title: 'Follow a worry chain'
summary: "An optional, bounded exploration of a manageable worry's feared consequences."
status: published
verses:
  - therapy
---

This optional CBT-inspired exercise asks what you fear might happen next, one question at a time. It is meant for a manageable everyday worry, not a traumatic event or a crisis. Following a worry chain can intensify distress; you can stop the loop or end the whole exercise at any point. There is no need to reach a final fear.

## How to use it

Choose a manageable worry, then answer only as far as feels useful. The pattern limits itself to ten follow-up questions. The wording of each follow-up question is generated from your previous answer, but the exercise does not interpret or diagnose you.

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.worry-chain). The standalone run is separate from chat and is not saved. In the desktop app its AI-written wording uses your selected local model offline. In the web app, the pattern instruction and relevant answer are sent to your selected OpenRouter model using Mira's zero-retention route. This route requires your own OpenRouter key and may incur charges.

## Scope

This is an original self-reflection adaptation, not a clinical protocol or a substitute for care. If the questions become overwhelming, stop. If you are in immediate danger, contact local emergency services or a trusted person.

## Executable Pattern Markdown

```text
:language 1
:title "CBT · Follow a worry chain"

!choose ready {
    This optional, scripted example asks about a worry's feared consequences. It can intensify worry and is not a full treatment protocol.
    Choose something manageable, and use Stop loop whenever you have had enough. There is no need to reach a core fear or finish all ten questions.
    - begin: "Try a manageable worry"
    - stop: "Not now"
}
?match ready {
    :case begin -> begin
    :else -> closing
}
begin:
!ask initial_worry {
    What are you afraid would happen?
}
?loop[10] worry = initial_worry {
    !ask next_worry {
        ~ Ask the user what the worst thing would be if {{worry}} happened. Keep the worry hypothetical and ask only this question, without interpretation or reassurance.
    }
    -> repeat next_worry
}
closing:
!show {
    Okay. Let's stop there.
}
-> end
```
