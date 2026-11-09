//! Seedless left reduction keeps empty results explicit and callbacks fully typed.
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
    runtime::start(pattern, "reduce".into(), BTreeMap::new())
        .unwrap()
        .state
}
fn output(body: &str) -> Value {
    let state = start(body);
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&state).unwrap()).unwrap();
    assert_eq!(state, restored);
    restored.outputs()["result"].clone()
}
fn invalid(body: &str) {
    let source = format!(":language 1\n{body}\n-> end");
    for error in compiler::compile(&source).expect_err(&source) {
        assert!(source.get(error.primary).is_some());
    }
}

#[test]
fn all_callback_syntaxes_reduce_left_to_right_without_an_extra_seed() {
    for body in [
        "result = reduce([10, 3, 2], _ - _) ?? 99",
        "result = reduce([10, 3, 2], (acc, n) => acc - n) ?? 99",
        "fn subtract(acc: number, n: number) -> number => acc - n\nresult = reduce([10, 3, 2], subtract) ?? 99",
        "result = ([10, 3, 2] |> reduce(_ - _)) ?? 99",
    ] { assert_eq!(output(body), Value::Number(5.)); }
}

#[test]
fn empty_and_singleton_inputs_do_not_invoke_the_callback() {
    assert_eq!(
        output("result = reduce([]:number, (a, b) => clamp(a, 10, 0))"),
        Value::Optional {
            element_type: Type::Number,
            value: None
        }
    );
    assert_eq!(
        output("result = reduce([7], (a, b) => clamp(a, 10, 0))"),
        Value::Optional {
            element_type: Type::Number,
            value: Some(Box::new(Value::Number(7.)))
        }
    );
    assert_eq!(
        output("result = reduce([]:number, _ + _) ?? 99"),
        Value::Number(99.)
    );
    assert_eq!(
        output("result = reduce([1, -1], _ + _) ?? 99"),
        Value::Number(0.)
    );
    assert_eq!(
        output("result = reduce([true, false], _ and _) ?? true"),
        Value::Boolean(false)
    );
    assert_eq!(
        output("result = reduce([\"\"], concat(_, _)) ?? \"fallback\""),
        Value::Text("".into())
    );
}

#[test]
fn reduction_is_generic_and_nested_lambdas_keep_captures() {
    assert_eq!(
        output("result = reduce([\"a\", \"b\", \"c\"], concat(_, _)) ?? \"\""),
        Value::Text("abc".into())
    );
    assert_eq!(
        output("result = reduce([[1], [2, 3]], concat(_, _)) ?? []"),
        Value::List {
            element_type: Type::Number,
            items: vec![Value::Number(1.), Value::Number(2.), Value::Number(3.)]
        }
    );
    assert_eq!(output("result = reduce([{total: 2}, {total: 4}], (a, b) => {total: a.total + b.total}) ?? {total: 0}"), Value::Record(BTreeMap::from([("total".into(), Value::Number(6.))])));
    assert_eq!(output("bonus = 1\nresult = map([[1, 2], [3], []:number], group => reduce(group, (a, b) => a + b + bonus) ?? 0)"), Value::List { element_type: Type::Number, items: vec![Value::Number(4.), Value::Number(3.), Value::Number(0.)] });
}

#[test]
fn reduce_checks_arity_element_and_result_types_even_for_empty_lists() {
    for body in [
        "result = reduce([1], 0, _ + _)",
        "result = reduce([1], n => n + 1)",
        "result = reduce([1], (a, b) => true)",
        "result = reduce([]:number, (a, b) => true)",
        "result = reduce([]:Optional[text], (a, b) => a)",
        "result = reduce(\"text\", concat(_, _))",
        "fn wrong(a: number, b: number) -> text => \"wrong\"\nresult = reduce([1], wrong)",
    ] {
        invalid(body);
    }
    assert_eq!(
        output("fn reduce(n: number) -> number => n + 1\nresult = reduce(3)"),
        Value::Number(4.)
    );
}

#[test]
fn a_failing_reducer_rolls_back_the_pending_reply() {
    let state =
        start("answer = !ask {\nContinue?\n}\nresult = reduce([1, 2], (a, b) => clamp(a, 10, 0))");
    let saved = serde_json::to_vec(&state).unwrap();
    assert!(runtime::transition(
        &state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text("yes".into())
        })
    )
    .is_err());
    assert_eq!(serde_json::to_vec(&state).unwrap(), saved);
}
