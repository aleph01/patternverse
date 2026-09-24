use pattern_core::{
    runtime::Status,
    scenario::{self, Scenario, Step, Target},
    snapshot::{ExecutableSnapshot, SourceBundle},
};
fn bundle() -> SourceBundle {
    serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/project-review.bundle.json"
    ))
    .unwrap()
}
#[test]
fn scripted_restart_scenario_and_cli_use_the_same_storage_boundary() {
    let scenario: Scenario = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/project-review.scenario.json"
    ))
    .unwrap();
    let report = scenario::run(
        ExecutableSnapshot::build(bundle()).unwrap(),
        "cli-scenario".into(),
        scenario,
    )
    .unwrap();
    assert_eq!(
        report.checkpoint.state().root().status(),
        &Status::Completed
    );
    assert_eq!(report.checkpoint.state().ledger().count(), 2);
    assert!(report.checkpoint.deliverable().is_empty());
    let output = std::process::Command::new(env!("CARGO_BIN_EXE_pattern"))
        .current_dir(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .args([
            "scenario-bundle",
            "docs/pattern-markdown/examples/project-review.bundle.json",
            "docs/pattern-markdown/examples/project-review.scenario.json",
        ])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&output.stdout).unwrap(),
        serde_json::to_value(&report).unwrap()
    );
}
#[test]
fn scripted_cancellation_failure_and_incorrect_expectations_are_explicit() {
    for step in [
        Step::Cancel {
            target: Target::Pending,
        },
        Step::Fail {
            target: Target::Root,
        },
    ] {
        let mut fixture: Scenario = serde_json::from_str(include_str!(
            "../../../docs/pattern-markdown/examples/project-review.scenario.json"
        ))
        .unwrap();
        fixture.steps = vec![step, Step::Restart];
        let report = scenario::run(
            ExecutableSnapshot::build(bundle()).unwrap(),
            "terminal".into(),
            fixture.clone(),
        )
        .unwrap();
        assert!(matches!(
            report.checkpoint.state().root().status(),
            Status::Cancelled | Status::Failed
        ));
        assert!(report.checkpoint.deliverable().is_empty());
        fixture.steps.push(Step::Expect {
            status: Status::Completed,
            pending_kind: None,
            ledger_len: 0,
        });
        assert!(scenario::run(
            ExecutableSnapshot::build(bundle()).unwrap(),
            "terminal".into(),
            fixture
        )
        .is_err());
    }
}
