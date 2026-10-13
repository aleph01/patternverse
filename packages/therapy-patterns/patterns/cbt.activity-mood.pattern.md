:language 1
:title "Activity–Mood Monitoring"
:output outcome
!ask period {
    Choose a short period to observe, such as part of today. What activities did you do, and roughly when?
}
!ask ratings {
    Alongside each activity, note mood and energy from 0 to 10 if useful. You can also note pleasure and mastery or accomplishment. Use the same meaning for your ratings each time.
}
!ask context {
    What else was relevant, such as sleep, company, pain, or demands? Include rest and care rather than treating them as inactivity.
}
!ask patterns {
    Across these observations, what seems associated with feeling better, worse, or unchanged? One entry cannot establish a reliable pattern.
}
!ask next {
    What small activity would you like to repeat, adjust, or observe again? Keep monitoring brief and stop if it becomes burdensome.
}
!show {
    Your notes, in your own words:

    1. {{period}}
    2. {{ratings}}
    3. {{context}}
    4. {{patterns}}
    5. {{next}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
