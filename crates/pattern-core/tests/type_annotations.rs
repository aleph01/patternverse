use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, RunState, Status},
    value::{Type, Value},
};
use std::collections::BTreeMap;

fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}")),
        "annotations".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}

fn restore(state: &RunState) -> RunState {
    let restored = serde_json::from_slice(&serde_json::to_vec(state).unwrap()).unwrap();
    assert_eq!(state, &restored);
    restored
}

fn invalid(source: &str) {
    for error in compiler::compile(source).expect_err(source) {
        assert!(
            source.get(error.primary).is_some(),
            "invalid diagnostic span"
        );
    }
}

fn optional(ty: Type, value: Option<Value>) -> Value {
    Value::Optional {
        element_type: ty,
        value: value.map(Box::new),
    }
}

#[test]
fn annotations_infer_contextual_lists_records_and_optionals() {
    let state = start(
        r#":language 1
:output result
empty: list[choice] = []
notes: list[Optional[text]] = [None, "space"]
result: {empty: list[choice], notes: list[Optional[text]], note: Optional[text]} = {
    empty: empty,
    notes: notes,
    note: None
}
-> end"#,
    );
    assert_eq!(state.status(), &Status::Completed);
    let Value::Record(fields) = &state.outputs()["result"] else {
        panic!()
    };
    assert_eq!(
        fields["empty"],
        Value::List {
            element_type: Type::Choice,
            items: vec![]
        }
    );
    assert_eq!(fields["note"], optional(Type::Text, None));
    assert_eq!(
        fields["notes"],
        Value::List {
            element_type: Type::Optional(Box::new(Type::Text)),
            items: vec![
                optional(Type::Text, None),
                optional(Type::Text, Some(Value::Text("space".into())))
            ],
        }
    );
    assert_eq!(serde_json::to_value(&state).unwrap()["version"], 5);
    restore(&state);
}

#[test]
fn public_output_annotations_provide_context_and_check_every_arm() {
    let state = start(":language 1\n:output result: list[number]\nresult = []\n-> end");
    assert_eq!(
        state.outputs()["result"],
        Value::List {
            element_type: Type::Number,
            items: vec![]
        }
    );
    let state = start(":language 1\n:output note: Optional[text]\nnote = None\n-> end");
    assert_eq!(state.outputs()["note"], optional(Type::Text, None));
    invalid(":language 1\n:output result: text\n?branch {\n:when true {\nresult = \"yes\"\n}\n:else {\nresult = 3\n}\n}\n-> end");
}

#[test]
fn optional_effect_answers_narrow_and_survive_pause_and_replay() {
    let source = r#":language 1
:output cleaned
note: Optional[text] = !ask {
    What matters?
}
?branch {
    :when note != None {
        cleaned: text = trim(note)
    }
    :else {
        cleaned: text = "absent"
    }
}
-> end"#;
    let state = start(source);
    let paused = runtime::transition(&state, Event::Pause).unwrap().state;
    let resumed = runtime::transition(&restore(&paused), Event::Resume)
        .unwrap()
        .state;
    let done = runtime::transition(
        &resumed,
        Event::Fulfill(Receipt {
            effect_id: resumed.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text("  belonging  ".into()),
        }),
    )
    .unwrap()
    .state;
    assert_eq!(done.outputs()["cleaned"], Value::Text("belonging".into()));
    restore(&done);
}

#[test]
fn guards_narrow_optional_fields_and_optional_records_in_either_order() {
    for guard in ["entry.note != None", "None != entry.note"] {
        let state = start(&format!(
            r#":language 1
:output result
entry: {{note: Optional[text]}} = {{note: " value "}}
?branch {{
    :when {guard} {{
        result = trim(entry.note)
    }}
    :else {{
        result = "absent"
    }}
}}
-> end"#
        ));
        assert_eq!(state.outputs()["result"], Value::Text("value".into()));
        restore(&state);
    }
    let state = start(
        r#":language 1
:output result
entry: Optional[{note: text}] = {note: " value "}
?branch {
    :when entry == None {
        result = "absent"
    }
    :else {
        result = trim(entry.note)
    }
}
-> end"#,
    );
    assert_eq!(state.outputs()["result"], Value::Text("value".into()));
    restore(&state);
}

#[test]
fn narrowing_does_not_escape_joins_or_invent_truthiness() {
    for body in ["trim(note)", "note + 2", "count(note)"] {
        invalid(&format!(
            ":language 1\nnote: Optional[text] = None\nvalue = {body}\n-> end"
        ));
    }
    invalid(":language 1\nnote: Optional[text] = None\n!show {\n{{note}}\n}\n-> end");
    invalid(":language 1\nnote: Optional[text] = \"value\"\n?branch {\n:when note != None {\n!show {\n{{note}}\n}\n}\n:else {\n!show {\nAbsent\n}\n}\n}\nresult = trim(note)\n-> end");
    invalid(":language 1\nnote: Optional[text] = None\n?branch {\n:when note {\n-> end\n}\n:else {\n-> end\n}\n}\n-> end");
}

