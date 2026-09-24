use pattern_core::{
    library::{self, Error, Library, Origin, RevisionRef},
    snapshot::SourceBundle,
};
use std::collections::BTreeMap;

fn source(question: &str) -> String {
    format!(":language 1\n:output answer\n!ask answer\n  {question}\n-> end\n")
}

#[test]
fn chat_preferences_roundtrip_without_mutating_source_or_release_identity() {
    use library::ChatAvailability;
    let mut library = Library::default();
    library
        .install(
            "builtin".into(),
            "Built-in".into(),
            Origin::BuiltIn {
                version: "1".into(),
            },
            bundle("Question?"),
        )
        .unwrap();
    let pinned = reference(&library, "builtin");
    let executable = library.executable(&pinned).unwrap();
    let chat = ChatAvailability {
        enabled: true,
        modalities: vec!["cbt".into()],
        description: "A guided reflection".into(),
        cues: vec!["difficult decision".into()],
    };
    library.configure_chat("builtin", 0, chat.clone()).unwrap();
    assert_eq!(
        library.configure_chat("builtin", 0, chat.clone()),
        Err(Error::Conflict)
    );
    let reopened = Library::decode(&serde_json::to_vec(&library).unwrap()).unwrap();
    let entry = &reopened.entries()[0];
    assert_eq!(entry.chat, chat);
    assert_eq!(entry.chat_generation, 1);
    assert_eq!(entry.generation, 0);
    assert!(entry.chat.allows("cbt"));
    assert!(!entry.chat.allows("narm"));
    assert_eq!(reopened.executable(&pinned).unwrap(), executable);
    library.fork(pinned, "copy".into(), "Copy".into()).unwrap();
    assert!(!library.entries()[1].chat.enabled);
    assert_eq!(library.entries()[1].chat.modalities, vec!["cbt"]);
    assert!(library.entries()[1].chat.cues.is_empty());
}

#[test]
fn old_libraries_default_to_manual_discovery_and_invalid_chat_data_is_rejected() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("Question?"))
        .unwrap();
    let mut legacy = serde_json::to_value(&library).unwrap();
    legacy["entries"][0].as_object_mut().unwrap().remove("chat");
    legacy["entries"][0]
        .as_object_mut()
        .unwrap()
        .remove("chat_generation");
    let reopened = Library::decode(&serde_json::to_vec(&legacy).unwrap()).unwrap();
    assert!(reopened.entries()[0].chat.allows("any-modality"));
    assert!(reopened.entries()[0].chat.cues.is_empty());
    let before = serde_json::to_vec(&library).unwrap();
    let invalid = library::ChatAvailability {
        cues: vec!["x".repeat(101)],
        ..Default::default()
    };
    assert_eq!(
        library.configure_chat("mine", 0, invalid.clone()),
        Err(Error::Invalid)
    );
    assert_eq!(serde_json::to_vec(&library).unwrap(), before);
    legacy["entries"][0]["chat"] = serde_json::to_value(invalid).unwrap();
    assert!(Library::decode(&serde_json::to_vec(&legacy).unwrap()).is_err());
}
fn bundle(question: &str) -> SourceBundle {
    library::standalone("reflection".into(), source(question))
}
fn reference(library: &Library, id: &str) -> RevisionRef {
    RevisionRef {
        artifact_id: id.into(),
        revision_id: library
            .entries()
            .iter()
            .find(|entry| entry.id == id)
            .unwrap()
            .last_valid
            .clone()
            .unwrap(),
    }
}

#[test]
fn invalid_draft_survives_restart_without_destroying_last_valid_revision() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("First?"))
        .unwrap();
    let first = reference(&library, "mine");
    let executable = library.executable(&first).unwrap();
    library.save("mine", 0, "!unknown\n".into()).unwrap();
    let reopened = Library::decode(&serde_json::to_vec(&library).unwrap()).unwrap();
    assert_eq!(
        reopened.entries()[0].draft.patterns["reflection"],
        "!unknown\n"
    );
    assert!(library::check_draft(&reopened.entries()[0]).is_err());
    assert_eq!(reopened.executable(&first).unwrap(), executable);
    assert_eq!(
        reopened.entries()[0].last_valid.as_deref(),
        Some(first.revision_id.as_str())
    );
}

#[test]
fn valid_edits_append_revisions_but_repeated_source_deduplicates() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("First?"))
        .unwrap();
    let first = reference(&library, "mine");
    library.save("mine", 0, source("Second?")).unwrap();
    assert_ne!(reference(&library, "mine"), first);
    library.save("mine", 1, source("First?")).unwrap();
    assert_eq!(reference(&library, "mine"), first);
    assert_eq!(library.entries()[0].revisions.len(), 2);
    assert_eq!(library.entries()[0].generation, 2);
}

