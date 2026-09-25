//! Versioned JSON transport shared by native IPC and a future browser WASM wrapper.
//! The transport is pure; callers own encryption and atomic checkpoint publication.

use crate::{techniques, HostError, SavedRun, Technique, View};
use pattern_core::{manager::Command, value::Value};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// Leave room for the operation envelope around the largest accepted saved run.
const MAX_REQUEST_BYTES: usize = 8 * 1024 * 1024 + 64 * 1024;
const WIRE_VERSION: u32 = 1;

#[derive(Debug, Deserialize)]
struct RequestEnvelope {
    version: u32,
    #[serde(flatten)]
    request: Request,
}

#[derive(Debug, Serialize)]
struct ResponseEnvelope {
    version: u32,
    #[serde(flatten)]
    response: Response,
}

/// One explicit host action. Saved data is validated through `SavedRun::restore`.
#[derive(Debug, Deserialize)]
#[serde(tag = "operation", rename_all = "snake_case", deny_unknown_fields)]
pub enum Request {
    Catalog {
        modality: String,
    },
    Start {
        technique_id: String,
        root_id: String,
        inputs: BTreeMap<String, Value>,
    },
    Load {
        saved: serde_json::Value,
    },
    Apply {
        saved: serde_json::Value,
        expected_revision: u64,
        command: Command,
    },
}

/// A catalog or a saved checkpoint plus its current, replay-safe view.
#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Response {
    Catalog {
        techniques: Vec<Technique>,
    },
    Run {
        saved: serde_json::Value,
        view: View,
    },
}

/// Parse and execute one bounded request without network, storage, or inference.
/// A platform adapter must commit `saved` before it renders or dispatches `view.pending`.
pub fn execute(bytes: &[u8]) -> Result<Vec<u8>, HostError> {
    if bytes.len() > MAX_REQUEST_BYTES {
        return Err(HostError::SavedRunTooLarge);
    }
    let envelope: RequestEnvelope =
        serde_json::from_slice(bytes).map_err(|_| HostError::InvalidInput)?;
    if envelope.version != WIRE_VERSION {
        return Err(HostError::UnsupportedVersion);
    }
    let response = match envelope.request {
        Request::Catalog { modality } => Response::Catalog {
            techniques: techniques(&modality),
        },
        Request::Start {
            technique_id,
            root_id,
            inputs,
        } => run_response(SavedRun::start(&technique_id, &root_id, inputs)?)?,
        Request::Load { saved } => run_response(restore(&saved)?)?,
        Request::Apply {
            saved,
            expected_revision,
            command,
        } => run_response(restore(&saved)?.apply_at(expected_revision, command)?)?,
    };
    serde_json::to_vec(&ResponseEnvelope {
        version: WIRE_VERSION,
        response,
    })
    .map_err(|_| HostError::InvalidRun)
}

/// Validate a caller-provided encrypted-store payload through the core's deterministic replay.
fn restore(saved: &serde_json::Value) -> Result<SavedRun, HostError> {
    let bytes = serde_json::to_vec(saved).map_err(|_| HostError::InvalidRun)?;
    SavedRun::restore(&bytes)
}

/// Keep checkpoint and projection in one response so callers cannot mix run revisions.
fn run_response(run: SavedRun) -> Result<Response, HostError> {
    let saved = serde_json::from_slice(&run.save()?).map_err(|_| HostError::InvalidRun)?;
    Ok(Response::Run {
        saved,
        view: run.view()?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// One caller can start, restore and advance without depending on platform code.
    #[test]
    fn transport_round_trips_one_participant_action() {
        let start = execute(
            &serde_json::to_vec(&json!({
            "version": 1, "operation": "start", "technique_id": "act.values", "root_id": "r1", "inputs": {}
            }))
            .unwrap(),
        )
        .unwrap();
        let started: serde_json::Value = serde_json::from_slice(&start).unwrap();
        assert_eq!(started["kind"], "run");
        assert_eq!(started["version"], 1);
        assert_eq!(started["view"]["revision"], 0);
        let saved = started["saved"].clone();
        let loaded: serde_json::Value = serde_json::from_slice(
            &execute(
                &serde_json::to_vec(&json!({
                "version": 1, "operation": "load", "saved": saved
                    }))
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(loaded["view"]["pending"], started["view"]["pending"]);
        let effect = &started["view"]["pending"];
        let applied: serde_json::Value = serde_json::from_slice(&execute(&serde_json::to_vec(&json!({
            "version": 1, "operation": "apply",
            "saved": started["saved"],
            "expected_revision": 0,
            "command": {
                "run_id": effect["run_id"],
                "event": {"Fulfill": {"effect_id": effect["effect_id"], "result": {"kind": "selected", "value": "begin"}}}
            }
        })).unwrap()).unwrap()).unwrap();
        assert_eq!(applied["view"]["revision"], 1);
        assert_ne!(applied["view"]["pending"], started["view"]["pending"]);
    }

    /// Unknown fields and stale projections do not produce a new checkpoint.
    #[test]
    fn transport_rejects_invalid_and_stale_requests() {
        assert_eq!(
            execute(br#"{"version":1,"operation":"catalog","modality":"cbt","extra":1}"#)
                .unwrap_err(),
            HostError::InvalidInput
        );
        assert_eq!(
            execute(br#"{"version":2,"operation":"catalog","modality":"cbt"}"#).unwrap_err(),
            HostError::UnsupportedVersion
        );
        let started: serde_json::Value = serde_json::from_slice(
            &execute(
                br#"{"version":1,"operation":"start","technique_id":"dbt.pause","root_id":"r2","inputs":{}}"#,
            )
            .unwrap(),
        )
        .unwrap();
        let effect = &started["view"]["pending"];
        let stale = json!({
            "version": 1, "operation": "apply", "saved": started["saved"], "expected_revision": 3,
            "command": {"run_id": effect["run_id"], "event": "Cancel"}
        });
        assert_eq!(
            execute(&serde_json::to_vec(&stale).unwrap()).unwrap_err(),
            HostError::StaleRevision
        );
    }
}