#[test]
fn helper_types_and_argument_result_context_support_square_brackets() {
    let state = start(
        r#":language 1
:output result
fn empty() -> list[text] => []
fn keep(items: list[Optional[text]]) -> list[Optional[text]] => items
result = {empty: empty(), notes: keep([None, "hello"])}
-> end"#,
    );
    restore(&state);
    let state = start(":language 1\n:output note\nfn nothing() -> Optional[text] => None\nnote = nothing()\n-> end");
    assert_eq!(state.outputs()["note"], optional(Type::Text, None));
}

#[test]
fn existing_closed_enums_work_in_annotated_nested_types() {
    let state = start(":language 1\ntype Mood = low | high\n:output moods\nmoods: list[Optional[Mood]] = [Mood.low, None]\n-> end");
    restore(&state);
}

#[test]
fn invalid_annotations_and_missing_context_fail_closed() {
    for statement in [
        "value: text = 7",
        "value: number = \"7\"",
        "value: text = None",
        "value = None",
        "value = []",
        "value: Optional[Optional[text]] = None",
        "value: list[text] = [1]",
        "value: Unknown = 7",
        "value: list[] = []",
        "value: {a: text, a: number} = {a: 1}",
        "value = 7 != None",
        "value = [None, \"hello\"]",
    ] {
        invalid(&format!(":language 1\n{statement}\n-> end"));
    }
}

#[test]
fn empty_and_absent_are_different_and_optional_equality_is_typed() {
    let state = start(
        r#":language 1
:output result
a: Optional[list[text]] = []
b: Optional[list[text]] = None
result = {same: a == b, absent: b == None, literal: None == None}
-> end"#,
    );
    assert_eq!(
        state.outputs()["result"],
        Value::Record(BTreeMap::from([
            ("same".into(), Value::Boolean(false)),
            ("absent".into(), Value::Boolean(true)),
            ("literal".into(), Value::Boolean(true)),
        ]))
    );
    restore(&state);
    invalid(":language 1\na: Optional[text] = None\nb: Optional[number] = None\nresult = a == b\n-> end");
}

#[test]
fn optional_inputs_keep_explicit_absence() {
    let source = ":language 1\n:input note: Optional[text]\n:output note\n-> end";
    let pattern = compiler::compile(source).unwrap();
    assert_eq!(
        pattern.input_types()["note"],
        Type::Optional(Box::new(Type::Text))
    );
    assert!(runtime::start(pattern.clone(), "missing".into(), BTreeMap::new()).is_err());
    let state = runtime::start(
        pattern,
        "input".into(),
        BTreeMap::from([("note".into(), optional(Type::Text, None))]),
    )
    .unwrap()
    .state;
    restore(&state);
    for declarations in [
        ":input note: text\n:output note: Optional[text]",
        ":output note: Optional[text]\n:input note: text",
    ] {
        invalid(&format!(":language 1\n{declarations}\n-> end"));
    }
}

#[test]
fn annotations_in_collection_locals_use_the_same_runtime() {
    let state = start(
        r#":language 1
:output result
result = each item in [1, 2] {
    empty: list[text] = []
    note: Optional[number] = item
    -> yield {empty: empty, note: note}
}
-> end"#,
    );
    restore(&state);
}

#[test]
fn legacy_versions_keep_none_identifiers_and_angle_bracket_types() {
    for language in [1, 2] {
        let source = format!(":language {language}\n:output None\nNone = []:list<number>\n-> end");
        let state = start(&source);
        assert_eq!(serde_json::to_value(&state).unwrap()["version"], 4);
        restore(&state);
        let compiled = compiler::compile(&format!(
            ":language {language}\n:input values: list[text]\n:output values\n-> end"
        ))
        .unwrap();
        assert_eq!(
            compiled.input_types()["values"],
            Type::List(Box::new(Type::Text))
        );
        let annotated = start(&format!(
            ":language {language}\n:output value\nvalue: Optional[text] = None\n-> end"
        ));
        assert_eq!(annotated.outputs()["value"], optional(Type::Text, None));
        restore(&annotated);
    }
    let state = start(":language 1\n:output values\nvalues: list<text> = []\n-> end");
    restore(&state);
}

