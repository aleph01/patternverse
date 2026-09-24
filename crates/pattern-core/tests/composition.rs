use pattern_core::{
    compiler,
    host::{self, Fixture},
    manager::{self, Command, ManagerLimits, RunManager},
    runtime::{self, Event, Fulfillment, Receipt, Request, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use std::collections::BTreeMap;

const CHILD: &str = ":language 1\n:input topic text\n:output answer\n!agent private {\n:returns text\nSuggest something for {{topic}}\n}\n!ask answer {\nReview {{private}}\n}\n-> end";
const ROOT: &str = ":language 1\n:input topic text\n:output answer\n= parent_only \"Not supplied\"\n!use child.basic as child {\n:with topic\n}\n= answer child.answer\n-> end";
fn bundle(root: &str, child: &str) -> SourceBundle {
    SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([
            ("root".into(), root.into()),
            ("child.basic".into(), child.into()),
        ]),
    }
}
fn snapshot(root: &str, child: &str) -> ExecutableSnapshot {
    ExecutableSnapshot::build(bundle(root, child)).unwrap_or_else(|e| panic!("{e:?}"))
}
fn inputs() -> BTreeMap<String, Value> {
    BTreeMap::from([("topic".into(), Value::Text("Drawing".into()))])
}
fn start() -> manager::Transition {
    manager::start(
        snapshot(ROOT, CHILD),
        "root-run".into(),
        inputs(),
        ManagerLimits::default(),
    )
    .unwrap()
}
fn command(state: &RunManager, reply: Fulfillment) -> Command {
    let effect = state.pending().unwrap();
    Command {
        run_id: effect.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: effect.effect_id.clone(),
            result: reply,
        }),
    }
}
fn answer(state: &RunManager, reply: Fulfillment) -> manager::Transition {
    manager::transition(state, command(state, reply)).unwrap()
}
fn lifecycle(state: &RunManager, id: &str, event: Event) -> manager::Transition {
    manager::transition(
        state,
        Command {
            run_id: id.into(),
            event,
        },
    )
    .unwrap()
}
fn restored(state: &RunManager) -> RunManager {
    let decoded = serde_json::from_str(&serde_json::to_string(state).unwrap()).unwrap();
    assert_eq!(state, &decoded);
    decoded
}
fn invalid(root: &str, child: &str, message: &str) {
    let bundle = bundle(root, child);
    let error = ExecutableSnapshot::build(bundle.clone()).unwrap_err();
    assert!(
        error
            .diagnostics
            .iter()
            .any(|e| e.message.contains(message)),
        "{error:?}, expected {message}"
    );
    for diagnostic in error.diagnostics {
        assert!(bundle.patterns[&error.pattern]
            .get(diagnostic.primary)
            .is_some());
    }
}

#[test]
fn use_emits_manager_action_not_host_effect_and_child_exports_only_outputs() {
    let executable = snapshot(ROOT, CHILD);
    let single = runtime::start(executable.root().clone(), "root-run".into(), inputs()).unwrap();
    assert!(single.effects.is_empty());
    assert_eq!(single.actions.len(), 1);
    assert!(single.state.pending().is_none());
    assert!(single.state.pending_child().is_some());
    assert!(host::simulate(
        executable.root().clone(),
        "single".into(),
        Fixture {
            inputs: inputs(),
            replies: vec![]
        }
    )
    .is_err());
    let first = start();
    assert_eq!(first.state.runs().len(), 2);
    let child_id = first.state.pending().unwrap().run_id.clone();
    assert_ne!(child_id, "root-run");
    assert!(
        matches!(&first.effects[0].request,Request::Generate{prompt,..} if prompt=="Suggest something for Drawing")
    );
    assert_eq!(
        first.state.runs()[&child_id].parent().unwrap().run_id,
        "root-run"
    );
    let next = answer(
        &first.state,
        Fulfillment::Generated(Value::Text("A private candidate".into())),
    );
    assert!(first.state.root().outputs().is_empty());
    let done = answer(
        &restored(&next.state),
        Fulfillment::Text("Accepted answer".into()),
    );
    assert_eq!(done.state.root().status(), &Status::Completed);
    assert_eq!(
        done.state.root().outputs(),
        &BTreeMap::from([("answer".into(), Value::Text("Accepted answer".into()))])
    );
    assert_eq!(done.state.runs()[&child_id].state().outputs().len(), 1);
    assert!(!done.state.runs()[&child_id]
        .state()
        .outputs()
        .contains_key("private"));
    assert!(done.state.root().ledger().is_empty()); // Child external results belong to its Run.
    assert_eq!(done.state.runs()[&child_id].state().ledger().len(), 2);
    restored(&done.state);
}

