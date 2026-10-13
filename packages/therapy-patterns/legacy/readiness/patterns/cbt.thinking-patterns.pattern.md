:language 1
:title "Identify Cognitive Distortions"
:output outcome
= focus "Notice recurring thinking habits—including catastrophizing, mind reading, and discounting the positive. There is no required emotional outcome."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask thought {
    Write one automatic thought you want to examine, along with the situation that brought it up.
}
!choose patterns [multi, min=0, prefer=checklist] {
    Which thinking habits might fit? You may select none. A label does not decide whether the thought is true.
    - catastrophizing: "Catastrophizing"
    - mind-reading: "Mind reading"
    - all-or-nothing: "All-or-nothing thinking"
    - generalizing: "Overgeneralization"
    - discounting: "Disqualifying or discounting the positive"
    - predicting: "Fortune telling"
    - mental-filter: "Mental filtering"
    - emotional-reasoning: "Emotional reasoning"
    - should: "Rigid should statements"
    - labeling: "Labeling"
    - personalization: "Personalization or excessive responsibility"
}
!ask wording {
    What in the wording suggests those possibilities? What does the label miss, including real difficulties or relevant context?
}
!ask balanced {
    How could you express the thought more precisely? If you discounted something positive, what evidence deserves to count without pretending everything is fine?
}
!show {
    Your notes, in your own words:

    1. {{thought}}
    2. {{patterns}}
    3. {{wording}}
    4. {{balanced}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
support:
!show {
    Stop the exercise. For immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support if you can. This exercise cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish.
}
= outcome "declined"
-> end
