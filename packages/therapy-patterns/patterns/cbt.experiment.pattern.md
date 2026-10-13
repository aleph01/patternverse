:language 1
:title "Behavioral Experiment"
:output outcome
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
