:language 1
:title "DBT · Clarify a request or boundary"
:output outcome
= focus "We can clarify what you want to communicate, while respecting the relationship and yourself. This is not a method for controlling another person's response."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> check
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
check:
!choose safety {
    :option ordinary "A manageable everyday interaction"
    :option unsafe "There may be coercion or danger"
    :option leave "Not now"
    Is this an interaction where considering a request or boundary feels safe enough? If direct communication could put you at risk, do not rehearse confrontation here.
}
?branch {
    :when safety.value == "ordinary" -> explore
    :when safety.value == "unsafe" -> support
    :else -> declined
}
explore:
!ask situation {
    What happened, in brief, without guessing the other person's motives?
}
!ask objective {
    What concrete request or boundary would you like to express?
}
!ask relationship {
    What, if anything, do you want to protect about this relationship?
}
!ask respect {
    What matters for your self-respect here, including any limit you do not want to cross?
}
!choose priority {
    :option objective "The concrete objective"
    :option relationship "The relationship"
    :option respect "My self-respect"
    :option balance "A balance, without choosing one"
    Which deserves most attention in this particular interaction? All three can matter.
}
!ask wording {
    In your own words, how could you state the relevant fact and your request or boundary clearly, without threats or an apology for having needs?
}
!ask fallback {
    If the response is not what you hope, what safe limit, pause or support could you choose? You cannot guarantee agreement.
}
!show {
    Your draft, not a message sent: {{wording}}
    Your fallback: {{fallback}}
    You can revise privately or decide not to use it. No contact has been made.
}
= outcome "drafted"
-> end
support:
!show {
    Set aside the communication exercise. Prioritize safety and consider qualified support rather than direct confrontation. For immediate danger, contact local emergency services; a trusted person or local specialist service may help. Mira cannot assess risk or provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not owe anyone a conversation or a completed exercise.
}
= outcome "declined"
-> end
