use pattern_core::{
    compiler::{self, FormBlock},
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::Value,
};
use std::collections::BTreeMap;

const ORIGINAL: &str =
    include_str!("../../../artifacts/pattern-language-readability-review/original.pattern.md");
const PROPOSAL: &str =
    include_str!("../../../artifacts/pattern-language-readability-review/proposed.pattern.txt");

#[test]
fn original_source_retains_its_pre_extension_compiled_identity() {
    // Recorded by the installed engine before the readability implementation.
    assert_eq!(
        compiler::compile(ORIGINAL).unwrap().snapshot_id(),
        "m4-v1:58e1a8ce42b66ad7823b6bc0066f6f98b77958f1f5114922333c43a97f451356"
    );
}

#[test]
fn current_authoring_reference_examples_compile() {
    for source in [
        include_str!("../../../docs/pattern-markdown/readability.md"),
        include_str!("../../../docs/pattern-markdown/core-language.md"),
    ] {
        for example in source.split("```pattern\n").skip(1) {
            let example = example.split("```").next().unwrap();
            compiler::compile(example).unwrap_or_else(|errors| panic!("{errors:?}\n{example}"));
        }
    }
}

#[test]
fn malformed_partial_and_excessively_nested_local_branches_fail_closed() {
    for fake in ["arm_when", "arm_else"] {
        let source = format!(":language 1\n?branch {{\n!{fake} {{\n-> end\n}}\n}}\n-> end");
        invalid(&source, "Use :case");
    }
    let nested = |levels| {
        (0..levels).fold("-> end".to_owned(), |body, _| {
            format!("?branch {{\n:when true {{\n{body}\n}}\n:else {{\n-> end\n}}\n}}")
        })
    };
    compiler::compile(&format!(":language 1\n{}", nested(32))).unwrap();
    invalid(&format!(":language 1\n{}", nested(33)), "at most 32");
    let source = ":language 1\n:title \"Café 🙂\"\nchoice = !choose {\n- yes: \"Yes\"\n}\n?match choice {\n:case yes {\nform = !form {\nnotes = !ask [optional] {\nCafé?\n}\n}\n}\n}\n-> end";
    for end in source.char_indices().map(|(i, _)| i).chain([source.len()]) {
        let prefix = &source[..end];
        if let Err(errors) = compiler::compile(prefix) {
            for error in errors {
                assert!(prefix.get(error.primary).is_some());
                for (span, _) in error.secondary {
                    assert!(prefix.get(span).is_some());
                }
            }
        }
    }
}

#[test]
fn the_work_preserves_workbook_availability() {
    use pattern_core::snapshot::{ExecutableSnapshot, SourceBundle};
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "work".into(),
        patterns: BTreeMap::from([("work".into(), PROPOSAL.into())]),
    })
    .unwrap();
    let original = ExecutableSnapshot::build(SourceBundle {
        root: "work".into(),
        patterns: BTreeMap::from([("work".into(), ORIGINAL.into())]),
    })
    .unwrap();
    // Both forms have early completion and shared later sections. The existing
    // workbook projector rejects that shape rather than guessing a paper route.
    assert_eq!(
        original.worksheet().unwrap_err()[0].message,
        snapshot.worksheet().unwrap_err()[0].message
    );
}

fn start(source: &str) -> runtime::Transition {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|e| panic!("{e:?}")),
        "readability".into(),
        BTreeMap::new(),
    )
    .unwrap()
}

fn submit(state: &RunState, result: Fulfillment) -> runtime::Transition {
    runtime::transition(
        state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result,
        }),
    )
    .unwrap()
}

fn invalid(source: &str, message: &str) {
    let errors = compiler::compile(source).unwrap_err();
    assert!(
        errors.iter().any(|e| e.message.contains(message)),
        "{errors:?}"
    );
    for error in errors {
        assert!(source.get(error.primary).is_some());
    }
}