#[test]
fn child_cannot_read_parent_or_sibling_internals_and_parent_cannot_read_child_internals() {
    invalid(
        &ROOT.replace("child.answer", "child.private"),
        CHILD,
        "Unknown field",
    );
    invalid(
        ROOT,
        &CHILD.replace("{{topic}}", "{{parent_only}}"),
        "not available",
    );
    invalid(
        ROOT,
        &CHILD.replace("{{topic}}", "{{child.answer}}"),
        "not available",
    );
    invalid(
        &ROOT.replace("= answer child.answer", "= answer private"),
        CHILD,
        "not available",
    );
}

#[test]
fn child_inputs_require_exact_explicit_contracts_and_immutable_aliases() {
    for (with, message) in [
        ("", "every declared child input"),
        (":with other = topic", "Unknown child input"),
        (":with topic\n:with topic", "Duplicate child input"),
        (":with topic = 5", "Type mismatch"),
        (":with topic = unknown", "not available"),
        (":with topic =", "expected"),
        (":with topic\nUnknown Markdown", "only explicit"),
        (":other topic", "Only :with"),
    ] {
        invalid(&ROOT.replace(":with topic", with), CHILD, message);
    }
    invalid(
        &ROOT.replace("!use child.basic as child", "!use child.basic as topic"),
        CHILD,
        "already exists",
    );
    invalid(
        &ROOT.replace("= answer child.answer", "= child \"replacement\""),
        CHILD,
        "already exists",
    );
    let mapped = ROOT.replace(":with topic", ":with topic = \"Explicit literal\"");
    let turn = manager::start(
        snapshot(&mapped, CHILD),
        "root-run".into(),
        inputs(),
        ManagerLimits::default(),
    )
    .unwrap();
    assert!(
        matches!(&turn.effects[0].request,Request::Generate{prompt,..} if prompt.contains("Explicit literal"))
    );
}

#[test]
fn missing_dependencies_cycles_and_recursive_collections_fail_before_execution() {
    invalid(
        &ROOT.replace("child.basic", "missing"),
        CHILD,
        "Missing local Pattern",
    );
    invalid(
        ROOT,
        ":language 1\n!use root as recursive {\n:with topic = \"X\"\n}\n-> end",
        "Recursive",
    );
    invalid(
        ROOT,
        ":language 1\n!collect entries {\n:max 1\n!use child.basic as recursive\n}\n-> end",
        "Recursive",
    );
    assert!(compiler::compile(ROOT)
        .unwrap_err()
        .iter()
        .any(|d| d.message.contains("Unresolved local Pattern")));
}

#[test]
fn source_revision_and_transitive_dependencies_are_pinned_not_live_lookups() {
    let original = bundle(ROOT, CHILD);
    let pinned = ExecutableSnapshot::build(original.clone()).unwrap();
    let mut edited = original.clone();
    edited.patterns.insert(
        "child.basic".into(),
        CHILD.replace("Suggest something", "Different prompt"),
    );
    let updated = ExecutableSnapshot::build(edited).unwrap();
    assert_ne!(pinned.id(), updated.id());
    assert_ne!(pinned.root().snapshot_id(), updated.root().snapshot_id());
    let mut unused = original;
    unused
        .patterns
        .insert("unused".into(), "deliberately invalid draft".into());
    assert_eq!(pinned, ExecutableSnapshot::build(unused).unwrap());
    let turn = manager::start(
        pinned.clone(),
        "stable".into(),
        inputs(),
        ManagerLimits::default(),
    )
    .unwrap();
    let saved = restored(&turn.state);
    assert_eq!(saved.snapshot(), &pinned);
    assert!(
        matches!(&saved.pending().unwrap().request,Request::Generate{prompt,..} if prompt.starts_with("Suggest something"))
    );
}

fn nested_bundle() -> SourceBundle {
    let mut bundle=bundle(ROOT,":language 1\n:input topic text\n:output answer\n!use leaf as inner {\n:with topic\n}\n= answer inner.answer\n-> end");
    bundle.patterns.insert("leaf".into(), CHILD.into());
    bundle
}

