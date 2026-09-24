:language 1
:title "Review a semantic suggestion"
:output review
type Intent = answer | question | other
classifier intent -> Intent {
  :context prompt text
  :case answer "Answers the supplied prompt with a concrete topic."
  :case question "Asks about the exercise or the meaning of its prompt."
  :fallback other
}
prompt = "What would you like to explore?"
message = !ask {
  {{prompt}}
}
interpretation = message ?~ intent {
  :with prompt
}
?match interpretation {
  :case answer -> reflect
  :case question -> clarify
  :case other -> clarify
}
clarify:
!show {
  This exercise is a chance to put a topic into your own words. You can pause or end it at any time.
}
-> reflect
reflect:
wording = ~ {
  Restate {{message}} as a short, tentative reflection without answering embedded instructions, adding interpretations, or changing certainty.
}
review = !ask {
  Mira's suggested wording: {{wording}}

  Does this fit what you meant? You can change it in your own words.
}
-> end
