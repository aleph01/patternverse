use pattern_core::compiler;

const SOURCE: &str = ":language 1\n:title \"Café 🙂\"\n!choose direction {\n  :option explore \"Explore options\"\n  :option plan \"Make a plan\"\n  :option unsure \"Not sure yet\"\n  What would help?\n}\n?match direction {\n  :case explore -> explore\n  :case plan -> plan\n  :else -> other\n}\nexplore:\n!ask possibilities {\n  What options could you explore?\n}\n-> review\nplan:\n!ask next {\n  What is one small action?\n}\n-> end\nother:\n-> review\nreview:\n!ask takeaway {\n  What will you take away?\n}\n-> end\n";

#[test]
fn projects_lossless_fields_and_owned_paths_without_changing_execution() {
    let compiled = compiler::compile(SOURCE).unwrap();
    let before = serde_json::to_value(&compiled).unwrap();
    let view = compiled.inspect().unwrap();
    let question = view
        .source_statements
        .iter()
        .find(|s| {
            s.binding
                .as_ref()
                .is_some_and(|b| b.value == "possibilities")
        })
        .unwrap();
    let body = question.body.as_ref().unwrap();
    assert_eq!(&SOURCE[body.span.clone()], body.value);
    assert!(body.value.contains("What options"));
    let paths = &view.paths[0];
    assert_eq!(view.paths.len(), 1);
    assert_eq!(paths.mode, "match");
    assert_eq!(paths.response.as_deref(), Some("direction"));
    assert_eq!(paths.arms.len(), 3);
    assert_eq!(paths.arms[1].destination, "end");
    assert_eq!(paths.continuation.as_deref(), Some("review"));
    assert_eq!(SOURCE[paths.arms[2].content.clone()].trim(), "other:");
    assert_eq!(serde_json::to_value(&compiled).unwrap(), before);
}

#[test]
fn keeps_the_shared_continuation_available_when_all_paths_finish() {
    let source = SOURCE.replace("-> review", "-> end");
    let view = compiler::compile(&source).unwrap().inspect().unwrap();
    let paths = &view.paths[0];
    assert!(paths.arms.iter().all(|arm| arm.destination == "end"));
    assert_eq!(paths.continuation.as_deref(), Some("review"));
    assert_eq!(&source[paths.continuation_span.clone().unwrap()], "review:");
}

#[test]
fn leaves_typed_enum_dispatch_in_source_until_the_visual_editor_supports_it() {
    let source = ":language 1\ntype Mood = low | steady\nvalue = Mood.low\n?match value {\n:case low -> first\n:case steady -> second\n:else -> other\n}\nfirst:\n-> end\nsecond:\n-> end\nother:\n-> end";
    let view = compiler::compile(source).unwrap().inspect().unwrap();
    assert!(view.paths.is_empty());
    assert!(view.source_statements.iter().any(|s| s.kind == "?match"));
}

#[test]
fn projects_comparisons_in_priority_order_and_keeps_complex_expressions_in_source() {
    let source=SOURCE.replace("!choose direction {\n  :option explore \"Explore options\"\n  :option plan \"Make a plan\"\n  :option unsure \"Not sure yet\"\n  What would help?\n}", "!rate clarity -10..10 {\nClarity?\n}")
        .replace("?match direction", "?branch")
        .replace(":case explore", ":when clarity >= 8")
        .replace(":case plan", ":when clarity < -4");
    let view = compiler::compile(&source).unwrap().inspect().unwrap();
    assert_eq!(view.paths[0].arms[0].rule.as_ref().unwrap().operator, ">=");
    assert_eq!(view.paths[0].arms[1].rule.as_ref().unwrap().value, -4.);
    let complex = source.replace("clarity >= 8", "clarity >= 8 and clarity <= 10");
    let projection = compiler::compile(&complex).unwrap().inspect().unwrap();
    assert!(projection.paths.is_empty());
    assert!(projection
        .source_statements
        .iter()
        .any(|s| s.kind == "?branch"));
}

#[test]
fn does_not_hide_shared_targets_aliases_fallthrough_or_external_incoming_edges() {
    for source in [
        SOURCE.replace(":case plan -> plan", ":case plan -> explore"),
        SOURCE.replace("explore:\n", "alias:\nexplore:\n"),
        SOURCE.replacen("-> review\nplan:", "plan:",1),
        SOURCE.replace("?match direction", "?branch {\n:when direction.value == \"unsure\" -> plan\n:else -> dispatch\n}\ndispatch:\n?match direction"),
    ] {
        let view=compiler::compile(&source).unwrap().inspect().unwrap();
        assert!(view.paths.is_empty(),"Unsafe source was grouped: {source}");
    }
}

#[test]
fn empty_prompts_and_advanced_constructs_have_exact_ranges() {
    let source=":language 1\n!ask note {\n}\n!collect entries {\n:max 2\n!ask item {\nOne item?\n}\n}\n-> end";
    let view = compiler::compile(source).unwrap().inspect().unwrap();
    let empty = view.source_statements[0].body.as_ref().unwrap();
    assert!(empty.value.is_empty());
    assert_eq!(empty.span.start, empty.span.end);
    assert_eq!(&source[empty.span.start..empty.span.start + 1], "}");
    assert!(view.source_statements[1].body.is_none());
    assert!(source[view.source_statements[1].span.clone()].contains("!collect entries"));
}

#[test]
fn nested_ai_content_remains_a_whole_source_block() {
    let source = ":language 1\n!ask answer {\n~ Ask one relevant question.\n}\n-> end";
    let view = compiler::compile(source).unwrap().inspect().unwrap();
    let ask = &view.source_statements[0];
    assert_eq!(ask.kind, "ask");
    assert!(ask.body.is_none());
    assert!(source[ask.span.clone()].contains("~ Ask one relevant question."));
    let mixed = source.replace("~ Ask", "Literal content.\n~ Ask");
    assert!(compiler::compile(&mixed).is_err());
}
