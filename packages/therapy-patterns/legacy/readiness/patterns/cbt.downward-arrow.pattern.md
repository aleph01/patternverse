:language 1
:title "Downward Arrow"
:output outcome
= focus "Gently explore what an automatic thought might mean to uncover a deeper assumption or belief. There is no required emotional outcome."
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
    Choose a manageable automatic thought. What went through your mind?
}
!ask meaning {
    If that thought were true, what would it mean to you about yourself, other people, or the world?
}
!ask deeper {
    If that meaning were true, what would be significant about it? You can stop or write that you have gone far enough.
}
!ask belief {
    What tentative rule, assumption, or belief seems to be showing up? Leave it uncertain if nothing useful emerges.
}
!ask response {
    How could you respond to that belief with accuracy and compassion? A belief is not a verdict about you. Stop here if it brings up overwhelming material.
}
!show {
    Your notes, in your own words:

    1. {{thought}}
    2. {{meaning}}
    3. {{deeper}}
    4. {{belief}}
    5. {{response}}

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
