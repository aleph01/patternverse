:language 1
:title "Graded Task Assignment"
:output outcome
task = !ask {
    What everyday task matters to you but feels overwhelming or hard to begin?
}
steps = !ask {
    Break it into small steps in a workable order, from easiest to more demanding.
}
first = !ask {
    Choose the easiest useful first step. What version fits your current energy and resources?
}
plan = !ask {
    When and where could you try it? What would count as starting, even if you stop there?
}
review = !ask {
    If you have tried it, what happened? Otherwise, decide when to review. Would you repeat, shrink the step, ask for support, or move to the next manageable step?
}
!show {
    Your notes, in your own words:

    1. {{task}}
    2. {{steps}}
    3. {{first}}
    4. {{plan}}
    5. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
outcome = "reflected"
-> end