#[test]
fn grandchild_completion_propagates_only_declared_values_through_each_level() {
    let executable = ExecutableSnapshot::build(nested_bundle()).unwrap();
    let first = manager::start(
        executable,
        "nested".into(),
        inputs(),
        ManagerLimits::default(),
    )
    .unwrap();
    assert_eq!(first.state.runs().len(), 3);
    let next = answer(
        &first.state,
        Fulfillment::Generated(Value::Text("X".into())),
    );
    let done = answer(&restored(&next.state), Fulfillment::Text("Y".into()));
    assert!(done
        .state
        .runs()
        .values()
        .all(|r| r.state().status() == &Status::Completed));
    assert_eq!(
        done.state.root().outputs()["answer"],
        Value::Text("Y".into())
    );
    restored(&done.state);
}

#[test]
fn changing_leaf_changes_root_identity_and_shared_dependencies_are_deduplicated() {
    let bundle = nested_bundle();
    let original = ExecutableSnapshot::build(bundle.clone()).unwrap();
    let mut changed = bundle;
    changed
        .patterns
        .insert("leaf".into(), CHILD.replace("Review", "Consider"));
    let changed = ExecutableSnapshot::build(changed).unwrap();
    assert_ne!(original.root().snapshot_id(), changed.root().snapshot_id());
    let diamond = SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([
            (
                "root".into(),
                ":language 1\n!use left as left\n!use right as right\n-> end".into(),
            ),
            (
                "left".into(),
                ":language 1\n!use shared as child\n-> end".into(),
            ),
            (
                "right".into(),
                ":language 1\n!use shared as child\n-> end".into(),
            ),
            (
                "shared".into(),
                ":language 1\n!show {\nShared\n}\n-> end".into(),
            ),
        ]),
    };
    let pinned = ExecutableSnapshot::build(diamond).unwrap();
    assert_eq!(pinned.sources().len(), 4);
    let done = manager::start(
        pinned,
        "diamond".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    assert_eq!(done.state.runs().len(), 5);
    assert_eq!(done.effects.len(), 2);
    assert_ne!(done.effects[0].run_id, done.effects[1].run_id);
    assert_eq!(done.state.root().status(), &Status::Completed);
    restored(&done.state);
}

