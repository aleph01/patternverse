use pattern_core::{
    compiler,
    host::{self, Fixture},
    runtime::{self, Event, Fulfillment, Limits, Receipt, Request, RunState, Status, Trace},
    value::{Choice, Type, Value},
};
use std::collections::BTreeMap;

const IDEAS: &str = include_str!("../../../docs/pattern-markdown/examples/ideas.pattern.md");
const OPEN: &str = ":language 1\n:output entries\n!collect entries {\n:max 2\n!ask text {\nEntry?\n}\n!rate score 0..10 {\nRate {{text}}\n}\n}\n-> end";
fn start(source: &str, inputs: BTreeMap<String, Value>) -> runtime::Transition {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|e| panic!("{e:?}\n{source}")),
        "collections".into(),
        inputs,
    )
    .unwrap()
}
fn event(state: &RunState, result: Fulfillment) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result,
    })
}
fn answer(state: &RunState, result: Fulfillment) -> runtime::Transition {
    runtime::transition(state, event(state, result)).unwrap()
}
fn json(state: &RunState) -> serde_json::Value {
    serde_json::to_value(state).unwrap()
}
fn restored(state: &RunState) -> RunState {
    let result = serde_json::from_value(json(state)).unwrap();
    assert_eq!(state, &result);
    result
}
fn records(state: &RunState, key: &str) -> Vec<Value> {
    let Value::List {
        element_type,
        items,
    } = &state.outputs()[key]
    else {
        panic!("not a list")
    };
    assert!(matches!(element_type, Type::Record(_)));
    assert!(items.iter().all(|v| &v.value_type() == element_type));
    items.clone()
}
fn record(fields: &[(&str, Value)]) -> Value {
    Value::Record(
        fields
            .iter()
            .map(|(k, v)| ((*k).into(), v.clone()))
            .collect(),
    )
}
fn invalid(source: &str) {
    let errors = compiler::compile(source).unwrap_err();
    assert!(!errors.is_empty());
    for e in errors {
        assert!(source.get(e.primary).is_some(), "invalid diagnostic span");
    }
}

#[test]
fn open_records_are_transactional_fresh_and_bounded() {
    let first = start(OPEN, BTreeMap::new());
    assert_eq!(
        first.effects[0].collection.as_ref().unwrap().record_index,
        Some(0)
    );
    let second = answer(&first.state, Fulfillment::Text("First".into()));
    assert_eq!(
        json(&second.state)["collection"]["completed"],
        serde_json::json!([])
    );
    assert!(second.state.outputs().is_empty());
    assert!(matches!(&second.effects[0].request, Request::Rate{prompt,..} if prompt=="Rate First"));
    let original = json(&second.state);
    assert!(runtime::transition(
        &second.state,
        event(&second.state, Fulfillment::Rating(11.))
    )
    .is_err());
    // A started record cannot be ended through a forged continuation answer.
    assert!(runtime::transition(
        &second.state,
        event(&second.state, Fulfillment::Selected("finish".into()))
    )
    .is_err());
    assert_eq!(json(&second.state), original);
    let continue_turn = answer(&second.state, Fulfillment::Rating(5.));
    assert!(
        matches!(&continue_turn.effects[0].request, Request::Choose{options,collection_continuation:Some(meta),..}
        if options.iter().map(|v|v.value.as_str()).collect::<Vec<_>>()==vec!["add","finish"] && meta.completed==1 && meta.min==1 && meta.max==2)
    );
    assert_eq!(
        continue_turn.effects[0]
            .collection
            .as_ref()
            .unwrap()
            .record_index,
        None
    );
    assert!(json(&continue_turn.state)["collection"]["locals"]
        .as_object()
        .unwrap()
        .is_empty());
    assert!(runtime::transition(
        &continue_turn.state,
        event(&continue_turn.state, Fulfillment::Selected("bogus".into()))
    )
    .is_err());
    let next = answer(&continue_turn.state, Fulfillment::Selected("add".into()));
    assert_eq!(next.effects[0].node_id, first.effects[0].node_id);
    assert_ne!(next.effects[0].effect_id, first.effects[0].effect_id);
    assert_eq!(
        next.effects[0].collection.as_ref().unwrap().record_index,
        Some(1)
    );
    assert!(json(&next.state)["collection"]["locals"]
        .as_object()
        .unwrap()
        .is_empty());
    let second = answer(&restored(&next.state), Fulfillment::Text("Second".into()));
    assert!(
        matches!(&second.effects[0].request, Request::Rate{prompt,..} if prompt=="Rate Second")
    );
    let done = answer(&second.state, Fulfillment::Rating(9.));
    assert_eq!(done.state.status(), &Status::Completed);
    assert!(done.effects.is_empty()); // No continuation after maximum.
    assert_eq!(
        records(&done.state, "entries"),
        vec![
            record(&[
                ("text", Value::Text("First".into())),
                ("score", Value::Number(5.))
            ]),
            record(&[
                ("text", Value::Text("Second".into())),
                ("score", Value::Number(9.))
            ]),
        ]
    );
    assert!(done
        .traces
        .iter()
        .any(|t| matches!(t, Trace::CollectionCompleted(_))));
    restored(&done.state);
}

