//! Shuffling preserves values and remains stable across native execution and durable replay.
use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, RunState, Status},
    value::{Choice, Type, Value},
};
use std::collections::{BTreeMap, BTreeSet};

fn start(source: &str, id: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}")),
        id.into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}

fn restored(state: &RunState) -> RunState {
    let copy = serde_json::from_slice(&serde_json::to_vec(state).unwrap()).unwrap();
    assert_eq!(state, &copy);
    copy
}

fn reply(state: &RunState, answer: &str) -> RunState {
    runtime::transition(
        state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text(answer.into()),
        }),
    )
    .unwrap()
    .state
}

fn sorted(value: &Value) -> Vec<String> {
    let Value::List { items, .. } = value else {
        panic!("Expected list")
    };
    let mut items: Vec<_> = items
        .iter()
        .map(|v| serde_json::to_string(v).unwrap())
        .collect();
    items.sort();
    items
}

#[test]
fn seeded_calls_and_pipelines_preserve_types_values_duplicates_and_originals() {
    for items in [
        "[1, 2, 2, 3, 4, 5]",
        "[\"é\", \"🙂\", \"é\", \"three\"]",
        "[{id: \"a\", score: 1}, {id: \"b\", score: 2}, {id: \"a\", score: 1}]",
        "[[1, 2], [3, 4], [1, 2]]",
        "[]:text",
        "[42]",
    ] {
        let source = format!(":language 1\n:output original\n:output result\n:output piped\noriginal = {items}\nresult = shuffle(original, \"fixture\")\npiped = original |> shuffle(\"fixture\")\n-> end");
        let run = restored(&start(&source, "one"));
        assert_eq!(run.outputs()["result"], run.outputs()["piped"]);
        assert_eq!(
            run.outputs()["result"].value_type(),
            run.outputs()["original"].value_type()
        );
        assert_eq!(
            sorted(&run.outputs()["result"]),
            sorted(&run.outputs()["original"])
        );
        assert_eq!(
            run.outputs()["result"],
            start(&source, "two").outputs()["result"]
        );
    }
}

#[test]
fn unseeded_shuffle_is_run_scoped_and_restores_before_and_after_it_executes() {
    let source = ":language 1\n:output result\nbefore = !ask {\nBegin?\n}\nresult = [1, 2, 3, 4, 5, 6, 7, 8] |> shuffle\nafter = !ask {\nKeep going?\n}\n-> end";
    let first = start(source, "run-1");
    let shuffled = reply(&restored(&first), "begin");
    let original_order = shuffled.inspect_bindings().unwrap()["result"].clone();
    assert_eq!(reply(&first, "begin"), shuffled);
    let paused = runtime::transition(&shuffled, Event::Pause).unwrap().state;
    let resumed = runtime::transition(&restored(&paused), Event::Resume)
        .unwrap()
        .state;
    assert_eq!(
        resumed.inspect_bindings().unwrap()["result"],
        original_order
    );
    let completed = restored(&reply(&resumed, "done"));
    assert_eq!(completed.status(), &Status::Completed);
    assert_eq!(completed.outputs()["result"], original_order);
    let orders: BTreeSet<_> = (0..16)
        .map(|id| {
            let run = reply(&start(source, &format!("run-{id}")), "begin");
            serde_json::to_string(&run.inspect_bindings().unwrap()["result"]).unwrap()
        })
        .collect();
    assert!(
        orders.len() > 1,
        "Different run identities must vary the order"
    );
}

#[test]
fn collection_iterations_have_distinct_stable_permutations_without_external_effects() {
    let source = ":language 1\n:output result\nresult = each unused in [1, 2, 3, 4] {\n order = shuffle([1, 2, 3, 4, 5, 6, 7, 8])\n -> yield order\n}\n-> end";
    let run = restored(&start(source, "iterations"));
    let Value::List { items, .. } = &run.outputs()["result"] else {
        panic!()
    };
    assert!(items.windows(2).any(|pair| pair[0] != pair[1]));
    assert!(items.iter().all(|item| sorted(item) == sorted(&items[0])));
    assert!(run.ledger().is_empty());
}

#[test]
fn empty_and_single_item_unseeded_results_keep_their_element_types() {
    for (items, expected) in [("[]:number", vec![]), ("[7]", vec![Value::Number(7.)])] {
        let run = start(
            &format!(":language 1\n:output result\nresult = shuffle({items})\n-> end"),
            "empty",
        );
        assert_eq!(
            run.outputs()["result"],
            Value::List {
                element_type: Type::Number,
                items: expected
            }
        );
    }
    let run = start(
        ":language 1\n:output result\nresult: list[text] = shuffle([])\n-> end",
        "annotated",
    );
    assert_eq!(
        run.outputs()["result"],
        Value::List {
            element_type: Type::Text,
            items: vec![]
        }
    );
}

#[test]
fn choice_catalogues_keep_authoritative_ids_and_labels() {
    for call in ["shuffle(options)", "shuffle(options, \"fixture\")"] {
        let source =
            format!(":language 1\n:input options choices\n:output result\nresult = {call}\n-> end");
        let choices = vec![
            Choice {
                value: "a".into(),
                label: "Same label".into(),
            },
            Choice {
                value: "b".into(),
                label: "Same label".into(),
            },
        ];
        let run = runtime::start(
            compiler::compile(&source).unwrap(),
            "choices".into(),
            BTreeMap::from([("options".into(), Value::Choices(choices.clone()))]),
        )
        .unwrap()
        .state;
        let Value::Choices(result) = &run.outputs()["result"] else {
            panic!()
        };
        assert_eq!(result.len(), choices.len());
        assert!(choices.iter().all(|choice| result.contains(choice)));
        restored(&run);
    }
}

