:language 1
:title "Thought diary — single-selection capability fixture"
:output outcome

!choose ready {
    :option begin "Explore one manageable moment"
    :option stop "Not now"
    Would you like to try a brief reflection? You can pause or stop at any point.
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
!choose identify {
    :option explore "Look at possible thinking styles"
    :option skip "Leave the labels aside"
    Would it be useful to consider a possible thinking style? No label is required.
}
?match identify {
    :case explore -> identify_style
    :else -> skipped
}
identify_style:
!choose thinking_style {
    :option all_or_nothing "All-or-nothing thinking"
    :option mind_reading "Assuming what someone else thinks"
    :option none "None of these fits"
    :option unsure "I am not sure"
    Which description, if any, feels closest to your experience?
    This example accepts one answer, not a checklist. It is not a diagnosis.
}
!show {
    Event: {{event}}
    Thought: {{thought}}
    Your response: {{consequence}}
    Your tentative selection: {{thinking_style}}
}
= outcome "reviewed"
-> end
skipped:
!show {
    We can leave the labels aside. Your account does not need one.
}
= outcome "labels_skipped"
-> end
declined:
!show {
    We can leave this here.
}
= outcome "declined"
-> end