#[test]
fn minimum_runs_automatically_then_finish_commits_only_complete_records() {
    let source = OPEN.replace(":max 2", ":min 2\n:max 4");
    let mut state = start(&source, BTreeMap::new()).state;
    for index in 0..2 {
        state = answer(&state, Fulfillment::Text(format!("Entry {index}"))).state;
        let turn = answer(&state, Fulfillment::Rating(3.));
        assert_eq!(
            turn.effects[0].request.kind(),
            if index == 0 {
                "interaction.ask"
            } else {
                "interaction.choose"
            }
        );
        state = turn.state;
    }
    let done = answer(&state, Fulfillment::Selected("finish".into()));
    assert_eq!(records(&done.state, "entries").len(), 2);
    assert_eq!(done.state.status(), &Status::Completed);
}

#[test]
fn zero_minimum_and_zero_maximum_produce_typed_empty_lists() {
    for max in [0, 2] {
        let source = OPEN.replace(":max 2", &format!(":min 0\n:max {max}"));
        let mut turn = start(&source, BTreeMap::new());
        if max > 0 {
            assert!(
                matches!(&turn.effects[0].request, Request::Choose{collection_continuation:Some(meta),..} if meta.completed==0)
            );
            turn = answer(
                &restored(&turn.state),
                Fulfillment::Selected("finish".into()),
            );
        }
        assert_eq!(turn.state.status(), &Status::Completed);
        assert!(records(&turn.state, "entries").is_empty());
        assert_eq!(
            turn.state.outputs()["entries"].value_type(),
            Type::List(Box::new(Type::Record(BTreeMap::from([
                ("text".into(), Type::Text),
                ("score".into(), Type::Number)
            ]))))
        );
    }
}

#[test]
fn mapped_collections_follow_input_order_once_and_skip_empty_sources() {
    let source = ":language 1\n:input items list<text>\n:output entries\n!collect entries {\n:from items\n:as item\n= original item\n!ask note {\nAbout {{item}}\n}\n}\n-> end";
    for texts in [vec![], vec!["B", "A", "B"]] {
        let items = texts.iter().map(|s| Value::Text((*s).into())).collect();
        let mut turn = start(
            source,
            BTreeMap::from([(
                "items".into(),
                Value::List {
                    element_type: Type::Text,
                    items,
                },
            )]),
        );
        for text in &texts {
            assert!(
                matches!(&turn.state.pending().unwrap().request,Request::Ask{prompt} if prompt==&format!("About {text}"))
            );
            turn = answer(
                &restored(&turn.state),
                Fulfillment::Text(format!("Note {text}")),
            );
            assert!(turn
                .effects
                .iter()
                .all(|e| e.request.kind() != "interaction.choose"));
        }
        assert_eq!(turn.state.status(), &Status::Completed);
        assert_eq!(
            records(&turn.state, "entries"),
            texts
                .iter()
                .map(|s| record(&[
                    ("original", Value::Text((*s).into())),
                    ("note", Value::Text(format!("Note {s}")))
                ]))
                .collect::<Vec<_>>()
        );
    }
}

