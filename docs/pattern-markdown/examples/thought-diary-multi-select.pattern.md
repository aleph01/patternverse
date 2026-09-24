:language 1
:title "Thought diary — optional thinking-style checklist"
:output outcome

!choose ready {
    Would you like to reflect on one manageable moment? You can pause or stop at any point.
    - begin: "Explore a moment"
    - stop: "Not now"
}
?match ready {
    :case begin -> explore
    :else -> declined
}
explore:
!ask event {
    What happened, as far as you could observe?
}
!ask thought {
    What went through your mind at that moment?
}
!ask consequence {
    What did you feel and do next?
}
!choose thinking_styles [multi, min=0, prefer=checklist] {
    Which descriptions, if any, seem to fit? These are tentative descriptions, not a diagnosis.
    You can leave all unchecked and continue without a label.

    - all_or_nothing: "All-or-nothing thinking"
    - mind_reading: "Assuming what someone else thinks"
    - discounting: "Discounting something positive"
}
?branch {
    :when count(thinking_styles) == 0 -> no_labels
    :else -> review
}
no_labels:
!show {
    We can leave the labels aside. Your account does not need one.
}
-> review
review:
!show {
    Event: {{event}}
    Thought: {{thought}}
    Your response: {{consequence}}
    Your tentative selections: {{thinking_styles}}
}
= outcome "reviewed"
-> end
declined:
!show {
    We can leave this here.
}
= outcome "declined"
-> end
