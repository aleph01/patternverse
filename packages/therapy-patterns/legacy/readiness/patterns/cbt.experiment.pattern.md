:language 1
:title "Behavioral Experiment"
:output outcome
= focus "Test a belief with a small, safe real-world experiment and review what actually happens. There is no required emotional outcome."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask belief {
    What specific everyday belief or prediction would you like to test? If useful, rate your confidence from 0 to 100.
}
!ask test {
    What small, low-risk action could give you information? For example, make one short contribution in a routine meeting. Never test physical danger, medical advice, abuse, or another person's consent.
}
!ask evidence {
    What observable outcome would support the prediction, and what would weaken it? How could you avoid treating a guess about someone's thoughts as an observation?
}
!ask plan {
    When could you try it? What appropriate support, stop condition, and review time would help? Nothing is carried out or scheduled automatically.
}
!ask observed {
    If you have already tried it, record what actually happened. Otherwise, note what you will observe and return after the experiment; do not invent a result.
}
!ask learning {
    Compare the observation with the prediction. What did you learn, including mixed or inconclusive evidence? Would you revise the belief or try a different safe test?
}
!show {
    Your notes, in your own words:

    1. {{belief}}
    2. {{test}}
    3. {{evidence}}
    4. {{plan}}
    5. {{observed}}
    6. {{learning}}

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
