use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Read, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, ChildStdout, Command as ProcessCommand, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, MutexGuard,
    },
    thread,
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

use crate::privacy::ensure_private_directory;

const MODEL_NAME: &str = "ggml-base-q5_1.bin";
const MAX_WAV_BYTES: usize = 32 * 1024 * 1024;
const MAX_JSON_BYTES: u64 = 8 * 1024 * 1024;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TranscriptionStatus {
    Available,
    Unavailable,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionSnapshot {
    pub status: TranscriptionStatus,
    pub detail_code: Option<&'static str>,
    pub model_name: &'static str,
    pub language_detection: &'static str,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TranscriptionEventKind {
    Started,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionEvent {
    kind: TranscriptionEventKind,
    text: String,
    detected_language: Option<String>,
    detail_code: Option<&'static str>,
}

#[derive(Clone, Copy, Debug)]
pub struct TranscriptionError(&'static str);

impl TranscriptionError {
    /// Return a stable transcription failure code without audio or transcript contents.
    pub fn code(self) -> &'static str {
        self.0
    }
}

struct ActiveTranscription {
    generation: u64,
    pid: Option<u32>,
}

struct TranscriptionInner {
    active: Option<ActiveTranscription>,
    worker: Option<WhisperWorker>,
}

pub struct LocalTranscription {
    app: AppHandle,
    model_path: Option<PathBuf>,
    temporary_directory: PathBuf,
    startup_error: Option<&'static str>,
    generation: AtomicU64,
    inner: Mutex<TranscriptionInner>,
}

impl LocalTranscription {
    /// Prepare a private temporary-audio directory and inspect local Whisper resources.
    /// Removes stale transcription files; missing model/sidecar is exposed as unavailable status.
    ///
    /// # Errors
    /// Returns cache-path or temporary-directory cleanup/creation errors.
    pub fn new(app: &AppHandle) -> Result<Self, TranscriptionError> {
        let temporary_directory = app
            .path()
            .app_cache_dir()
            .map_err(|_| TranscriptionError("TRANSCRIPTION_CACHE_UNAVAILABLE"))?
            .join("voice-transcription");
        reset_temporary_directory(&temporary_directory)?;

        let model_path = resolve_model_path(app);
        let startup_error = if app.shell().sidecar("whisper-cli").is_err() {
            Some("WHISPER_SIDECAR_MISSING")
        } else if model_path.is_none() {
            Some("WHISPER_MODEL_MISSING")
        } else {
            None
        };

        Ok(Self {
            app: app.clone(),
            model_path,
            temporary_directory,
            startup_error,
            generation: AtomicU64::new(0),
            inner: Mutex::new(TranscriptionInner {
                active: None,
                worker: None,
            }),
        })
    }

    /// Report local resource readiness without accessing the microphone or starting a worker.
    pub fn snapshot(&self) -> TranscriptionSnapshot {
        TranscriptionSnapshot {
            status: if self.startup_error.is_none() {
                TranscriptionStatus::Available
            } else {
                TranscriptionStatus::Unavailable
            },
            detail_code: self.startup_error,
            model_name: MODEL_NAME,
            language_detection: "automatic-or-specified",
        }
    }

    /// Validate WAV input and language, then reuse or start one local transcription worker.
    /// Temporary audio/output files are private and cleaned after completion; results arrive as events.
    /// A watchdog terminates the matching process after 120 seconds.
    ///
    /// # Errors
    /// Rejects unsupported/invalid input, missing resources, concurrent work, file/process setup,
    /// or initial event-channel failures.
    pub fn start(
        self: &Arc<Self>,
        audio_base64: String,
        mime_type: String,
        language: String,
        on_event: Channel<TranscriptionEvent>,
    ) -> Result<u64, TranscriptionError> {
        if let Some(error) = self.startup_error {
            return Err(TranscriptionError(error));
        }
        if !matches!(mime_type.as_str(), "audio/wav" | "audio/x-wav") {
            return Err(TranscriptionError("TRANSCRIPTION_AUDIO_FORMAT_UNSUPPORTED"));
        }

        if audio_base64.len() > (MAX_WAV_BYTES * 4 / 3) + 4 {
            return Err(TranscriptionError("TRANSCRIPTION_AUDIO_TOO_LARGE"));
        }

        let audio = BASE64
            .decode(audio_base64)
            .map_err(|_| TranscriptionError("TRANSCRIPTION_AUDIO_INVALID"))?;
        validate_wav(&audio)?;
        let language = validate_language(&language)?;
        let model_path = self
            .model_path
            .as_ref()
            .ok_or(TranscriptionError("WHISPER_MODEL_MISSING"))?;
        let generation = {
            let mut inner = self.lock_inner();
            if inner.active.is_some() {
                return Err(TranscriptionError("TRANSCRIPTION_IN_PROGRESS"));
            }
            let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
            inner.active = Some(ActiveTranscription {
                generation,
                pid: None,
            });
            generation
        };
        let input_path = self
            .temporary_directory
            .join(format!("recording-{generation}.wav"));
        let output_prefix = self
            .temporary_directory
            .join(format!("transcript-{generation}"));
        let output_path = output_prefix.with_extension("json");
        if let Err(error) = write_private_file(&input_path, &audio) {
            self.clear(generation);
            return Err(error);
        }
        drop(audio);

        // Pre-create output privately. Only the generated paths cross the anonymous pipe.
        if let Err(error) = write_private_file(&output_path, &[]) {
            self.clear(generation);
            cleanup_files(&input_path, &output_path);
            return Err(error);
        }
        let mut worker = {
            let mut inner = self.lock_inner();
            if !self.is_current(generation) {
                inner.active = None;
                cleanup_files(&input_path, &output_path);
                return Err(TranscriptionError("TRANSCRIPTION_CANCELLED"));
            }
            let worker = inner
                .worker
                .take()
                .map(Ok)
                .unwrap_or_else(|| spawn_whisper(&self.app, model_path));
            match worker {
                Ok(worker) => {
                    if let Some(active) = inner.active.as_mut() {
                        active.pid = Some(worker.child.id());
                    }
                    worker
                }
                Err(error) => {
                    inner.active = None;
                    cleanup_files(&input_path, &output_path);
                    return Err(error);
                }
            }
        };
        if on_event.send(started_event()).is_err() {
            self.clear(generation);
            cleanup_files(&input_path, &output_path);
            return Err(TranscriptionError("TRANSCRIPTION_EVENT_CHANNEL_CLOSED"));
        }

        let transcription = Arc::clone(self);
        thread::spawn(move || {
            let (completed, wait) = std::sync::mpsc::channel::<()>();
            let watchdog = Arc::downgrade(&transcription);
            thread::spawn(move || {
                if matches!(
                    wait.recv_timeout(std::time::Duration::from_secs(120)),
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout)
                ) {
                    if let Some(transcription) = watchdog.upgrade() {
                        let inner = transcription.lock_inner();
                        if let Some(active) = &inner.active {
                            if active.generation == generation {
                                if let Some(pid) = active.pid {
                                    signal_terminate(pid);
                                }
                            }
                        }
                    }
                }
            });
            let status = worker.transcribe(&input_path, &output_path, &language);
            drop(completed);
            let result = status.and_then(|_| read_transcription(&output_path));
            let cancelled = {
                let mut inner = transcription.lock_inner();
                let cancelled = !transcription.is_current(generation);
                // Failed/cancelled processes are dropped and reloaded on the next request.
                if !cancelled && status.is_ok() {
                    inner.worker = Some(worker);
                }
                if inner.active.as_ref().map(|active| active.generation) == Some(generation) {
                    inner.active = None;
                }
                cancelled
            };
            cleanup_files(&input_path, &output_path);
            let event = if cancelled {
                TranscriptionEvent {
                    kind: TranscriptionEventKind::Cancelled,
                    text: String::new(),
                    detected_language: None,
                    detail_code: None,
                }
            } else {
                match result {
                    Ok(result) => TranscriptionEvent {
                        kind: TranscriptionEventKind::Completed,
                        text: result.text,
                        detected_language: result.detected_language,
                        detail_code: None,
                    },
                    Err(error) => TranscriptionEvent {
                        kind: TranscriptionEventKind::Failed,
                        text: String::new(),
                        detected_language: None,
                        detail_code: Some(error.code()),
                    },
                }
            };
            let _ = on_event.send(event);
        });

        Ok(generation)
    }

    /// Invalidate the active job and signal its recorded child PID; return whether a job existed.
    pub fn cancel(&self) -> bool {
        let inner = self.lock_inner();
        if let Some(active) = &inner.active {
            self.generation.fetch_add(1, Ordering::SeqCst);
            if let Some(pid) = active.pid {
                signal_terminate(pid);
            }
            true
        } else {
            false
        }
    }

    /// Cancel active work and drop any retained idle Whisper worker during shutdown.
    pub fn cancel_all(&self) {
        let _ = self.cancel();
        self.lock_inner().worker.take();
    }

    /// Check whether a transcription job still owns the current generation.
    fn is_current(&self, generation: u64) -> bool {
        self.generation.load(Ordering::SeqCst) == generation
    }

    /// Clear activity only for the finishing transcription generation.
    fn clear(&self, generation: u64) {
        let mut inner = self.lock_inner();
        if inner.active.as_ref().map(|active| active.generation) == Some(generation) {
            inner.active = None;
        }
    }

    /// Lock transcription bookkeeping, recovering its contents after mutex poisoning.
    fn lock_inner(&self) -> MutexGuard<'_, TranscriptionInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

/// Create a content-free transcription-start notification.
fn started_event() -> TranscriptionEvent {
    TranscriptionEvent {
        kind: TranscriptionEventKind::Started,
        text: String::new(),
        detected_language: None,
        detail_code: None,
    }
}

/// Find the bundled Whisper model, allowing a source-tree fallback only in debug builds.
fn resolve_model_path(app: &AppHandle) -> Option<PathBuf> {
    let bundled = app
        .path()
        .resource_dir()
        .ok()?
        .join("binaries/whisper-model")
        .join(MODEL_NAME);
    if bundled.is_file() {
        return Some(bundled);
    }
    let development = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("binaries/whisper-model")
        .join(MODEL_NAME);
    (cfg!(debug_assertions) && development.is_file()).then_some(development)
}

/// Remove the dedicated transcription cache and recreate it with private permissions.
/// The caller must supply only the app-owned voice-transcription directory, never a general cache root.
fn reset_temporary_directory(path: &Path) -> Result<(), TranscriptionError> {
    if path.exists() {
        fs::remove_dir_all(path)
            .map_err(|_| TranscriptionError("TRANSCRIPTION_STALE_AUDIO_CLEANUP_FAILED"))?;
    }
    ensure_private_directory(path)
        .map_err(|_| TranscriptionError("TRANSCRIPTION_CACHE_CREATE_FAILED"))
}

/// Create a new owner-only audio/output file; never overwrite an existing path.
fn write_private_file(path: &Path, bytes: &[u8]) -> Result<(), TranscriptionError> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options
        .open(path)
        .and_then(|mut file| file.write_all(bytes))
        .map_err(|_| TranscriptionError("TRANSCRIPTION_AUDIO_WRITE_FAILED"))
}

/// Require bounded canonical 16 kHz mono 16-bit PCM WAV data with consistent RIFF lengths.
fn validate_wav(audio: &[u8]) -> Result<(), TranscriptionError> {
    if audio.len() < 44 || audio.len() > MAX_WAV_BYTES {
        return Err(TranscriptionError("TRANSCRIPTION_AUDIO_INVALID"));
    }
    if &audio[0..4] != b"RIFF" || &audio[8..12] != b"WAVE" || &audio[12..16] != b"fmt " {
        return Err(TranscriptionError("TRANSCRIPTION_AUDIO_INVALID"));
    }
    let format = u16::from_le_bytes([audio[20], audio[21]]);
    let channels = u16::from_le_bytes([audio[22], audio[23]]);
    let sample_rate = u32::from_le_bytes([audio[24], audio[25], audio[26], audio[27]]);
    let bits_per_sample = u16::from_le_bytes([audio[34], audio[35]]);
    if format != 1 || channels != 1 || sample_rate != 16_000 || bits_per_sample != 16 {
        return Err(TranscriptionError("TRANSCRIPTION_AUDIO_INVALID"));
    }
    let riff_size = u32::from_le_bytes([audio[4], audio[5], audio[6], audio[7]]) as usize;
    let data_size = u32::from_le_bytes([audio[40], audio[41], audio[42], audio[43]]) as usize;
    if &audio[36..40] != b"data"
        || riff_size != audio.len().saturating_sub(8)
        || data_size != audio.len().saturating_sub(44)
    {
        return Err(TranscriptionError("TRANSCRIPTION_AUDIO_INVALID"));
    }
    Ok(())
}

/// Normalize automatic detection or a bounded alphanumeric/hyphen language identifier.
fn validate_language(language: &str) -> Result<String, TranscriptionError> {
    let normalized = language.trim().to_ascii_lowercase();
    if normalized == "auto" {
        return Ok(normalized);
    }
    if normalized.len() < 2
        || normalized.len() > 16
        || !normalized
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    {
        return Err(TranscriptionError("TRANSCRIPTION_LANGUAGE_INVALID"));
    }
    Ok(normalized)
}

struct WhisperWorker {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
}

impl WhisperWorker {
    /// Send generated input/output paths over the worker pipe and require a bounded success reply.
    /// Blocks until the child responds; the owning job provides cancellation and a watchdog.
    fn transcribe(
        &mut self,
        input: &Path,
        output: &Path,
        language: &str,
    ) -> Result<(), TranscriptionError> {
        let request = serde_json::json!({ "input": input, "output": output, "language": language });
        writeln!(self.input, "{request}")
            .and_then(|_| self.input.flush())
            .map_err(|_| TranscriptionError("WHISPER_TRANSCRIPTION_FAILED"))?;
        let mut response = String::new();
        self.output
            .by_ref()
            .take(1024)
            .read_line(&mut response)
            .map_err(|_| TranscriptionError("WHISPER_TRANSCRIPTION_FAILED"))?;
        if response.len() >= 1024
            || !response.ends_with('\n')
            || serde_json::from_str::<serde_json::Value>(&response)
                .ok()
                .and_then(|v| v.get("ok").and_then(|v| v.as_bool()))
                != Some(true)
        {
            return Err(TranscriptionError("WHISPER_TRANSCRIPTION_FAILED"));
        }
        Ok(())
    }
}

impl Drop for WhisperWorker {
    /// Kill and reap the owned Whisper process so model workers do not outlive their owner.
    fn drop(&mut self) {
        // Never leave a model process behind on cancellation or app exit.
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Start the bundled Whisper worker with piped input/output and no stderr logging.
/// The returned worker owns and reaps the child; model contents remain local.
fn spawn_whisper(app: &AppHandle, model_path: &Path) -> Result<WhisperWorker, TranscriptionError> {
    let sidecar = app
        .shell()
        .sidecar("whisper-cli")
        .map_err(|_| TranscriptionError("WHISPER_SIDECAR_MISSING"))?;
    let mut command: ProcessCommand = sidecar.into();
    let mut child = command
        .arg("-m")
        .arg(model_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| TranscriptionError("WHISPER_SIDECAR_START_FAILED"))?;
    // Successful spawn with Stdio::piped guarantees these owned handles exist.
    let input = child.stdin.take().expect("piped input");
    let output = BufReader::new(child.stdout.take().expect("piped output"));
    Ok(WhisperWorker {
        child,
        input,
        output,
    })
}

/// Signal the recorded application-owned child PID on Unix; other platforms do nothing.
fn signal_terminate(pid: u32) {
    #[cfg(unix)]
    // SAFETY: kill takes scalar arguments; callers supply the recorded owned worker PID.
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
}

/// Best-effort removal of the exact generated audio and transcript temporary files.
fn cleanup_files(input_path: &Path, output_path: &Path) {
    let _ = fs::remove_file(input_path);
    let _ = fs::remove_file(output_path);
}

#[derive(Deserialize)]
struct WhisperOutput {
    result: WhisperResult,
    #[serde(default)]
    transcription: Vec<WhisperSegment>,
}

#[derive(Deserialize)]
struct WhisperResult {
    language: Option<String>,
}

#[derive(Deserialize)]
struct WhisperSegment {
    #[serde(default)]
    text: String,
}

struct CompletedTranscription {
    text: String,
    detected_language: Option<String>,
}

/// Read a size-checked worker JSON result, normalize segments, and reject empty speech.
fn read_transcription(path: &Path) -> Result<CompletedTranscription, TranscriptionError> {
    let mut file =
        fs::File::open(path).map_err(|_| TranscriptionError("TRANSCRIPTION_OUTPUT_MISSING"))?;
    if file
        .metadata()
        .map_err(|_| TranscriptionError("TRANSCRIPTION_OUTPUT_INVALID"))?
        .len()
        > MAX_JSON_BYTES
    {
        return Err(TranscriptionError("TRANSCRIPTION_OUTPUT_TOO_LARGE"));
    }
    let mut json = String::new();
    file.read_to_string(&mut json)
        .map_err(|_| TranscriptionError("TRANSCRIPTION_OUTPUT_INVALID"))?;
    let output: WhisperOutput = serde_json::from_str(&json)
        .map_err(|_| TranscriptionError("TRANSCRIPTION_OUTPUT_INVALID"))?;
    let text = normalize_segments(&output.transcription);
    if text.is_empty() {
        return Err(TranscriptionError("TRANSCRIPTION_NO_SPEECH"));
    }
    Ok(CompletedTranscription {
        text,
        detected_language: output.result.language,
    })
}

/// Trim and join speech segments, excluding known silence/music markers.
fn normalize_segments(segments: &[WhisperSegment]) -> String {
    segments
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|text| {
            !text.is_empty()
                && !matches!(
                    text.to_ascii_uppercase().as_str(),
                    "[BLANK_AUDIO]" | "[NO SPEECH]" | "[SILENCE]" | "[MUSIC]"
                )
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    #[test]
    fn pipe_worker_reuses_process_and_reports_eof() {
        use super::*;
        let mut child = ProcessCommand::new("/bin/sh")
            .args([
                "-c",
                "read first; printf '{\"ok\":true}\\n'; read second; printf '{\"ok\":true}\\n'",
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .unwrap();
        let input = child.stdin.take().unwrap();
        let output = BufReader::new(child.stdout.take().unwrap());
        let mut worker = WhisperWorker {
            child,
            input,
            output,
        };
        let path = Path::new("unused");
        worker.transcribe(path, path, "auto").unwrap();
        worker.transcribe(path, path, "en").unwrap();
        assert!(worker.transcribe(path, path, "auto").is_err());
    }

    use super::*;

    fn canonical_wav() -> Vec<u8> {
        let mut wav = vec![0_u8; 44];
        wav[0..4].copy_from_slice(b"RIFF");
        wav[4..8].copy_from_slice(&36_u32.to_le_bytes());
        wav[8..12].copy_from_slice(b"WAVE");
        wav[12..16].copy_from_slice(b"fmt ");
        wav[16..20].copy_from_slice(&16_u32.to_le_bytes());
        wav[20..22].copy_from_slice(&1_u16.to_le_bytes());
        wav[22..24].copy_from_slice(&1_u16.to_le_bytes());
        wav[24..28].copy_from_slice(&16_000_u32.to_le_bytes());
        wav[28..32].copy_from_slice(&32_000_u32.to_le_bytes());
        wav[32..34].copy_from_slice(&2_u16.to_le_bytes());
        wav[34..36].copy_from_slice(&16_u16.to_le_bytes());
        wav[36..40].copy_from_slice(b"data");
        wav
    }

    #[test]
    fn accepts_only_the_app_owned_pcm_shape() {
        assert!(validate_wav(&canonical_wav()).is_ok());
        let mut stereo = canonical_wav();
        stereo[22..24].copy_from_slice(&2_u16.to_le_bytes());
        assert_eq!(
            validate_wav(&stereo).unwrap_err().code(),
            "TRANSCRIPTION_AUDIO_INVALID"
        );
    }

    #[test]
    fn validates_auto_and_explicit_language_codes() {
        assert_eq!(validate_language("AUTO").unwrap(), "auto");
        assert_eq!(validate_language("pt-BR").unwrap(), "pt-br");
        assert_eq!(
            validate_language("en; touch /tmp/nope").unwrap_err().code(),
            "TRANSCRIPTION_LANGUAGE_INVALID"
        );
    }

    #[test]
    fn removes_non_speech_markers_without_rewriting_spoken_text() {
        let segments = vec![
            WhisperSegment {
                text: " [BLANK_AUDIO] ".into(),
            },
            WhisperSegment {
                text: " Das fühlt sich schwer an. ".into(),
            },
            WhisperSegment {
                text: " Vielleicht brauche ich Zeit. ".into(),
            },
        ];
        assert_eq!(
            normalize_segments(&segments),
            "Das fühlt sich schwer an. Vielleicht brauche ich Zeit."
        );
    }

    #[test]
    fn launch_cleanup_replaces_stale_audio_directory() {
        let path =
            std::env::temp_dir().join(format!("mira-transcription-test-{}", std::process::id()));
        fs::create_dir_all(&path).unwrap();
        fs::write(path.join("stale.wav"), b"private audio").unwrap();
        reset_temporary_directory(&path).unwrap();
        assert!(path.is_dir());
        assert!(fs::read_dir(&path).unwrap().next().is_none());
        fs::remove_dir(path).unwrap();
    }
}
