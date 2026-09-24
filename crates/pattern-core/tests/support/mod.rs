//! Plaintext file adapter only for synthetic fixtures. Not compiled into the library.
use pattern_core::persistence::{AtomicStore, StoreError, Stored};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Clone, Copy, Default)]
pub enum Fault {
    #[default]
    None,
    BeforeWrite,
    AfterCommit,
    ExitBeforePublish,
    ExitAfterCommit,
}
pub struct FileStore {
    directory: PathBuf,
    pub fault: Fault,
}
#[derive(Serialize, Deserialize)]
struct Envelope {
    revision: u64,
    bytes: Vec<u8>,
}
impl FileStore {
    pub fn new(directory: &Path) -> Self {
        Self {
            directory: directory.into(),
            fault: Fault::None,
        }
    }
    pub fn path(&self, key: &str) -> PathBuf {
        self.directory
            .join(format!("{:x}.json", Sha256::digest(key.as_bytes())))
    }
    fn lock(&self, key: &str) -> Result<File, StoreError> {
        let path = self.path(key).with_extension("lock");
        let mut options = OpenOptions::new();
        options.read(true).write(true).create(true).truncate(false);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let lock = options.open(path).map_err(|_| StoreError::Unavailable)?;
        fs2::FileExt::lock_exclusive(&lock).map_err(|_| StoreError::Unavailable)?;
        Ok(lock)
    }
    fn read(&self, key: &str) -> Result<Option<Stored>, StoreError> {
        match fs::read(self.path(key)) {
            Ok(bytes) => {
                let e: Envelope =
                    serde_json::from_slice(&bytes).map_err(|_| StoreError::Unavailable)?;
                Ok(Some(Stored {
                    revision: e.revision,
                    bytes: e.bytes,
                }))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(_) => Err(StoreError::Unavailable),
        }
    }
}
impl AtomicStore for FileStore {
    fn load(&mut self, key: &str) -> Result<Option<Stored>, StoreError> {
        let _lock = self.lock(key)?;
        self.read(key)
    }
    fn compare_and_swap(
        &mut self,
        key: &str,
        expected: Option<u64>,
        replacement: Stored,
    ) -> Result<(), StoreError> {
        let _lock = self.lock(key)?;
        if self.read(key)?.map(|r| r.revision) != expected {
            return Err(StoreError::Conflict);
        }
        let fault = std::mem::take(&mut self.fault);
        if matches!(fault, Fault::BeforeWrite) {
            return Err(StoreError::Unavailable);
        }
        let bytes = serde_json::to_vec(&Envelope {
            revision: replacement.revision,
            bytes: replacement.bytes,
        })
        .map_err(|_| StoreError::Unavailable)?;
        let mut temp = tempfile::NamedTempFile::new_in(&self.directory)
            .map_err(|_| StoreError::Unavailable)?;
        temp.write_all(&bytes)
            .map_err(|_| StoreError::Unavailable)?;
        temp.as_file()
            .sync_all()
            .map_err(|_| StoreError::Unavailable)?;
        if matches!(fault, Fault::ExitBeforePublish) {
            std::process::exit(77);
        }
        temp.persist(self.path(key))
            .map_err(|_| StoreError::OutcomeUnknown)?;
        File::open(&self.directory)
            .and_then(|dir| dir.sync_all())
            .map_err(|_| StoreError::OutcomeUnknown)?;
        if matches!(fault, Fault::ExitAfterCommit) {
            std::process::exit(78);
        }
        if matches!(fault, Fault::AfterCommit) {
            return Err(StoreError::OutcomeUnknown);
        }
        Ok(())
    }
}