#[test]
fn typed_child_arguments_use_declared_context_and_return_named_outputs() {
    use pattern_core::{
        manager,
        snapshot::{ExecutableSnapshot, SourceBundle},
    };
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "parent".into(),
        patterns: BTreeMap::from([
            ("parent".into(), ":language 1\n:output result\nresult: {notes: list[Optional[text]]} = !use child {\n:with notes = [None, \"hello\"]\n}\n-> end".into()),
            ("child".into(), ":language 1\n:input notes: list[Optional[text]]\n:output notes: list[Optional[text]]\n-> end".into()),
        ]),
    }).unwrap();
    let started = manager::start(
        snapshot,
        "typed-child".into(),
        BTreeMap::new(),
        manager::ManagerLimits::default(),
    )
    .unwrap();
    let saved = serde_json::to_vec(&started.state).unwrap();
    let restored: manager::RunManager = serde_json::from_slice(&saved).unwrap();
    assert_eq!(started.state, restored);
}

#[test]
fn annotations_on_form_fields_are_checked_and_wrapped_by_the_host() {
    invalid(":language 1\nentry = !form {\nanswer: number = !ask {\nQuestion?\n}\n}\n-> end");
    let state = start(":language 1\n:output entry\nentry = !form {\nanswer: Optional[text] = !ask [optional] {\nQuestion?\n}\n}\n-> end");
    let done = runtime::transition(
        &state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Form(BTreeMap::from([(
                "answer".into(),
                Value::Text(String::new()),
            )])),
        }),
    )
    .unwrap()
    .state;
    let Value::Record(fields) = &done.outputs()["entry"] else {
        panic!()
    };
    assert_eq!(
        fields["answer"],
        optional(Type::Text, Some(Value::Text(String::new())))
    );
    restore(&done);
}

#[test]
fn annotation_projection_preserves_types_when_renaming_a_binding() {
    let source = ":language 1\nanswer: Optional[text] = !ask {\nQuestion?\n}\n-> end";
    let inspection = compiler::compile(source).unwrap().inspect().unwrap();
    let binding = inspection.source_statements[0].binding.as_ref().unwrap();
    assert_eq!(binding.value, "answer");
    assert_eq!(&source[binding.span.clone()], "answer");
    let mut renamed = source.to_owned();
    renamed.replace_range(binding.span.clone(), "response");
    assert!(renamed.contains("response: Optional[text] = !ask"));
    compiler::compile(&renamed).unwrap();
}

#[test]
fn optional_schemas_and_saved_values_cannot_be_forged() {
    let nested = optional(Type::Optional(Box::new(Type::Text)), None);
    assert!(!nested.is_valid());
    let state = start(":language 1\n:output note\nnote: Optional[text] = None\n-> end");
    let mut saved = serde_json::to_value(&state).unwrap();
    saved["outputs"]["note"] = serde_json::to_value(optional(Type::Number, None)).unwrap();
    assert!(serde_json::from_value::<RunState>(saved).is_err());
}

#[test]
fn annotation_reference_examples_compile() {
    for example in include_str!("../../../docs/pattern-markdown/type-annotations.md")
        .split("```pattern\n")
        .skip(1)
    {
        let source = example.split("```").next().unwrap();
        compiler::compile(source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}"));
    }
}

#[test]
fn existing_none_and_optional_names_keep_their_value_meaning() {
    for language in [1, 2] {
        let state = start(&format!(":language {language}\n:output result\nNone = 7\nOptional = 8\nresult = None + Optional\n-> end"));
        assert_eq!(state.outputs()["result"], Value::Number(15.));
        assert_eq!(serde_json::to_value(&state).unwrap()["version"], 4);
        restore(&state);
    }
    let state =
        start(":language 1\n:output result\nNone = 7\nresult: Optional[number] = None\n-> end");
    assert_eq!(
        state.outputs()["result"],
        optional(Type::Number, Some(Value::Number(7.)))
    );
    restore(&state);
}

#[test]
fn helper_parameters_named_none_are_not_absence_literals() {
    let state = start(":language 1\n:output result\nfn twice(None: number) -> number => None + None\nresult = twice(4)\n-> end");
    assert_eq!(state.outputs()["result"], Value::Number(8.));
    assert_eq!(serde_json::to_value(&state).unwrap()["version"], 4);
    restore(&state);
}

#[test]
fn annotation_shaped_markdown_keeps_its_legacy_interpretation() {
    for header in ["answer = !ask", "!ask answer"] {
        let source =
            format!(":language 1\n{header}\nAn example:\nnote: Optional[text] = None\n-> end");
        let state = start(&source);
        let runtime::Request::Ask { prompt } = &state.pending().unwrap().request else {
            panic!()
        };
        assert!(prompt.contains("note: Optional[text] = None"));
        assert_eq!(serde_json::to_value(&state).unwrap()["version"], 4);
        restore(&state);
    }
}
