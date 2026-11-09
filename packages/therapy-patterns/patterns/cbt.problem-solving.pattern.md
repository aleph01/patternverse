:language 1
:title "Problem Solving"
:output outcome
problem = !ask {
    Define one concrete practical problem. What is happening, and which parts are within your influence?
}
goal = !ask {
    What realistic improvement would be enough for now?
}
options = !ask {
    Generate several possible actions without deciding yet. Include asking for support or reducing the scope.
}
compare = !ask {
    Compare the likely benefits, costs, constraints, and risks of the options.
}
plan = !ask {
    Choose one manageable action. When and where could you try it, and what would a useful result look like?
}
review = !ask {
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
outcome = "reflected"
-> end
