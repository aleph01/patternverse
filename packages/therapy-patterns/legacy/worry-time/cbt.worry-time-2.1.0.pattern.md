:language 1
:title "Worry Time / Stimulus Control for Worry"
:output outcome
!ask schedule {
    Choose a regular time, place, and brief duration for your worry period, away from bedtime. Add it to your own calendar if useful; this pattern does not create reminders.
}
!ask worry {
    Briefly note the topic of one manageable recurring worry and its trigger, without working through it now.
}
!ask return {
    When this worry appears outside that period, how could you gently remind yourself of the plan and return attention to what you are doing? Thoughts may still be present.
}
!ask period {
    At your planned worry time, does this concern still need attention? If there is a practical action, outline it; if it is uncertainty you cannot resolve now, acknowledge that. You do not have to fill the period or keep worrying.
}
!ask review {
    What did you notice about postponing engagement with worry? What would you adjust? Do not postpone urgent action, necessary care, or a real safety concern.
}
!show {
    Your notes, in your own words:

    1. {{schedule}}
    2. {{worry}}
    3. {{return}}
    4. {{period}}
    5. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
