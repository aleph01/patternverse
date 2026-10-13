use pattern_core::{
    compiler, host,
    runtime::{self, Request, Status},
    show::{AxisKind, Representation, ShowView},
    syntax,
};
use std::collections::BTreeMap;

fn views(data: &str, commands: &str) -> Vec<ShowView> {
    let source = format!(":language 1\n{data}\n{commands}\n-> end\n");
    let result = runtime::start(
        compiler::compile(&source).unwrap(),
        "show-test".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(result.state.status(), &Status::Completed);
    let restored: runtime::RunState =
        serde_json::from_str(&serde_json::to_string(&result.state).unwrap()).unwrap();
    assert_eq!(restored, result.state);
    result
        .effects
        .into_iter()
        .filter_map(|effect| {
            if let Request::Show { view, .. } = effect.request {
                view
            } else {
                None
            }
        })
        .collect()
}
const IDEAS: &str = "ideas = [{id: \"a\", name: \"Alpha\", effort: 1, impact: 5, priority: 3, category: \"Product\", scenario: \"Expected\"}, {id: \"b\", name: \"Beta\", effort: 4, impact: 2, priority: 1, category: \"Service\", scenario: \"Optimistic\"}, {id: \"c\", name: \"Gamma\", effort: 2, impact: 4, priority: 5, category: \"Product\", scenario: \"Expected\"}]";

#[test]
fn documentation_examples_compile_in_the_existing_language() {
    let document = include_str!("../../../docs/pattern-markdown/show.md");
    for block in document.split("```pattern\n").skip(1) {
        let source = block.split("```").next().unwrap();
        compiler::compile(source)
            .unwrap_or_else(|errors| panic!("Invalid documentation example: {errors:?}"));
    }
}

#[test]
fn structured_views_survive_checkpoint_replay_and_content_acknowledgement() {
    use pattern_core::{
        manager::{Command, ManagerLimits},
        persistence::{self, Checkpoint, MemoryStore},
        runtime::{Event, Fulfillment, Receipt},
        snapshot::{ExecutableSnapshot, SourceBundle},
    };
    let source = ":language 1\nitems = [{name: \"Alpha\", score: 2}]\n!show {{items}} {\n:map score\n}\nanswer = !ask {\nWhat do you notice?\n}\n!show {{items}}\n-> end";
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "show".into(),
        patterns: BTreeMap::from([("show".into(), source.into())]),
    })
    .unwrap();
    let mut store = MemoryStore::default();
    let first = persistence::create(
        &mut store,
        snapshot,
        "show-replay".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    assert_eq!(first.deliverable().len(), 2);
    assert!(matches!(
        first.deliverable()[0].request,
        Request::Show { view: Some(_), .. }
    ));
    let restored = Checkpoint::decode(&first.encode().unwrap()).unwrap();
    assert_eq!(first, restored);
    let acknowledged = persistence::acknowledge_content(
        &mut store,
        &restored,
        &restored.deliverable()[0].effect_id,
    )
    .unwrap();
    let pending = acknowledged.state().pending().unwrap();
    let completed = persistence::apply(
        &mut store,
        &acknowledged,
        Command {
            run_id: pending.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: pending.effect_id.clone(),
                result: Fulfillment::Text("It is manageable".into()),
            }),
        },
    )
    .unwrap();
    assert_eq!(completed.state().root().status(), &Status::Completed);
    assert_eq!(completed.deliverable().len(), 1);
    assert_eq!(
        Checkpoint::decode(&completed.encode().unwrap()).unwrap(),
        completed
    );
}

