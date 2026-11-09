---
id: set-a-good-enough-stopping-rule
type: practice
title: Set a Good Enough Stopping Rule
summary: Define an acceptance standard and use it to decide whether a candidate deserves further search.
status: published
tags:
  - decision-making
  - stopping-rules
  - reflection
verses:
  - decision-making
implements:
  - satisficing
duration_minutes: 10
attribution: "Original Patternverse reflection inspired by Herbert A. Simon's satisficing framework; not an exercise reproduced from Simon's work."
---

Choose one bounded decision with identifiable requirements. You can prepare the rule before searching or examine a candidate you have already found. This reflection records your assessment; it does not verify a candidate's claims or choose on your behalf.

```patternverse-language
:language 1
:title "Set a Good Enough Stopping Rule"
:output result

standard = !form {
  :title "Define an acceptable choice"
  decision = !ask {
What are you choosing, and what must this choice make possible?
  }
  requirements = !ask {
What few conditions must an acceptable option meet? Make each specific enough to check.
  }
  preferences = !ask {
Which desirable extras can remain optional without defeating the purpose?
  }
}

search = !form {
  :title "Plan a bounded search"
  evidence = !ask {
Where will you look, and what information must you check before treating an option as acceptable?
  }
  fallback = !ask {
When will you reconsider the search if nothing meets the standard? What would justify changing a requirement?
  }
}

candidate = !form {
  :title "Examine one option"
  option = !ask {
Which candidate are you examining? If you have not found one yet, say so.
  }
  assessment = !ask {
Which requirements have you verified? Which remain unmet or unknown?
  }
  reopen = !ask {
If you accept this option, what material new information would justify revisiting the choice?
  }
}

next_move = !choose {
What follows from your assessment?
- accept: "The requirements are verified; I can stop searching"
- continue: "A requirement is unmet or unknown; continue or check it"
- revise: "New information justifies reviewing the standard or search"
}

result = {standard: standard, search: search, candidate: candidate, next_move: next_move}

!show {
Decision: {{standard.decision}}
Acceptance standard: {{standard.requirements}}
Optional extras: {{standard.preferences}}
Candidate: {{candidate.option}}
Verified, unmet, or unknown: {{candidate.assessment}}
Your next move: {{next_move}}
Review if no option qualifies: {{search.fallback}}
Reason to reopen after acceptance: {{candidate.reopen}}

This records your assessment. No option is booked, bought, or checked by this reflection.
}

-> end
```
