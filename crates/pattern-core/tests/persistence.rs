mod support;
use pattern_core::{
    manager::{self, Command, ManagerLimits},
    persistence::{self, AtomicStore, Checkpoint, Error, MemoryStore, StoreError, Stored},
    runtime::{Event, Fulfillment, Receipt, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use std::collections::BTreeMap;
use support::{Fault, FileStore};
const SOURCE:&str=":language 1\n:output answer\n!show {\nBefore\n}\n!agent generated {\n:returns text\nSuggest\n}\n!show {\nCandidate: {{generated}}\n}\n!ask answer {\nReview\n}\n!show {\nAfter\n}\n-> end";
fn snapshot() -> ExecutableSnapshot {
    ExecutableSnapshot::build(SourceBundle {
        root: "sample".into(),
        patterns: BTreeMap::from([("sample".into(), SOURCE.into())]),
    })
    .unwrap()
}
fn create(store: &mut impl AtomicStore) -> Checkpoint {
    persistence::create(
        store,
        snapshot(),
        "test".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
}
fn reply(checkpoint: &Checkpoint, result: Fulfillment) -> Command {
    let pending = checkpoint.state().pending().unwrap();
    Command {
        run_id: pending.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: pending.effect_id.clone(),
            result,
        }),
    }
}
fn generated(c: &Checkpoint) -> Command {
    reply(
        c,
        Fulfillment::Generated(Value::Text("Synthetic candidate".into())),
    )
}
fn lifecycle(c: &Checkpoint, event: Event) -> Command {
    Command {
        run_id: c.key().into(),
        event,
    }
}

#[test]
fn content_and_blocking_effects_recover_in_order_without_repeating_accepted_generation() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    let ids: Vec<_> = first
        .deliverable()
        .iter()
        .map(|e| e.effect_id.clone())
        .collect();
    assert_eq!(ids.len(), 2);
    let first = persistence::acknowledge_content(&mut store, &first, &ids[0]).unwrap();
    assert_eq!(first.deliverable().len(), 1);
    let next = persistence::apply(&mut store, &first, generated(&first)).unwrap();
    let loaded = persistence::load(&mut store, "test").unwrap().unwrap();
    assert_eq!(next, loaded);
    assert_eq!(
        loaded
            .deliverable()
            .iter()
            .map(|e| e.request.kind())
            .collect::<Vec<_>>(),
        vec!["content.show", "interaction.ask"]
    );
    assert!(!loaded.deliverable().iter().any(|e| e.effect_id == ids[1]));
    assert_eq!(loaded.state().ledger().count(), 1);
}
#[test]
fn duplicate_results_acks_and_retries_never_add_receipts_or_revisions() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    let accepted = generated(&first);
    let next = persistence::apply(&mut store, &first, accepted.clone()).unwrap();
    assert_eq!(
        persistence::apply(&mut store, &next, accepted.clone()).unwrap(),
        next
    );
    let pending = next.state().pending().unwrap();
    let retry = Command {
        run_id: pending.run_id.clone(),
        event: Event::Retry {
            effect_id: pending.effect_id.clone(),
        },
    };
    assert_eq!(persistence::apply(&mut store, &next, retry).unwrap(), next);
    let id = next.deliverable()[0].effect_id.clone();
    let ack = persistence::acknowledge_content(&mut store, &next, &id).unwrap();
    assert_eq!(
        persistence::acknowledge_content(&mut store, &ack, &id).unwrap(),
        ack
    );
    let Event::Fulfill(mut receipt) = accepted.event else {
        panic!()
    };
    receipt.result = Fulfillment::Generated(Value::Text("Conflict".into()));
    assert!(persistence::apply(
        &mut store,
        &ack,
        Command {
            run_id: accepted.run_id,
            event: Event::Fulfill(receipt)
        }
    )
    .is_err());
    assert_eq!(persistence::load(&mut store, "test").unwrap().unwrap(), ack);
}
#[test]
fn content_ack_cannot_consume_blocking_requests_or_unknown_ids() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    for id in [
        "unknown",
        first.state().pending().unwrap().effect_id.as_str(),
    ] {
        assert_eq!(
            persistence::acknowledge_content(&mut store, &first, id),
            Err(Error::UnknownContent)
        );
    }
    assert_eq!(first.revision(), 0);
}
#[test]
fn pause_resume_and_terminal_recovery_never_dispatch_stale_ai_work() {
    for terminal in [Event::Cancel, Event::Fail] {
        let mut store = MemoryStore::default();
        let first = create(&mut store);
        let paused =
            persistence::apply(&mut store, &first, lifecycle(&first, Event::Pause)).unwrap();
        let loaded = persistence::load(&mut store, "test").unwrap().unwrap();
        assert_eq!(loaded, paused);
        let paused = loaded;
        assert!(paused
            .deliverable()
            .iter()
            .all(|e| e.request.kind() == "content.show"));
        assert!(persistence::apply(&mut store, &paused, generated(&paused)).is_err());
        let resumed =
            persistence::apply(&mut store, &paused, lifecycle(&paused, Event::Resume)).unwrap();
        assert_eq!(resumed.state().pending(), first.state().pending());
        let stopped =
            persistence::apply(&mut store, &resumed, lifecycle(&resumed, terminal)).unwrap();
        assert!(stopped
            .deliverable()
            .iter()
            .all(|e| e.request.kind() == "content.show"));
        assert_eq!(
            persistence::load(&mut store, "test").unwrap().unwrap(),
            stopped
        );
    }
}
#[test]
fn stale_writers_and_repeated_create_cannot_overwrite_progress() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    let next = persistence::apply(&mut store, &first, generated(&first)).unwrap();
    assert_eq!(
        persistence::apply(&mut store, &first, lifecycle(&first, Event::Pause)),
        Err(Error::Store(StoreError::Conflict))
    );
    assert!(persistence::create(
        &mut store,
        snapshot(),
        "test".into(),
        BTreeMap::new(),
        ManagerLimits::default()
    )
    .is_err());
    let pending = first.state().pending().unwrap();
    assert_eq!(
        persistence::apply(
            &mut store,
            &first,
            Command {
                run_id: "test".into(),
                event: Event::Retry {
                    effect_id: pending.effect_id.clone()
                }
            }
        ),
        Err(Error::Store(StoreError::Conflict))
    );
    assert_eq!(
        persistence::load(&mut store, "test").unwrap().unwrap(),
        next
    );
}
#[test]
fn failed_save_leaves_old_checkpoint_and_retry_identity_intact() {
    let dir = tempfile::tempdir().unwrap();
    let mut store = FileStore::new(dir.path());
    let first = create(&mut store);
    store.fault = Fault::BeforeWrite;
    assert_eq!(
        persistence::apply(&mut store, &first, generated(&first)),
        Err(Error::Store(StoreError::Unavailable))
    );
    let mut restarted = FileStore::new(dir.path());
    assert_eq!(
        persistence::load(&mut restarted, "test").unwrap().unwrap(),
        first
    );
    let next = persistence::apply(&mut restarted, &first, generated(&first)).unwrap();
    assert_eq!(next.state().ledger().count(), 1);
}
#[test]
fn ambiguous_commit_requires_reload_and_does_not_regenerate_accepted_reply() {
    let dir = tempfile::tempdir().unwrap();
    let mut store = FileStore::new(dir.path());
    let first = create(&mut store);
    store.fault = Fault::AfterCommit;
    let command = generated(&first);
    assert_eq!(
        persistence::apply(&mut store, &first, command.clone()),
        Err(Error::Store(StoreError::OutcomeUnknown))
    );
    let mut restarted = FileStore::new(dir.path());
    let saved = persistence::load(&mut restarted, "test").unwrap().unwrap();
    assert_eq!(
        saved.state().pending().unwrap().request.kind(),
        "interaction.ask"
    );
    assert_eq!(
        persistence::apply(&mut restarted, &saved, command).unwrap(),
        saved
    );
    assert_eq!(saved.state().ledger().count(), 1);
}
#[test]
fn concurrent_file_writers_have_one_winner_without_lost_updates() {
    let dir = tempfile::tempdir().unwrap();
    let first = create(&mut FileStore::new(dir.path()));
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let handles: Vec<_> = (0..2)
        .map(|_| {
            let path = dir.path().to_owned();
            let first = first.clone();
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                let mut store = FileStore::new(&path);
                barrier.wait();
                persistence::apply(&mut store, &first, generated(&first))
            })
        })
        .collect();
    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    assert_eq!(results.iter().filter(|r| r.is_ok()).count(), 1);
    assert_eq!(
        results
            .iter()
            .filter(|r| **r == Err(Error::Store(StoreError::Conflict)))
            .count(),
        1
    );
    let loaded = persistence::load(&mut FileStore::new(dir.path()), "test")
        .unwrap()
        .unwrap();
    assert_eq!(loaded.state().ledger().count(), 1);
}
#[test]
fn abrupt_process_exit_before_and_after_publication_recovers_whole_checkpoints() {
    for (point, code, revision) in [("before", 77, 0), ("after", 78, 1)] {
        let dir = tempfile::tempdir().unwrap();
        let first = create(&mut FileStore::new(dir.path()));
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "crash_writer_process", "--nocapture"])
            .env("MIRA_TEST_CHECKPOINT_DIRECTORY", dir.path())
            .env("MIRA_TEST_CRASH_POINT", point)
            .output()
            .unwrap();
        assert_eq!(
            result.status.code(),
            Some(code),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        let loaded = persistence::load(&mut FileStore::new(dir.path()), "test")
            .unwrap()
            .unwrap();
        assert_eq!(loaded.revision(), revision);
        if revision == 0 {
            assert_eq!(loaded, first);
        } else {
            assert_eq!(
                loaded.state().pending().unwrap().request.kind(),
                "interaction.ask"
            );
        }
    }
}
#[test]
fn crash_writer_process() {
    let Ok(path) = std::env::var("MIRA_TEST_CHECKPOINT_DIRECTORY") else {
        return;
    };
    let mut store = FileStore::new(std::path::Path::new(&path));
    let first = persistence::load(&mut store, "test").unwrap().unwrap();
    store.fault = if std::env::var("MIRA_TEST_CRASH_POINT").unwrap() == "before" {
        Fault::ExitBeforePublish
    } else {
        Fault::ExitAfterCommit
    };
    let _ = persistence::apply(&mut store, &first, generated(&first));
    panic!("fault injection did not exit");
}
#[test]
fn malformed_stale_version_and_forged_acknowledgements_fail_closed() {
    let first = create(&mut MemoryStore::default());
    let bytes = first.encode().unwrap();
    for end in [0, 1, bytes.len() / 2, bytes.len() - 1] {
        assert!(Checkpoint::decode(&bytes[..end]).is_err());
    }
    for (key, value) in [
        ("version", serde_json::json!(99)),
        ("revision", serde_json::json!(42)),
        ("acknowledged_content", serde_json::json!(["forged"])),
    ] {
        let mut saved = serde_json::to_value(&first).unwrap();
        saved[key] = value;
        assert!(Checkpoint::decode(&serde_json::to_vec(&saved).unwrap()).is_err());
    }
    assert_eq!(
        Checkpoint::decode(&vec![b' '; persistence::MAX_CHECKPOINT_BYTES + 1]),
        Err(Error::TooLarge)
    );
}
#[test]
fn wrong_key_or_storage_revision_cannot_load_or_silently_roll_back() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    store
        .compare_and_swap(
            "other",
            None,
            Stored {
                revision: 0,
                bytes: first.encode().unwrap(),
            },
        )
        .unwrap();
    assert_eq!(
        persistence::load(&mut store, "other"),
        Err(Error::InvalidCheckpoint)
    );
    store
        .compare_and_swap(
            "test",
            Some(0),
            Stored {
                revision: 5,
                bytes: first.encode().unwrap(),
            },
        )
        .unwrap();
    assert_eq!(
        persistence::load(&mut store, "test"),
        Err(Error::InvalidCheckpoint)
    );
}
#[test]
fn replay_returns_historical_evidence_not_delivery_or_new_ledger_entries() {
    let mut store = MemoryStore::default();
    let first = create(&mut store);
    let second = persistence::apply(&mut store, &first, generated(&first)).unwrap();
    let done = persistence::apply(
        &mut store,
        &second,
        reply(&second, Fulfillment::Text("Done".into())),
    )
    .unwrap();
    assert_eq!(done.state().root().status(), &Status::Completed);
    let replay = manager::replay(done.state()).unwrap();
    assert_eq!(&replay.state, done.state());
    assert_eq!(replay.state.ledger().count(), 2);
    assert_eq!(
        replay
            .recorded_effects
            .iter()
            .filter(|e| e.request.kind() == "agent.generate")
            .count(),
        1
    );
    assert!(done
        .deliverable()
        .iter()
        .all(|e| e.request.kind() == "content.show"));
    let summary: Vec<_> = replay
        .traces
        .iter()
        .map(|t| match &t.event {
            pattern_core::runtime::Trace::EffectRequested(_) => "effect.requested".into(),
            pattern_core::runtime::Trace::EffectFulfilled(_) => "effect.fulfilled".into(),
            other => format!("{other:?}"),
        })
        .collect();
    insta::assert_json_snapshot!("completed_trace", summary);
}
