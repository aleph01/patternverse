:language 1
:title "Candidate initiatives — different ways to reason"
initiatives = [
  {id: "onboarding", name: "Improve onboarding", category: "Product", effort: 2, impact: 5, priority: 4, scenario: "Expected"},
  {id: "pricing", name: "Rewrite the pricing page", category: "Commercial", effort: 1, impact: 3, priority: 3, scenario: "Expected"},
  {id: "export", name: "Add an export feature", category: "Product", effort: 4, impact: 4, priority: 2, scenario: "Expected"},
  {id: "calls", name: "Call former customers", category: "Service", effort: 2, impact: 4, priority: 5, scenario: "Expected"},
  {id: "onboarding-best", name: "Improve onboarding", category: "Product", effort: 2, impact: 5, priority: 4, scenario: "Optimistic"},
  {id: "export-best", name: "Add an export feature", category: "Product", effort: 3, impact: 5, priority: 3, scenario: "Optimistic"},
]
!show {{initiatives}}
!show {{initiatives}} {
  :group category
}
!show {{initiatives}} {
  :order priority desc
}
!show {{initiatives}} {
  :map effort
}
!show {{initiatives}} {
  :map effort, impact
  :group category
}
!show {{initiatives}} {
  :map effort, impact
  :split scenario
}
-> end
