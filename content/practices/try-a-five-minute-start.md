---
id: try-a-five-minute-start
type: practice
title: Try a Five-Minute Start
summary: Choose a concrete first action, try it for five minutes, and decide honestly whether to continue, stop, or adjust.
status: published
tags:
  - procrastination
  - motivation
  - bounded-experiments
verses:
  - decision-making
  - therapy
implements:
  - five-minute-technique
duration_minutes: 8
attribution: "Original Patternverse practice informed by the just-five-minutes technique described by the NHS and Centre for Clinical Interventions."
---

Choose an ordinary task that is feasible to approach briefly. The commitment is to a short trial, with permission to stop. The timer can be paused; you can move to the reflection early or end the practice whenever you need to.

```patternverse-language
:language 1
:title "Try a Five-Minute Start"
:output result

plan = !form {
  :title "Make a small, honest agreement"
  task = !ask {
Which task have you been putting off, and why does it matter to you?
  }
  action = !ask {
What concrete part can you actually work on for five minutes? Choose contact with the task rather than extra preparation unless preparation is the real obstacle.
  }
  expectation = !ask {
What do you expect starting to feel like? At the end you may stop, continue by choice, or adjust the approach.
  }
}

!show {
Start the timer when you are ready and try your chosen action. You do not have to feel motivated first. When the five minutes finish, use the next-step button to reflect. It is also available after starting if you need to end the trial early; pause the timer if you do.
}

trial = !timer {
  :duration 300
  :blocking false
  :sticky true
Try your chosen action for up to five minutes.
}

review = !form {
  :title "Use what the attempt revealed"
  experience = !ask {
What happened during the attempt? Did interest, effort, or difficulty differ from what you expected? If you did not start or stopped early, that is useful information too.
  }
  obstacle = !ask {
What would make the next step workable: more time, a smaller task, missing information, support, or rest?
  }
}

next_move = !choose {
What do you choose now?
- stop: "Stop here and respect the boundary"
- continue: "Choose another bounded period of work"
- adjust: "Change the task, get support, or reconsider the demand"
}

next_step = !ask {
What does your choice mean concretely? If continuing, choose a new endpoint; if stopping or adjusting, note anything you want to return to later.
}

result = {plan: plan, trial: trial, review: review, next_move: next_move, next_step: next_step}

!show {
Task: {{plan.task}}
Trial action: {{plan.action}}
What you expected: {{plan.expectation}}
What happened: {{review.experience}}
What would help: {{review.obstacle}}
Your choice: {{next_move}}
Next step or endpoint: {{next_step}}

Continuing is optional. What you learned from the attempt matters more than how much you finished. You can leave this here or return to your next step later.
}

-> end
```