#[test]
fn synthetic_example_simulates_open_then_mapped_records_in_the_real_runtime() {
    let fixture: Fixture = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/ideas.fixture.json"
    ))
    .unwrap();
    let result =
        host::simulate(compiler::compile(IDEAS).unwrap(), "ideas".into(), fixture).unwrap();
    assert_eq!(records(&result.state, "ideas").len(), 2);
    assert_eq!(
        records(&result.state, "plans"),
        vec![
            record(&[
                ("idea", Value::Text("Sketch a tree".into())),
                ("next_step", Value::Text("Find a pencil".into()))
            ]),
            record(&[
                ("idea", Value::Text("Plant herbs".into())),
                ("next_step", Value::Text("Choose a pot".into()))
            ]),
        ]
    );
    assert!(
        matches!(&result.effects.last().unwrap().request,Request::Show { markdown, .. } if markdown=="You explored 2 ideas.")
    );
    restored(&result.state);
}

#[test]
fn record_paths_work_in_templates_expressions_and_dynamic_choices() {
    let source=":language 1\n:output result\n!collect original {\n:max 1\n!agent options {\n:returns choices\nSuggest options\n}\n}\n!collect copies {\n:from original\n:as item\n= copied item\n}\n!collect result {\n:from copies\n:as item\n!choose selected {\n:from item.copied.options\nPick\n}\n= key selected.value\n= count_options count(item.copied.options)\n!show {\nChose {{selected.label}} from {{item.copied.options}}\n}\n}\n-> end";
    let first = start(source, BTreeMap::new());
    let next = answer(
        &first.state,
        Fulfillment::Generated(Value::Choices(vec![Choice {
            value: "a".into(),
            label: "Alpha".into(),
        }])),
    );
    let done = answer(&restored(&next.state), Fulfillment::Selected("a".into()));
    assert_eq!(done.state.status(), &Status::Completed);
    assert_eq!(
        records(&done.state, "result"),
        vec![record(&[
            (
                "selected",
                Value::Choice(Choice {
                    value: "a".into(),
                    label: "Alpha".into()
                })
            ),
            ("key", Value::Text("a".into())),
            ("count_options", Value::Number(1.))
        ])]
    );
    assert!(
        matches!(&done.effects[0].request,Request::Show { markdown, .. } if markdown.starts_with("Chose Alpha from"))
    );
}

#[test]
fn mapped_choices_have_readonly_alias_and_copy_only_explicit_fields() {
    let source=":language 1\n:input choices choices\n:output entries\n!collect entries {\n:from choices\n:as item\n= key item.value\n= title item.label\n}\n-> end";
    let done = start(
        source,
        BTreeMap::from([(
            "choices".into(),
            Value::Choices(vec![Choice {
                value: "a".into(),
                label: "Alpha".into(),
            }]),
        )]),
    );
    assert_eq!(
        records(&done.state, "entries"),
        vec![record(&[
            ("key", Value::Text("a".into())),
            ("title", Value::Text("Alpha".into()))
        ])]
    );
    invalid(&source.replace("= key item.value", "= item item.value"));
    invalid(&source.replace("= key item.value", "= choices item.value"));
    invalid(&source.replace(":as item", ":as choices"));
    invalid(&source.replace(":as item", ":as entries"));
}

#[test]
fn collection_scope_never_leaks_or_shadows_root_bindings() {
    invalid(&OPEN.replace("-> end", "!show {\n{{text}}\n}\n-> end"));
    invalid(&OPEN.replace(":output entries", ":output text"));
    invalid(&OPEN.replace("!collect entries", "= text \"root\"\n!collect entries"));
    invalid(&OPEN.replace("Entry?", "{{entries}}"));
    invalid(&OPEN.replace("Entry?", "{{score}}"));
    invalid(&OPEN.replace("Entry?", "{{missing.field}}"));
    let source = OPEN
        .replace("!collect entries", "= root \"Readable\"\n!collect entries")
        .replace("Entry?", "{{root}}");
    let first = start(&source, BTreeMap::new());
    assert!(matches!(&first.effects[0].request,Request::Ask{prompt} if prompt=="Readable"));
}

