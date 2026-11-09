//! Contextual callbacks retain lexical types, immutable captures, and durable replay.
use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, RunState},
    value::{Type, Value},
};
use std::collections::BTreeMap;

fn start(body: &str) -> RunState {
    let source = format!(":language 1\n:output result\n{body}\n-> end");
    let pattern =
        compiler::compile(&source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}"));
    runtime::start(pattern, "lambda-test".into(), BTreeMap::new())
        .unwrap()
        .state
}
fn output(body: &str) -> Value {
    let state = start(body);
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&state).unwrap()).unwrap();
    assert_eq!(state, restored);
    restored.outputs()["result"].clone()
}
fn numbers(values: &[f64]) -> Value {
    Value::List {
        element_type: Type::Number,
        items: values.iter().copied().map(Value::Number).collect(),
    }
}
fn invalid(body: &str) {
    let source = format!(":language 1\n{body}\n-> end");
    for error in compiler::compile(&source).expect_err(&source) {
        assert!(source.get(error.primary).is_some());
    }
}

#[test]
fn both_syntaxes_work_in_every_callback_position() {
    for expression in ["map([2, 8, 9], _ * 2)", "map([2, 8, 9], n => n * 2)"] {
        assert_eq!(
            output(&format!("result = {expression}")),
            numbers(&[4., 16., 18.])
        );
    }
    for expression in [
        "filter([2, 8, 9], _ >= 7)",
        "filter([2, 8, 9], n => n >= 7)",
    ] {
        assert_eq!(
            output(&format!("result = {expression}")),
            numbers(&[8., 9.])
        );
    }
    for expression in [
        "fold([2, 3], 10, _ - _)",
        "fold([2, 3], 10, (acc, n) => acc - n)",
    ] {
        assert_eq!(output(&format!("result = {expression}")), Value::Number(5.));
    }
    for (expression, expected) in [
        ("find([2, 8, 9], _ >= 7) ?? 0", Value::Number(8.)),
        ("find([2, 8, 9], n => n >= 7) ?? 0", Value::Number(8.)),
        ("any([2, 8], _ >= 7)", Value::Boolean(true)),
        ("any([2, 8], n => n >= 7)", Value::Boolean(true)),
        ("all([2, 8], _ >= 7)", Value::Boolean(false)),
        ("all([2, 8], n => n >= 7)", Value::Boolean(false)),
    ] {
        assert_eq!(output(&format!("result = {expression}")), expected);
    }
}

#[test]
fn placeholder_fields_calls_pipelines_and_source_order_are_inferred() {
    assert_eq!(
        output("result = [{score: 2}, {score: 4}] |> map(_.score)"),
        numbers(&[2., 4.])
    );
    assert_eq!(
        output("result = map([\"  YES  \"], trim(_) |> lowercase)"),
        Value::List {
            element_type: Type::Text,
            items: vec![Value::Text("yes".into())]
        }
    );
    assert_eq!(
        output("result = fold([1], {z: 9, a: 0}, {z: _.z, a: _})"),
        Value::Record(BTreeMap::from([
            ("z".into(), Value::Number(9.)),
            ("a".into(), Value::Number(1.))
        ]))
    );
}

#[test]
fn captures_and_nested_callbacks_keep_their_lexical_values() {
    assert_eq!(
        output("threshold = 7\nresult = filter([2, 8, 9], _ >= threshold)"),
        numbers(&[8., 9.])
    );
    let result = output(
        "offset = 1\nresult = map([2, 3], outer => map([4, 5], inner => outer * inner + offset))",
    );
    assert_eq!(
        result,
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[9., 11.]), numbers(&[13., 16.])]
        }
    );
    assert_eq!(output("result = map([{floor: 7, scores: [2, 8]}], group => filter(group.scores, _ >= group.floor))"), Value::List { element_type: Type::List(Box::new(Type::Number)), items: vec![numbers(&[8.])] });
    assert_eq!(
        output("result = map([2], n => map([3], n => n + 1))"),
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[4.])]
        }
    );
    assert_eq!(output("fn scale(values: list[number], factor: number) -> list[number] => map(values, _ * factor)\nresult = scale([2, 3], 4)"), numbers(&[8., 12.]));
}

#[test]
fn contextual_results_and_empty_inputs_keep_exact_types() {
    assert_eq!(
        output("result = map([]:number, n => []:text)"),
        Value::List {
            element_type: Type::List(Box::new(Type::Text)),
            items: vec![]
        }
    );
    for (expression, expected) in [
        ("any([]:number, _ > 0)", Value::Boolean(false)),
        ("all([]:number, n => n > 0)", Value::Boolean(true)),
        ("find([]:number, _ > 0) ?? 99", Value::Number(99.)),
    ] {
        assert_eq!(output(&format!("result = {expression}")), expected);
    }
    assert_eq!(output("seed: Optional[number] = None\nresult = fold([2, 3], seed, (acc, n) => (acc ?? 0) + n) ?? 0"), Value::Number(5.));
    assert_eq!(
        output("result = find([1, 2], _ == 1 or clamp(0, 10, 0) > 0) ?? 0"),
        Value::Number(1.)
    );
    assert_eq!(
        output("result = all([1, 2], n => n != 1 and clamp(0, 10, 0) > 0)"),
        Value::Boolean(false)
    );
}