#[test]
fn parent_collection_can_call_a_child_with_its_own_collection() {
    let root=":language 1\n:output entries\n!collect entries {\n:min 2\n:max 2\n!ask topic {\nTopic\n}\n!use child.basic as detail {\n:with topic\n}\n}\n-> end";
    let child=":language 1\n:input topic text\n:output notes\n!collect notes {\n:max 1\n!ask text {\nNote for {{topic}}\n}\n}\n-> end";
    let mut turn = manager::start(
        snapshot(root, child),
        "collections".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let mut child_ids = vec![];
    for topic in ["First", "Second"] {
        turn = answer(&restored(&turn.state), Fulfillment::Text(topic.into()));
        child_ids.push(turn.state.pending().unwrap().run_id.clone());
        assert!(
            matches!(&turn.state.pending().unwrap().request,Request::Ask{prompt} if prompt==&format!("Note for {topic}"))
        );
        assert_eq!(
            turn.state
                .pending()
                .unwrap()
                .collection
                .as_ref()
                .unwrap()
                .record_index,
            Some(0)
        );
        let paused = lifecycle(&turn.state, "collections", Event::Pause);
        turn = lifecycle(&restored(&paused.state), "collections", Event::Resume);
        turn = answer(&turn.state, Fulfillment::Text(format!("Note {topic}")));
    }
    assert_ne!(child_ids[0], child_ids[1]);
    assert_eq!(turn.state.root().status(), &Status::Completed);
    let Value::List { items, .. } = &turn.state.root().outputs()["entries"] else {
        panic!()
    };
    assert_eq!(items.len(), 2);
    assert!(serde_json::to_string(items)
        .unwrap()
        .contains("Note Second"));
    restored(&turn.state);
}

#[test]
fn pause_resume_whole_tree_preserves_pending_identity_and_accepted_generation() {
    let first = manager::start(
        ExecutableSnapshot::build(nested_bundle()).unwrap(),
        "nested".into(),
        inputs(),
        ManagerLimits::default(),
    )
    .unwrap();
    let second = answer(
        &first.state,
        Fulfillment::Generated(Value::Text("Accepted".into())),
    );
    let pending = second.state.pending().unwrap().clone();
    let paused = lifecycle(&second.state, "nested", Event::Pause);
    assert!(paused
        .state
        .runs()
        .values()
        .all(|r| r.state().status() == &Status::Paused));
    assert!(paused.effects.is_empty());
    assert!(manager::transition(
        &paused.state,
        command(&paused.state, Fulfillment::Text("Too soon".into()))
    )
    .is_err());
    // Resuming a leaf cannot bypass its paused parent.
    assert!(manager::transition(
        &paused.state,
        Command {
            run_id: pending.run_id.clone(),
            event: Event::Resume
        }
    )
    .is_err());
    let resumed = lifecycle(&restored(&paused.state), "nested", Event::Resume);
    assert_eq!(resumed.effects, vec![pending]);
    assert!(resumed
        .effects
        .iter()
        .all(|e| e.request.kind() != "agent.generate"));
    let done = answer(&resumed.state, Fulfillment::Text("Done".into()));
    restored(&done.state);
}

#[test]
fn child_only_pause_leaves_parent_waiting_and_root_resume_reaches_child() {
    let first = start();
    let child = first.state.pending().unwrap().run_id.clone();
    let paused = lifecycle(&first.state, &child, Event::Pause);
    assert_eq!(paused.state.root().status(), &Status::Waiting);
    assert_eq!(
        paused.state.runs()[&child].state().status(),
        &Status::Paused
    );
    let resumed = lifecycle(&restored(&paused.state), "root-run", Event::Resume);
    assert_eq!(resumed.state.pending(), first.state.pending());
    assert_eq!(resumed.effects, first.effects);
}

#[test]
fn cancel_and_failure_propagate_from_any_active_level_without_success_outputs() {
    for event in [Event::Cancel, Event::Fail] {
        for level in 0..3 {
            let first = manager::start(
                ExecutableSnapshot::build(nested_bundle()).unwrap(),
                "nested".into(),
                inputs(),
                ManagerLimits::default(),
            )
            .unwrap();
            let mut ids: Vec<_> = first.state.runs().keys().cloned().collect();
            ids.sort_by_key(String::len);
            let late = command(
                &first.state,
                Fulfillment::Generated(Value::Text("Late".into())),
            );
            let stopped = lifecycle(&first.state, &ids[level], event.clone());
            let expected = if event == Event::Cancel {
                Status::Cancelled
            } else {
                Status::Failed
            };
            assert!(stopped
                .state
                .runs()
                .values()
                .all(|r| r.state().status() == &expected && r.state().outputs().is_empty()));
            assert!(stopped.state.pending().is_none());
            assert!(stopped.effects.is_empty());
            let stopped = restored(&stopped.state);
            assert!(manager::transition(&stopped, late).is_err());
            assert!(manager::transition(
                &stopped,
                Command {
                    run_id: "nested".into(),
                    event: Event::Resume
                }
            )
            .is_err());
        }
    }
}

#[test]
fn accepted_child_reply_is_idempotent_after_parent_advances_and_conflicts_fail() {
    let first = start();
    let accepted = command(
        &first.state,
        Fulfillment::Generated(Value::Text("X".into())),
    );
    let second = manager::transition(&first.state, accepted.clone()).unwrap();
    let completed = command(&second.state, Fulfillment::Text("Y".into()));
    let done = manager::transition(&second.state, completed.clone()).unwrap();
    for cmd in [accepted, completed.clone()] {
        let duplicate = manager::transition(&restored(&done.state), cmd).unwrap();
        assert_eq!(duplicate.state, done.state);
        assert!(duplicate.effects.is_empty());
    }
    let Event::Fulfill(mut receipt) = completed.event else {
        panic!()
    };
    receipt.result = Fulfillment::Text("Conflicting".into());
    assert_eq!(
        manager::transition(
            &done.state,
            Command {
                run_id: completed.run_id,
                event: Event::Fulfill(receipt)
            }
        ),
        Err(manager::Error::Runtime(
            runtime::Error::ConflictingDuplicate
        ))
    );
}

#[test]
fn replies_cannot_be_routed_to_parent_or_another_run_and_retries_reuse_identity() {
    let first = start();
    let mut wrong = command(
        &first.state,
        Fulfillment::Generated(Value::Text("X".into())),
    );
    wrong.run_id = "root-run".into();
    assert!(manager::transition(&first.state, wrong).is_err());
    let pending = first.state.pending().unwrap();
    let retry = manager::transition(
        &first.state,
        Command {
            run_id: pending.run_id.clone(),
            event: Event::Retry {
                effect_id: pending.effect_id.clone(),
            },
        },
    )
    .unwrap();
    assert_eq!(retry.state, first.state);
    assert_eq!(retry.effects, first.effects);
    assert!(manager::transition(
        &first.state,
        Command {
            run_id: "unknown".into(),
            event: Event::Pause
        }
    )
    .is_err());
}

#[test]
fn invalid_child_reply_and_parent_postprocessing_failure_roll_back_whole_tree() {
    let first = start();
    let before = serde_json::to_value(&first.state).unwrap();
    assert!(
        manager::transition(&first.state, command(&first.state, Fulfillment::Rating(3.))).is_err()
    );
    assert_eq!(serde_json::to_value(&first.state).unwrap(), before);
    let root=":language 1\n:output doubled\n!use child.basic as child\n= doubled child.number * 2\n-> end";
    let child = ":language 1\n:output number\n!agent number {\n:returns number\nNumber\n}\n-> end";
    let first = manager::start(
        snapshot(root, child),
        "overflow".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let before = first.state.clone();
    assert!(manager::transition(
        &first.state,
        command(&first.state, Fulfillment::Generated(Value::Number(1e308)))
    )
    .is_err());
    assert_eq!(first.state, before);
    let done = answer(&first.state, Fulfillment::Generated(Value::Number(2.)));
    assert_eq!(done.state.root().outputs()["doubled"], Value::Number(4.));
}

#[test]
fn snapshot_rejects_changed_source_revision_graph_and_compiled_code() {
    let pinned = snapshot(ROOT, CHILD);
    let saved = serde_json::to_value(&pinned).unwrap();
    for key in ["id", "root_revision", "version", "sources", "patterns"] {
        let mut changed = saved.clone();
        changed[key] = serde_json::Value::Null;
        assert!(serde_json::from_value::<ExecutableSnapshot>(changed).is_err());
    }
    let mut changed = saved;
    changed["sources"]["child.basic"] = serde_json::json!(CHILD.replace("Review", "Modified"));
    assert!(serde_json::from_value::<ExecutableSnapshot>(changed).is_err());
}

#[test]
fn manager_restore_rejects_mismatched_tree_links_inputs_results_and_journal() {
    let first = start();
    let second = answer(
        &first.state,
        Fulfillment::Generated(Value::Text("X".into())),
    );
    let child_id = second.state.pending().unwrap().run_id.clone();
    let saved = serde_json::to_value(&second.state).unwrap();
    let mut variants = vec![];
    let mut changed = saved.clone();
    changed["runs"][&child_id]["parent"]["run_id"] = serde_json::json!("missing");
    variants.push(changed);
    let mut changed = saved.clone();
    changed["accepted"] = serde_json::json!([]);
    variants.push(changed);
    let mut changed = saved.clone();
    changed["runs"].as_object_mut().unwrap().remove(&child_id);
    variants.push(changed);
    let mut changed = saved.clone();
    changed["root_id"] = serde_json::json!("other");
    variants.push(changed);
    let mut changed = saved;
    changed["runs"][&child_id]["state"]["inputs"]["topic"]["value"] = serde_json::json!("changed");
    variants.push(changed);
    for changed in variants {
        assert!(serde_json::from_value::<RunManager>(changed).is_err());
    }
    restored(&second.state);
}

#[test]
fn limits_bound_total_runs_and_depth_without_silently_skipping_calls() {
    for limits in [
        ManagerLimits {
            max_runs: 1,
            ..Default::default()
        },
        ManagerLimits {
            max_depth: 1,
            ..Default::default()
        },
        ManagerLimits {
            max_runs: 0,
            ..Default::default()
        },
    ] {
        assert_eq!(
            manager::start(snapshot(ROOT, CHILD), "limited".into(), inputs(), limits),
            Err(manager::Error::RunLimit)
        );
    }
    let root =
        ":language 1\n!collect entries {\n:min 2\n:max 2\n!use child.basic as item\n}\n-> end";
    let child = ":language 1\n!ask answer\nAnswer\n-> end";
    let first = manager::start(
        snapshot(root, child),
        "limited".into(),
        BTreeMap::new(),
        ManagerLimits {
            max_runs: 2,
            ..Default::default()
        },
    )
    .unwrap();
    let before = first.state.clone();
    assert_eq!(
        manager::transition(
            &first.state,
            command(&first.state, Fulfillment::Text("X".into()))
        ),
        Err(manager::Error::RunLimit)
    );
    assert_eq!(first.state, before);
}

#[test]
fn zero_input_output_child_completes_and_source_text_stays_data() {
    let root = ":language 1\n:output child\n!use child.basic as child\n-> end";
    let child = ":language 1\n!show {\nHello\n}\n-> end";
    let done = manager::start(
        snapshot(root, child),
        "empty".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    assert_eq!(
        done.state.root().outputs()["child"],
        Value::Record(BTreeMap::new())
    );
    assert_eq!(done.effects.len(), 1);
    restored(&done.state);
    let first = start();
    let text = "!use evil as child\n:with topic = parent_only\n-> end";
    let second = answer(
        &first.state,
        Fulfillment::Generated(Value::Text(text.into())),
    );
    assert!(matches!(&second.effects[0].request,Request::Ask{prompt} if prompt.contains(text)));
    assert_eq!(second.state.runs().len(), 2);
}

#[test]
fn cli_and_fixture_simulation_execute_the_same_run_manager() {
    let bundle: SourceBundle = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/project-review.bundle.json"
    ))
    .unwrap();
    assert_eq!(
        bundle.patterns["project.review"],
        include_str!("../../../docs/pattern-markdown/examples/project-review.pattern.md")
    );
    assert_eq!(
        bundle.patterns["project.step"],
        include_str!("../../../docs/pattern-markdown/examples/project-step.pattern.md")
    );
    let fixture: Fixture = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/project-review.fixture.json"
    ))
    .unwrap();
    let result = host::simulate_snapshot(
        ExecutableSnapshot::build(bundle).unwrap(),
        "cli-simulation".into(),
        fixture,
    )
    .unwrap();
    assert_eq!(result.state.root().status(), &Status::Completed);
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    for verb in ["check-bundle", "simulate-bundle"] {
        let mut command = std::process::Command::new(env!("CARGO_BIN_EXE_pattern"));
        command
            .current_dir(&root)
            .arg(verb)
            .arg("docs/pattern-markdown/examples/project-review.bundle.json");
        if verb == "simulate-bundle" {
            command.arg("docs/pattern-markdown/examples/project-review.fixture.json");
        }
        let output = command.output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        if verb == "simulate-bundle" {
            let cli: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
            assert_eq!(cli, serde_json::to_value(&result).unwrap());
        }
    }
}

