use pattern_core::{
    compiler,
    data::DataLibrary,
    runtime::{self, Event, Fulfillment, Receipt, Request},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::{Contract, Value},
};
use serde_json::json;
use std::collections::BTreeMap;
fn data() -> BTreeMap<String, DataLibrary> {
    BTreeMap::from([("commons:materials".into(),serde_json::from_value(json!({"record_type":{"record":{"id":"text","name":"text","density":"number"}},"records":[{"id":"wood","name":"Wood","density":600},{"id":"steel","name":"Steel","density":7850}]})).unwrap())])
}
const SOURCE: &str = r#":language 1
:import materials from "commons:materials"
:output matches
matches = !agent {
:returns list[{item: ref[materials], reason: text}]
:min 0
:max 2
:context materials
Find relevant materials.
}
rows = each entry in matches {
 record = lookup(materials, entry.item)
 -> yield {name: record.name, density: record.density, reason: entry.reason}
}
!show {{rows}} {
}
-> end
"#;
#[test]
fn structured_references_lookup_show_and_empty_results_share_the_real_runtime() {
    for reply in [json!([]), json!([{"item":"wood","reason":"Lightweight"}])] {
        let pattern = compiler::compile_with_data(SOURCE, &data()).unwrap();
        let turn = runtime::start(pattern, "r".into(), BTreeMap::new()).unwrap();
        let effect = turn.state.pending().unwrap();
        let Request::Generate {
            contract, context, ..
        } = &effect.request
        else {
            panic!()
        };
        assert!(
            matches!(context.get("materials"),Some(Value::Catalog {records,..}) if records.len()==2)
        );
        let value = Value::from_json(&reply, &contract.returns).unwrap();
        let done = runtime::transition(
            &turn.state,
            Event::Fulfill(Receipt {
                effect_id: effect.effect_id.clone(),
                result: Fulfillment::Generated(value),
            }),
        )
        .unwrap();
        assert_eq!(done.state.status(), &runtime::Status::Completed);
        let output = serde_json::to_string(&done.effects).unwrap();
        if reply.as_array().unwrap().len() > 0 {
            assert!(output.contains("Wood"));
            assert!(output.contains("Lightweight"));
        }
    }
}
#[test]
fn invalid_ids_cross_library_references_and_bounds_do_not_advance() {
    let turn = runtime::start(
        compiler::compile_with_data(SOURCE, &data()).unwrap(),
        "r".into(),
        BTreeMap::new(),
    )
    .unwrap();
    let effect = turn.state.pending().unwrap();
    let Request::Generate { contract, .. } = &effect.request else {
        panic!()
    };
    assert!(Value::from_json(
        &json!([{"item":"invented","reason":"x"}]),
        &contract.returns
    )
    .is_err());
    assert!(Value::from_json(
        &json!([{"item":"wood","reason":"x","extra":true}]),
        &contract.returns
    )
    .is_err());
    let mut valid =
        Value::from_json(&json!([{"item":"wood","reason":"x"}]), &contract.returns).unwrap();
    let Value::List { items, .. } = &mut valid else {
        panic!()
    };
    items.extend([items[0].clone(), items[0].clone()]);
    let before = serde_json::to_string(&turn.state).unwrap();
    assert!(runtime::transition(
        &turn.state,
        Event::Fulfill(Receipt {
            effect_id: effect.effect_id.clone(),
            result: Fulfillment::Generated(valid)
        })
    )
    .is_err());
    assert_eq!(before, serde_json::to_string(&turn.state).unwrap());
    let mut foreign = data();
    foreign.insert("commons:other".into(), foreign["commons:materials"].clone());
    let source = SOURCE
        .replace(
            ":output matches",
            ":import other from \"commons:other\"\n:output matches",
        )
        .replace("lookup(materials, entry.item)", "lookup(other, entry.item)");
    assert!(compiler::compile_with_data(&source, &foreign).is_err());
}
#[test]
fn latest_resolution_is_pinned_and_tampering_is_rejected() {
    let bundle = SourceBundle {
        root: "demo".into(),
        patterns: BTreeMap::from([("demo".into(), SOURCE.into())]),
    };
    let first = ExecutableSnapshot::build_with_data(bundle.clone(), data()).unwrap();
    let saved = serde_json::to_value(&first).unwrap();
    let mut changed = data();
    changed.get_mut("commons:materials").unwrap().records[0]["name"] = json!("Changed");
    let next = ExecutableSnapshot::build_with_data(bundle, changed).unwrap();
    assert_ne!(first.id(), next.id());
    assert_ne!(first.root().snapshot_id(), next.root().snapshot_id());
    assert_eq!(first, serde_json::from_value(saved.clone()).unwrap());
    let mut tampered = saved;
    tampered["data"]["commons:materials"]["records"][0]["name"] = json!("Tampered");
    assert!(serde_json::from_value::<ExecutableSnapshot>(tampered).is_err());
}
#[test]
fn libraries_are_bounded_and_can_be_used_without_ai() {
    let mut libraries = data();
    let bad = libraries.get_mut("commons:materials").unwrap();
    bad.records.push(bad.records[0].clone());
    assert!(compiler::compile_with_data(SOURCE, &libraries).is_err());
    let source=":language 1\n:import materials from \"commons:materials\"\n:output result\nresult = lookup(materials, \"absent\")\n-> end";
    let run = runtime::start(
        compiler::compile_with_data(source, &data()).unwrap(),
        "r".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(run.state.status(), &runtime::Status::Completed);
    assert!(compiler::compile(SOURCE).is_err());
    let list = Value::from_json(
        &json!([]),
        &pattern_core::value::Type::List(Box::new(pattern_core::value::Type::Text)),
    )
    .unwrap();
    assert!(Contract {
        returns: list.value_type(),
        min: Some(0),
        max: Some(2)
    }
    .accepts(&list));
}