#[test]
fn immutable_releases_require_a_fork_with_exact_ancestry() {
    for origin in [
        Origin::BuiltIn {
            version: "1.0.0".into(),
        },
        Origin::Installed {
            version: "2.0.0".into(),
        },
    ] {
        let mut library = Library::default();
        library
            .install(
                "release".into(),
                "Release".into(),
                origin,
                bundle("Original?"),
            )
            .unwrap();
        let original = reference(&library, "release");
        assert_eq!(
            library.save("release", 0, source("Changed?")),
            Err(Error::Immutable)
        );
        library
            .fork(original.clone(), "fork".into(), "My copy".into())
            .unwrap();
        library.save("fork", 0, source("Local?")).unwrap();
        assert_eq!(
            library.entries()[1].origin,
            Origin::Local {
                forked_from: Some(original.clone())
            }
        );
        assert_eq!(reference(&library, "release"), original);
        assert!(library
            .executable(&original)
            .unwrap()
            .root()
            .source()
            .contains("Original?"));
    }
}

#[test]
fn stale_save_and_limits_are_transactional() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("First?"))
        .unwrap();
    let before = serde_json::to_vec(&library).unwrap();
    assert_eq!(
        library.save("mine", 9, source("Stale?")),
        Err(Error::Conflict)
    );
    assert_eq!(
        library.save("mine", 0, "x".repeat(65537)),
        Err(Error::Limit)
    );
    assert_eq!(serde_json::to_vec(&library).unwrap(), before);
}

#[test]
fn pinned_dependency_closure_is_retained_across_forks_and_edits() {
    let child = source("Child question?");
    let root = ":language 1\n!use child as result\n-> end\n";
    let mut library = Library::default();
    library
        .install(
            "parent".into(),
            "Parent".into(),
            Origin::BuiltIn {
                version: "1".into(),
            },
            SourceBundle {
                root: "parent".into(),
                patterns: BTreeMap::from([
                    ("parent".into(), root.into()),
                    ("child".into(), child.clone()),
                ]),
            },
        )
        .unwrap();
    let original = reference(&library, "parent");
    library
        .fork(original.clone(), "fork".into(), "Fork".into())
        .unwrap();
    library
        .save(
            "fork",
            0,
            ":language 1\n:title \"Changed parent\"\n!use child as result\n-> end\n".into(),
        )
        .unwrap();
    let fork = library.executable(&reference(&library, "fork")).unwrap();
    assert_eq!(fork.sources()["child"], child);
    assert_eq!(
        library.executable(&original).unwrap().sources()["parent"],
        root
    );
    library
        .save(
            "fork",
            1,
            ":language 1\n!use absent as missing\n-> end\n".into(),
        )
        .unwrap();
    assert_eq!(
        library.executable(&reference(&library, "fork")).unwrap(),
        fork
    );
}

#[test]
fn new_invalid_drafts_are_saved_but_not_runnable() {
    let mut library = Library::default();
    library
        .create(
            "mine".into(),
            "Mine".into(),
            library::standalone("draft".into(), "!unknown".into()),
        )
        .unwrap();
    assert!(library.entries()[0].last_valid.is_none());
    assert!(library.entries()[0].revisions.is_empty());
    assert!(Library::decode(&serde_json::to_vec(&library).unwrap()).is_ok());
}

#[test]
fn restore_rejects_changed_revision_identity_or_future_schema() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("First?"))
        .unwrap();
    let mut saved = serde_json::to_value(&library).unwrap();
    saved["entries"][0]["revisions"][0]["bundle"]["patterns"]["reflection"] =
        serde_json::json!(source("Tampered?"));
    assert!(Library::decode(&serde_json::to_vec(&saved).unwrap()).is_err());
    let mut saved = serde_json::to_value(&library).unwrap();
    saved["version"] = serde_json::json!(900);
    assert!(Library::decode(&serde_json::to_vec(&saved).unwrap()).is_err());
}

#[test]
fn revision_limit_never_discards_the_current_draft() {
    let mut library = Library::default();
    library
        .create("mine".into(), "Mine".into(), bundle("0"))
        .unwrap();
    for generation in 0..31 {
        library
            .save("mine", generation, source(&(generation + 1).to_string()))
            .unwrap();
    }
    let before = serde_json::to_vec(&library).unwrap();
    assert_eq!(
        library.save("mine", 31, source("too many")),
        Err(Error::Limit)
    );
    assert_eq!(serde_json::to_vec(&library).unwrap(), before);
    library.save("mine", 31, "invalid draft".into()).unwrap();
    assert!(library::check_draft(&library.entries()[0]).is_err());
}
