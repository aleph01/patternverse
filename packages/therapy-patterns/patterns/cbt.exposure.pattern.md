:language 1
:title "Exposure"
:output outcome
!ask situation {
    What objectively safe, everyday situation are you avoiding? Do not choose real danger, abuse, traumatic memories, medical risks, or anything that disregards another person's consent.
}
!ask ladder {
    List a few possible approach steps from easier to harder. You may add rough difficulty ratings from 0 to 100. Keep the steps voluntary and manageable.
}
!ask first {
    Which easiest step feels workable? What do you predict will happen, and what would you like to learn?
}
!ask plan {
    When and where might you try that step? What appropriate support would help? Do not remove genuine safety precautions or change prescribed treatment.
}
!ask observed {
    If you have tried the step, what actually happened? Otherwise, leave a plan for what to observe. Learning matters more than forcing anxiety to drop.
}
!ask next {
    Would you repeat, make the step smaller, pause, or seek qualified support? You control the pace. If distress is overwhelming or this involves trauma, OCD, or physical symptoms, seek professional guidance.
}
!show {
    Your notes, in your own words:

    1. {{situation}}
    2. {{ladder}}
    3. {{first}}
    4. {{plan}}
    5. {{observed}}
    6. {{next}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
