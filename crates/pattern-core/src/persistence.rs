//! Host storage boundary: commit state + accepted results + content acknowledgements
//! before dispatching anything. The runtime and Manager remain pure.
use crate::{
    manager::{self, Command, ManagerLimits, RunManager},
    runtime::{Effect, Request, Status},
    snapshot::ExecutableSnapshot,
    value::Value,
};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const MAX_CHECKPOINT_BYTES: usize = 16 * 1024 * 1024;
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum StoreError {
    Conflict,
    Unavailable,
    /// A write may have committed. Reload; do not dispatch tentative effects.
    OutcomeUnknown,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stored {
    pub revision: u64,
    pub bytes: Vec<u8>,
}
/// Implementations must provide atomic, durable compare-and-swap and consistent reads.
/// Production adapters must encrypt/authenticate bytes under the existing Host boundary.
/// Keys are opaque Run IDs, not filesystem paths. Never overwrite on a revision mismatch.
pub trait AtomicStore {
    /// Read an optional checkpoint record without changing its revision.
    ///
    /// # Errors
    /// Returns storage failures; absence must be represented as `Ok(None)`.
    fn load(&mut self, key: &str) -> Result<Option<Stored>, StoreError>;
    /// Durably replace a record only if its revision equals `expected`; `None` requires absence.
    /// Success must mean publication is durable before the Host dispatches any effects.
    ///
    /// # Errors
    /// Returns `Conflict` for a stale expectation, `Unavailable` for a definite failure,
    /// or `OutcomeUnknown` if publication may have succeeded. Reload after ambiguity.
    fn compare_and_swap(
        &mut self,
        key: &str,
        expected: Option<u64>,
        replacement: Stored,
    ) -> Result<(), StoreError>;
}
/// Synthetic fixture adapter only: neither durable nor encrypted.
#[derive(Default, Clone)]
pub struct MemoryStore {
    records: BTreeMap<String, Stored>,
}
impl AtomicStore for MemoryStore {
    /// Clone a fixture record by opaque key; absence is not an error.
    fn load(&mut self, key: &str) -> Result<Option<Stored>, StoreError> {
        Ok(self.records.get(key).cloned())
    }
    /// Replace a fixture record after checking the expected revision; this adapter is not durable.
    fn compare_and_swap(
        &mut self,
        key: &str,
        expected: Option<u64>,
        replacement: Stored,
    ) -> Result<(), StoreError> {
        if self.records.get(key).map(|r| r.revision) != expected {
            return Err(StoreError::Conflict);
        }
        self.records.insert(key.into(), replacement);
        Ok(())
    }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    Store(StoreError),
    Manager(manager::Error),
    InvalidCheckpoint,
    TooLarge,
    UnknownContent,
    CounterOverflow,
}
impl From<StoreError> for Error {
    /// Wrap a storage failure without losing conflict or uncertain-outcome information.
    fn from(value: StoreError) -> Self {
        Self::Store(value)
    }
}
impl From<manager::Error> for Error {
    /// Wrap a deterministic run-manager failure at the persistence boundary.
    fn from(value: manager::Error) -> Self {
        Self::Manager(value)
    }
}
impl std::fmt::Display for Error {
    /// Format the typed persistence failure without embedding saved conversation data.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for Error {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SavedCheckpoint {
    version: u32,
    revision: u64,
    state: RunManager,
    acknowledged_content: BTreeSet<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct Checkpoint {
    inner: SavedCheckpoint,
    #[serde(skip)]
    content: Vec<Effect>,
}
impl<'de> Deserialize<'de> for Checkpoint {
    /// Decode saved metadata, replay the run, and validate acknowledgement and revision invariants.
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let inner = SavedCheckpoint::deserialize(deserializer)?;
        from_saved(inner).map_err(serde::de::Error::custom)
    }
}
/// Reconstruct historical Show effects by replay, deduplicated by effect identity.
fn content_history(state: &RunManager) -> Result<Vec<Effect>, Error> {
    let replay = manager::replay(state)?;
    let mut seen = BTreeSet::new();
    Ok(replay
        .recorded_effects
        .into_iter()
        .filter(|e| matches!(e.request, Request::Show { .. }) && seen.insert(e.effect_id.clone()))
        .collect())
}
/// Validate checkpoint version, replayed content acknowledgements, and revision accounting.
fn from_saved(inner: SavedCheckpoint) -> Result<Checkpoint, Error> {
    let content = content_history(&inner.state)?;
    let known: BTreeSet<_> = content.iter().map(|e| e.effect_id.as_str()).collect();
    let expected = inner
        .state
        .accepted_commands()
        .len()
        .checked_add(inner.acknowledged_content.len())
        .ok_or(Error::CounterOverflow)?;
    if inner.version != 1
        || inner.revision != u64::try_from(expected).map_err(|_| Error::CounterOverflow)?
        || inner
            .acknowledged_content
            .iter()
            .any(|id| !known.contains(id.as_str()))
    {
        return Err(Error::InvalidCheckpoint);
    }
    Ok(Checkpoint { inner, content })
}
impl Checkpoint {
    /// Return the durable revision used for compare-and-swap, not a runtime step count.
    pub fn revision(&self) -> u64 {
        self.inner.revision
    }
    /// Borrow the validated run tree stored in this checkpoint.
    pub fn state(&self) -> &RunManager {
        &self.inner.state
    }
    /// Borrow the root run identity used as the opaque storage key.
    pub fn key(&self) -> &str {
        self.inner.state.root().run_id()
    }
    /// Only unacknowledged committed content and the current, unpaused blocking effect.
    /// A Host must deduplicate delivery by effect ID; this is at-least-once, not exactly-once IO.
    pub fn deliverable(&self) -> Vec<&Effect> {
        let mut result: Vec<_> = self
            .content
            .iter()
            .filter(|e| !self.inner.acknowledged_content.contains(&e.effect_id))
            .collect();
        if let Some(pending) = self.inner.state.pending() {
            if self.inner.state.runs()[&pending.run_id].state().status() == &Status::Waiting {
                result.push(pending);
            }
        }
        result
    }
    /// Serialize this checkpoint within the configured byte limit.
    ///
    /// # Errors
    /// Returns serialization or checkpoint-size errors.
    pub fn encode(&self) -> Result<Vec<u8>, Error> {
        let bytes = serde_json::to_vec(self).map_err(|_| Error::InvalidCheckpoint)?;
        if bytes.len() > MAX_CHECKPOINT_BYTES {
            return Err(Error::TooLarge);
        }
        Ok(bytes)
    }
    /// Decode bounded bytes and validate the complete saved checkpoint through replay.
    ///
    /// # Errors
    /// Returns size-limit, decoding, or saved-state validation errors.
    pub fn decode(bytes: &[u8]) -> Result<Self, Error> {
        if bytes.len() > MAX_CHECKPOINT_BYTES {
            return Err(Error::TooLarge);
        }
        serde_json::from_slice(bytes).map_err(|_| Error::InvalidCheckpoint)
    }
}
/// Load and validate an optional durable checkpoint, including its key and revision.
///
/// # Errors
/// Returns storage, decoding, size-limit, or record-identity errors.
pub fn load(store: &mut impl AtomicStore, key: &str) -> Result<Option<Checkpoint>, Error> {
    store
        .load(key)?
        .map(|saved| {
            let checkpoint = Checkpoint::decode(&saved.bytes)?;
            if checkpoint.revision() != saved.revision || checkpoint.key() != key {
                return Err(Error::InvalidCheckpoint);
            }
            Ok(checkpoint)
        })
        .transpose()
}
/// Start and durably publish a new run before exposing its checkpoint to the Host.
///
/// # Errors
/// Returns manager, encoding, or storage failures, including conflicts with an existing key.
/// On an uncertain write outcome, reload before dispatching any effects.
pub fn create(
    store: &mut impl AtomicStore,
    snapshot: ExecutableSnapshot,
    key: String,
    inputs: BTreeMap<String, Value>,
    limits: ManagerLimits,
) -> Result<Checkpoint, Error> {
    let turn = manager::start(snapshot, key.clone(), inputs, limits)?;
    let checkpoint = from_saved(SavedCheckpoint {
        version: 1,
        revision: 0,
        state: turn.state,
        acknowledged_content: BTreeSet::new(),
    })?;
    store.compare_and_swap(
        &key,
        None,
        Stored {
            revision: 0,
            bytes: checkpoint.encode()?,
        },
    )?;
    Ok(checkpoint)
}
/// Publish a changed checkpoint by revision CAS; verify storage even for a state-neutral operation.
/// An ambiguous failure requires reload rather than dispatching the staged effects.
fn save(
    store: &mut impl AtomicStore,
    previous: &Checkpoint,
    next: Checkpoint,
) -> Result<Checkpoint, Error> {
    if previous == &next {
        // No new receipt/revision for retries, duplicate replies or duplicate acknowledgements.
        // Still reject a stale caller instead of returning stale delivery instructions.
        if store.load(previous.key())?
            != Some(Stored {
                revision: previous.revision(),
                bytes: previous.encode()?,
            })
        {
            return Err(StoreError::Conflict.into());
        }
        return Ok(next);
    }
    store.compare_and_swap(
        previous.key(),
        Some(previous.revision()),
        Stored {
            revision: next.revision(),
            bytes: next.encode()?,
        },
    )?;
    Ok(next)
}
/// Apply a command and durably publish accepted state and content history atomically.
///
/// # Errors
/// Returns manager, revision-overflow, encoding, or storage failures. Reload after an
/// uncertain write; the returned checkpoint is available only after successful publication.
pub fn apply(
    store: &mut impl AtomicStore,
    checkpoint: &Checkpoint,
    command: Command,
) -> Result<Checkpoint, Error> {
    let turn = manager::transition(checkpoint.state(), command)?;
    let mut next = checkpoint.clone();
    if turn.state != checkpoint.inner.state {
        next.inner.revision = next
            .inner
            .revision
            .checked_add(1)
            .ok_or(Error::CounterOverflow)?;
        next.inner.state = turn.state;
        next.content.extend(
            turn.effects
                .into_iter()
                .filter(|e| matches!(e.request, Request::Show { .. })),
        );
    }
    save(store, checkpoint, next)
}
/// Call after the UI has durably upserted content under effect_id. Never acknowledge a
/// blocking effect here: its validated fulfillment is its acknowledgement.
/// # Errors
/// Rejects unknown content identities, revision overflow, encoding failures, or stale/failed
/// storage writes. Reload after an uncertain write outcome.
pub fn acknowledge_content(
    store: &mut impl AtomicStore,
    checkpoint: &Checkpoint,
    effect_id: &str,
) -> Result<Checkpoint, Error> {
    if !checkpoint.content.iter().any(|e| e.effect_id == effect_id) {
        return Err(Error::UnknownContent);
    }
    let mut next = checkpoint.clone();
    if next.inner.acknowledged_content.insert(effect_id.into()) {
        next.inner.revision = next
            .inner
            .revision
            .checked_add(1)
            .ok_or(Error::CounterOverflow)?;
    }
    save(store, checkpoint, next)
}