#[test]
fn the_work_preserves_all_41_routes_prompts_contracts_results_and_replay() {
    let mut routes = 0;
    for entry in ["single", "worksheet", "leave"] {
        for (truth, absolute) in [
            ("yes", "yes"),
            ("yes", "no"),
            ("yes", "unresolved"),
            ("no", ""),
            ("unresolved", ""),
        ] {
            for turnarounds in ["explore", "skip"] {
                for blank_optional in [false, true] {
                    if entry == "leave"
                        && (truth != "yes"
                            || absolute != "yes"
                            || turnarounds != "explore"
                            || blank_optional)
                    {
                        continue;
                    }
                    let mut old = start(ORIGINAL);
                    let mut new = start(PROPOSAL);
                    let mut choice_index = 0;
                    loop {
                        assert_eq!(
                            old.effects.iter().map(|e| &e.request).collect::<Vec<_>>(),
                            new.effects.iter().map(|e| &e.request).collect::<Vec<_>>()
                        );
                        assert_eq!(old.state.status(), new.state.status());
                        if old.state.status() == &Status::Completed {
                            break;
                        }
                        let paused = runtime::transition(&new.state, Event::Pause).unwrap();
                        let restored: RunState =
                            serde_json::from_str(&serde_json::to_string(&paused.state).unwrap())
                                .unwrap();
                        new = runtime::transition(&restored, Event::Resume).unwrap();
                        let pending = old.state.pending().unwrap();
                        assert_eq!(&pending.request, &new.state.pending().unwrap().request);
                        let result = match &pending.request {
                            Request::Choose { .. } | Request::Select { .. } => {
                                let id = match choice_index {
                                    0 => entry,
                                    1 => truth,
                                    2 if truth == "yes" => absolute,
                                    _ => turnarounds,
                                };
                                choice_index += 1;
                                Fulfillment::Selected(id.into())
                            }
                            Request::Form(form) => Fulfillment::Form(
                                form.blocks
                                    .iter()
                                    .filter_map(|b| match b {
                                        FormBlock::Ask { id, required, .. } => Some((
                                            id.clone(),
                                            Value::Text(if blank_optional && !required {
                                                String::new()
                                            } else {
                                                format!("Observation: {id}")
                                            }),
                                        )),
                                        _ => None,
                                    })
                                    .collect(),
                            ),
                            other => panic!("Unexpected effect: {other:?}"),
                        };
                        old = submit(&old.state, result.clone());
                        new = submit(&new.state, result);
                    }
                    assert_eq!(old.state.outputs(), new.state.outputs());
                    routes += 1;
                }
            }
        }
    }
    assert_eq!(routes, 41);
}

#[test]
fn nested_local_branches_join_without_reassignment_and_support_empty_arms() {
    let source = ":language 1\n:output result\n?branch {\n:when true {\n?match true {\n:case true {\nresult = 1\n}\n:else {\nresult = 2\n}\n}\n}\n:else {\nresult = 3\n}\n}\n?branch {\n:when false {\n}\n:else {\n}\n}\n-> end";
    assert_eq!(start(source).state.outputs()["result"], Value::Number(1.));
    invalid(
        &source.replace("result = 3", "other = 3"),
        "Output 'result'",
    );
    invalid(
        &source.replace("result = 3", "result = \"three\""),
        "different types",
    );
    invalid(&source.replace("-> end", "result = 4\n-> end"), "immutable");
    invalid(
        ":language 1\n?branch {\n:when true {\n}\n:else {\n}\n}",
        "falls off",
    );
}

#[test]
fn local_arms_cannot_capture_labels_or_mix_old_and_new_forms() {
    for body in [
        "bad:\n-> end",
        "-> outside",
        ":case yes -> outside\n:case no {\n-> end\n}",
        "?branch {\n:when true -> outside\n:else -> end\n}",
    ] {
        let source = format!(":language 1\n?branch {{\n:when true {{\n{body}\n}}\n:else {{\n-> end\n}}\n}}\noutside:\n-> end");
        assert!(compiler::compile(&source).is_err(), "{source}");
    }
}

#[test]
fn finite_choice_exhaustiveness_tracks_aliases_and_both_branch_catalogues() {
    let source = ":language 1\n:output result\n?branch {\n:when true {\nchoice = !choose {\n- a: \"A\"\n- b: \"B\"\n}\n}\n:else {\nchoice = !choose {\n- b: \"B\"\n- c: \"C\"\n}\n}\n}\nalias = choice\n?match alias {\n:case a {\nresult = 1\n}\n:case b {\nresult = 2\n}\n:case c {\nresult = 3\n}\n}\n-> end";
    let state = start(source).state;
    assert_eq!(
        submit(&state, Fulfillment::Selected("b".into()))
            .state
            .outputs()["result"],
        Value::Number(2.)
    );
    invalid(
        &source.replace(":case c {\nresult = 3\n}\n", ""),
        "every offered ID",
    );
    invalid(
        &source.replace(":case c", ":case invented"),
        "every offered ID",
    );
    invalid(
        ":language 1\n:input choice choice\n?match choice {\n:case a {\n-> end\n}\n}",
        "final :else",
    );
}

#[test]
fn optional_marker_retains_atomic_form_validation_and_rejects_conflicts() {
    let source = ":language 1\n:output form\nform = !form {\nrequired = !ask {\nRequired?\n}\nnotes = !ask [optional] {\nNotes?\n}\n}\n-> end";
    let state = start(source).state;
    let answers = BTreeMap::from([
        ("required".into(), Value::Text("yes".into())),
        ("notes".into(), Value::Text("".into())),
    ]);
    assert_eq!(
        submit(&state, Fulfillment::Form(answers)).state.status(),
        &Status::Completed
    );
    invalid(
        &source.replace("Notes?", ":required true\nNotes?"),
        "Duplicate",
    );
    invalid(
        &source.replace("[optional]", "[optional, optional]"),
        "Question parameters",
    );
    invalid(&source.replace("Notes?", "{{form.notes}}"), "not available");
}
