:language 1
:title "Identify Cognitive Distortions"
:output outcome
!ask thought {
    Describe a manageable everyday situation and the thought that came up. Write the thought in your own words.
}
!choose patterns [multi, min=0, prefer=checklist] {
    Which thinking habits might be influencing this thought? Choose any that seem relevant, or none. Selecting a habit does not mean your thought is wrong.
    - catastrophizing: "Catastrophizing"
    - mind-reading: "Mind reading"
    - all-or-nothing: "All-or-nothing thinking"
    - generalizing: "Overgeneralization"
    - discounting: "Disqualifying or discounting the positive"
    - predicting: "Fortune telling"
    - mental-filter: "Mental filtering"
    - emotional-reasoning: "Emotional reasoning"
    - should: "Rigid should statements"
    - labeling: "Labeling"
    - personalization: "Personalization or excessive responsibility"
}
!ask examine {
    Could the thinking habits you selected be affecting how you see the situation? What supports your thought, and what gives you reason to question it? Include any real difficulties or important context. If you selected none, you can still examine the thought.
}
!ask balanced {
    Taking that evidence and context into account, how could you express the thought more accurately? Include any positive evidence you may have dismissed, without ignoring real difficulties.
}
!show {
    Your notes, in your own words:

    1. {{thought}}
    2. {{patterns}}
    3. {{examine}}
    4. {{balanced}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
