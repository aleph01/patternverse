//! Pure built-ins and absence fallback execute through the durable language runtime.
use pattern_core::{
    compiler,
    runtime::{self, RunState},
    value::{Choice, Type, Value},
};
use std::collections::BTreeMap;

fn run(body: &str) -> RunState {
    let source = format!(":language 1\n:output result\n{body}\n-> end");
    let pattern =
        compiler::compile(&source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}"));
    let state = runtime::start(pattern, "inline-functions".into(), BTreeMap::new())
        .unwrap()
        .state;
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&state).unwrap()).unwrap();
    assert_eq!(state, restored);
    state
}
fn output(body: &str) -> Value {
    run(body).outputs()["result"].clone()
}
fn invalid(body: &str) {
    let source = format!(":language 1\n{body}\n-> end");
    for error in compiler::compile(&source).expect_err(&source) {
        assert!(source.get(error.primary).is_some());
    }
}
fn text(value: &str) -> Value {
    Value::Text(value.into())
}
fn numbers(values: &[f64]) -> Value {
    Value::List {
        element_type: Type::Number,
        items: values.iter().copied().map(Value::Number).collect(),
    }
}

#[test]
fn coalescing_preserves_present_falsy_values_and_checks_both_branches() {
    for (ty, present, fallback, expected) in [
        ("text", "\"\"", "\"fallback\"", text("")),
        ("number", "0", "5", Value::Number(0.)),
        ("boolean", "false", "true", Value::Boolean(false)),
        ("list[number]", "[]", "[5]", numbers(&[])),
    ] {
        assert_eq!(
            output(&format!(
                "value: Optional[{ty}] = {present}\nresult = value ?? {fallback}"
            )),
            expected
        );
    }
    assert_eq!(output("result = None ?? 3"), Value::Number(3.));
    assert_eq!(
        output("value: Optional[text] = None\nresult = value ?? \"fallback\""),
        text("fallback")
    );
    assert_eq!(
        output("value: Optional[list[number]] = None\nresult = value ?? []"),
        numbers(&[])
    );
    for body in [
        "result = 3 ?? 4",
        "value: Optional[text] = None\nresult = value ?? 4",
        "result = None ?? None",
        "value: Optional[text] = \"present\"\nresult = value ?? unknown",
    ] {
        invalid(body);
    }
}

#[test]
fn coalescing_is_lazy_right_associative_and_has_documented_precedence() {
    assert_eq!(
        output("value: Optional[number] = 3\nresult = value ?? clamp(0, 10, 0)"),
        Value::Number(3.)
    );
    assert_eq!(
        output("a: Optional[number] = None\nb: Optional[number] = 7\nresult = a ?? b ?? 10"),
        Value::Number(7.)
    );
    assert_eq!(
        output("value: Optional[number] = None\nresult = value ?? 2 + 3 * 4 > 10 and true"),
        Value::Boolean(true)
    );
    assert_eq!(
        output("value: Optional[text] = None\nresult = value ?? \"  YES  \" |> trim |> lowercase"),
        text("yes")
    );
    assert_eq!(
        output("value: Optional[text] = None\nresult = value\n ?? \"fallback\""),
        text("fallback")
    );
    assert_eq!(
        output("value: Optional[text] = None\nresult = value ??\n \"fallback\""),
        text("fallback")
    );
    assert_eq!(
        output("None: Optional[number] = 8\nresult = None ?? 0"),
        Value::Number(8.)
    );
    let pattern = compiler::compile(
        ":language 1\nvalue: Optional[number] = None\nresult = value ?? clamp(0, 10, 0)\n-> end",
    )
    .unwrap();
    assert!(runtime::start(pattern, "absent".into(), BTreeMap::new()).is_err());
    invalid(&format!("result = {}1", "None ?? ".repeat(1000)));
}

#[test]
fn text_functions_use_literal_unicode_separators_and_preserve_empty_parts() {
    assert_eq!(
        output("result = join(split(\"|é||🫶|\", \"|\"), \";\")"),
        text(";é;;🫶;")
    );
    assert_eq!(output("result = join([]:text, \",\")"), text(""));
    assert_eq!(output("result = join([\"a\", \"b\"], \"\")"), text("ab"));
    assert_eq!(
        output("result = count(split(\"\", \",\"))"),
        Value::Number(1.)
    );
    for expression in [
        "contains(\"é 🫶\", \"🫶\")",
        "starts_with(\"éclair\", \"é\")",
        "ends_with(\"hello🫶\", \"🫶\")",
        "contains(\"\", \"\")",
        "starts_with(\"x\", \"\")",
        "ends_with(\"x\", \"\")",
    ] {
        assert_eq!(
            output(&format!("result = {expression}")),
            Value::Boolean(true)
        );
    }
    assert_eq!(
        output("result = contains(\"Hello\", \"hello\")"),
        Value::Boolean(false)
    );
    for expression in [
        "join([1], \",\")",
        "split(1, \",\")",
        "contains([1], \"1\")",
        "starts_with([1], 1)",
    ] {
        invalid(&format!("result = {expression}"));
    }
    let pattern =
        compiler::compile(":language 1\nresult = split(\"hello\", \"\")\n-> end").unwrap();
    assert!(runtime::start(pattern, "split".into(), BTreeMap::new()).is_err());
}

