---
id: find-the-shades-of-grey
type: practice
title: Find the Shades of Grey
summary: Examine one all-or-nothing judgment using your own scale, concrete evidence, and an optional revised description.
status: published
verses:
  - therapy
implements:
  - cognitive-continuum
duration_minutes: 12
attribution: 'Original Patternverse educational adaptation of the CBT cognitive continuum technique; not an official clinical worksheet or a validated treatment.'
---

Choose one manageable everyday situation. This self-guided practice takes about 10–15 minutes and uses no AI. You define the scale and judge the evidence. You may pause or end at any point; a higher score or a better feeling is not required.

```patternverse-language
:language 1
:title "Find the Shades of Grey"
:output outcome

!show {
  Begin with a bounded event such as a presentation, a draft, or one missed commitment. A number here describes one quality in that situation; it does not measure your worth.

  Keep the event, relevant consequences, and any boundaries in view throughout. The aim is to notice distinctions your original judgment may have missed. You can leave with the same assessment or with something unresolved.
}

scene = !form {
  :title "Name one judgment"
  situation = !ask {
    :placeholder "I lost my place during a presentation yesterday."
    What happened in one particular situation? Describe what you observed.
  }
  thought = !ask {
    :placeholder "If I stumble, the whole presentation is a failure."
    What all-or-nothing thought came up? Use your own words.
  }
  quality = !ask {
    :placeholder "How clearly this presentation communicated its main message."
    What one quality of this event or behaviour can vary by degree? Make it specific enough to examine through observations.
  }
}

anchors = !form {
  :title "Give the range a meaning"
  !show {
    Your quality: {{scene.quality}}

    Describe less and more of the same quality. Keep required standards separate: missing a safety check or breaking a commitment can still matter at any position. Use situations and behaviours rather than rating your value as a person.
  }
  low = !ask {
    What would 0 look like for this quality?
  }
  high = !ask {
    What would 100 look like? Define an example rather than requiring a flawless person or universal approval.
  }
  middle = !ask {
    What would a middle example, around 50, look like? Make it meaningfully different from both ends.
  }
  lower = !ask [optional] {
    What might a position around 25 look like?
  }
  upper = !ask [optional] {
    What might a position around 75 look like?
  }
}

placement = !choose {
  Quality: {{scene.quality}}

  0: {{anchors.low}}
  Around 25: {{anchors.lower}}
  Around 50: {{anchors.middle}}
  Around 75: {{anchors.upper}}
  100: {{anchors.high}}

  Would an approximate initial position be useful? It is a placement on your defined scale, not a percentage of certainty that the original thought is true.

  - rate: "Record an approximate initial position."
  - open: "Leave the position open and explore the evidence."
}

?match placement {
  :case rate {
    initial = !rate 0..100 {
      :low "Your 0 anchor"
      :high "Your 100 anchor"
      Where would you initially place this situation on the quality you defined? An estimate is enough.
    }
    initial_note = [initial]
    initial_status = "Approximate position out of 100"
  }
  :case open {
    initial_note = []:number
    initial_status = "Initial placement left open."
  }
}

evidence = !form {
  :title "Consider the whole event"
  !show {
    Situation: {{scene.situation}}

    Original thought: {{scene.thought}}

    Quality: {{scene.quality}}

    Initial position: {{initial_status}} {{initial_note}}

    Use observations, examples, or actual feedback. A feeling of embarrassment is real, but does not by itself tell you what others understood or thought. No need to manufacture positive evidence.
  }
  concern = !ask {
    What concrete observations support your concern or suggest a lower placement? If none are clear, say so.
  }
  overlooked = !ask {
    What observations suggest a higher placement or a distinction the original thought missed? If none are clear, say so.
  }
  unknown = !ask [optional] {
    What is unknown, mixed, or outside this scale? For example, another person's private opinion.
  }
  preserve = !ask [optional] {
    What consequence, responsibility, standard, or boundary still needs to be acknowledged?
  }
}

review = !choose {
  Review the same anchors and evidence once, without moving the criteria to obtain a preferred score.

  Quality: {{scene.quality}}

  0: {{anchors.low}}
  Around 25: {{anchors.lower}}
  Around 50: {{anchors.middle}}
  Around 75: {{anchors.upper}}
  100: {{anchors.high}}

  Supporting the concern: {{evidence.concern}}
  Other relevant observations: {{evidence.overlooked}}
  Unknown or outside the scale: {{evidence.unknown}}
  What still matters: {{evidence.preserve}}

  How would you like to finish the assessment?

  - rate: "Record a position based on this evidence."
  - same: "Keep my initial position, including leaving it open."
  - open: "Leave the final position unresolved."
}

?match review {
  :case rate {
    revised = !rate 0..100 {
      :low "Your 0 anchor"
      :high "Your 100 anchor"
      Where does the evidence place this situation on the same scale? A lower, unchanged, or higher position is allowed.
    }
    final_note = [revised]
    final_status = "Approximate position out of 100"
  }
  :case same {
    final_note = initial_note
    final_status = initial_status
  }
  :case open {
    final_note = []:number
    final_status = "Final placement left unresolved."
  }
}

closing = !form {
  :title "Put the distinctions into words"
  !show {
    Original thought: {{scene.thought}}

    Initial position: {{initial_status}} {{initial_note}}
    Final position: {{final_status}} {{final_note}}

    An accurate description can acknowledge a strength and a mistake, or a real problem that needs attention. You do not have to replace the original thought or feel differently.
  }
  description = !ask [optional] {
    What description now fits the evidence? Include the limits or uncertainties that matter. You may keep the original wording or leave this blank.
  }
  noticed = !ask [optional] {
    Did you notice a useful distinction, even if your rating or feelings stayed the same?
  }
  next = !ask [optional] {
    Is there one small response you want to consider, such as clarifying a point, repairing a mistake, or leaving this for now?
  }
}

!show {
  Your continuum reflection

  Situation: {{scene.situation}}
  Original thought: {{scene.thought}}
  Quality assessed: {{scene.quality}}

  Your scale
  0: {{anchors.low}}
  Around 25: {{anchors.lower}}
  Around 50: {{anchors.middle}}
  Around 75: {{anchors.upper}}
  100: {{anchors.high}}

  Initial placement: {{initial_status}} {{initial_note}}
  Final placement: {{final_status}} {{final_note}}

  Evidence supporting the concern: {{evidence.concern}}
  Other relevant observations: {{evidence.overlooked}}
  Unknown or outside the scale: {{evidence.unknown}}
  Responsibilities and boundaries: {{evidence.preserve}}

  Your description: {{closing.description}}
  What you noticed: {{closing.noticed}}
  Possible response: {{closing.next}}

  These are your observations, not a diagnosis or a verified score. One thoughtful pass is enough for now. You can use the practice controls to save notes you want to keep.
}

outcome = "reflected"
-> end
```
