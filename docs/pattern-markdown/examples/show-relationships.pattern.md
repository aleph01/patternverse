:language 1
:title "Relations, time, and layers"
type Level = event | pattern | structure | assumption
factors = [
  {id: "pressure", name: "Pressure", affects: "withdrawal"},
  {id: "withdrawal", name: "Withdrawal", affects: "uncertainty"},
  {id: "uncertainty", name: "Uncertainty", affects: "pressure"},
]
!show {{factors}} {
  :link affects
}
questions = [
  {id: "root", name: "Why are subscriptions falling?", parent: ""},
  {id: "acquisition", name: "Acquisition", parent: "root"},
  {id: "retention", name: "Retention", parent: "root"},
  {id: "traffic", name: "Traffic", parent: "acquisition"},
  {id: "churn", name: "Churn", parent: "retention"},
]
!show {{questions}} {
  :link parent
}
events = [{name: "Research", date: "2026-10-03"}, {name: "Prototype", date: "2026-10-12"}, {name: "Review", date: "2026-10-28"}]
!show {{events}} {
  :map date
}
observations = [{name: "A missed deadline", level: Level.event}, {name: "Repeated handover delays", level: Level.pattern}, {name: "No shared ownership", level: Level.structure}, {name: "Speed matters more than clarity", level: Level.assumption}]
!show {{observations}} {
  :map level
}
-> end