#[test]
fn collection_grammar_and_bounds_fail_closed_with_valid_spans() {
    for attributes in [
        "",
        ":max -1",
        ":max 1.5",
        ":max \"2\"",
        ":max 4294967296",
        ":max 0",
        ":min 3\n:max 2",
        ":max 2\n:max 3",
        ":max 2\n:as item",
        ":from xs",
        ":from xs\n:as item\n:max 2",
        ":from xs\n:as item\n:min 1",
        ":from 1\n:as item",
    ] {
        invalid(&format!(":language 1\n:input xs list<text>\n!collect entries {{\n{attributes}\n!ask text {{\nText\n}}\n}}\n-> end"));
    }
    for body in [
        "!collect nested {\n:max 1\n!ask x {\nX\n}\n}",
        "?branch {\n:when true -> end\n:else -> end\n}",
        "?match true {\n:case true -> end\n:else -> end\n}",
        "Here:",
        "-> end",
        "= entries 2",
        "plain Markdown",
    ] {
        invalid(&format!(
            ":language 1\n!collect entries {{\n:max 1\n{body}\n}}\n-> end"
        ));
    }
    invalid(":language 1\n!collect entries {\n:max 1\n}\n-> end");
    invalid(":language 1\n!collect entries\n:max 1\n!ask text\nText\n-> end");
}

#[test]
fn shorthand_body_and_unicode_have_stable_byte_spans() {
    let source=":language 1\n:output entries\n!collect entries {\n:max 1\n!ask text\nÜber 🌿\n= copy text\n}\n-> end";
    let first = start(source, BTreeMap::new());
    assert!(source.get(first.effects[0].span.clone()).is_some());
    let done = answer(
        &first.state,
        Fulfillment::Text("!collect code {\n-> end\n}".into()),
    );
    assert_eq!(
        records(&done.state, "entries")[0],
        record(&[
            ("text", Value::Text("!collect code {\n-> end\n}".into())),
            ("copy", Value::Text("!collect code {\n-> end\n}".into()))
        ])
    );
    for (end, _) in source.char_indices() {
        if let Err(errors) = compiler::compile(&source[..end]) {
            for error in errors {
                assert!(source[..end].get(error.primary).is_some());
            }
        }
    }
}

#[test]
fn pause_restore_resume_preserves_agent_and_continuation_identity() {
    let source=":language 1\n:output entries\n!collect entries {\n:max 2\n!agent suggestion {\n:returns text\nSuggest\n}\n!ask review {\nReview {{suggestion}}\n}\n}\n-> end";
    let first = start(source, BTreeMap::new());
    let generated = event(
        &first.state,
        Fulfillment::Generated(Value::Text("Accepted generation".into())),
    );
    let second = runtime::transition(&first.state, generated.clone()).unwrap();
    let continuation = answer(&second.state, Fulfillment::Text("Okay".into()));
    for state in [&first.state, &second.state, &continuation.state] {
        let pending = state.pending().unwrap().clone();
        let paused = runtime::transition(state, Event::Pause).unwrap();
        assert!(paused.effects.is_empty());
        assert_eq!(paused.state.status(), &Status::Paused);
        assert_eq!(paused.state.pending(), Some(&pending));
        assert_eq!(
            runtime::transition(
                &paused.state,
                Event::Retry {
                    effect_id: pending.effect_id.clone()
                }
            ),
            Err(runtime::Error::Paused)
        );
        assert_eq!(
            runtime::transition(
                &paused.state,
                event(&paused.state, Fulfillment::Text("late".into()))
            ),
            Err(runtime::Error::Paused)
        );
        let resumed = runtime::transition(&restored(&paused.state), Event::Resume).unwrap();
        assert_eq!(&resumed.state, state);
        assert_eq!(resumed.effects, vec![pending]);
    }
    let replay = runtime::transition(&restored(&continuation.state), generated).unwrap();
    assert_eq!(replay.state, continuation.state);
    assert!(replay.effects.is_empty());
    let done = answer(&replay.state, Fulfillment::Selected("finish".into()));
    assert_eq!(done.state.ledger().len(), 3);
    assert_eq!(records(&done.state, "entries").len(), 1);
}

#[test]
fn duplicate_last_reply_cannot_advance_the_next_record() {
    let source = OPEN.replace(":max 2", ":min 2\n:max 2");
    let first = start(&source, BTreeMap::new());
    let second = answer(&first.state, Fulfillment::Text("A".into()));
    let accepted = event(&second.state, Fulfillment::Rating(4.));
    let next = runtime::transition(&second.state, accepted.clone()).unwrap();
    let duplicate = runtime::transition(&restored(&next.state), accepted).unwrap();
    assert_eq!(duplicate.state, next.state);
    assert!(duplicate.effects.is_empty());
    assert_eq!(
        duplicate
            .state
            .pending()
            .unwrap()
            .collection
            .as_ref()
            .unwrap()
            .record_index,
        Some(1)
    );
}