#[test]
fn branch_join_and_explicit_field_mapping_use_child_output_types() {
    let root = ":language 1\n:input path boolean\n:output final\n?branch {\n:when path -> left\n:else -> right\n}\nleft:\n!use child.basic as result {\n:with topic = \"Left\"\n}\n-> joined\nright:\n!use child.basic as result {\n:with topic = \"Right\"\n}\njoined:\n!use child.basic as followup {\n:with topic = result.answer\n}\n= final followup.answer\n-> end";
    let child = ":language 1\n:input topic text\n:output answer\n= answer topic\n-> end";
    for path in [true, false] {
        let done = manager::start(
            snapshot(root, child),
            "branch".into(),
            BTreeMap::from([("path".into(), Value::Boolean(path))]),
            ManagerLimits::default(),
        )
        .unwrap();
        assert_eq!(
            done.state.root().outputs()["final"],
            Value::Text(if path { "Left" } else { "Right" }.into())
        );
        assert_eq!(done.state.runs().len(), 3);
        restored(&done.state);
    }
    invalid(
        &root.replace(":else -> right", ":else -> joined"),
        child,
        "not available",
    );
    invalid(
        &root.replace(
            ":with topic = result.answer",
            ":with topic = result.missing",
        ),
        child,
        "Unknown field",
    );
}

