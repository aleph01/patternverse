---
id: notice-an-urge-without-following-it
type: practice
title: Notice an Urge Without Following It
summary: Observe a manageable impulse without requiring it to disappear, then choose a response that fits your intentions.
status: published
tags:
  - mindfulness
  - cravings
  - response-choice
verses:
  - therapy
implements:
  - urge-surfing
duration_minutes: 5
attribution: "Original Patternverse educational reflection informed by VA urge-surfing guidance; not a treatment or withdrawal protocol."
---

Use a manageable impulse that is already present, such as an urge to check your phone. There is no need to provoke a craving or perform the behavior. You can keep your eyes open, stop, or turn attention toward your surroundings at any time. For substance-related cravings, this exercise can accompany an existing care plan and does not replace it.

```patternverse-language
:language 1
:title "Notice an Urge Without Following It"
:output result

starting = !form {
  :title "Notice what is already here"
  impulse = !ask {
What manageable impulse do you notice, and what response would fit your intentions? If nothing suitable is present, you can stop here without creating an urge.
  }
  sensation = !ask {
If comfortable, notice one bodily aspect of the impulse. How would you describe it plainly: its location, pressure, warmth, movement, or another quality? No particular sensation needs to appear.
  }
}

!show {
Let the impulse be present briefly without acting it out or demanding that it vanish. Keep breathing naturally. If useful, feel your feet on the floor. Notice any changes in the experience, including thoughts that it needs an immediate response.

There is no required waiting time. If inward attention becomes uncomfortable, look around, feel the support beneath you, or stop. Moving away from a trigger and using support are also available choices.
}

observation = !ask {
After a brief pause, what do you notice? The impulse may have changed, remained similar, or returned. What is different, if anything, between noticing it and immediately following it?
}

response = !choose {
Which response fits now, whether or not the urge remains?
- resume: "Return to an activity I have chosen"
- environment: "Change my surroundings or move away from a trigger"
- support: "Use my support or care plan"
- stop: "Stop this exercise and orient to my surroundings"
}

action = !ask {
What is one concrete next action for the response you chose? You do not need the urge to disappear before taking it.
}

result = {starting: starting, observation: observation, response: response, action: action}

!show {
Impulse and intended response: {{starting.impulse}}
What you noticed in the body: {{starting.sensation}}
What happened during the pause: {{observation}}
Your chosen response: {{response}}
Concrete next action: {{action}}

The aim was to notice an impulse and choose a response, without requiring the impulse to disappear. You can leave this here. This reflection does not assess addiction, provide detoxification guidance, or contact support on your behalf.
}

-> end
```