#[test]
fn seeded_shuffle_is_allowed_in_helpers_but_unseeded_shuffle_requires_a_whole_binding() {
    let run = start(":language 1\n:output result\nfn order(items: list[number]) -> list[number] => shuffle(items, \"demo\")\nresult = order([1, 2, 3])\n-> end", "helper");
    assert_eq!(run.status(), &Status::Completed);
    for body in [
        "result = shuffle(1)",
        "result = shuffle(\"text\")",
        "result = shuffle([1, 2], 42)",
        "result = shuffle()",
        "result = shuffle([1], \"seed\", \"extra\")",
        "result = {order: shuffle([1, 2])}",
        "result = count(shuffle([1, 2]))",
        "result = shuffle([1, 2]) |> count",
        "fn order(items: list[number]) -> list[number] => shuffle(items)\nresult = order([1, 2])",
        "result: text = shuffle([1, 2])",
    ] {
        let source = format!(":language 1\n:output result\n{body}\n-> end");
        let errors = compiler::compile(&source).expect_err(&source);
        assert!(errors
            .iter()
            .all(|error| source.get(error.primary.clone()).is_some()));
    }
}

#[test]
fn altered_saved_permutations_are_rejected_by_replay() {
    let run = start(
        ":language 1\n:output result\nresult = shuffle([1, 2, 3])\n-> end",
        "tamper",
    );
    let mut saved = serde_json::to_value(&run).unwrap();
    saved["outputs"]["result"]["value"]["items"][0] =
        serde_json::to_value(Value::Number(999.)).unwrap();
    assert!(serde_json::from_value::<RunState>(saved).is_err());
}

#[test]
fn seeded_algorithm_has_a_portable_golden_order() {
    let run = start(
        ":language 1\n:output result\nresult = shuffle([1, 2, 3, 4, 5, 6], \"demo\")\n-> end",
        "golden",
    );
    assert_eq!(
        run.outputs()["result"],
        Value::List {
            element_type: Type::Number,
            items: [6., 2., 3., 1., 4., 5.]
                .into_iter()
                .map(Value::Number)
                .collect()
        }
    );
}

#[test]
fn existing_same_named_helpers_keep_their_meaning() {
    let source = ":language 1\n:output result\nfn shuffle(n: number) -> number => n + 1\nresult = shuffle(7)\n-> end";
    assert_eq!(
        start(source, "legacy").outputs()["result"],
        Value::Number(8.)
    );
}

#[test]
fn run_scoped_shuffle_can_be_lifted_to_an_optional_output() {
    let source =
        ":language 1\n:output result\nresult: Optional[list[number]] = shuffle([1, 2, 3])\n-> end";
    let run = start(source, "optional");
    assert!(matches!(
        run.outputs()["result"],
        Value::Optional { value: Some(_), .. }
    ));
    restored(&run);
}

#[test]
fn loop_iterations_shuffle_independently_and_restore_their_pending_order() {
    let source = ":language 1\n?loop[2] iteration = 0 {\n order = shuffle([1, 2, 3, 4, 5, 6, 7, 8])\n answer = !ask {\n{{order}}\n}\n -> repeat iteration + 1\n}\n-> end";
    let first = start(source, "loop-shuffle");
    let second = reply(&restored(&first), "continue");
    assert_ne!(
        first.pending().unwrap().request,
        second.pending().unwrap().request
    );
    assert_eq!(restored(&second).pending(), second.pending());
    assert_eq!(reply(&second, "finish").status(), &Status::Completed);
}

#[test]
fn child_flow_invocations_have_distinct_replayable_orders() {
    let source = ":language 1\n:output result\nflow reorder {\n :output order\n order = shuffle([1, 2, 3, 4, 5, 6, 7, 8])\n -> end\n}\nresult = each unused in [1, 2, 3] {\n child = !use reorder {\n }\n -> yield child.order\n}\n-> end";
    let bundle = pattern_core::snapshot::SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), source.into())]),
    };
    let snapshot = pattern_core::snapshot::ExecutableSnapshot::build(bundle).unwrap();
    let run = pattern_core::manager::start(
        snapshot,
        "child-shuffle".into(),
        BTreeMap::new(),
        pattern_core::manager::ManagerLimits::default(),
    )
    .unwrap()
    .state;
    let Value::List { items, .. } = &run.root().outputs()["result"] else {
        panic!()
    };
    assert!(items.windows(2).any(|pair| pair[0] != pair[1]));
    assert!(items.iter().all(|item| sorted(item) == sorted(&items[0])));
    let restored: pattern_core::manager::RunManager =
        serde_json::from_slice(&serde_json::to_vec(&run).unwrap()).unwrap();
    assert_eq!(restored, run);
}

#[test]
fn inspection_and_workbook_export_describe_run_scoped_shuffle_explicitly() {
    let source =
        ":language 1\n:output order\norder = shuffle([\"Pause\", \"Reflect\", \"Act\"])\n-> end";
    let compiled = compiler::compile(source).unwrap();
    let outline = compiled.inspect().unwrap();
    assert_eq!(outline.steps[0].kind, "shuffle");
    let bundle = pattern_core::snapshot::SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), source.into())]),
    };
    let snapshot = pattern_core::snapshot::ExecutableSnapshot::build(bundle).unwrap();
    let workbook = snapshot.worksheet().unwrap();
    assert_eq!(workbook.fidelity, "partial");
    assert!(workbook.markdown.contains("Shuffle"));
    assert!(workbook.markdown.contains("Pause"));
}
