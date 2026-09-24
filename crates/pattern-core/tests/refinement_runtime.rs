use pattern_core::{
    compiler,
    refine::Decision,
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::Value,
};
use std::collections::BTreeMap;

const SOURCE: &str = ":language 1\n:output statement\n!refine[rounds=1, renewable] statement = \"Perhaps\" {\n :as current\n !ask change {\n  What would fit better than {{current}}?\n }\n -> propose change\n}\n-> end";
fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap(),
        "refinement".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}
fn reply(state: &RunState, result: Fulfillment) -> RunState {
    runtime::transition(
        state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result,
        }),
    )
    .unwrap()
    .state
}
fn restore(state: &RunState) -> RunState {
    serde_json::from_slice(&serde_json::to_vec(state).unwrap()).unwrap()
}
#[test]
fn initial_review_edits_and_acceptance_are_not_generation() {
    let state = start(SOURCE);
    assert!(matches!(
        state.pending().unwrap().request,
        Request::Refine { .. }
    ));
    let edited = restore(&reply(&state, Fulfillment::Edited("My own wording".into())));
    assert!(
        matches!(&edited.pending().unwrap().request, Request::Refine { review } if review.candidate == "My own wording")
    );
    let done = restore(&reply(&edited, Fulfillment::Reviewed(Decision::Accept)));
    assert_eq!(done.status(), &Status::Completed);
    let Value::Record(fields) = &done.outputs()["statement"] else {
        panic!()
    };
    assert_eq!(fields["value"], Value::Text("My own wording".into()));
    assert_eq!(fields["rounds"], Value::Number(0.0));
}
#[test]
fn proposals_pause_resume_renew_and_finish_without_acceptance() {
    let state = reply(&start(SOURCE), Fulfillment::Reviewed(Decision::Revise));
    let paused = restore(&runtime::transition(&state, Event::Pause).unwrap().state);
    assert!(runtime::transition(
        &paused,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text("late".into())
        })
    )
    .is_err());
    let resumed = runtime::transition(&paused, Event::Resume).unwrap().state;
    let proposed = restore(&reply(&resumed, Fulfillment::Text("Revised".into())));
    assert!(
        matches!(&proposed.pending().unwrap().request, Request::Refine { review } if review.at_checkpoint && review.choices.contains(&Decision::Continue))
    );
    let renewed = restore(&reply(&proposed, Fulfillment::Reviewed(Decision::Continue)));
    assert!(
        matches!(&renewed.pending().unwrap().request, Request::Ask { prompt } if prompt.contains("Revised"))
    );
    let proposed = reply(&renewed, Fulfillment::Text("Not yet right".into()));
    let done = restore(&reply(&proposed, Fulfillment::Reviewed(Decision::Finish)));
    let Value::Record(fields) = &done.outputs()["statement"] else {
        panic!()
    };
    assert!(matches!(&fields["outcome"], Value::Choice(value) if value.value == "unresolved"));
    assert_eq!(fields["rounds"], Value::Number(2.0));
}
#[test]
fn nonrenewable_limit_direct_edit_duplicate_and_late_reply() {
    let source = SOURCE.replace(", renewable", "");
    let state = reply(&start(&source), Fulfillment::Reviewed(Decision::Revise));
    let state = reply(&state, Fulfillment::Text("Candidate".into()));
    let receipt = Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Edited("Manual".into()),
    };
    let edited = runtime::transition(&state, Event::Fulfill(receipt.clone()))
        .unwrap()
        .state;
    assert_eq!(
        runtime::transition(&edited, Event::Fulfill(receipt.clone()))
            .unwrap()
            .state,
        edited
    );
    assert!(runtime::transition(
        &edited,
        Event::Fulfill(Receipt {
            result: Fulfillment::Reviewed(Decision::Accept),
            ..receipt
        })
    )
    .is_err());
    let done = reply(&edited, Fulfillment::Reviewed(Decision::Finish));
    let Value::Record(fields) = &done.outputs()["statement"] else {
        panic!()
    };
    assert!(matches!(&fields["outcome"], Value::Choice(value) if value.value == "limit_reached"));
    restore(&done);
}
#[test]
fn rejects_bad_budget_missing_proposal_scope_leaks_and_non_text() {
    for source in [
        SOURCE.replace("rounds=1", "rounds=0"),
        SOURCE.replace("-> propose change", "!show\n No proposal"),
        SOURCE.replace("-> propose change", "-> propose 42"),
        SOURCE.replace("-> end", "!show\n {{current}}\n-> end"),
    ] {
        assert!(compiler::compile(&source).is_err(), "{source}");
    }
}