#[test]
fn parses_and_infers_collection_order_groups_numeric_axis_and_cartesian() {
    let commands="!show {{ideas}}\n!show {{ideas}} {\n:order priority desc\n}\n!show {{ideas}} {\n:group category\n}\n!show {{ideas}} {\n:group category\n:order priority desc\n}\n!show {{ideas}} {\n:map effort\n}\n!show {{ideas}} {\n:map effort, impact\n:group category\n}";
    let results = views(IDEAS, commands);
    assert_eq!(results.len(), 6);
    let kinds: Vec<_> = results
        .iter()
        .map(|view| view.panels[0].representation.clone())
        .collect();
    assert_eq!(
        kinds,
        vec![
            Representation::Collection,
            Representation::Ordered,
            Representation::Grouped,
            Representation::Grouped,
            Representation::Axis,
            Representation::Cartesian
        ]
    );
    assert_eq!(
        results[1].panels[0]
            .items
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["c", "a", "b"]
    );
    assert_eq!(
        results[3].panels[0].items[0].group.as_deref(),
        Some("Product")
    );
    assert_eq!(results[4].axes[0].kind, AxisKind::Numeric);
    assert_eq!(results[5].panels[0].items[0].coordinates, vec![1., 5.]);
    assert!(results.iter().all(|view| view.warnings.is_empty()));
}
#[test]
fn infers_iso_dates_datetimes_and_enum_declaration_order() {
    let data="type Level = event | pattern | structure | assumption\nevents = [{name: \"Launch\", date: \"2026-02-28\", level: Level.assumption}, {name: \"Research\", date: \"2026-01-01\", level: Level.event}]";
    let result = views(
        data,
        "!show {{events}} {\n:map date\n:order date\n}\n!show {{events}} {\n:map level\n}",
    );
    assert_eq!(result[0].axes[0].kind, AxisKind::Temporal);
    assert_eq!(result[0].panels[0].items[0].label, "Research");
    assert_eq!(result[1].axes[0].kind, AxisKind::Ordinal);
    assert_eq!(
        result[1].axes[0].levels,
        vec!["event", "pattern", "structure", "assumption"]
    );
    assert_eq!(result[1].panels[0].items[0].coordinates, vec![3.]);
    let times = views(
        "events = [{date: \"2026-01-01T12:30:00Z\"}, {date: \"2026-01-01T13:30:00+01:00\"}]",
        "!show {{events}} {\n:map date\n}",
    );
    assert_eq!(times[0].axes[0].min, times[0].axes[0].max);
}
#[test]
fn split_domains_stay_comparable_and_all_operations_compose() {
    let result=views(IDEAS,"!show {{ideas}} {\n:map effort, impact\n:split scenario\n:group category\n:order priority desc\n}");
    let view = &result[0];
    assert_eq!(view.axes[0].min, 1.);
    assert_eq!(view.axes[0].max, 4.);
    assert_eq!(view.panels.len(), 2);
    assert_eq!(view.panels[0].label.as_deref(), Some("Expected"));
    assert_eq!(view.panels[0].items[0].label, "Gamma");
    for operations in [
        ":split scenario",
        ":group category\n:split scenario",
        ":order priority\n:split scenario",
        ":map effort\n:split scenario",
    ] {
        assert_eq!(
            views(IDEAS, &format!("!show {{{{ideas}}}} {{\n{operations}\n}}"))[0]
                .panels
                .len(),
            2
        );
    }
}
#[test]
fn infers_parent_trees_many_to_many_networks_and_feedback_cycles() {
    let tree=views("nodes = [{id: \"root\", parent: \"\"}, {id: \"a\", parent: \"root\"}, {id: \"b\", parent: \"root\"}]","!show {{nodes}} {\n:link parent\n}");
    assert_eq!(tree[0].panels[0].representation, Representation::Tree);
    assert_eq!(tree[0].panels[0].edges[0].from, "root");
    let network="nodes = [{id: \"a\", influences: [\"b\",\"c\"]}, {id: \"b\", influences: [\"c\"]}, {id: \"c\", influences: []:text}]";
    assert_eq!(
        views(network, "!show {{nodes}} {\n:link influences\n}")[0].panels[0].representation,
        Representation::Network
    );
    let cycle=views("nodes = [{id: \"pressure\", affects: \"withdrawal\"}, {id: \"withdrawal\", affects: \"uncertainty\"}, {id: \"uncertainty\", affects: \"pressure\"}]","!show {{nodes}} {\n:link affects\n}");
    assert!(cycle[0].panels[0].cyclic);
    assert!(cycle[0].panels[0].edges.iter().all(|edge| edge.cyclic));
    assert_eq!(cycle[0].panels[0].representation, Representation::Network);
}
#[test]
fn links_can_compose_with_mappings_groups_order_and_split() {
    let data="nodes = [{id: \"a\", category: \"Team\", effort: 1, impact: 5, scenario: \"Expected\", affects: \"b\"}, {id: \"b\", category: \"Team\", effort: 5, impact: 2, scenario: \"Expected\", affects: \"a\"}]";
    let view=views(data,"!show {{nodes}} {\n:map effort, impact\n:link affects\n:split scenario\n:group category\n:order impact desc\n}").remove(0);
    assert_eq!(view.panels[0].representation, Representation::Cartesian);
    assert!(view.panels[0].cyclic);
    assert_eq!(view.panels[0].edges.len(), 2);
}
#[test]
fn compile_errors_have_source_spans_and_typo_help() {
    for (command, expected) in [
        ("!show {{missing}}", "not available"),
        (
            "!show {{ideas}} {\n:map effort, impact, priority\n}",
            "one or two",
        ),
        (
            "!show {{ideas}} {\n:order impact sideways\n}",
            "asc or desc",
        ),
        ("!show {{ideas}} {\n:map impcat\n}", "not found"),
        ("!show {{ideas}} {\n:layout quadrants\n}", "Unsupported"),
        (
            "!show {{ideas}} {\n:map effort\n:map impact\n}",
            "Duplicate",
        ),
        ("!show {{ideas}} {\n:link effort\n}", "item IDs"),
    ] {
        let source = format!(":language 1\n{IDEAS}\n{command}\n-> end\n");
        let error = compiler::compile(&source).unwrap_err().remove(0);
        assert!(error.message.contains(expected), "{}", error.message);
        assert!(error.primary.start >= source.find(command).unwrap());
        if command.contains("impcat") {
            assert!(error.help.unwrap().contains("impact"));
        }
    }
    assert!(syntax::parse(":language 1\n!show {{ideas + other}}\n-> end\n").is_err());
    let source =
        ":language 1\nitems = [{meta: {score: 2}}]\n!show {{items}} {\n:map meta\n}\n-> end\n";
    assert!(compiler::compile(source).unwrap_err()[0]
        .message
        .contains("nested structure"));
    assert!(views(
        "items = [{meta: {score: 2}}]",
        "!show {{items}} {\n:map meta.score\n}"
    )[0]
    .warnings
    .is_empty());
}
#[test]
fn malformed_dates_unknown_targets_duplicate_ids_and_cross_split_links_fall_back_without_loss() {
    let view=views("nodes = [{id: \"a\", date: \"2026-02-30\", affects: \"missing\"}, {id: \"b\", date: \"2026-01-01\", affects: \"a\"}]","!show {{nodes}} {\n:map date\n:link affects\n}").remove(0);
    assert!(view.warnings.iter().any(|w| w.contains("temporal")));
    assert!(view
        .warnings
        .iter()
        .any(|w| w.contains("cannot be resolved")));
    assert_eq!(view.panels[0].items.len(), 2);
    assert!(view.text().contains("missing"));
    let duplicates = views(
        "nodes = [{id: \"a\", affects: \"a\"}, {id: \"a\", affects: \"a\"}]",
        "!show {{nodes}} {\n:link affects\n}",
    );
    assert!(duplicates[0]
        .warnings
        .iter()
        .any(|w| w.contains("duplicated")));
    let split=views("nodes = [{id: \"a\", context: \"one\", affects: \"b\"}, {id: \"b\", context: \"two\", affects: \"a\"}]","!show {{nodes}} {\n:split context\n:link affects\n}");
    assert!(split[0]
        .warnings
        .iter()
        .any(|w| w.contains("outside this split")));
    assert!(split[0].text().contains("affects: b"));
}
#[test]
fn plain_markdown_wire_remains_unchanged_and_empty_collections_keep_their_type() {
    let result = runtime::start(
        compiler::compile(":language 1\n!show {\nStill ordinary Markdown.\n}\n-> end\n").unwrap(),
        "old".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(&result.effects[0].request).unwrap(),
        serde_json::json!({"kind":"content.show","payload":{"markdown":"Still ordinary Markdown."}})
    );
    let empty = views(
        "items = []:{effort: number}",
        "!show {{items}} {\n:map effort\n}",
    );
    assert_eq!(empty[0].axes[0].kind, AxisKind::Numeric);
    assert!(empty[0].panels[0].items.is_empty());
    assert_eq!(
        views("items = [\"Alpha\",\"Beta\"]", "!show {{items}}")[0].panels[0].items[1].label,
        "Beta"
    );
}
#[test]
fn interactive_collection_rating_pure_transformation_and_show_share_the_existing_engine() {
    let source=":language 1\nfn score(item: {name: text, effort: number, impact: number}) -> {name: text, score: number} => {name: item.name, score: item.impact * 2 - item.effort}\nideas = !collect {\n:min 1\n:max 1\nname = !ask {\nWhat could we try?\n}\neffort = !rate 1..5 {\nEffort?\n}\nimpact = !rate 1..5 {\nImpact?\n}\n-> yield {name: name, effort: effort, impact: impact}\n}\nscored = map(ideas, score)\n!show {{scored}} {\n:order score desc\n:map score\n}\n-> end\n";
    let fixture=serde_json::from_value(serde_json::json!({"inputs":{},"replies":[{"expected_kind":"interaction.ask","result":{"kind":"text","value":"A useful idea"}},{"expected_kind":"interaction.rate","result":{"kind":"rating","value":2}},{"expected_kind":"interaction.rate","result":{"kind":"rating","value":5}}]})).unwrap();
    let result = host::simulate(
        compiler::compile(source).unwrap(),
        "interactive".into(),
        fixture,
    )
    .unwrap();
    let Request::Show {
        view: Some(view), ..
    } = &result.effects.last().unwrap().request
    else {
        panic!("not a view")
    };
    assert_eq!(view.panels[0].items[0].coordinates, vec![8.]);
}
