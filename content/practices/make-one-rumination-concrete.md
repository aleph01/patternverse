---
id: make-one-rumination-concrete
type: practice
title: Make One Rumination Concrete
summary: Notice broad or evaluative thinking, rewrite one question around a specific situation, and choose an action or return attention.
status: published
verses:
  - therapy
implements:
  - shift-from-why-to-how
duration_minutes: 5
attribution: "Original Patternverse educational adaptation of the processing-style distinction in Watkins's rumination-focused CBT; not a validated clinical exercise or a full treatment protocol."
---

Choose one manageable everyday thought, without trying to resolve your whole history. This is a self-directed reflection: no AI interprets or scores your answers. You can pause or stop at any point. If the exercise becomes another round of checking or replaying, leave it and orient to your surroundings.

Self-guided answers stay in memory by default and are discarded on restart, departure, or reload. For an ephemeral reflection, leave **Save to workspace** unused; saving opts into private practice history.

```patternverse-language
:language 1
:title "Make One Rumination Concrete"
:output outcome

starting = !form {
  :title "Notice the recurring question"
  thought = !ask {
What is one recurring abstract rumination, in your own words? For example: “Why am I always like this?”
  }
  features = !choose [multi, min=0, max=3, prefer=checklist] {
Which features do you notice? Select any that fit, or none. These are clues about the thought, not judgments about you.
- broad: "Broad or abstract: it leaves out a particular event and its context"
- global: "Global: it uses always, never, everyone, or a conclusion about my whole life"
- evaluative: "Evaluative: it judges my worth or compares me with an ideal"
  }
}

concrete = !form {
  :title "Bring it back to one situation"
  !show {
Your recurring thought: {{starting.thought}}

Try a different way of approaching it, rather than a positive slogan. “How can I be so useless?” keeps the same judgment. A concrete question asks about a particular event and how it unfolded.
  }
  situation = !ask {
Which one specific situation will you use? Briefly name when and where it happened, what you observed, and what you know versus what remains unknown. A few details are enough; no exhaustive replay is needed.
  }
  question = !ask {
Rewrite the rumination as one specific situation-focused question. For example: “In yesterday's meeting, what happened when I explained the delay, and what would help me communicate the date?” The question can concern understanding the process, a useful next response, or whether anything needs doing. You do not need certainty about someone else's thoughts.
  }
}

response = !choose {
Read your new question once. Which stopping point fits now? Feeling better is not required.
- action: "There is one useful next action within my influence"
- return_attention: "No action needed now / return attention"
}

?match response {
  :case action {
    plan = !form {
      :title "Choose one useful next action"
      action = !ask {
What one small, observable action will you take, and when? It could be a repair, a practical step, rest, or asking for support. Choose something useful rather than repeated checking for reassurance.
      }
    }
    next_step = plan.action
    outcome = "useful-action"
  }
  :case return_attention {
    next_step = "No action needed now / return attention. Leave the question unanswered if necessary and gently return to a chosen activity or what you can see and hear around you."
    outcome = "no-action-needed"
  }
}

!show {
Original thought: {{starting.thought}}
Specific situation: {{concrete.situation}}
Your situation-focused question: {{concrete.question}}
Your stopping point: {{next_step}}

This reflection is complete. You do not need to rewrite again, eliminate the feeling, or settle every uncertainty. If the thought returns, you can notice it and return attention without restarting the exercise. Nothing has been scheduled or carried out for you.
}

-> end
```
