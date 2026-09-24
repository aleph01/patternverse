//! Product content fixtures exercise the portable runtime without adding therapy logic to it.
use pattern_core::{
    manager::{self, Command, ManagerLimits},
    runtime::{Event, Fulfillment, Receipt, Status},
    scenario::{self, Scenario, Step, Target},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use std::{collections::BTreeMap, path::PathBuf};

const NAMES: &[(&str, &str)] = &[
    ("cbt.moment", "reflected"),
    ("cbt.activation", "option_kept"),
    ("act.defusion", "noticed"),
    ("act.values", "option_kept"),
    ("dbt.pause", "option_considered"),
    ("dbt.interpersonal", "drafted"),
];
fn directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/therapy-patterns")
}
fn source(name: &str) -> String {
    std::fs::read_to_string(directory().join(format!("patterns/{name}.pattern.md"))).unwrap()
}
fn snapshot(name: &str) -> ExecutableSnapshot {
    ExecutableSnapshot::build(SourceBundle {
        root: name.into(),
        patterns: BTreeMap::from([
            (name.into(), source(name)),
            ("therapy.ready".into(), source("therapy.ready")),
        ]),
    })
    .unwrap()
}
fn fixture(name: &str) -> Scenario {
    serde_json::from_str(
        &std::fs::read_to_string(directory().join(format!("scenarios/{name}.json"))).unwrap(),
    )
    .unwrap()
}
fn choice(value: &str) -> Step {
    Step::Reply {
        expected_kind: "interaction.choose".into(),
        result: Fulfillment::Selected(value.into()),
    }
}
fn run(name: &str, steps: Vec<Step>) -> scenario::Report {
    scenario::run(
        snapshot(name),
        "synthetic-therapy".into(),
        Scenario {
            inputs: BTreeMap::new(),
            steps,
        },
    )
    .unwrap()
}

#[test]
fn all_six_exercises_complete_with_only_explicit_interactions_and_declared_outcomes() {
    for (name, outcome) in NAMES {
        let fixture = fixture(name);
        assert!(fixture.inputs.is_empty());
        assert!(fixture.steps.iter().all(|step| matches!(step, Step::Reply { expected_kind, .. } if expected_kind == "interaction.ask" || expected_kind == "interaction.choose")));
        let report = run(name, fixture.steps);
        assert_eq!(
            report.checkpoint.state().root().status(),
            &Status::Completed,
            "{name}"
        );
        assert_eq!(
            report.checkpoint.state().root().outputs(),
            &BTreeMap::from([("outcome".into(), Value::Text(outcome.to_string()))])
        );
        assert!(report.checkpoint.state().pending().is_none());
    }
}

#[test]
fn every_exercise_has_decline_and_support_exits_before_disclosure() {
    for (name, _) in NAMES {
        for (selection, outcome) in [("stop", "declined"), ("support", "support_requested")] {
            let report = run(name, vec![choice(selection), Step::Restart]);
            assert_eq!(
                report.checkpoint.state().root().status(),
                &Status::Completed
            );
            assert_eq!(
                report.checkpoint.state().root().outputs()["outcome"],
                Value::Text(outcome.into())
            );
            assert_eq!(report.checkpoint.state().ledger().count(), 1);
        }
    }
}

#[test]
fn restart_pause_rejection_and_duplicate_reply_never_advance_twice() {
    for (name, _) in NAMES {
        let mut fixture = fixture(name);
        fixture.steps.insert(
            0,
            Step::RejectReply {
                result: Fulfillment::Text("not a consent choice".into()),
            },
        );
        fixture.steps.splice(
            2..2,
            [
                Step::RepeatLast,
                Step::Pause {
                    target: Target::Root,
                },
                Step::Restart,
                Step::Resume {
                    target: Target::Root,
                },
            ],
        );
        let report = run(name, fixture.steps);
        assert_eq!(
            report.checkpoint.state().root().status(),
            &Status::Completed
        );
        let baseline = run(name, super_fixture_steps(name));
        assert_eq!(
            report.checkpoint.state().root().outputs(),
            baseline.checkpoint.state().root().outputs()
        );
        assert_eq!(
            report.checkpoint.state().ledger().count(),
            baseline.checkpoint.state().ledger().count()
        );
    }
}
fn super_fixture_steps(name: &str) -> Vec<Step> {
    fixture(name).steps
}

#[test]
fn late_declines_and_safety_branches_do_not_require_a_plan_or_disclosure() {
    for (name, prefix, selection, outcome) in [
        ("cbt.activation", 6, "leave", "declined"),
        ("act.defusion", 2, "leave", "declined"),
        ("act.defusion", 4, "leave", "declined"),
        ("act.values", 5, "leave", "declined"),
        ("dbt.pause", 1, "support", "support_requested"),
        ("dbt.pause", 5, "support", "support_requested"),
        ("dbt.interpersonal", 1, "unsafe", "support_requested"),
    ] {
        let mut steps = fixture(name).steps[..prefix].to_vec();
        steps.push(choice(selection));
        let report = run(name, steps);
        assert_eq!(
            report.checkpoint.state().root().outputs()["outcome"],
            Value::Text(outcome.into())
        );
        assert_eq!(
            report.checkpoint.state().root().status(),
            &Status::Completed
        );
    }
}

#[test]
fn cancellation_after_each_user_boundary_is_terminal_without_success_outputs() {
    for (name, _) in NAMES {
        let steps = fixture(name).steps;
        for index in 0..steps.len() {
            let mut prefix = steps[..index].to_vec();
            prefix.extend([
                Step::Cancel {
                    target: Target::Root,
                },
                Step::Restart,
            ]);
            let report = run(name, prefix);
            assert_eq!(
                report.checkpoint.state().root().status(),
                &Status::Cancelled
            );
            assert!(report.checkpoint.state().root().outputs().is_empty());
        }
    }
}

#[test]
fn running_exercises_pin_source_and_reject_ambient_inputs() {
    for (name, _) in NAMES {
        let original = snapshot(name);
        assert!(manager::start(
            original.clone(),
            "bad".into(),
            BTreeMap::from([("history".into(), Value::Text("not declared".into()))]),
            ManagerLimits::default()
        )
        .is_err());
        let started = manager::start(
            original.clone(),
            "pinned".into(),
            BTreeMap::new(),
            ManagerLimits::default(),
        )
        .unwrap();
        let saved = serde_json::to_vec(&started.state).unwrap();
        let changed = ExecutableSnapshot::build(SourceBundle {
            root: name.to_string(),
            patterns: BTreeMap::from([(
                name.to_string(),
                ":language 1\n!show\n  Different source\n-> end".into(),
            )]),
        })
        .unwrap();
        assert_ne!(original.id(), changed.id());
        let restored = serde_json::from_slice(&saved).unwrap();
        let pending = started.state.pending().unwrap();
        let next = manager::transition(
            &restored,
            Command {
                run_id: pending.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result: Fulfillment::Selected("begin".into()),
                }),
            },
        )
        .unwrap();
        assert_eq!(next.state.root().status(), &Status::Waiting);
        assert_eq!(next.state.snapshot().id(), original.id());
    }
}
