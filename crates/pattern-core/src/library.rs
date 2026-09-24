//! Source-first local authoring. Drafts never mutate revisions or running snapshots.
use crate::snapshot::{BuildError, ExecutableSnapshot, SourceBundle};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const MAX_SOURCE: usize = 64 * 1024;
const MAX_BUNDLE: usize = 256 * 1024;
const MAX_ENTRIES: usize = 64;
const MAX_REVISIONS: usize = 32;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct RevisionRef {
    pub artifact_id: String,
    pub revision_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Origin {
    BuiltIn { version: String },
    Installed { version: String },
    Local { forked_from: Option<RevisionRef> },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Revision {
    pub id: String,
    pub bundle: SourceBundle,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub title: String,
    pub origin: Origin,
    pub generation: u64,
    pub draft: SourceBundle,
    pub revisions: Vec<Revision>,
    pub last_valid: Option<String>,
    #[serde(default)]
    pub chat: ChatAvailability,
    #[serde(default)]
    pub chat_generation: u64,
}

/// Local discovery preferences, deliberately separate from immutable executable revisions.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ChatAvailability {
    pub enabled: bool,
    /// Empty means modality-independent; otherwise use stable approach identities.
    pub modalities: Vec<String>,
    pub description: String,
    /// Explicit discovery terms; empty means manual selection only.
    pub cues: Vec<String>,
}

impl Default for ChatAvailability {
    /// Keep existing saved Patterns manually discoverable without recommending examples.
    fn default() -> Self {
        Self {
            enabled: true,
            modalities: vec![],
            description: String::new(),
            cues: vec![],
        }
    }
}

impl ChatAvailability {
    /// Decide new-start eligibility without changing an already pinned Run.
    pub fn allows(&self, modality: &str) -> bool {
        self.enabled
            && (self.modalities.is_empty() || self.modalities.iter().any(|id| id == modality))
    }

    /// Bound saved discovery data independently of source compilation.
    fn validate(&self) -> Result<(), Error> {
        if self.description.len() > 1000
            || self.modalities.len() > 32
            || self.cues.len() > 16
            || self
                .modalities
                .iter()
                .chain(self.cues.iter())
                .any(|text| text.trim().is_empty() || text.len() > 100)
        {
            return Err(Error::Invalid);
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct Library {
    version: u32,
    entries: Vec<Entry>,
}

#[derive(Deserialize)]
struct SavedLibrary {
    version: u32,
    entries: Vec<Entry>,
}

impl Default for Library {
    /// Create an empty versioned catalog without installing or resolving external source.
    fn default() -> Self {
        Self {
            version: 1,
            entries: vec![],
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    NotFound,
    Conflict,
    Immutable,
    Invalid,
    Limit,
}

impl Library {
    /// Update local chat preferences with their own CAS, leaving source and release identity intact.
    ///
    /// # Errors
    /// Rejects stale preference generations, missing entries, and unbounded discovery metadata.
    pub fn configure_chat(
        &mut self,
        id: &str,
        generation: u64,
        chat: ChatAvailability,
    ) -> Result<(), Error> {
        chat.validate()?;
        let index = self.index(id)?;
        let entry = &mut self.entries[index];
        if entry.chat_generation != generation {
            return Err(Error::Conflict);
        }
        let next = generation.checked_add(1).ok_or(Error::Limit)?;
        entry.chat = chat;
        entry.chat_generation = next;
        Ok(())
    }
    /// Borrow local entries and installed releases without deriving execution from drafts.
    pub fn entries(&self) -> &[Entry] {
        &self.entries
    }

    /// Create an owned working document, retaining even an invalid initial source.
    ///
    /// # Errors
    /// Rejects duplicate identity, invalid metadata, or resource limits.
    pub fn create(&mut self, id: String, title: String, bundle: SourceBundle) -> Result<(), Error> {
        let bundle = self.resolve_imports(bundle);
        self.insert(
            id,
            title,
            Origin::Local { forked_from: None },
            bundle,
            false,
        )
    }

    /// Install a trusted immutable release with a distinct lineage identity.
    ///
    /// # Errors
    /// Rejects local origins, duplicate identities, invalid code, and limits.
    pub fn install(
        &mut self,
        id: String,
        title: String,
        origin: Origin,
        bundle: SourceBundle,
    ) -> Result<(), Error> {
        if matches!(origin, Origin::Local { .. }) {
            return Err(Error::Invalid);
        }
        self.insert(id, title, origin, bundle, true)
    }

    /// Save an owned root draft with optimistic concurrency; retain the last valid executable.
    /// Dependencies remain pinned to the working document's explicit local source bundle.
    ///
    /// # Errors
    /// Rejects immutable releases, stale generations, missing entries, and limits.
    /// Compiler errors are saved as draft state, not returned as a failed save.
    pub fn save(&mut self, id: &str, generation: u64, source: String) -> Result<(), Error> {
        let index = self.index(id)?;
        let mut next = self.entries[index].clone();
        if !matches!(next.origin, Origin::Local { .. }) {
            return Err(Error::Immutable);
        }
        if next.generation != generation {
            return Err(Error::Conflict);
        }
        next.generation = generation.checked_add(1).ok_or(Error::Limit)?;
        next.draft.patterns.insert(next.draft.root.clone(), source);
        next.draft = self.resolve_imports(next.draft);
        check_bundle(&next.draft)?;
        promote(&mut next)?;
        self.entries[index] = next;
        Ok(())
    }

    /// Fork an exact saved revision into a new owned identity, recording immutable ancestry.
    ///
    /// # Errors
    /// Rejects unknown revisions, duplicate identities, invalid metadata, and limits.
    pub fn fork(&mut self, from: RevisionRef, id: String, title: String) -> Result<(), Error> {
        let bundle = self.revision(&from)?.bundle.clone();
        let mut chat = self.entries[self.index(&from.artifact_id)?].chat.clone();
        // A fork is a distinct editable alternative, not a second automatic recommendation.
        chat.enabled = false;
        chat.cues.clear();
        self.insert(
            id.clone(),
            title,
            Origin::Local {
                forked_from: Some(from),
            },
            bundle,
            true,
        )?;
        let index = self.index(&id)?;
        self.entries[index].chat = chat;
        Ok(())
    }

    /// Resolve an exact immutable revision; never substitute a newer revision or draft.
    ///
    /// # Errors
    /// Returns not-found when the artifact or the requested revision is absent.
    pub fn revision(&self, reference: &RevisionRef) -> Result<&Revision, Error> {
        self.entries[self.index(&reference.artifact_id)?]
            .revisions
            .iter()
            .find(|revision| revision.id == reference.revision_id)
            .ok_or(Error::NotFound)
    }

    /// Build the requested saved executable without consulting working documents or external state.
    ///
    /// # Errors
    /// Rejects missing or invalid saved source.
    pub fn executable(&self, reference: &RevisionRef) -> Result<ExecutableSnapshot, Error> {
        ExecutableSnapshot::build(self.revision(reference)?.bundle.clone())
            .map_err(|_| Error::Invalid)
    }

    /// Materialize declared imports from immutable local revisions, retaining portable bundled pins.
    /// Missing pins and conflicting closures remain compiler-invalid drafts; no latest fallback occurs.
    pub fn resolve_imports(&self, mut bundle: SourceBundle) -> SourceBundle {
        if check_bundle(&bundle).is_err() {
            return bundle;
        }
        let Some(source) = bundle.patterns.get(&bundle.root) else {
            return bundle;
        };
        let Ok(parsed) = crate::syntax::parse(source) else {
            return bundle;
        };
        let Ok(imports) = crate::syntax::imports(&parsed.declarations) else {
            return bundle;
        };
        for import in imports {
            // An embedded, matching closure is portable and needs no mutable catalog lookup.
            let existing = SourceBundle {
                root: import.alias.clone(),
                patterns: bundle.patterns.clone(),
            };
            if ExecutableSnapshot::build(existing)
                .is_ok_and(|snapshot| snapshot.root().snapshot_id() == import.revision)
            {
                continue;
            }
            if import.alias == bundle.root {
                continue;
            }
            bundle.patterns.remove(&import.alias);
            let snapshot = self
                .entries
                .iter()
                .find(|entry| entry.id == import.artifact)
                .and_then(|entry| {
                    entry.revisions.iter().find_map(|revision| {
                        ExecutableSnapshot::build(revision.bundle.clone())
                            .ok()
                            .filter(|snapshot| snapshot.root().snapshot_id() == import.revision)
                            .map(|snapshot| (revision.bundle.root.clone(), snapshot))
                    })
                });
            let Some((root, snapshot)) = snapshot else {
                continue;
            };
            let mut staged = bundle.patterns.clone();
            let mut conflict = false;
            for (name, source) in snapshot.sources() {
                let name = if name == &root { &import.alias } else { name };
                if staged.get(name).is_some_and(|old| old != source) {
                    conflict = true;
                    break;
                }
                staged.insert(name.clone(), source.clone());
            }
            if !conflict {
                bundle.patterns = staged;
            }
        }
        bundle
    }

    /// Decode and verify a bounded saved library before exposing revisions to execution.
    ///
    /// # Errors
    /// Rejects malformed metadata, duplicate identities, mismatched revisions, and oversized data.
    pub fn decode(bytes: &[u8]) -> Result<Self, Error> {
        if bytes.len() > 8 * 1024 * 1024 {
            return Err(Error::Limit);
        }
        let saved: SavedLibrary = serde_json::from_slice(bytes).map_err(|_| Error::Invalid)?;
        let library = Self {
            version: saved.version,
            entries: saved.entries,
        };
        if library.version != 1 {
            return Err(Error::Invalid);
        }
        if library.entries.len() > MAX_ENTRIES {
            return Err(Error::Limit);
        }
        let mut seen = std::collections::BTreeSet::new();
        for entry in &library.entries {
            check_metadata(&entry.id, &entry.title)?;
            entry.chat.validate()?;
            check_bundle(&entry.draft)?;
            if !seen.insert(&entry.id) || entry.revisions.len() > MAX_REVISIONS {
                return Err(Error::Invalid);
            }
            let mut revisions = std::collections::BTreeSet::new();
            for revision in &entry.revisions {
                check_bundle(&revision.bundle)?;
                let executable = ExecutableSnapshot::build(revision.bundle.clone())
                    .map_err(|_| Error::Invalid)?;
                if executable.id() != revision.id || !revisions.insert(&revision.id) {
                    return Err(Error::Invalid);
                }
            }
            if entry
                .last_valid
                .as_ref()
                .is_some_and(|id| !revisions.contains(id))
            {
                return Err(Error::Invalid);
            }
            if !matches!(entry.origin, Origin::Local { .. }) {
                let executable =
                    ExecutableSnapshot::build(entry.draft.clone()).map_err(|_| Error::Invalid)?;
                if entry.generation != 0 || entry.last_valid.as_deref() != Some(executable.id()) {
                    return Err(Error::Invalid);
                }
            }
        }
        Ok(library)
    }

    /// Locate an artifact by immutable identity, independent of its symbolic source name.
    fn index(&self, id: &str) -> Result<usize, Error> {
        self.entries
            .iter()
            .position(|entry| entry.id == id)
            .ok_or(Error::NotFound)
    }

    /// Stage and validate a complete entry before changing the library.
    fn insert(
        &mut self,
        id: String,
        title: String,
        origin: Origin,
        bundle: SourceBundle,
        require_valid: bool,
    ) -> Result<(), Error> {
        check_metadata(&id, &title)?;
        check_bundle(&bundle)?;
        if self.entries.len() >= MAX_ENTRIES {
            return Err(Error::Limit);
        }
        if self.entries.iter().any(|entry| entry.id == id) {
            return Err(Error::Conflict);
        }
        let mut entry = Entry {
            id,
            title,
            origin,
            generation: 0,
            draft: bundle,
            revisions: vec![],
            last_valid: None,
            chat: ChatAvailability::default(),
            chat_generation: 0,
        };
        promote(&mut entry)?;
        if require_valid && entry.last_valid.is_none() {
            return Err(Error::Invalid);
        }
        self.entries.push(entry);
        Ok(())
    }
}

/// Compile the current draft for editor diagnostics without changing the last-valid revision.
///
/// # Errors
/// Returns the compiler's precise pattern name, spans, and diagnostics for invalid source.
pub fn check_draft(entry: &Entry) -> Result<ExecutableSnapshot, BuildError> {
    ExecutableSnapshot::build(entry.draft.clone())
}

/// Add a content-addressed revision only on successful compilation; keep invalid drafts intact.
fn promote(entry: &mut Entry) -> Result<(), Error> {
    if let Ok(executable) = check_draft(entry) {
        let id = executable.id().to_owned();
        if !entry.revisions.iter().any(|revision| revision.id == id) {
            if entry.revisions.len() >= MAX_REVISIONS {
                return Err(Error::Limit);
            }
            entry.revisions.push(Revision {
                id: id.clone(),
                bundle: SourceBundle {
                    root: entry.draft.root.clone(),
                    patterns: executable.sources().clone(),
                },
            });
        }
        entry.last_valid = Some(id);
    }
    Ok(())
}

/// Bound identity and display metadata independently of executable language validation.
fn check_metadata(id: &str, title: &str) -> Result<(), Error> {
    if id.is_empty() || id.len() > 100 || title.trim().is_empty() || title.len() > 200 {
        return Err(Error::Invalid);
    }
    Ok(())
}

/// Bound authored source before parsing; a working document must always contain its root file.
fn check_bundle(bundle: &SourceBundle) -> Result<(), Error> {
    if bundle.root.is_empty()
        || bundle.root.len() > 100
        || !bundle.patterns.contains_key(&bundle.root)
    {
        return Err(Error::Invalid);
    }
    if bundle.patterns.len() > 32
        || bundle
            .patterns
            .values()
            .any(|source| source.len() > MAX_SOURCE)
        || bundle.patterns.values().map(String::len).sum::<usize>() > MAX_BUNDLE
    {
        return Err(Error::Limit);
    }
    Ok(())
}

/// Construct a standalone working document from its symbolic name and exact source.
pub fn standalone(name: String, source: String) -> SourceBundle {
    SourceBundle {
        root: name.clone(),
        patterns: BTreeMap::from([(name, source)]),
    }
}