#[test]
fn executable_examples_and_original_attribute_form_use_the_same_engine() {
    for source in [
        include_str!("../../../docs/pattern-markdown/examples/overt-statements.pattern.md"),
        include_str!("../../../docs/pattern-markdown/examples/mismatch-detection.pattern.md"),
    ] {
        let pattern = compiler::compile(source).unwrap();
        let inputs = pattern
            .input_types()
            .keys()
            .map(|key| (key.clone(), Value::Text("Synthetic wording".into())))
            .collect();
        let initial = runtime::start(pattern, "example".into(), inputs)
            .unwrap()
            .state;
        let body = reply(&initial, Fulfillment::Reviewed(Decision::Revise));
        let agent = reply(&body, Fulfillment::Text("Use different words".into()));
        let reviewed = restore(&reply(
            &agent,
            Fulfillment::Generated(Value::Text("Revised synthetic wording".into())),
        ));
        assert!(
            matches!(&reviewed.pending().unwrap().request, Request::Refine { review } if review.candidate == "Revised synthetic wording")
        );
        assert_eq!(
            reply(&reviewed, Fulfillment::Reviewed(Decision::Accept)).status(),
            &Status::Completed
        );
    }
    let source = SOURCE.replace("!refine[rounds=1, renewable] statement = \"Perhaps\" {", "!refine statement {\n :initial \"Perhaps\"\n :rounds 1\n :renewable true\n :next change").replace(" -> propose change\n", "");
    assert!(matches!(
        start(&source).pending().unwrap().request,
        Request::Refine { .. }
    ));
}

#[test]
fn refinement_child_calls_are_isolated_replayable_and_cancel_with_the_parent() {
    use pattern_core::{
        manager::{self, Command, ManagerLimits, RunManager},
        snapshot::{ExecutableSnapshot, SourceBundle},
    };
    let source = SOURCE.replace(
        " !ask change {\n  What would fit better than {{current}}?\n }\n -> propose change",
        " !use editor as child {\n :with current\n }\n -> propose child.changed",
    );
    let child = ":language 1\n:input current text\n:output changed\n!ask changed\n Change {{current}}?\n-> end";
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "main".into(),
        patterns: BTreeMap::from([("main".into(), source), ("editor".into(), child.into())]),
    })
    .unwrap();
    let initial = manager::start(
        snapshot,
        "parent".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
    .state;
    let answer = |state: &RunManager, result| {
        let pending = state.pending().unwrap();
        manager::transition(
            state,
            Command {
                run_id: pending.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result,
                }),
            },
        )
        .unwrap()
        .state
    };
    let child_state = answer(&initial, Fulfillment::Reviewed(Decision::Revise));
    assert_ne!(child_state.pending().unwrap().run_id, "parent");
    let child_state: RunManager =
        serde_json::from_slice(&serde_json::to_vec(&child_state).unwrap()).unwrap();
    let reviewed = answer(&child_state, Fulfillment::Text("Child wording".into()));
    assert!(
        matches!(&reviewed.pending().unwrap().request, Request::Refine { review } if review.candidate == "Child wording")
    );
    let done = answer(&reviewed, Fulfillment::Reviewed(Decision::Accept));
    let _: RunManager = serde_json::from_slice(&serde_json::to_vec(&done).unwrap()).unwrap();
    let cancelled = manager::transition(
        &child_state,
        Command {
            run_id: "parent".into(),
            event: Event::Cancel,
        },
    )
    .unwrap()
    .state;
    assert_eq!(cancelled.root().status(), &Status::Cancelled);
    assert!(cancelled.root().outputs().is_empty());
    assert!(cancelled.pending().is_none());
    let _: RunManager = serde_json::from_slice(&serde_json::to_vec(&cancelled).unwrap()).unwrap();
}

#[test]
fn edited_receipts_cannot_be_agent_decisions_or_tamper_with_saved_candidates() {
    use pattern_core::refine::{self, Actor, Config};
    let initial = refine::start(
        "run".into(),
        "node".into(),
        "Words".into(),
        Config {
            rounds: 1,
            renewable: false,
        },
    )
    .unwrap()
    .state;
    let refine::Pending::Review { id } = initial.pending().unwrap() else {
        panic!()
    };
    assert_eq!(
        refine::transition(
            &initial,
            refine::Event::Edited {
                effect_id: id.clone(),
                value: "Agent text".into(),
                actor: Actor::Agent
            }
        )
        .unwrap_err(),
        refine::Error::ParticipantRequired
    );
    let state = start(SOURCE);
    let mut saved = serde_json::to_value(&state).unwrap();
    saved["refinement"]["state"]["candidate"] = serde_json::json!("Forged");
    assert!(serde_json::from_value::<RunState>(saved).is_err());
    for value in [" ".into(), "x".repeat(32001)] {
        assert!(runtime::transition(
            &state,
            Event::Fulfill(Receipt {
                effect_id: state.pending().unwrap().effect_id.clone(),
                result: Fulfillment::Edited(value)
            })
        )
        .is_err());
    }
}

#[test]
fn compact_headers_and_partial_unicode_source_report_valid_byte_ranges() {
    let source = SOURCE.replace("Perhaps", "Peut-être 🪴");
    for end in source
        .char_indices()
        .map(|(index, _)| index)
        .chain([source.len()])
    {
        let partial = &source[..end];
        if let Err(diagnostics) = compiler::compile(partial) {
            for diagnostic in diagnostics {
                assert!(partial.get(diagnostic.primary).is_some());
            }
        }
    }
    for bad in [
        "rounds=-1",
        "rounds=1, rounds=2",
        "rounds=1, renewable=maybe",
        "rounds=4294967296",
        "rounds=1, hidden=true",
    ] {
        assert!(compiler::compile(&SOURCE.replace("rounds=1, renewable", bad)).is_err());
    }
    let inspection = compiler::compile(SOURCE).unwrap().inspect().unwrap();
    assert_eq!(inspection.steps[0].kind, "refine");
    assert_eq!(inspection.steps[0].children.last().unwrap().kind, "propose");
}
