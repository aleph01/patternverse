//! Isolated, bounded source host shared by authoring, public worksheets and embeds.
//! The module name, transport export and root identity remain stable for compatibility.
//! It never changes bundled technique admission,
//! writes storage, resolves external imports, or invokes a model.
use crate::{HostError, SavedRun};
use pattern_core::{
    compiler,
    manager::{self, Command, ManagerLimits},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use serde::Deserialize;
use std::collections::BTreeMap;

const ROOT: &str = "editor.preview";
const MAX_SOURCE: usize = 64 * 1024;
const MAX_CHECKPOINT: usize = 2 * 1024 * 1024;

fn preview_limits() -> ManagerLimits {
    ManagerLimits {
        max_runs: 64,
        max_depth: 8,
        ..ManagerLimits::default()
    }
}

#[derive(Deserialize)]
#[serde(tag = "operation", rename_all = "snake_case", deny_unknown_fields)]
enum Request {
    InspectBundle {
        bundle: SourceBundle,
    },
    Worksheet {
        source: Option<String>,
        technique_id: Option<String>,
    },
    WorksheetAvailability {
        source: Option<String>,
        technique_id: Option<String>,
    },
    Inspect {
        source: String,
    },
    Start {
        source: String,
        root_id: String,
        inputs: BTreeMap<String, Value>,
    },
    Rewind {
        saved: serde_json::Value,
        expected_revision: u64,
        run_id: String,
        effect_id: String,
    },
    Apply {
        saved: serde_json::Value,
        expected_revision: u64,
        command: Command,
    },
    Restore {
        source: String,
        saved: serde_json::Value,
    },
}

/// One checkpoint admission/replay path for both transitions and explicit handoff.
fn restore(saved: serde_json::Value) -> Result<SavedRun, String> {
    let bytes = serde_json::to_vec(&saved).map_err(|_| "Invalid preview state")?;
    if bytes.len() > MAX_CHECKPOINT {
        return Err("Preview state is too large".into());
    }
    if saved["technique_id"] != ROOT
        || saved["manager"]["limits"]
            != serde_json::to_value(preview_limits()).map_err(|_| "Invalid limits")?
    {
        return Err("This is not a bounded editor preview".into());
    }
    if saved["manager"]["accepted"]
        .as_array()
        .is_none_or(|commands| commands.len() > 512)
    {
        return Err("Preview transition limit exceeded".into());
    }
    // RunManager deserialization performs production replay validation.
    let current: SavedRun = serde_json::from_slice(&bytes).map_err(|_| "Invalid preview state")?;
    let sources = current.manager.snapshot().sources();
    if current.technique_id != ROOT
        || sources.len() != 1
        || sources.get(ROOT).is_none_or(|s| s.len() > MAX_SOURCE)
    {
        return Err("This is not an editor preview".into());
    }
    Ok(current)
}

fn check_source(source: &str) -> Result<compiler::CompiledPattern, String> {
    if source.len() > MAX_SOURCE {
        return Err("Practice source exceeds 64 KiB".into());
    }
    compiler::compile(source).map_err(|errors| serde_json::to_string(&errors).unwrap_or_default())
}

fn worksheet_snapshot(
    source: Option<String>,
    technique_id: Option<String>,
) -> Result<ExecutableSnapshot, String> {
    match (source, technique_id) {
        (Some(source), None) => {
            check_source(&source)?;
            ExecutableSnapshot::build(SourceBundle {
                root: ROOT.into(),
                patterns: BTreeMap::from([(ROOT.into(), source)]),
            })
            .map_err(|_| "Worksheet source could not compile".into())
        }
        (None, Some(id)) => {
            crate::catalog_snapshot(&id).map_err(|_| "Worksheet pattern is unavailable".into())
        }
        _ => Err("Provide one worksheet source or catalog identity".into()),
    }
}

/// Bounded source transport; adapters own any checkpoint storage or explicit transfer.
pub fn execute(request: &str) -> Result<String, String> {
    if request.len() > MAX_CHECKPOINT + MAX_SOURCE {
        return Err("Preview request is too large".into());
    }
    let request: Request = serde_json::from_str(request).map_err(|_| "Invalid editor request")?;
    let run = match request {
        Request::InspectBundle { bundle } => {
            if bundle.root.is_empty()
                || bundle.root.len() > 128
                || bundle.patterns.len() > 128
                || bundle.patterns.iter().any(|(name, source)| {
                    name.is_empty() || name.len() > 128 || source.len() > MAX_SOURCE
                })
            {
                return Err("Definition bundle exceeds inspection limits".into());
            }
            let root = bundle.root.clone();
            let snapshot = ExecutableSnapshot::build(bundle)
                .map_err(|_| "Definition bundle could not compile")?;
            let structure = snapshot
                .root()
                .inspect()
                .map_err(|_| "Could not inspect definition bundle")?;
            // A definition projection, never a run or checkpoint. The shared core
            // selects the exact transitive closure and validates every contract.
            return serde_json::to_string(&serde_json::json!({
                "snapshot_id": snapshot.id(),
                "revision": structure.revision,
                "inputs": structure.inputs,
                "outputs": structure.outputs,
                "sources": snapshot.sources(),
                "root": root,
            }))
            .map_err(|_| "Could not serialize definition inspection".into());
        }
        Request::Worksheet {
            source,
            technique_id,
        } => {
            let snapshot = worksheet_snapshot(source, technique_id)?;
            let worksheet = snapshot
                .worksheet()
                .map_err(|_| "Could not project worksheet")?;
            return serde_json::to_string(&worksheet)
                .map_err(|_| "Could not serialize worksheet".into());
        }
        Request::WorksheetAvailability {
            source,
            technique_id,
        } => {
            let result = worksheet_snapshot(source, technique_id)?.worksheet();
            let value = match result {
                Ok(_) => serde_json::json!({"available": true}),
                Err(errors) => {
                    serde_json::json!({"available": false, "reason": errors.first().map(|e| e.message.as_str()).unwrap_or("Workbook unavailable.")})
                }
            };
            return serde_json::to_string(&value)
                .map_err(|_| "Could not inspect workbook availability".into());
        }
        Request::Inspect { source } => {
            if source.len() > MAX_SOURCE {
                return Err("Practice source exceeds 64 KiB".into());
            }
            let result = match compiler::compile(&source) {
                Ok(compiled) => {
                    serde_json::json!({"diagnostics":compiled.diagnostics(), "structure":compiled.inspect().map_err(|_| "Could not inspect source")?})
                }
                Err(errors) => serde_json::json!({"diagnostics":errors,"structure":null}),
            };
            return serde_json::to_string(&result).map_err(|_| "Could not inspect source".into());
        }
        Request::Start {
            source,
            root_id,
            inputs,
        } => {
            check_source(&source)?;
            if root_id.is_empty() || root_id.len() > 128 {
                return Err("Invalid preview identity".into());
            }
            let snapshot = ExecutableSnapshot::build(SourceBundle {
                root: ROOT.into(),
                patterns: BTreeMap::from([(ROOT.into(), source)]),
            })
            .map_err(|_| "Practice could not compile")?;
            let turn = manager::start(snapshot, root_id, inputs, preview_limits())
                .map_err(|_| "Starting values do not match the declared input types")?;
            SavedRun {
                technique_id: ROOT.into(),
                revision: 0,
                manager: turn.state,
            }
        }
        Request::Rewind {
            saved,
            expected_revision,
            run_id,
            effect_id,
        } => {
            let current = restore(saved)?;
            if current.revision >= 512 {
                return Err("Preview transition limit reached. Restart the preview.".into());
            }
            current
                .rewind_at(expected_revision, &run_id, &effect_id)
                .map_err(|error| error.to_string())?
        }
        Request::Apply {
            saved,
            expected_revision,
            command,
        } => {
            let current = restore(saved)?;
            if current.revision >= 512 {
                return Err("Preview transition limit reached. Restart the preview.".into());
            }
            current
                .apply_at(expected_revision, command)
                .map_err(|error| error.to_string())?
        }
        Request::Restore { source, saved } => {
            let current = restore(saved)?;
            if current.manager.snapshot().sources().get(ROOT) != Some(&source) {
                return Err("Checkpoint belongs to a different practice revision".into());
            }
            current
        }
    };
    let saved = run.save().map_err(|error: HostError| error.to_string())?;
    if saved.len() > MAX_CHECKPOINT {
        return Err("Preview state is too large".into());
    }
    serde_json::to_string(&serde_json::json!({"saved":serde_json::from_slice::<serde_json::Value>(&saved).map_err(|_| "Invalid preview state")?, "view":run.view().map_err(|error| error.to_string())?}))
        .map_err(|_| "Could not render preview".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value as Json};
    fn request(value: Json) -> Json {
        serde_json::from_str(&execute(&value.to_string()).unwrap()).unwrap()
    }
    #[test]
    fn inspects_types_and_byte_diagnostics_without_a_run() {
        let valid = request(
            json!({"operation":"inspect","source":":language 1\nanswer = !ask {\nCafé?\n}\n-> end"}),
        );
        assert_eq!(valid["structure"]["bindings"][0]["name"], "answer");
        let invalid = request(json!({"operation":"inspect","source":"!show {{missing}}"}));
        assert!(invalid["structure"].is_null());
        assert!(invalid["diagnostics"][0]["primary"]["start"].is_number());
    }
    #[test]
    fn inspects_exact_dependency_closure_without_starting_a_run() {
        let parent = ":language 1\n:input focus text\n!use child as entry {\n}\n!show {\n{{entry.answer}}\n}\n-> end";
        let child = ":language 1\n:output answer\n!ask answer {\nChild question?\n}\n-> end";
        let result = request(json!({"operation":"inspect_bundle","bundle":{
            "root":"parent", "patterns":{"parent":parent,"child":child,"unused":"invalid source"}
        }}));
        assert_eq!(result["root"], "parent");
        assert_eq!(result["inputs"]["focus"], "text");
        assert_eq!(result["sources"]["child"], child);
        assert_eq!(result["sources"].as_object().unwrap().len(), 2);
        assert!(result["snapshot_id"]
            .as_str()
            .unwrap()
            .starts_with("executable-m4-v1:"));
        assert!(result.get("saved").is_none());
        assert!(result.get("view").is_none());
        assert!(execute(
            &json!({"operation":"inspect_bundle","bundle":{
                "root":"parent", "patterns":{"parent":parent}
            }})
            .to_string()
        )
        .is_err());
        assert!(execute(
            &json!({"operation":"inspect_bundle","bundle":{
                "root":"parent", "patterns":{"parent":"x".repeat(MAX_SOURCE+1)}
            }})
            .to_string()
        )
        .is_err());
        assert!(execute(
            &json!({"operation":"inspect_bundle","saved":{},"bundle":{
                "root":"parent", "patterns":{"parent":parent,"child":child}
            }})
            .to_string()
        )
        .is_err());
    }
    #[test]
    fn worksheets_use_sources_or_the_audited_catalog_without_saved_answers() {
        let result = request(
            json!({"operation":"worksheet","source":":language 1\n!ask answer {\nWhat happened?\n}\n-> end"}),
        );
        assert_eq!(result["fidelity"], "complete");
        assert!(result.get("saved").is_none());
        let catalog = request(json!({"operation":"worksheet","technique_id":"cbt.thought-record"}));
        assert!(catalog["markdown"]
            .as_str()
            .unwrap()
            .contains("positive evidence"));
        assert!(!catalog["markdown"]
            .as_str()
            .unwrap()
            .contains("Would you like to begin?"));
        assert_eq!(catalog["fidelity"], "complete");
        for entry in crate::techniques("cbt").iter() {
            let sheet = request(json!({"operation":"worksheet","technique_id":entry.id}));
            assert!(sheet["markdown"].as_str().unwrap().len() > 100);
            assert!(!sheet["markdown"].as_str().unwrap().contains("Route "));
            let available =
                request(json!({"operation":"worksheet_availability","technique_id":entry.id}));
            assert_eq!(available["available"], true);
        }
        for entry in crate::techniques("reframing").iter() {
            let available =
                request(json!({"operation":"worksheet_availability","technique_id":entry.id}));
            assert_eq!(available["available"], false, "{}", entry.id);
            assert!(available["reason"]
                .as_str()
                .unwrap()
                .contains("AI-dependent"));
            assert!(
                execute(&json!({"operation":"worksheet","technique_id":entry.id}).to_string())
                    .is_err()
            );
        }
        assert!(execute(
            &json!({"operation":"worksheet","source":"-> end","technique_id":"cbt.thought-record"})
                .to_string()
        )
        .is_err());
        assert!(execute(
            &json!({"operation":"worksheet","source":"-> end","saved":{"private":"answer"}})
                .to_string()
        )
        .is_err());
    }
    #[test]
    fn workbook_availability_uses_the_same_fail_closed_definition_boundary() {
        for source in [
            ":language 1\n!ask answer {\n~ Ask about today.\n}\n-> end",
            ":language 1\n!choose option {\n- a: \"Same\"\n- b: \"Same\"\n}\n-> end",
        ] {
            let result = request(json!({"operation":"worksheet_availability","source":source}));
            assert_eq!(result["available"], false);
            assert!(result.get("markdown").is_none());
            assert!(result.get("saved").is_none());
            assert!(
                execute(&json!({"operation":"worksheet","source":source}).to_string()).is_err()
            );
        }
        assert!(execute(
            &json!({"operation":"worksheet_availability","source":"-> end","saved":{}}).to_string()
        )
        .is_err());
    }
    #[test]
    fn source_run_advances_pinned_source_and_rejects_stale_or_catalog_checkpoints() {
        let source = ":language 1\nanswer = !ask {\nQuestion?\n}\n!show {\n{{answer}}\n}\n-> end";
        let run =
            request(json!({"operation":"start","source":source,"root_id":"preview1","inputs":{}}));
        let effect = &run["view"]["pending"];
        let action = json!({"operation":"apply","saved":run["saved"],"expected_revision":0,"command":{"run_id":effect["run_id"],"event":{"Fulfill":{"effect_id":effect["effect_id"],"result":{"kind":"text","value":"A note"}}}}});
        let next = request(action.clone());
        assert_eq!(next["view"]["status"], "Completed");
        assert_eq!(next["view"]["items"][0]["result"]["value"], "A note");
        let mut stale = action;
        stale["saved"] = next["saved"].clone();
        assert!(execute(&stale.to_string())
            .unwrap_err()
            .contains("CONFLICT"));
        let checkpoint = crate::SavedRun::start("cbt.thought-record", "catalog", BTreeMap::new())
            .unwrap()
            .save()
            .unwrap();
        assert!(execute(&json!({"operation":"apply","saved":serde_json::from_slice::<Json>(&checkpoint).unwrap(),"expected_revision":0,"command":{"run_id":"catalog","event":"Cancel"}}).to_string()).is_err());
        assert!(crate::SavedRun::restore(&serde_json::to_vec(&run["saved"]).unwrap()).is_err());
        let mut tampered = run["saved"].clone();
        tampered["manager"]["limits"]["max_runs"] = json!(10000);
        assert!(execute(&json!({"operation":"apply","saved":tampered,"expected_revision":0,"command":{"run_id":"preview1","event":"Pause"}}).to_string()).is_err());
    }
    #[test]
    fn rejects_oversized_sources_and_unknown_fields() {
        assert!(execute(
            &json!({"operation":"inspect","source":" ".repeat(MAX_SOURCE+1)}).to_string()
        )
        .is_err());
        assert!(execute(r#"{"operation":"inspect","source":"-> end","extra":true}"#).is_err());
    }

    #[test]
    fn restores_the_exact_pinned_source_without_replaying_external_effects() {
        let source = ":language 1\nanswer = !ask {\nQuestion?\n}\n-> end";
        let run =
            request(json!({"operation":"start","source":source,"root_id":"handoff","inputs":{}}));
        let restored = request(json!({"operation":"restore","source":source,"saved":run["saved"]}));
        assert_eq!(restored, run);
        assert!(execute(
            &json!({"operation":"restore","source":"-> end","saved":run["saved"]}).to_string()
        )
        .unwrap_err()
        .contains("different practice revision"));
        let mut tampered = run["saved"].clone();
        tampered["manager"]["limits"]["max_runs"] = json!(10000);
        assert!(execute(
            &json!({"operation":"restore","source":source,"saved":tampered}).to_string()
        )
        .is_err());
        assert!(
            execute(&json!({"operation":"restore","source":source,"saved":{}}).to_string())
                .is_err()
        );
    }
}
