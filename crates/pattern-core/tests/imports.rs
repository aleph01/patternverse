use pattern_core::{
    compiler,
    library::{self, Library},
    snapshot::{ExecutableSnapshot, SourceBundle},
    syntax,
};
use std::collections::BTreeMap;

const CHILD: &str = ":language 1\n:output wording\n!ask wording\n Your own words?\n-> end";
fn parent(pin: &str) -> String {
    format!(":language 1\n:import \"child@{pin}\" as helper\n:output result\n!use helper as result\n-> end")
}
fn revision(source: &str) -> String {
    compiler::compile(source).unwrap().snapshot_id().into()
}
#[test]
fn import_pins_exact_revision_and_survives_library_changes_and_portable_restore() {
    let pin = revision(CHILD);
    let mut library = Library::default();
    library
        .create(
            "child".into(),
            "Child".into(),
            library::standalone("original".into(), CHILD.into()),
        )
        .unwrap();
    library
        .create(
            "parent".into(),
            "Parent".into(),
            library::standalone("parent".into(), parent(&pin)),
        )
        .unwrap();
    let entry = library.entries().last().unwrap();
    assert!(
        entry.last_valid.is_some(),
        "{:?}",
        library::check_draft(entry)
    );
    let before = library::check_draft(entry).unwrap();
    library
        .save("child", 0, CHILD.replace("own words", "new wording"))
        .unwrap();
    let after = library::check_draft(library.entries().last().unwrap()).unwrap();
    assert_eq!(before.id(), after.id());
    let saved: ExecutableSnapshot =
        serde_json::from_slice(&serde_json::to_vec(&after).unwrap()).unwrap();
    assert_eq!(saved, after);
    let portable =
        Library::default().resolve_imports(library.entries().last().unwrap().draft.clone());
    assert_eq!(ExecutableSnapshot::build(portable).unwrap(), before);
}
#[test]
fn missing_mismatched_duplicate_and_remote_pins_fail_closed() {
    let pin = revision(CHILD);
    assert!(compiler::compile(&parent(&pin)).is_err());
    let mismatched = SourceBundle {
        root: "parent".into(),
        patterns: BTreeMap::from([
            ("parent".into(), parent(&pin)),
            (
                "helper".into(),
                CHILD.replace("own words", "different words"),
            ),
        ]),
    };
    assert!(ExecutableSnapshot::build(mismatched).is_err());
    for source in [
        parent("latest"),
        parent("https://example.com/pattern"),
        format!(":import \"child@{pin}\" as helper\n{}", parent(&pin)),
    ] {
        assert!(syntax::imports(&syntax::parse(&source).unwrap().declarations).is_err());
    }
}
#[test]
fn invalid_import_edit_preserves_last_valid_without_fallback_execution() {
    let pin = revision(CHILD);
    let mut library = Library::default();
    library
        .create(
            "child".into(),
            "Child".into(),
            library::standalone("original".into(), CHILD.into()),
        )
        .unwrap();
    library
        .create(
            "parent".into(),
            "Parent".into(),
            library::standalone("parent".into(), parent(&pin)),
        )
        .unwrap();
    let previous = library.entries().last().unwrap().last_valid.clone();
    library
        .save("parent", 0, parent(&format!("m4-v1:{}", "0".repeat(64))))
        .unwrap();
    let entry = library.entries().last().unwrap();
    assert_eq!(previous, entry.last_valid);
    assert!(library::check_draft(entry).is_err());
    Library::decode(&serde_json::to_vec(&library).unwrap()).unwrap();
}
#[test]
fn conflicting_transitive_names_do_not_overwrite_embedded_sources() {
    let leaf = ":language 1\n!show\n Leaf\n-> end";
    let child = ":language 1\n!use shared as leaf_result\n-> end";
    let child_bundle = SourceBundle {
        root: "child".into(),
        patterns: BTreeMap::from([
            ("child".into(), child.into()),
            ("shared".into(), leaf.into()),
        ]),
    };
    let pin = ExecutableSnapshot::build(child_bundle.clone())
        .unwrap()
        .root()
        .snapshot_id()
        .to_owned();
    let mut library = Library::default();
    library
        .create("child".into(), "Child".into(), child_bundle)
        .unwrap();
    let original = leaf.replace("Leaf", "Different");
    let bundle = library.resolve_imports(SourceBundle {
        root: "parent".into(),
        patterns: BTreeMap::from([
            ("parent".into(), parent(&pin)),
            ("shared".into(), original.clone()),
        ]),
    });
    assert_eq!(bundle.patterns["shared"], original);
    assert!(!bundle.patterns.contains_key("helper"));
    assert!(ExecutableSnapshot::build(bundle).is_err());
}
