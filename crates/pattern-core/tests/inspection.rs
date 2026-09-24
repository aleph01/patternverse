use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::{Type, Value},
};
use std::collections::BTreeMap;

#[test]
fn validated_outline_preserves_names_scopes_and_source_ranges() {
    let source = ":language 1\n:title \"Ideas\"\n:input topic text\n:output entries\n!collect entries {\n:max 2\n!ask idea {\nFor {{topic}}?\n}\n}\n-> end";
    let pattern = compiler::compile(source).unwrap();
    let before = serde_json::to_value(&pattern).unwrap();
    let view = pattern.inspect().unwrap();
    assert_eq!(view.title.as_deref(), Some("Ideas"));
    assert_eq!(view.inputs["topic"], Type::Text);
    assert!(view.outputs.contains_key("entries"));
    assert_eq!(view.steps[0].kind, "collect");
    assert_eq!(view.steps[0].children[0].kind, "ask");
    assert_eq!(view.steps[0].locals[0].name, "idea");
    assert!(source[view.steps[0].children[0].span.clone()].contains("!ask idea"));
    assert!(!view.bindings.iter().any(|binding| binding.name == "idea"));
    assert_eq!(serde_json::to_value(&pattern).unwrap(), before);
}

#[test]
fn dependency_outline_uses_the_exact_compiled_child_interface() {
    let bundle: SourceBundle = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/project-review.bundle.json"
    ))
    .unwrap();
    let snapshot = ExecutableSnapshot::build(bundle).unwrap();
    let view = snapshot.root().inspect().unwrap();
    assert_eq!(view.steps[0].kind, "use");
    assert_eq!(view.steps[0].dependency.as_deref(), Some("project.step"));
    assert_eq!(view.dependencies.len(), 1);
    assert_eq!(view.inputs["topic"], Type::Text);
    assert!(matches!(view.outputs["plan"], Type::Record(_)));
}

#[test]
fn source_names_are_preserved_when_two_dependencies_share_an_executable_identity() {
    let child = ":language 1\n-> end";
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([
            (
                "root".into(),
                ":language 1\n!use alpha as a {\n}\n!use beta as b {\n}\n-> end".into(),
            ),
            ("alpha".into(), child.into()),
            ("beta".into(), child.into()),
        ]),
    })
    .unwrap();
    let view = snapshot.root().inspect().unwrap();
    assert_eq!(view.dependencies["alpha"], view.dependencies["beta"]);
    assert_eq!(view.steps[0].dependency.as_deref(), Some("alpha"));
    assert_eq!(view.steps[1].dependency.as_deref(), Some("beta"));
}

#[test]
fn runtime_inspector_reports_only_assigned_bindings_and_final_exports() {
    let compiled = compiler::compile(
        ":language 1\n:input topic text\n:output answer\n!ask answer {\n{{topic}}?\n}\n-> end",
    )
    .unwrap();
    let first = runtime::start(
        compiled,
        "simulation".into(),
        BTreeMap::from([("topic".into(), Value::Text("Synthetic".into()))]),
    )
    .unwrap();
    assert_eq!(first.state.inspect_bindings().unwrap().len(), 1);
    assert!(first.state.outputs().is_empty());
    let next = runtime::transition(
        &first.state,
        Event::Fulfill(Receipt {
            effect_id: first.effects[0].effect_id.clone(),
            result: Fulfillment::Text("Yes".into()),
        }),
    )
    .unwrap();
    assert_eq!(
        next.state.inspect_bindings().unwrap()["answer"],
        Value::Text("Yes".into())
    );
    assert_eq!(next.state.outputs()["answer"], Value::Text("Yes".into()));
}

#[test]
fn flow_edges_preserve_branch_labels_fallthrough_and_terminal_steps() {
    let source = include_str!("../../../docs/pattern-markdown/examples/check-in.pattern.md");
    let view = compiler::compile(source).unwrap().inspect().unwrap();
    assert_eq!(view.steps[0].edges[0].target, 1);
    assert!(view.steps[1].text.contains("{{focus}}"));
    let branch = view
        .steps
        .iter()
        .find(|step| step.kind == "branch")
        .unwrap();
    assert_eq!(
        branch
            .edges
            .iter()
            .map(|edge| edge.target)
            .collect::<Vec<_>>(),
        branch.targets
    );
    assert_eq!(branch.edges[0].label, "energy >= 8");
    assert_eq!(branch.edges.last().unwrap().label, "Otherwise");
    assert!(view
        .steps
        .iter()
        .filter(|step| step.kind == "end")
        .all(|step| step.edges.is_empty()));
    assert!(view
        .steps
        .iter()
        .all(|step| step.edges.iter().all(|edge| edge.target < view.steps.len())));
}
