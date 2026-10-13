:language 1
:title "Problem Solving"
:output outcome
!ask problem {
    Define one concrete practical problem. What is happening, and which parts are within your influence?
}
!ask goal {
    What realistic improvement would be enough for now?
}
!ask options {
    Generate several possible actions without deciding yet. Include asking for support or reducing the scope.
}
!ask compare {
    Compare the likely benefits, costs, constraints, and risks of the options.
}
!ask plan {
    Choose one manageable action. When and where could you try it, and what would a useful result look like?
}
!ask review {
    If you have tried it, what happened and what would you adjust? Otherwise, choose a review point and what you will look for.
}
!show {
    Your notes, in your own words:

    1. {{problem}}
    2. {{goal}}
    3. {{options}}
    4. {{compare}}
    5. {{plan}}
    6. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