#[test]
fn cancellation_and_failure_drop_current_frame_without_success_outputs() {
    let first = start(OPEN, BTreeMap::new());
    let partial = answer(&first.state, Fulfillment::Text("Unfinished".into()));
    for (event, status) in [
        (Event::Cancel, Status::Cancelled),
        (Event::Fail, Status::Failed),
    ] {
        for state in [
            partial.state.clone(),
            runtime::transition(&partial.state, Event::Pause)
                .unwrap()
                .state,
        ] {
            let late = crate::event(&state, Fulfillment::Rating(4.));
            let terminal = runtime::transition(&state, event.clone()).unwrap();
            assert_eq!(terminal.state.status(), &status);
            assert!(terminal.state.pending().is_none());
            assert!(terminal.state.outputs().is_empty());
            assert_eq!(json(&terminal.state)["collection"], serde_json::Value::Null);
            assert_eq!(
                runtime::transition(&restored(&terminal.state), late),
                Err(runtime::Error::Terminal)
            );
            assert_eq!(
                runtime::transition(&terminal.state, Event::Resume),
                Err(runtime::Error::Terminal)
            );
        }
    }
}

#[test]
fn inconsistent_collection_snapshots_are_rejected() {
    let first = start(OPEN, BTreeMap::new());
    let second = answer(&first.state, Fulfillment::Text("A".into()));
    let continuation = answer(&second.state, Fulfillment::Rating(2.));
    for (state, path, replacement) in [
        (&second.state, "/collection/locals", serde_json::json!({})),
        (
            &second.state,
            "/collection/phase/Body/pc",
            serde_json::json!(0),
        ),
        (&second.state, "/collection/source", serde_json::json!([])),
        (
            &second.state,
            "/pending/collection/record_index",
            serde_json::json!(99),
        ),
        (
            &continuation.state,
            "/collection/completed",
            serde_json::json!([]),
        ),
        (
            &continuation.state,
            "/pending/request/payload/collection_continuation/completed",
            serde_json::json!(9),
        ),
        (
            &continuation.state,
            "/limits/max_collection_records",
            serde_json::json!(1),
        ),
    ] {
        let mut saved = json(state);
        *saved
            .pointer_mut(path)
            .unwrap_or_else(|| panic!("missing {path}")) = replacement;
        assert!(
            serde_json::from_value::<RunState>(saved).is_err(),
            "accepted tampered {path}"
        );
    }
}

#[test]
fn host_limits_reject_without_truncating_authored_or_mapped_counts() {
    let pattern = compiler::compile(OPEN).unwrap();
    assert_eq!(
        runtime::start_with_limits(
            pattern.clone(),
            "limit".into(),
            BTreeMap::new(),
            Limits {
                max_collection_records: 1
            }
        ),
        Err(runtime::Error::CollectionLimit)
    );
    assert!(runtime::start_with_limits(
        pattern,
        "limit".into(),
        BTreeMap::new(),
        Limits {
            max_collection_records: 2
        }
    )
    .is_ok());
    let source=":language 1\n:input items list<number>\n:output entries\n!collect entries {\n:from items\n:as item\n= copy item\n}\n-> end";
    let pattern = compiler::compile(source).unwrap();
    let inputs = BTreeMap::from([(
        "items".into(),
        Value::List {
            element_type: Type::Number,
            items: vec![Value::Number(1.), Value::Number(2.)],
        },
    )]);
    assert_eq!(
        runtime::start_with_limits(
            pattern.clone(),
            "limit".into(),
            inputs.clone(),
            Limits {
                max_collection_records: 1
            }
        ),
        Err(runtime::Error::CollectionLimit)
    );
    let done = runtime::start_with_limits(
        pattern,
        "limit".into(),
        inputs,
        Limits {
            max_collection_records: 2,
        },
    )
    .unwrap();
    assert_eq!(records(&done.state, "entries").len(), 2);
    let zero = compiler::compile(&OPEN.replace(":max 2", ":min 0\n:max 0")).unwrap();
    assert!(runtime::start_with_limits(
        zero,
        "limit".into(),
        BTreeMap::new(),
        Limits {
            max_collection_records: 0
        }
    )
    .is_ok());
}

