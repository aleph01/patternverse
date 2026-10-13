:language 1
:title "Thinking-pattern checklist"
:output outcome
= focus "Use thinking-pattern labels as hypotheses, not verdicts."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask step1 {
    Write one thought you want to examine.
}
!choose step2 [multi, min=0, prefer=checklist] {
    Which tentative labels might fit? Select none if unsure. Labels are not a diagnosis.
    - all-or-nothing: "All-or-nothing thinking"
    - generalizing: "Overgeneralizing"
    - mind-reading: "Mind-reading"
    - predicting: "Predicting without enough evidence"
    - discounting: "Disqualifying or discounting the positive"
    - should: "Rigid should rules"
    - emotional-reasoning: "Treating a feeling as proof"
}
!ask step3 {
    What in the wording suggests those possibilities? What might the labels miss?
}
!ask step4 {
    How could you restate the thought more precisely while respecting the real difficulty?
}
!show {
    Your reflection, in your own words:

    1. {{step1}}
    2. {{step2}}
    3. {{step3}}
    4. {{step4}}

    You may leave this here. Nothing needs to feel resolved.
}
= outcome "reflected"
-> end
support:
!show {
    Stop the exercise. If anyone is in immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support if you can. This exercise cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish.
}
= outcome "declined"
-> end