#[test]
fn numeric_and_optional_access_functions_cover_empty_lists() {
    assert_eq!(output("result = sum([2, -1, 0.5])"), Value::Number(1.5));
    assert_eq!(output("result = sum([]:number)"), Value::Number(0.));
    for (function, expected) in [("min", -1.), ("max", 4.), ("first", 4.), ("last", 2.)] {
        assert_eq!(
            output(&format!("result = {function}([4, -1, 2]) ?? 99")),
            Value::Number(expected)
        );
        assert_eq!(
            output(&format!("result = {function}([]:number) ?? 99")),
            Value::Number(99.)
        );
    }
    assert_eq!(
        output("result = first([{name: \"A\"}]) ?? {name: \"B\"}"),
        Value::Record(BTreeMap::from([("name".into(), text("A"))]))
    );
    for expr in [
        "sum([\"a\"])",
        "min([true])",
        "last(\"text\")",
        "first([]:Optional[text])",
    ] {
        invalid(&format!("result = {expr}"));
    }
    let pattern = compiler::compile(":language 1\nresult = sum([1e308, 1e308])\n-> end").unwrap();
    assert!(runtime::start(pattern, "overflow".into(), BTreeMap::new()).is_err());
}

#[test]
fn predicates_short_circuit_and_preserve_empty_collection_laws() {
    let helpers = "fn positive(n: number) -> boolean => n > 0\nfn checked(n: number) -> boolean => n == 1 or clamp(n, 10, 0) > 0\nfn rejected(n: number) -> boolean => n != 1 and clamp(n, 10, 0) > 0";
    for (expression, expected) in [
        ("find([1, 2], checked) ?? 99", Value::Number(1.)),
        ("any([1, 2], checked)", Value::Boolean(true)),
        ("all([1, 2], rejected)", Value::Boolean(false)),
        ("any([]:number, positive)", Value::Boolean(false)),
        ("all([]:number, positive)", Value::Boolean(true)),
        ("find([]:number, positive) ?? 99", Value::Number(99.)),
        ("find([-1, 0], positive) ?? 99", Value::Number(99.)),
    ] {
        assert_eq!(
            output(&format!("{helpers}\nresult = {expression}")),
            expected
        );
    }
    for expression in ["any([1], trim)", "all([1], missing)", "find([1], twice)"] {
        invalid(&format!(
            "fn twice(n: number) -> number => n * 2\nresult = {expression}"
        ));
    }
}

#[test]
fn distinct_and_membership_use_structural_equality_and_keep_first_values() {
    assert_eq!(
        output("result = distinct([2, 1, 2, 0, -0, 1])"),
        numbers(&[2., 1., 0.])
    );
    assert_eq!(
        output("result = contains([{name: \"A\"}], {name: \"A\"})"),
        Value::Boolean(true)
    );
    assert_eq!(output("result = distinct([]:number)"), numbers(&[]));
    let source = ":language 1\n:input items: list[choice]\n:input needle: choice\n:output result\nresult = {items: distinct(items), found: contains(items, needle)}\n-> end";
    let choice = |label: &str| {
        Value::Choice(Choice {
            value: "a".into(),
            label: label.into(),
        })
    };
    let state = runtime::start(
        compiler::compile(source).unwrap(),
        "choices".into(),
        BTreeMap::from([
            (
                "items".into(),
                Value::List {
                    element_type: Type::Choice,
                    items: vec![choice("First"), choice("Other label")],
                },
            ),
            ("needle".into(), choice("Different label")),
        ]),
    )
    .unwrap()
    .state;
    let Value::Record(result) = &state.outputs()["result"] else {
        panic!()
    };
    assert_eq!(result["found"], Value::Boolean(true));
    assert_eq!(
        result["items"],
        Value::List {
            element_type: Type::Choice,
            items: vec![choice("First")]
        }
    );
}

#[test]
fn existing_helpers_can_keep_new_builtin_names() {
    for name in [
        "join",
        "split",
        "contains",
        "starts_with",
        "ends_with",
        "sum",
        "min",
        "max",
        "first",
        "last",
        "find",
        "any",
        "all",
        "distinct",
    ] {
        assert_eq!(
            output(&format!(
                "fn {name}(n: number) -> number => n + 1\nresult = {name}(3)"
            )),
            Value::Number(4.)
        );
    }
}

#[test]
fn expansion_limits_apply_to_new_text_and_list_functions() {
    for (expression, input) in [
        ("join([value, value], \"\")", "x".repeat(600_000)),
        ("split(value, \",\")", ",".repeat(10_000)),
    ] {
        let pattern = compiler::compile(&format!(
            ":language 1\n:input value: text\nresult = {expression}\n-> end"
        ))
        .unwrap();
        assert!(runtime::start(
            pattern,
            "bounds".into(),
            BTreeMap::from([("value".into(), text(&input))])
        )
        .is_err());
    }
}
