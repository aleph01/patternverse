:language 1
:title "Project review"
:input topic text
:output plan
plan = !use project.step {
    :with topic
}
!show {
    First step: {{plan.next_step}}
}
-> end
