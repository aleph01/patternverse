:language 1
:title "Project review"
:input topic text
:output plan
!use project.step as plan {
    :with topic
}
!show {
    First step: {{plan.next_step}}
}
-> end