#[test]
fn show_only_and_pure_bodies_terminate_at_the_limit() {
    let source=":language 1\n:output entries\n!collect entries {\n:min 3\n:max 3\n!show {\nEntry\n}\n}\n-> end";
    let done = start(source, BTreeMap::new());
    assert_eq!(done.state.status(), &Status::Completed);
    assert_eq!(done.effects.len(), 3);
    assert_eq!(records(&done.state, "entries"), vec![record(&[]); 3]);
    restored(&done.state);
    let derived = start(
        &source.replace("!show {\nEntry\n}", "= fixed 7"),
        BTreeMap::new(),
    );
    assert_eq!(
        records(&derived.state, "entries"),
        vec![record(&[("fixed", Value::Number(7.))]); 3]
    );
}

#[test]
fn cli_checks_and_simulates_collection_fixture() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    for command in ["check", "simulate"] {
        let mut process = std::process::Command::new(env!("CARGO_BIN_EXE_pattern"));
        process
            .current_dir(&root)
            .arg(command)
            .arg("docs/pattern-markdown/examples/ideas.pattern.md");
        if command == "simulate" {
            process.arg("docs/pattern-markdown/examples/ideas.fixture.json");
        }
        let result = process.output().unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        if command == "simulate" {
            let result: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
            assert_eq!(result["state"]["status"], "Completed");
        }
    }
}

#[test]
fn collections_join_only_with_identical_record_schemas() {
    let source = ":language 1\n:input left boolean\n:output entries\n?branch {\n:when left -> left_path\n:else -> right_path\n}\nleft_path:\n!collect entries {\n:max 1\n= number 1\n}\n-> joined\nright_path:\n!collect entries {\n:max 1\n= number 2\n}\njoined:\n-> end";
    for left in [true, false] {
        let done = start(
            source,
            BTreeMap::from([("left".into(), Value::Boolean(left))]),
        );
        assert_eq!(
            records(&done.state, "entries"),
            vec![record(&[(
                "number",
                Value::Number(if left { 1. } else { 2. })
            )])]
        );
        restored(&done.state);
    }
    invalid(&source.replace("= number 2", "= text \"different schema\""));
    invalid(&source.replace("= number 2", "= number \"different type\""));
    // A possibly assigned root name may not be hidden by a record field at the join.
    let source = ":language 1\n?branch {\n:when true -> assigned\n:else -> joined\n}\nassigned:\n= prior 1\njoined:\n!collect entries {\n:max 1\n= prior 2\n}\n-> end";
    invalid(source);
}

#[test]
fn failed_derived_record_rolls_back_receipt_and_completion() {
    let source = ":language 1\n:output entries\n!collect entries {\n:max 1\n!agent number {\n:returns number\nA number\n}\n= doubled number * 2\n}\n-> end";
    let first = start(source, BTreeMap::new());
    let saved = json(&first.state);
    assert!(matches!(
        runtime::transition(
            &first.state,
            event(&first.state, Fulfillment::Generated(Value::Number(1e308)))
        ),
        Err(runtime::Error::Expression(_))
    ));
    assert_eq!(json(&first.state), saved);
    assert!(first.state.ledger().is_empty());
    let done = answer(&first.state, Fulfillment::Generated(Value::Number(2.)));
    assert_eq!(
        records(&done.state, "entries"),
        vec![record(&[
            ("number", Value::Number(2.)),
            ("doubled", Value::Number(4.))
        ])]
    );
}

#[test]
fn equality_compares_record_fields_with_semantic_choice_identity() {
    let source = ":language 1\n:input first choice\n:input second choice\n:output same\n!collect left {\n:max 1\n= choice first\n}\n!collect right {\n:max 1\n= choice second\n}\n= same left == right\n-> end";
    for (id, expected) in [("a", true), ("b", false)] {
        let done = start(
            source,
            BTreeMap::from([
                (
                    "first".into(),
                    Value::Choice(Choice {
                        value: "a".into(),
                        label: "Alpha".into(),
                    }),
                ),
                (
                    "second".into(),
                    Value::Choice(Choice {
                        value: id.into(),
                        label: "Another label".into(),
                    }),
                ),
            ]),
        );
        assert_eq!(done.state.outputs()["same"], Value::Boolean(expected));
    }
}
