:language 1
:title "CBT · Map one moment"
:output outcome
= focus "We can look at one recent moment without deciding that your thoughts are wrong."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask situation {
    What happened in one specific, manageable moment? Start with what someone could have seen or heard.
}
!ask thought {
    In that moment, what meaning or prediction came to mind? Use your own words; uncertainty is welcome.
}
!ask feeling {
    What feeling did you notice? You may include a body sensation if that feels useful, or say you are unsure.
}
!ask response {
    What did you do, or feel pulled to do, next?
}
!ask consequence {
    What followed that response, as far as you could tell?
}
!show {
    Here is the sequence you described, not an explanation imposed on it:

    Event: {{situation}}
    Meaning or prediction: {{thought}}
    Feeling: {{feeling}}
    Response: {{response}}
    What followed: {{consequence}}
}
!ask next {
    What, if anything, would you like to understand about this sequence? You can correct the wording or leave it here.
}
= outcome "reflected"
-> end
support:
!show {
    Let us stop the exercise. If you or someone else is in immediate danger, contact local emergency services now. If you can, reach a trusted person or qualified crisis support. Mira cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish an exercise.
}
= outcome "declined"
-> end
