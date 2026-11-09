---
id: explore-an-oblique-route
type: practice
title: Explore an Oblique Route
summary: Find a meaningful activity connected to a broad aspiration and choose what to learn from it.
status: published
tags:
  - goals
  - life-patterns
  - reflection
verses:
  - decision-making
implements:
  - obliquity
duration_minutes: 10
attribution: "Original Patternverse reflection inspired by John Kay's account of obliquity; not an official exercise from the book."
---

Use this reflection for a broad aspiration such as belonging, satisfying work, or a richer creative life. Choose something you can explore without requiring another person to respond in a particular way. Completing the reflection creates a plan; experience will come from the activity itself.

```patternverse-language
:language 1
:title "Explore an Oblique Route"
:output result

direction = !form {
  :title "Name the aspiration"
  aspiration = !ask {
What larger outcome matters to you, and what might it include?
  }
  current_approach = !ask {
How have you been pursuing it directly? What seems useful, unclear, or burdensome about that approach?
  }
  direct_need = !ask {
Is there a concrete requirement, conversation, or deadline that needs direct attention? Keep it visible alongside this exploration.
  }
}

activity = !form {
  :title "Find something worth doing"
  possibility = !ask {
What activity connected to this aspiration could be worthwhile even if the larger outcome takes time or changes?
  }
  connection = !ask {
How could participation create relevant opportunities, develop an ability, or reveal what you value? What remains outside your control?
  }
  next_step = !ask {
What small next step fits your time and responsibilities? Who else would need to agree?
  }
}

review = !form {
  :title "Keep learning possible"
  observations = !ask {
What would you notice about the activity itself, your experience, and other people's willing participation?
  }
  revisit = !ask {
When will you look back, and what might lead you to continue, change the activity, or stop? No reminder is scheduled by this reflection.
  }
}

result = {direction: direction, activity: activity, review: review}

!show {
Aspiration: {{direction.aspiration}}
Direct attention still needed: {{direction.direct_need}}
Activity to explore: {{activity.possibility}}
Next step: {{activity.next_step}}
What to observe: {{review.observations}}
When to reconsider: {{review.revisit}}
}

-> end
```
