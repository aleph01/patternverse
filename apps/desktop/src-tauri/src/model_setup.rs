use std::{
    collections::HashMap,
    ffi::{CStr, CString},
    fs,
    io::{BufRead, BufReader, Read, Write},
    mem::MaybeUninit,
    net::TcpStream,
    os::unix::ffi::OsStrExt,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, MutexGuard,
    },
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Manager};

use crate::ollama::{ManagedOllama, RuntimeError};
use crate::privacy::{
    ensure_private_directory, harden_existing_private_file, loopback_address, prepare_model_cache,
    write_private_atomic,
};

const DISK_RESERVE_BYTES: u64 = 2_000_000_000;
const PULL_IO_TIMEOUT: Duration = Duration::from_millis(600);
const MAX_HEADER_BYTES: usize = 32 * 1024;
const MAX_PROGRESS_LINE_BYTES: usize = 1024 * 1024;

#[derive(Clone, Copy)]
struct CatalogEntry {
    id: &'static str,
    tier: &'static str,
    title: &'static str,
    summary: &'static str,
    download_bytes: u64,
    recommended_memory_bytes: u64,
    minimum_available_memory_bytes: u64,
}

const MODEL_CATALOG: [CatalogEntry; 3] = [
    CatalogEntry {
        id: "qwen3:1.7b",
        tier: "lightweight",
        title: "Lightweight",
        summary: "Fast and requires less memory.",
        download_bytes: 1_400_000_000,
        recommended_memory_bytes: 4_000_000_000,
        minimum_available_memory_bytes: 2_000_000_000,
    },
    CatalogEntry {
        id: "qwen3:4b-instruct",
        tier: "balanced",
        title: "Balanced",
        summary: "A thoughtful balance of quality and speed.",
        download_bytes: 2_500_000_000,
        recommended_memory_bytes: 8_000_000_000,
        minimum_available_memory_bytes: 4_000_000_000,
    },
    CatalogEntry {
        id: "qwen3:8b",
        tier: "highQuality",
        title: "High quality",
        summary: "More capable, with greater memory needs.",
        download_bytes: 5_200_000_000,
        recommended_memory_bytes: 24_000_000_000,
        minimum_available_memory_bytes: 7_000_000_000,
    },
];

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareProfile {
    chip: String,
    architecture: String,
    apple_silicon: bool,
    total_memory_bytes: u64,
    available_memory_bytes: u64,
    free_disk_bytes: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelChoice {
    id: &'static str,
    tier: &'static str,
    title: &'static str,
    summary: &'static str,
    download_bytes: u64,
    recommended_memory_bytes: u64,
    installed: bool,
    can_install: bool,
    recommended: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DownloadPhase {
    Preparing,
    Downloading,
    Verifying,
    Cancelling,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveDownloadSnapshot {
    model_id: String,
    phase: DownloadPhase,
    completed_bytes: u64,
    total_bytes: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSetupSnapshot {
    hardware: HardwareProfile,
    choices: Vec<ModelChoice>,
    recommended_model_id: String,
    selected_model_id: String,
    active_download: Option<ActiveDownloadSnapshot>,
    disk_reserve_bytes: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DownloadEventKind {
    Started,
    Progress,
    Complete,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadEvent {
    kind: DownloadEventKind,
    model_id: String,
    phase: Option<DownloadPhase>,
    completed_bytes: u64,
    total_bytes: u64,
    detail_code: Option<&'static str>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SelectionFile {
    model_id: String,
}

struct SetupInner {
    selected_model_id: Option<String>,
    active_download: Option<ActiveDownloadSnapshot>,
    active_generation: Option<u64>,
}

pub struct ModelSetup {
    generation: AtomicU64,
    models_directory: PathBuf,
    selection_file: PathBuf,
    inner: Mutex<SetupInner>,
}

impl ModelSetup {
    /// Prepare private model cache/selection paths and restore a recognized catalog selection.
    ///
    /// # Errors
    /// Returns app-path, cache-migration, directory, or permission errors.
    pub fn new(app: &AppHandle) -> Result<Self, RuntimeError> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|_| RuntimeError("APP_DATA_DIRECTORY_UNAVAILABLE"))?;
        ensure_private_directory(&app_data)
            .map_err(|_| RuntimeError("APP_DATA_DIRECTORY_PERMISSION_FAILED"))?;
        let app_cache = app
            .path()
            .app_cache_dir()
            .map_err(|_| RuntimeError("APP_CACHE_DIRECTORY_UNAVAILABLE"))?;
        let models_directory = prepare_model_cache(&app_cache, &app_data)
            .map_err(|_| RuntimeError("MODEL_DIRECTORY_CREATE_FAILED"))?;
        let selection_file = app_data.join("model-selection.json");
        harden_existing_private_file(&selection_file)
            .map_err(|_| RuntimeError("MODEL_SELECTION_PERMISSION_FAILED"))?;
        let selected_model_id = read_selection(&selection_file);

        Ok(Self {
            generation: AtomicU64::new(0),
            models_directory,
            selection_file,
            inner: Mutex::new(SetupInner {
                selected_model_id,
                active_download: None,
                active_generation: None,
            }),
        })
    }

    /// Combine current hardware, catalog, installed-model, selection, and progress information.
    /// An unavailable runtime is represented as an empty installed-model list.
    ///
    /// # Errors
    /// Returns hardware, memory, or disk-inspection failures.
    pub fn snapshot(&self, runtime: &ManagedOllama) -> Result<ModelSetupSnapshot, RuntimeError> {
        let hardware = inspect_hardware(&self.models_directory)?;
        let installed = runtime.list_models().unwrap_or_default();
        let installed_ids: Vec<&str> = installed.iter().map(|model| model.id.as_str()).collect();
        let recommended = recommend_model(&hardware);
        let inner = self.lock_inner();
        let selected = inner
            .selected_model_id
            .as_deref()
            .and_then(catalog_entry)
            .unwrap_or(recommended);

        let choices = MODEL_CATALOG
            .iter()
            .map(|entry| {
                let is_installed = installed_ids.contains(&entry.id);
                ModelChoice {
                    id: entry.id,
                    tier: entry.tier,
                    title: entry.title,
                    summary: entry.summary,
                    download_bytes: entry.download_bytes,
                    recommended_memory_bytes: entry.recommended_memory_bytes,
                    installed: is_installed,
                    can_install: is_installed || has_install_space(&hardware, entry),
                    recommended: entry.id == recommended.id,
                }
            })
            .collect();

        Ok(ModelSetupSnapshot {
            hardware,
            choices,
            recommended_model_id: recommended.id.into(),
            selected_model_id: selected.id.into(),
            active_download: inner.active_download.clone(),
            disk_reserve_bytes: DISK_RESERVE_BYTES,
        })
    }

    /// Persist a catalog selection before updating the in-memory selected model.
    ///
    /// # Errors
    /// Rejects unknown model identities or selection-file publication failures.
    pub fn select_model(&self, model_id: &str) -> Result<(), RuntimeError> {
        catalog_entry(model_id).ok_or(RuntimeError("MODEL_NOT_IN_CATALOG"))?;
        write_selection(&self.selection_file, model_id)?;
        self.lock_inner().selected_model_id = Some(model_id.into());
        Ok(())
    }

    /// Validate a catalog download, reserve one active worker, and publish progress events.
    /// The managed local runtime performs the requested download; later failures arrive as events.
    ///
    /// # Errors
    /// Rejects unavailable runtime, insufficient space, concurrent work, selection persistence,
    /// or initial event-channel failure.
    pub fn start_download(
        self: &Arc<Self>,
        runtime: Arc<ManagedOllama>,
        model_id: String,
        on_event: Channel<DownloadEvent>,
    ) -> Result<u64, RuntimeError> {
        let entry = *catalog_entry(&model_id).ok_or(RuntimeError("MODEL_NOT_IN_CATALOG"))?;
        let port = runtime.endpoint_port()?;
        let hardware = inspect_hardware(&self.models_directory)?;
        if !has_install_space(&hardware, &entry) {
            return Err(RuntimeError("MODEL_INSUFFICIENT_DISK_SPACE"));
        }
        let generation = {
            let mut inner = self.lock_inner();
            if inner.active_download.is_some() {
                return Err(RuntimeError("MODEL_DOWNLOAD_IN_PROGRESS"));
            }
            let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
            inner.active_generation = Some(generation);
            inner.active_download = Some(ActiveDownloadSnapshot {
                model_id: model_id.clone(),
                phase: DownloadPhase::Preparing,
                completed_bytes: 0,
                total_bytes: entry.download_bytes,
            });
            generation
        };

        if let Err(error) = self.select_model(&model_id) {
            self.clear_download(generation);
            return Err(error);
        }

        if on_event
            .send(DownloadEvent {
                kind: DownloadEventKind::Started,
                model_id: model_id.clone(),
                phase: Some(DownloadPhase::Preparing),
                completed_bytes: 0,
                total_bytes: entry.download_bytes,
                detail_code: None,
            })
            .is_err()
        {
            self.clear_download(generation);
            return Err(RuntimeError("MODEL_DOWNLOAD_CHANNEL_CLOSED"));
        }

        let setup = Arc::clone(self);
        thread::spawn(move || {
            let mut accumulator = ProgressAccumulator::new(entry.download_bytes);
            let result = pull_model(
                port,
                entry.id,
                || !setup.is_current(generation),
                |progress| {
                    let event = accumulator.apply(entry.id, progress)?;
                    if !setup.record_progress(generation, &event) {
                        return Err(RuntimeError("MODEL_DOWNLOAD_CANCELLED"));
                    }
                    on_event
                        .send(event)
                        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_CHANNEL_CLOSED"))
                },
            );

            let cancelled = !setup.is_current(generation)
                || matches!(result, Err(error) if error.code() == "MODEL_DOWNLOAD_CANCELLED");
            setup.clear_download(generation);

            if cancelled {
                let _ = on_event.send(DownloadEvent {
                    kind: DownloadEventKind::Cancelled,
                    model_id,
                    phase: None,
                    completed_bytes: accumulator.completed_bytes,
                    total_bytes: accumulator.total_bytes,
                    detail_code: None,
                });
                return;
            }

            match result {
                Ok(()) => {
                    let installed = runtime
                        .list_models()
                        .map(|models| models.iter().any(|model| model.id == entry.id))
                        .unwrap_or(false);
                    let event = if installed {
                        DownloadEvent {
                            kind: DownloadEventKind::Complete,
                            model_id,
                            phase: None,
                            completed_bytes: entry.download_bytes,
                            total_bytes: entry.download_bytes,
                            detail_code: None,
                        }
                    } else {
                        failed_event(model_id, "MODEL_DOWNLOAD_NOT_INSTALLED", &accumulator)
                    };
                    let _ = on_event.send(event);
                }
                Err(error) => {
                    let _ = on_event.send(failed_event(model_id, error.code(), &accumulator));
                }
            }
        });

        Ok(generation)
    }

    /// Invalidate the active download token and show a cancelling phase while the worker exits.
    pub fn cancel_download(&self) -> bool {
        let has_active = self.lock_inner().active_download.is_some();
        if has_active {
            self.generation.fetch_add(1, Ordering::SeqCst);
            if let Some(active) = self.lock_inner().active_download.as_mut() {
                active.phase = DownloadPhase::Cancelling;
            }
        }
        has_active
    }

    /// Invalidate outstanding download workers during application shutdown.
    pub fn cancel_all(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    /// Check whether a download worker still owns the current generation.
    fn is_current(&self, generation: u64) -> bool {
        self.generation.load(Ordering::SeqCst) == generation
    }

    /// Update visible progress only for the matching, uncancelled active download.
    fn record_progress(&self, generation: u64, event: &DownloadEvent) -> bool {
        if !self.is_current(generation) {
            return false;
        }
        let mut inner = self.lock_inner();
        if inner.active_generation != Some(generation) {
            return false;
        }
        if let Some(active) = inner.active_download.as_mut() {
            active.phase = event.phase.unwrap_or(active.phase);
            active.completed_bytes = event.completed_bytes;
            active.total_bytes = event.total_bytes;
        }
        true
    }

    /// Clear progress and activity only for the worker that is finishing.
    fn clear_download(&self, generation: u64) {
        let mut inner = self.lock_inner();
        if inner.active_generation == Some(generation) {
            inner.active_generation = None;
            inner.active_download = None;
        }
    }

    /// Lock setup bookkeeping, recovering its contents after mutex poisoning.
    fn lock_inner(&self) -> MutexGuard<'_, SetupInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

/// Construct a terminal failure event retaining the last known byte counts.
fn failed_event(
    model_id: String,
    detail_code: &'static str,
    progress: &ProgressAccumulator,
) -> DownloadEvent {
    DownloadEvent {
        kind: DownloadEventKind::Failed,
        model_id,
        phase: None,
        completed_bytes: progress.completed_bytes,
        total_bytes: progress.total_bytes,
        detail_code: Some(detail_code),
    }
}

/// Look up a model by exact catalog identity; unknown models return `None`.
fn catalog_entry(model_id: &str) -> Option<&'static CatalogEntry> {
    MODEL_CATALOG.iter().find(|entry| entry.id == model_id)
}

/// Choose the largest catalog tier meeting total and available memory thresholds.
/// Falls back to the lightweight entry if none meet both thresholds.
fn recommend_model(hardware: &HardwareProfile) -> &'static CatalogEntry {
    MODEL_CATALOG
        .iter()
        .rev()
        .find(|entry| {
            hardware.total_memory_bytes >= entry.recommended_memory_bytes
                && hardware.available_memory_bytes >= entry.minimum_available_memory_bytes
        })
        .unwrap_or(&MODEL_CATALOG[0])
}

/// Check estimated download size plus the reserved free-disk budget without overflow.
fn has_install_space(hardware: &HardwareProfile, entry: &CatalogEntry) -> bool {
    hardware.free_disk_bytes >= entry.download_bytes.saturating_add(DISK_RESERVE_BYTES)
}

/// Restore only a recognized catalog selection; unreadable or invalid files use defaults.
fn read_selection(path: &Path) -> Option<String> {
    let data = fs::read(path).ok()?;
    let selection: SelectionFile = serde_json::from_slice(&data).ok()?;
    catalog_entry(&selection.model_id).map(|entry| entry.id.into())
}

/// Serialize and atomically save the model selection in a private configuration file.
fn write_selection(path: &Path, model_id: &str) -> Result<(), RuntimeError> {
    let data = serde_json::to_vec(&SelectionFile {
        model_id: model_id.into(),
    })
    .map_err(|_| RuntimeError("MODEL_SELECTION_SAVE_FAILED"))?;
    write_private_atomic(path, &data).map_err(|_| RuntimeError("MODEL_SELECTION_SAVE_FAILED"))
}

/// Read memory and disk capacity for model setup, using a fallback chip display name.
fn inspect_hardware(models_directory: &Path) -> Result<HardwareProfile, RuntimeError> {
    let total_memory_bytes = sysctl_u64("hw.memsize")?;
    let available_memory_bytes = available_memory_bytes()?.min(total_memory_bytes);
    let apple_silicon = sysctl_i32("hw.optional.arm64").unwrap_or(0) == 1;
    let chip = sysctl_string("machdep.cpu.brand_string")
        .or_else(|_| sysctl_string("hw.model"))
        .unwrap_or_else(|_| "Mac".into());

    Ok(HardwareProfile {
        chip,
        architecture: std::env::consts::ARCH.into(),
        apple_silicon,
        total_memory_bytes,
        available_memory_bytes,
        free_disk_bytes: free_disk_bytes(models_directory)?,
    })
}

/// Read a named 64-bit system value, requiring the returned size to match the buffer.
fn sysctl_u64(name: &str) -> Result<u64, RuntimeError> {
    let name = CString::new(name).map_err(|_| RuntimeError("HARDWARE_INSPECTION_FAILED"))?;
    let mut value = 0_u64;
    let mut size = std::mem::size_of::<u64>();
    // SAFETY: the name is NUL-terminated, and value/size are live writable buffers.
    // A null new-value pointer makes this a read-only query.
    let result = unsafe {
        libc::sysctlbyname(
            name.as_ptr(),
            (&mut value as *mut u64).cast(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    };
    if result == 0 && size == std::mem::size_of::<u64>() {
        Ok(value)
    } else {
        Err(RuntimeError("HARDWARE_INSPECTION_FAILED"))
    }
}

/// Read a named 32-bit system value; return a hardware-inspection error on failure.
fn sysctl_i32(name: &str) -> Result<i32, RuntimeError> {
    let name = CString::new(name).map_err(|_| RuntimeError("HARDWARE_INSPECTION_FAILED"))?;
    let mut value = 0_i32;
    let mut size = std::mem::size_of::<i32>();
    // SAFETY: sysctl receives a valid name and a writable buffer with its actual size.
    let result = unsafe {
        libc::sysctlbyname(
            name.as_ptr(),
            (&mut value as *mut i32).cast(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    };
    if result == 0 {
        Ok(value)
    } else {
        Err(RuntimeError("HARDWARE_INSPECTION_FAILED"))
    }
}

/// Read a NUL-terminated UTF-8 system string using the reported buffer size.
fn sysctl_string(name: &str) -> Result<String, RuntimeError> {
    let name = CString::new(name).map_err(|_| RuntimeError("HARDWARE_INSPECTION_FAILED"))?;
    let mut size = 0_usize;
    // SAFETY: a null output buffer requests the size only; size is a valid out-pointer.
    if unsafe {
        libc::sysctlbyname(
            name.as_ptr(),
            std::ptr::null_mut(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    } != 0
        || size == 0
    {
        return Err(RuntimeError("HARDWARE_INSPECTION_FAILED"));
    }
    let mut bytes = vec![0_u8; size];
    // SAFETY: bytes owns at least size writable bytes and remains alive for the call.
    if unsafe {
        libc::sysctlbyname(
            name.as_ptr(),
            bytes.as_mut_ptr().cast(),
            &mut size,
            std::ptr::null_mut(),
            0,
        )
    } != 0
    {
        return Err(RuntimeError("HARDWARE_INSPECTION_FAILED"));
    }
    CStr::from_bytes_until_nul(&bytes)
        .map_err(|_| RuntimeError("HARDWARE_INSPECTION_FAILED"))?
        .to_str()
        .map(str::to_owned)
        .map_err(|_| RuntimeError("HARDWARE_INSPECTION_FAILED"))
}

/// Estimate reclaimable RAM from free, inactive, and speculative pages with saturating arithmetic.
fn available_memory_bytes() -> Result<u64, RuntimeError> {
    let mut statistics = MaybeUninit::<libc::vm_statistics64>::zeroed();
    let mut count = libc::HOST_VM_INFO64_COUNT;
    // SAFETY: the statistics buffer and count match HOST_VM_INFO64's output layout.
    let result = unsafe {
        #[allow(deprecated)]
        let host = libc::mach_host_self();
        libc::host_statistics64(
            host,
            libc::HOST_VM_INFO64,
            statistics.as_mut_ptr().cast(),
            &mut count,
        )
    };
    if result != libc::KERN_SUCCESS {
        return Err(RuntimeError("MEMORY_INSPECTION_FAILED"));
    }
    // SAFETY: the buffer was zero-initialized and the host call reported success.
    let statistics = unsafe { statistics.assume_init() };
    let reclaimable_pages = u64::from(statistics.free_count)
        .saturating_add(u64::from(statistics.inactive_count))
        .saturating_add(u64::from(statistics.speculative_count));
    // SAFETY: Darwin initializes this process-wide page-size value before application code.
    let page_size = unsafe { libc::vm_page_size as u64 };
    Ok(reclaimable_pages.saturating_mul(page_size))
}

/// Estimate available disk bytes using filesystem fragments; reject failed filesystem inspection.
fn free_disk_bytes(path: &Path) -> Result<u64, RuntimeError> {
    let path = CString::new(path.as_os_str().as_bytes())
        .map_err(|_| RuntimeError("DISK_INSPECTION_FAILED"))?;
    let mut statistics = MaybeUninit::<libc::statvfs>::zeroed();
    // SAFETY: path is NUL-terminated and statistics points to writable statvfs storage.
    if unsafe { libc::statvfs(path.as_ptr(), statistics.as_mut_ptr()) } != 0 {
        return Err(RuntimeError("DISK_INSPECTION_FAILED"));
    }
    // SAFETY: statvfs reported success and its output buffer was initialized to zero.
    let statistics = unsafe { statistics.assume_init() };
    let fragment_size = if statistics.f_frsize == 0 {
        statistics.f_bsize
    } else {
        statistics.f_frsize
    };
    Ok((statistics.f_bavail as u64).saturating_mul(fragment_size))
}

#[derive(Deserialize)]
struct PullProgress {
    #[serde(default)]
    status: String,
    digest: Option<String>,
    #[serde(default)]
    total: u64,
    #[serde(default)]
    completed: u64,
    error: Option<String>,
}

struct ProgressAccumulator {
    estimated_total: u64,
    layers: HashMap<String, (u64, u64)>,
    completed_bytes: u64,
    total_bytes: u64,
}

impl ProgressAccumulator {
    /// Initialize aggregate progress using the catalog download estimate until layer totals arrive.
    fn new(estimated_total: u64) -> Self {
        Self {
            estimated_total,
            layers: HashMap::new(),
            completed_bytes: 0,
            total_bytes: estimated_total,
        }
    }

    /// Update per-layer byte totals and convert a pull record into a user-facing phase.
    /// Rejects reported remote errors and caps each layer's completed count at its total.
    fn apply(
        &mut self,
        model_id: &str,
        progress: PullProgress,
    ) -> Result<DownloadEvent, RuntimeError> {
        if progress.error.is_some() {
            return Err(RuntimeError("MODEL_DOWNLOAD_REMOTE_ERROR"));
        }
        if let Some(digest) = progress.digest {
            self.record_layer(digest, progress.total, progress.completed);
        }
        Ok(DownloadEvent {
            kind: DownloadEventKind::Progress,
            model_id: model_id.into(),
            phase: Some(download_phase(&progress.status, progress.total)),
            completed_bytes: self.completed_bytes,
            total_bytes: self.total_bytes,
            detail_code: None,
        })
    }

    /// Replace one layer's latest counters and recompute bounded aggregate progress.
    fn record_layer(&mut self, digest: String, total: u64, completed: u64) {
        self.layers.insert(digest, (total, completed));
        let layer_total = self.layers.values().map(|(total, _)| *total).sum::<u64>();
        self.total_bytes = self.estimated_total.max(layer_total);
        self.completed_bytes = self
            .layers
            .values()
            .map(|(total, completed)| (*completed).min(*total))
            .sum::<u64>()
            .min(self.total_bytes);
    }
}

/// Classify a pull status, giving final verification precedence over byte counters.
fn download_phase(status: &str, total: u64) -> DownloadPhase {
    if status.contains("verifying")
        || status.contains("writing manifest")
        || status.contains("removing")
        || status == "success"
    {
        DownloadPhase::Verifying
    } else if total > 0 || status.starts_with("pulling ") {
        DownloadPhase::Downloading
    } else {
        DownloadPhase::Preparing
    }
}

/// Request a model pull over loopback and stream bounded NDJSON progress to the consumer.
/// Requires an explicit success record; propagates cancellation, protocol, and callback errors.
fn pull_model<FIsCancelled, FProgress>(
    port: u16,
    model_id: &str,
    is_cancelled: FIsCancelled,
    mut on_progress: FProgress,
) -> Result<(), RuntimeError>
where
    FIsCancelled: Fn() -> bool,
    FProgress: FnMut(PullProgress) -> Result<(), RuntimeError>,
{
    let address = loopback_address(port);
    let mut stream = TcpStream::connect_timeout(&address.into(), PULL_IO_TIMEOUT)
        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_CONNECTION_FAILED"))?;
    stream
        .set_read_timeout(Some(PULL_IO_TIMEOUT))
        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_CONNECTION_FAILED"))?;
    stream
        .set_write_timeout(Some(PULL_IO_TIMEOUT))
        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_CONNECTION_FAILED"))?;
    let body = serde_json::to_vec(&serde_json::json!({ "model": model_id, "stream": true }))
        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_REQUEST_FAILED"))?;
    write!(
        stream,
        "POST /api/pull HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nAccept: application/x-ndjson\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .and_then(|_| stream.write_all(&body))
    .map_err(|_| RuntimeError("MODEL_DOWNLOAD_REQUEST_FAILED"))?;

    let mut reader = BufReader::new(stream);
    let status_line = read_line_cancelable(&mut reader, &is_cancelled)?;
    if !status_line.starts_with("HTTP/1.1 200 ") && !status_line.starts_with("HTTP/1.0 200 ") {
        return Err(RuntimeError("MODEL_DOWNLOAD_HTTP_ERROR"));
    }
    let mut chunked = false;
    let mut header_bytes = status_line.len();
    loop {
        let line = read_line_cancelable(&mut reader, &is_cancelled)?;
        header_bytes = header_bytes.saturating_add(line.len());
        if header_bytes > MAX_HEADER_BYTES {
            return Err(RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"));
        }
        if line == "\r\n" || line == "\n" || line.is_empty() {
            break;
        }
        if line.to_ascii_lowercase().starts_with("transfer-encoding:")
            && line.to_ascii_lowercase().contains("chunked")
        {
            chunked = true;
        }
    }

    let mut pending = Vec::new();
    let mut success = false;
    if chunked {
        loop {
            let size_line = read_line_cancelable(&mut reader, &is_cancelled)?;
            let size_text = size_line.trim().split(';').next().unwrap_or_default();
            let size = usize::from_str_radix(size_text, 16)
                .map_err(|_| RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"))?;
            if size == 0 {
                break;
            }
            if size > MAX_PROGRESS_LINE_BYTES {
                return Err(RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"));
            }
            let mut chunk = vec![0_u8; size];
            read_exact_cancelable(&mut reader, &mut chunk, &is_cancelled)?;
            let mut ending = [0_u8; 2];
            read_exact_cancelable(&mut reader, &mut ending, &is_cancelled)?;
            if ending != *b"\r\n" {
                return Err(RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"));
            }
            process_progress_bytes(&chunk, &mut pending, &mut success, &mut on_progress)?;
        }
    } else {
        let mut buffer = [0_u8; 8 * 1024];
        loop {
            if is_cancelled() {
                return Err(RuntimeError("MODEL_DOWNLOAD_CANCELLED"));
            }
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => process_progress_bytes(
                    &buffer[..read],
                    &mut pending,
                    &mut success,
                    &mut on_progress,
                )?,
                Err(error) if is_retryable_io(&error) => continue,
                Err(_) => return Err(RuntimeError("MODEL_DOWNLOAD_RESPONSE_FAILED")),
            }
        }
    }
    process_final_progress(&mut pending, &mut success, &mut on_progress)?;
    if success {
        Ok(())
    } else {
        Err(RuntimeError("MODEL_DOWNLOAD_INCOMPLETE"))
    }
}

/// Read one progress protocol line, polling cancellation between retryable reads.
/// Rejects early EOF, oversized returned lines, and nonretryable I/O failures.
fn read_line_cancelable<R: BufRead, F: Fn() -> bool>(
    reader: &mut R,
    is_cancelled: &F,
) -> Result<String, RuntimeError> {
    loop {
        if is_cancelled() {
            return Err(RuntimeError("MODEL_DOWNLOAD_CANCELLED"));
        }
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => return Err(RuntimeError("MODEL_DOWNLOAD_INCOMPLETE")),
            Ok(_) if line.len() <= MAX_PROGRESS_LINE_BYTES => return Ok(line),
            Ok(_) => return Err(RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE")),
            Err(error) if is_retryable_io(&error) => continue,
            Err(_) => return Err(RuntimeError("MODEL_DOWNLOAD_RESPONSE_FAILED")),
        }
    }
}

/// Fill a chunk buffer while polling cancellation; reject EOF before all bytes arrive.
fn read_exact_cancelable<R: Read, F: Fn() -> bool>(
    reader: &mut R,
    output: &mut [u8],
    is_cancelled: &F,
) -> Result<(), RuntimeError> {
    let mut offset = 0;
    while offset < output.len() {
        if is_cancelled() {
            return Err(RuntimeError("MODEL_DOWNLOAD_CANCELLED"));
        }
        match reader.read(&mut output[offset..]) {
            Ok(0) => return Err(RuntimeError("MODEL_DOWNLOAD_INCOMPLETE")),
            Ok(read) => offset += read,
            Err(error) if is_retryable_io(&error) => continue,
            Err(_) => return Err(RuntimeError("MODEL_DOWNLOAD_RESPONSE_FAILED")),
        }
    }
    Ok(())
}

/// Recognize timeout and would-block reads that should recheck cancellation and retry.
fn is_retryable_io(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
    )
}

/// Buffer bounded progress bytes and dispatch complete NDJSON records.
fn process_progress_bytes<F: FnMut(PullProgress) -> Result<(), RuntimeError>>(
    bytes: &[u8],
    pending: &mut Vec<u8>,
    success: &mut bool,
    on_progress: &mut F,
) -> Result<(), RuntimeError> {
    pending.extend_from_slice(bytes);
    if pending.len() > MAX_PROGRESS_LINE_BYTES {
        return Err(RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"));
    }
    while let Some(newline) = pending.iter().position(|byte| *byte == b'\n') {
        let line: Vec<u8> = pending.drain(..=newline).collect();
        process_progress_line(&line, success, on_progress)?;
    }
    Ok(())
}

/// Dispatch a nonblank final progress record without requiring a trailing newline.
fn process_final_progress<F: FnMut(PullProgress) -> Result<(), RuntimeError>>(
    pending: &mut Vec<u8>,
    success: &mut bool,
    on_progress: &mut F,
) -> Result<(), RuntimeError> {
    if !pending.iter().all(u8::is_ascii_whitespace) {
        let line = std::mem::take(pending);
        process_progress_line(&line, success, on_progress)?;
    }
    Ok(())
}

/// Decode one progress record, retain its success marker, and invoke the progress consumer.
fn process_progress_line<F: FnMut(PullProgress) -> Result<(), RuntimeError>>(
    line: &[u8],
    success: &mut bool,
    on_progress: &mut F,
) -> Result<(), RuntimeError> {
    let line = line
        .strip_suffix(b"\n")
        .unwrap_or(line)
        .strip_suffix(b"\r")
        .unwrap_or(line);
    if line.is_empty() {
        return Ok(());
    }
    let progress: PullProgress = serde_json::from_slice(line)
        .map_err(|_| RuntimeError("MODEL_DOWNLOAD_INVALID_RESPONSE"))?;
    if progress.status == "success" {
        *success = true;
    }
    on_progress(progress)
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use super::*;
    use std::net::TcpListener;

    #[test]
    fn phase_classification_prioritizes_verification_over_byte_counts() {
        for status in [
            "verifying sha256",
            "writing manifest",
            "removing unused layers",
            "success",
        ] {
            assert_eq!(download_phase(status, 100), DownloadPhase::Verifying);
        }
        assert_eq!(
            download_phase("pulling manifest", 0),
            DownloadPhase::Downloading
        );
        assert_eq!(download_phase("", 100), DownloadPhase::Downloading);
        assert_eq!(download_phase("starting", 0), DownloadPhase::Preparing);
    }

    #[test]
    fn layer_updates_replace_counts_and_cap_each_layer() {
        let mut progress = ProgressAccumulator::new(200);
        progress.record_layer("one".into(), 100, 50);
        assert_eq!((progress.completed_bytes, progress.total_bytes), (50, 200));
        progress.record_layer("one".into(), 100, 150);
        assert_eq!((progress.completed_bytes, progress.total_bytes), (100, 200));
        progress.record_layer("two".into(), 150, 25);
        assert_eq!((progress.completed_bytes, progress.total_bytes), (125, 250));
    }

    #[test]
    fn status_only_records_keep_counts_and_remote_errors_leave_state_unchanged() {
        let mut progress = ProgressAccumulator::new(100);
        progress.record_layer("one".into(), 100, 50);
        let status = serde_json::from_str(r#"{"status":"success"}"#).unwrap();
        let event = progress.apply("synthetic", status).unwrap();
        assert_eq!(event.phase, Some(DownloadPhase::Verifying));
        assert_eq!((event.completed_bytes, event.total_bytes), (50, 100));
        let error = serde_json::from_str(
            r#"{"error":"synthetic","digest":"one","total":900,"completed":900}"#,
        )
        .unwrap();
        assert_eq!(
            progress.apply("synthetic", error).unwrap_err().code(),
            "MODEL_DOWNLOAD_REMOTE_ERROR"
        );
        assert_eq!(progress.layers["one"], (100, 50));
        assert_eq!((progress.completed_bytes, progress.total_bytes), (50, 100));
    }

    fn read_request(stream: &mut TcpStream) {
        let mut request = Vec::new();
        let mut buffer = [0_u8; 512];
        loop {
            let read = stream.read(&mut buffer).unwrap();
            if read == 0 {
                return;
            }
            request.extend_from_slice(&buffer[..read]);
            let Some(header_end) = request.windows(4).position(|bytes| bytes == b"\r\n\r\n") else {
                continue;
            };
            let headers = String::from_utf8_lossy(&request[..header_end]).to_ascii_lowercase();
            let content_length = headers
                .lines()
                .find_map(|line| line.strip_prefix("content-length:"))
                .and_then(|value| value.trim().parse::<usize>().ok())
                .unwrap_or(0);
            if request.len() >= header_end + 4 + content_length {
                return;
            }
        }
    }

    fn profile(total: u64, available: u64, disk: u64) -> HardwareProfile {
        HardwareProfile {
            chip: "Test chip".into(),
            architecture: "aarch64".into(),
            apple_silicon: true,
            total_memory_bytes: total,
            available_memory_bytes: available,
            free_disk_bytes: disk,
        }
    }

    #[test]
    fn recommends_a_conservative_model_for_available_resources() {
        assert_eq!(
            recommend_model(&profile(32_000_000_000, 20_000_000_000, 20_000_000_000)).id,
            "qwen3:8b"
        );
        assert_eq!(
            recommend_model(&profile(16_000_000_000, 8_000_000_000, 10_000_000_000)).id,
            "qwen3:4b-instruct"
        );
        assert_eq!(
            recommend_model(&profile(8_000_000_000, 2_000_000_000, 4_000_000_000)).id,
            "qwen3:1.7b"
        );
    }

    #[test]
    fn requires_two_gigabytes_free_after_installation() {
        let balanced = catalog_entry("qwen3:4b-instruct").unwrap();
        assert!(!has_install_space(
            &profile(16_000_000_000, 8_000_000_000, 4_499_999_999),
            balanced
        ));
        assert!(has_install_space(
            &profile(16_000_000_000, 8_000_000_000, 4_500_000_000),
            balanced
        ));
    }

    #[test]
    fn reads_chunked_pull_progress_to_success() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            read_request(&mut stream);
            let body = concat!(
                "{\"status\":\"pulling manifest\"}\n",
                "{\"status\":\"pulling layer\",\"digest\":\"one\",\"total\":100,\"completed\":50}\n",
                "{\"status\":\"success\"}\n"
            );
            write!(
                stream,
                "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n{:X}\r\n{}\r\n0\r\n\r\n",
                body.len(), body
            )
            .unwrap();
        });

        let mut events = Vec::new();
        pull_model(
            port,
            "qwen3:1.7b",
            || false,
            |progress| {
                events.push(progress.status);
                Ok(())
            },
        )
        .unwrap();
        assert_eq!(events.last().map(String::as_str), Some("success"));
    }

    #[test]
    fn cancellation_closes_a_stalled_pull() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            read_request(&mut stream);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n")
                .unwrap();
            thread::sleep(Duration::from_secs(2));
        });
        let started = std::time::Instant::now();
        let result = pull_model(
            port,
            "qwen3:1.7b",
            || started.elapsed() > Duration::from_millis(100),
            |_| Ok(()),
        );
        assert_eq!(result.unwrap_err().code(), "MODEL_DOWNLOAD_CANCELLED");
    }
}
