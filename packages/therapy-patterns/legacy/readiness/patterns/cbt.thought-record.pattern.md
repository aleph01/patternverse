:language 1
:title "Thought Record / Cognitive Restructuring"
:output outcome
= focus "Examine a distressing situation, automatic thoughts, emotions, and evidence to find a more balanced alternative. There is no required emotional outcome."
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
    Describe a manageable, recent situation. What happened, where, and with whom? Separate observations from interpretations.
}
!ask thought {
    What automatic thought or image came up? Write it in your own words. If helpful, note how strongly you believe it from 0 to 100.
}
!ask emotions {
    What emotions and body sensations did you notice? If useful, rate each emotion's intensity from 0 to 100.
}
!ask for {
    What observable evidence supports the thought? Distinguish facts from guesses.
}
!ask against {
    What observable evidence does not fit the thought? Include positive evidence you might have dismissed; it still counts.
}
!ask balanced {
    What more balanced alternative includes both sides and acknowledges what remains uncertain? It should feel believable, not merely cheerful.
}
!ask review {
    How believable is the alternative? How do you feel now, if different at all, and what response would you choose?
}
!show {
    Your notes, in your own words:

    1. {{situation}}
    2. {{thought}}
    3. {{emotions}}
    4. {{for}}
    5. {{against}}
    6. {{balanced}}
    7. {{review}}

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