#[test]
fn completed_sibling_is_not_cancelled_and_old_duplicate_cannot_finish_current_child() {
    let root = ":language 1\n!use child.basic as first\n!use child.basic as second\n-> end";
    let child = ":language 1\n:output answer\n!ask answer\nAnswer\n-> end";
    let first = manager::start(
        snapshot(root, child),
        "siblings".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let accepted = command(&first.state, Fulfillment::Text("One".into()));
    let old_id = accepted.run_id.clone();
    let second = manager::transition(&first.state, accepted.clone()).unwrap();
    let current_id = second.state.pending().unwrap().run_id.clone();
    assert_ne!(old_id, current_id);
    let duplicate = manager::transition(&restored(&second.state), accepted).unwrap();
    assert_eq!(duplicate.state, second.state);
    assert!(duplicate.effects.is_empty());
    let stopped = lifecycle(&second.state, &current_id, Event::Cancel);
    assert_eq!(
        stopped.state.runs()[&old_id].state().status(),
        &Status::Completed
    );
    assert_eq!(stopped.state.root().status(), &Status::Cancelled);
    assert!(stopped.state.root().outputs().is_empty());
    restored(&stopped.state);
}

#[test]
fn manager_checks_child_state_against_actual_invocation_not_just_valid_individual_runs() {
    let first = start();
    let child_id = first.state.pending().unwrap().run_id.clone();
    let child_revision = first.state.runs()[&child_id].state().snapshot_id();
    let child = first
        .state
        .snapshot()
        .patterns()
        .find(|p| p.snapshot_id() == child_revision)
        .unwrap();
    let forged = runtime::start(
        child.clone(),
        child_id.clone(),
        BTreeMap::from([(
            "topic".into(),
            Value::Text("Different explicit input".into()),
        )]),
    )
    .unwrap();
    // This is a coherent standalone Run, but it does not belong to this parent invocation.
    let valid: runtime::RunState =
        serde_json::from_value(serde_json::to_value(&forged.state).unwrap()).unwrap();
    let mut saved = serde_json::to_value(&first.state).unwrap();
    saved["runs"][&child_id]["state"] = serde_json::to_value(valid).unwrap();
    assert!(serde_json::from_value::<RunManager>(saved).is_err());
}

#[test]
fn malformed_use_headers_and_partial_unicode_sources_have_valid_diagnostics() {
    for header in [
        "?use child.basic as x",
        "!use child.basic",
        "!use child.basic alias x",
        "!use https://example.com as x",
        "!use ../child as x",
        "!use child..basic as x",
        "!use \"child.basic\" as x",
        "!use child.basic as x extra",
    ] {
        let source = format!(":language 1\n{header}\n-> end");
        assert!(compiler::compile(&source).is_err(), "{source}");
    }
    let root = ROOT.replace(":with topic", ":with topic = \"Über 🌿\"");
    for (end, _) in root.char_indices() {
        let bundle = bundle(&root[..end], CHILD);
        if let Err(error) = ExecutableSnapshot::build(bundle.clone()) {
            for diagnostic in error.diagnostics {
                assert!(bundle.patterns[&error.pattern]
                    .get(diagnostic.primary)
                    .is_some());
            }
        }
    }
}

#[test]
fn dependency_depth_limit_also_counts_already_compiled_shared_paths() {
    let mut patterns = BTreeMap::new();
    for index in 0..64 {
        let source = if index == 63 {
            ":language 1\n-> end".into()
        } else {
            format!(":language 1\n!use p{} as child\n-> end", index + 1)
        };
        patterns.insert(format!("p{index}"), source);
    }
    // Compile the shared long chain before a second path into it.
    patterns.insert(
        "root".into(),
        ":language 1\n!use p1 as direct\n!use z as wrapped\n-> end".into(),
    );
    patterns.insert("z".into(), ":language 1\n!use p1 as child\n-> end".into());
    let error = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns,
    })
    .unwrap_err();
    assert!(error.to_string().contains("64"), "{error:?}");
}

#[test]
fn manager_and_single_run_have_identical_effects_for_uncomposed_patterns() {
    let source = include_str!("../../../docs/pattern-markdown/examples/ideas.pattern.md");
    let fixture: Fixture = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/ideas.fixture.json"
    ))
    .unwrap();
    let single = host::simulate(
        compiler::compile(source).unwrap(),
        "same".into(),
        fixture.clone(),
    )
    .unwrap();
    let executable = ExecutableSnapshot::build(SourceBundle {
        root: "ideas".into(),
        patterns: BTreeMap::from([("ideas".into(), source.into())]),
    })
    .unwrap();
    let managed = host::simulate_snapshot(executable, "same".into(), fixture).unwrap();
    assert_eq!(managed.effects, single.effects);
    assert_eq!(managed.state.root(), &single.state);
    assert_eq!(
        managed
            .traces
            .iter()
            .map(|t| t.event.clone())
            .collect::<Vec<_>>(),
        single.traces
    );
    restored(&managed.state);
}