#[test]
fn callbacks_cannot_escape_capture_future_values_or_bypass_contracts() {
    for body in [
        "result = map([1], _ >= 0 and _ <= 3)",
        "result = map([1], (a, b) => a + b)",
        "result = fold([1], 0, (a, a) => a)",
        "result = filter([1], n => n + 1)",
        "result = fold([1], 0, (acc, n) => true)",
        "result = map([1], n => later + n)\nlater = 3",
        "result = map([[1]], filter(_, _ > 0))",
        "result = n => n + 1",
        "result = [n => n + 1]",
        "result = map([1], n => _ + n)",
        "result = map([1], n => !ask {Question})",
        "result = map([1], n => shuffle([n]))",
        "fn leak(n: number) -> list[number] => map([n], _ + secret)\nsecret = 3\nresult = leak(1)",
    ] {
        invalid(body);
    }
    invalid(":input secret: number\nflow child {\n:input values: list[number]\n:output answer\nanswer = map(values, _ + secret)\n-> end\n}\nresult = 0");
}

#[test]
fn lambda_names_shadow_enum_names_without_rewriting_field_paths() {
    assert_eq!(
        output(
            "type Intent = answer | other\nresult = map([{answer: 3}], Intent => Intent.answer)"
        ),
        numbers(&[3.])
    );
    let result = output("type Intent = answer | other\nresult = map([1], n => Intent.answer)");
    let Value::List { items, .. } = result else {
        panic!()
    };
    assert!(matches!(&items[0], Value::Enum { variant, .. } if variant == "answer"));
    assert_eq!(
        output("fn _(n: number) -> number => n + 1\nresult = map([2], _)"),
        numbers(&[3.])
    );
    assert_eq!(
        output("_ = 3\nresult = map([2], n => _ + n)"),
        numbers(&[5.])
    );
}

#[test]
fn captured_answers_survive_pause_restore_and_replay_without_new_state_frames() {
    let state =
        start("offset = !rate 0..10 {\nChoose a number.\n}\nresult = map([1, 2], n => n + offset)");
    let paused = runtime::transition(&state, Event::Pause).unwrap().state;
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&paused).unwrap()).unwrap();
    let resumed = runtime::transition(&restored, Event::Resume).unwrap().state;
    let done = runtime::transition(
        &resumed,
        Event::Fulfill(Receipt {
            effect_id: resumed.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Rating(3.),
        }),
    )
    .unwrap()
    .state;
    assert_eq!(done.outputs()["result"], numbers(&[4., 5.]));
    let replayed: RunState = serde_json::from_slice(&serde_json::to_vec(&done).unwrap()).unwrap();
    assert_eq!(done, replayed);
}

#[test]
fn invalid_callback_execution_rolls_back_and_partial_unicode_spans_stay_valid() {
    let state = start("answer = !ask {\nContinue?\n}\nresult = map([1], n => clamp(n, 10, 0))");
    let saved = serde_json::to_vec(&state).unwrap();
    assert!(runtime::transition(
        &state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text("yes".into())
        })
    )
    .is_err());
    assert_eq!(saved, serde_json::to_vec(&state).unwrap());
    let source = ":language 1\nresult = map([\"é 🫶\"], note => concat(trim(note), \"!\"))\n-> end";
    for end in source
        .char_indices()
        .map(|(index, _)| index)
        .chain([source.len()])
    {
        if let Err(errors) = compiler::compile(&source[..end]) {
            for error in errors {
                assert!(source[..end].get(error.primary).is_some());
            }
        }
    }
}

#[test]
fn copied_capture_environments_remain_within_the_pure_value_budget() {
    let source = ":language 1\n:input huge: text\n:input values: list[number]\nresult = map(values, n => n > 0 or contains(huge, \"x\"))\n-> end";
    let pattern = compiler::compile(source).unwrap();
    let inputs = BTreeMap::from([
        ("huge".into(), Value::Text("x".repeat(600_000))),
        ("values".into(), numbers(&vec![1.; 100])),
    ]);
    assert!(runtime::start(pattern, "capture-budget".into(), inputs).is_err());
    invalid(&format!(
        "result = map([1], n => {})",
        "not ".repeat(1000) + "true"
    ));
}
