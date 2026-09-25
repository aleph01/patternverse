use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command as ProcessCommand, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, MutexGuard,
    },
    thread,
    time::{Duration, Instant},
};

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

use crate::privacy::{loopback_address, prepare_model_cache};

const DEFAULT_OLLAMA_PORT: u16 = 11_434;
const START_ATTEMPTS: usize = 3;
// GPU discovery can take tens of seconds on the first cold launch.
const START_TIMEOUT: Duration = Duration::from_secs(60);
const HEALTH_INTERVAL: Duration = Duration::from_secs(2);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(2);
const MAX_RESPONSE_BYTES: u64 = 4 * 1024 * 1024;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeStatus {
    Starting,
    Ready,
    Unavailable,
    Stopped,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSnapshot {
    pub status: RuntimeStatus,
    pub detail_code: Option<&'static str>,
    pub version: Option<String>,
    pub endpoint_port: Option<u16>,
    pub model_directory: &'static str,
}

impl RuntimeSnapshot {
    /// Construct a starting snapshot without exposing an endpoint before readiness.
    fn starting() -> Self {
        Self {
            status: RuntimeStatus::Starting,
            detail_code: None,
            version: None,
            endpoint_port: None,
            model_directory: "application-owned",
        }
    }

    /// Construct an unavailable snapshot carrying a stable failure code.
    fn unavailable(code: &'static str) -> Self {
        Self {
            status: RuntimeStatus::Unavailable,
            detail_code: Some(code),
            version: None,
            endpoint_port: None,
            model_directory: "application-owned",
        }
    }

    /// Construct an inactive snapshot with no usable endpoint.
    fn stopped() -> Self {
        Self {
            status: RuntimeStatus::Stopped,
            detail_code: None,
            version: None,
            endpoint_port: None,
            model_directory: "application-owned",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledModel {
    pub id: String,
    pub display_name: String,
    pub size_bytes: u64,
    pub installed: bool,
}

#[derive(Clone, Copy, Debug)]
pub struct RuntimeError(pub(crate) &'static str);

impl RuntimeError {
    /// Return the stable native-runtime error code used for IPC and control decisions.
    pub fn code(self) -> &'static str {
        self.0
    }
}

struct OwnedProcess {
    generation: u64,
    port: u16,
    child: Child,
}

struct RuntimeInner {
    snapshot: RuntimeSnapshot,
    process: Option<OwnedProcess>,
}

pub struct ManagedOllama {
    generation: AtomicU64,
    inner: Mutex<RuntimeInner>,
}

impl Default for ManagedOllama {
    /// Create an inactive runtime manager without spawning a process.
    fn default() -> Self {
        Self {
            generation: AtomicU64::new(0),
            inner: Mutex::new(RuntimeInner {
                snapshot: RuntimeSnapshot::stopped(),
                process: None,
            }),
        }
    }
}

impl ManagedOllama {
    /// Clone current lifecycle status under the bookkeeping lock.
    pub fn snapshot(&self) -> RuntimeSnapshot {
        self.lock_inner().snapshot.clone()
    }

    /// Invalidate earlier workers, retire the previous owned child, and start a new runtime worker.
    /// Returns immediately; readiness and failures are available through snapshots.
    pub fn start(self: &Arc<Self>, app: AppHandle) {
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let previous_process = {
            let mut inner = self.lock_inner();
            inner.snapshot = RuntimeSnapshot::starting();
            inner.process.take()
        };

        let runtime = Arc::clone(self);
        thread::spawn(move || {
            if let Some(process) = previous_process {
                terminate_child(process.child);
            }
            runtime.launch(app, generation);
        });
    }

    /// Invalidate workers, mark the runtime stopped, and terminate only the application-owned child.
    pub fn stop(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        let process = {
            let mut inner = self.lock_inner();
            inner.snapshot = RuntimeSnapshot::stopped();
            inner.process.take()
        };

        if let Some(process) = process {
            terminate_child(process.child);
        }
    }

    /// Query installed models on the ready application-owned loopback runtime.
    ///
    /// # Errors
    /// Returns readiness, connection, HTTP, response-size, or decoding errors.
    pub fn list_models(&self) -> Result<Vec<InstalledModel>, RuntimeError> {
        OllamaApi::new(self.endpoint_port()?).models()
    }

    /// Delete an exact installed model through the managed local runtime.
    ///
    /// # Errors
    /// Returns readiness, model-not-installed, request, or response errors.
    pub fn delete_model(&self, model_id: &str) -> Result<(), RuntimeError> {
        let api = OllamaApi::new(self.endpoint_port()?);
        let installed = api.models()?;
        if !installed.iter().any(|model| model.id == model_id) {
            return Err(RuntimeError("MODEL_NOT_INSTALLED"));
        }
        api.delete_model(model_id)
    }

    /// Return the owned process's port only when the manager reports readiness.
    ///
    /// # Errors
    /// Returns not-ready or missing-process errors.
    pub fn endpoint_port(&self) -> Result<u16, RuntimeError> {
        let inner = self.lock_inner();
        if inner.snapshot.status != RuntimeStatus::Ready {
            return Err(RuntimeError("OLLAMA_RUNTIME_NOT_READY"));
        }
        inner
            .process
            .as_ref()
            .map(|process| process.port)
            .ok_or(RuntimeError("OLLAMA_PROCESS_MISSING"))
    }

    /// Resolve bundled resources, attempt startup, and monitor the accepted process generation.
    /// Failures update status; stale generations stop attempting work.
    fn launch(self: &Arc<Self>, app: AppHandle, generation: u64) {
        let paths = match RuntimePaths::resolve(&app) {
            Ok(paths) => paths,
            Err(error) => {
                self.mark_unavailable(generation, error.code());
                return;
            }
        };

        for _ in 0..START_ATTEMPTS {
            if !self.is_current(generation) {
                return;
            }

            let port = match reserve_loopback_port() {
                Ok(port) => port,
                Err(error) => {
                    self.mark_unavailable(generation, error.code());
                    return;
                }
            };

            let child = match spawn_sidecar(&app, &paths, port) {
                Ok(child) => child,
                Err(_) => {
                    self.mark_unavailable(generation, "OLLAMA_SIDECAR_START_FAILED");
                    return;
                }
            };

            if !self.install_process(generation, port, child) {
                return;
            }

            match self.wait_until_ready(generation, port) {
                Ok(version) => {
                    self.mark_ready(generation, port, version);
                    self.monitor(generation, port);
                    return;
                }
                Err(error) => {
                    self.terminate_generation(generation);
                    if error.code() != "OLLAMA_PROCESS_EXITED" {
                        self.mark_unavailable(generation, error.code());
                        return;
                    }
                }
            }
        }

        self.mark_unavailable(generation, "OLLAMA_PROCESS_EXITED");
    }

    /// Poll version and child liveness until ready, cancelled, exited, or startup timeout.
    fn wait_until_ready(&self, generation: u64, port: u16) -> Result<String, RuntimeError> {
        let started_at = Instant::now();
        let api = OllamaApi::new(port);
        let mut last_error = RuntimeError("OLLAMA_START_TIMEOUT");

        while started_at.elapsed() < START_TIMEOUT {
            if !self.is_current(generation) {
                return Err(RuntimeError("OLLAMA_START_CANCELLED"));
            }
            if self.process_exited(generation) {
                return Err(RuntimeError("OLLAMA_PROCESS_EXITED"));
            }
            match api.version() {
                Ok(version) => {
                    thread::sleep(Duration::from_millis(50));
                    if !self.process_exited(generation) {
                        return Ok(version);
                    }
                }
                Err(error) => last_error = error,
            }
            thread::sleep(Duration::from_millis(125));
        }

        Err(last_error)
    }

    /// Periodically check the owned runtime; stop it after three consecutive health failures.
    fn monitor(self: &Arc<Self>, generation: u64, port: u16) {
        let mut failed_health_checks = 0;
        let api = OllamaApi::new(port);

        loop {
            thread::sleep(HEALTH_INTERVAL);
            if !self.is_current(generation) {
                return;
            }
            if self.process_exited(generation) {
                self.mark_unavailable(generation, "OLLAMA_PROCESS_EXITED");
                return;
            }

            if api.version().is_ok() {
                failed_health_checks = 0;
            } else {
                failed_health_checks += 1;
                if failed_health_checks >= 3 {
                    self.terminate_generation(generation);
                    self.mark_unavailable(generation, "OLLAMA_HEALTH_LOST");
                    return;
                }
            }
        }
    }

    /// Adopt a newly spawned child only for the current generation; otherwise terminate it.
    fn install_process(&self, generation: u64, port: u16, child: Child) -> bool {
        let mut inner = self.lock_inner();
        if self.generation.load(Ordering::SeqCst) != generation {
            drop(inner);
            terminate_child(child);
            return false;
        }
        inner.process = Some(OwnedProcess {
            generation,
            port,
            child,
        });
        true
    }

    /// Publish version and endpoint information after checking the generation token.
    fn mark_ready(&self, generation: u64, port: u16, version: String) {
        if !self.is_current(generation) {
            return;
        }
        self.lock_inner().snapshot = RuntimeSnapshot {
            status: RuntimeStatus::Ready,
            detail_code: None,
            version: Some(version),
            endpoint_port: Some(port),
            model_directory: "application-owned",
        };
    }

    /// Publish a failure snapshot if the worker's generation is still current.
    fn mark_unavailable(&self, generation: u64, code: &'static str) {
        if self.is_current(generation) {
            self.lock_inner().snapshot = RuntimeSnapshot::unavailable(code);
        }
    }

    /// Check matching child liveness and clear process bookkeeping when no live child is found.
    fn process_exited(&self, generation: u64) -> bool {
        let mut inner = self.lock_inner();
        let exited = match inner.process.as_mut() {
            Some(process) if process.generation == generation => {
                matches!(process.child.try_wait(), Ok(Some(_)) | Err(_))
            }
            _ => true,
        };
        if exited {
            inner.process = None;
        }
        exited
    }

    /// Remove and terminate only the child belonging to the supplied generation.
    fn terminate_generation(&self, generation: u64) {
        let process = {
            let mut inner = self.lock_inner();
            match inner.process.as_ref() {
                Some(process) if process.generation == generation => inner.process.take(),
                _ => None,
            }
        };
        if let Some(process) = process {
            terminate_child(process.child);
        }
    }

    /// Check the atomic token used to retire superseded runtime workers.
    fn is_current(&self, generation: u64) -> bool {
        self.generation.load(Ordering::SeqCst) == generation
    }

    /// Lock runtime bookkeeping, recovering its contents after mutex poisoning.
    fn lock_inner(&self) -> MutexGuard<'_, RuntimeInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

struct RuntimePaths {
    models: PathBuf,
    working_directory: PathBuf,
}

impl RuntimePaths {
    /// Resolve private cache and bundled runtime resources; development fallback is debug-only.
    fn resolve(app: &AppHandle) -> Result<Self, RuntimeError> {
        let app_data = app
            .path()
            .app_data_dir()
            .map_err(|_| RuntimeError("APP_DATA_DIRECTORY_UNAVAILABLE"))?;
        let app_cache = app
            .path()
            .app_cache_dir()
            .map_err(|_| RuntimeError("APP_CACHE_DIRECTORY_UNAVAILABLE"))?;
        let models = prepare_model_cache(&app_cache, &app_data)
            .map_err(|_| RuntimeError("MODEL_DIRECTORY_CREATE_FAILED"))?;

        let bundled_runtime = app
            .path()
            .resource_dir()
            .map_err(|_| RuntimeError("RUNTIME_RESOURCE_DIRECTORY_UNAVAILABLE"))?
            .join("binaries/ollama-runtime");
        let development_runtime = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("ollama-runtime");
        let working_directory = if bundled_runtime.exists() {
            bundled_runtime
        } else if cfg!(debug_assertions) && development_runtime.exists() {
            development_runtime
        } else {
            return Err(RuntimeError("OLLAMA_RUNTIME_RESOURCES_MISSING"));
        };

        Ok(Self {
            models,
            working_directory,
        })
    }
}

/// Find an available ephemeral loopback port other than the global Ollama default.
/// The probe socket closes on return; startup retries handle a subsequent bind race.
fn reserve_loopback_port() -> Result<u16, RuntimeError> {
    for _ in 0..16 {
        let listener = TcpListener::bind(loopback_address(0))
            .map_err(|_| RuntimeError("LOOPBACK_PORT_UNAVAILABLE"))?;
        let port = listener
            .local_addr()
            .map_err(|_| RuntimeError("LOOPBACK_PORT_UNAVAILABLE"))?
            .port();
        if port != DEFAULT_OLLAMA_PORT {
            return Ok(port);
        }
    }
    Err(RuntimeError("LOOPBACK_PORT_UNAVAILABLE"))
}

/// Launch the bundled Ollama child on loopback with app-owned cache and cloud/history disabled.
/// Redirects child output to null so conversation contents are not logged here.
fn spawn_sidecar(app: &AppHandle, paths: &RuntimePaths, port: u16) -> Result<Child, RuntimeError> {
    let sidecar = app
        .shell()
        .sidecar("ollama")
        .map_err(|_| RuntimeError("OLLAMA_SIDECAR_MISSING"))?;
    let mut command: ProcessCommand = sidecar.into();
    command
        .arg("serve")
        .current_dir(&paths.working_directory)
        .env("OLLAMA_HOST", format!("127.0.0.1:{port}"))
        .env("OLLAMA_MODELS", &paths.models)
        .env("OLLAMA_KEEP_ALIVE", "0")
        .env("OLLAMA_NOHISTORY", "1")
        .env("OLLAMA_NO_CLOUD", "1")
        .stdin(Stdio::null());
    command.stdout(Stdio::null()).stderr(Stdio::null());
    command
        .spawn()
        .map_err(|_| RuntimeError("OLLAMA_SIDECAR_START_FAILED"))
}

/// Terminate and reap the supplied owned child, allowing a short graceful-exit interval.
fn terminate_child(mut child: Child) {
    #[cfg(unix)]
    {
        // This is the exact PID returned for the app-owned child. SIGTERM gives Ollama
        // a short opportunity to close its listener before the bounded kill fallback.
        // SAFETY: kill takes scalar arguments; the Child retains ownership of this PID.
        unsafe {
            libc::kill(child.id() as i32, libc::SIGTERM);
        }
        for _ in 0..20 {
            if matches!(child.try_wait(), Ok(Some(_))) {
                return;
            }
            thread::sleep(Duration::from_millis(25));
        }
    }

    let _ = child.kill();
    let _ = child.wait();
}

struct OllamaApi {
    address: SocketAddr,
}

impl OllamaApi {
    /// Construct an API client restricted to IPv4 loopback at the given port.
    fn new(port: u16) -> Self {
        Self {
            address: SocketAddr::V4(loopback_address(port)),
        }
    }

    /// Fetch the runtime version and reject an empty version string.
    fn version(&self) -> Result<String, RuntimeError> {
        let response: VersionResponse = self.get_json("/api/version")?;
        if response.version.trim().is_empty() {
            return Err(RuntimeError("OLLAMA_INVALID_VERSION_RESPONSE"));
        }
        Ok(response.version)
    }

    /// Decode installed models, falling back to the model name if the canonical ID is empty.
    fn models(&self) -> Result<Vec<InstalledModel>, RuntimeError> {
        let response: TagsResponse = self.get_json("/api/tags")?;
        Ok(response
            .models
            .into_iter()
            .map(|model| {
                let id = if model.model.is_empty() {
                    model.name
                } else {
                    model.model
                };
                InstalledModel {
                    display_name: id.clone(),
                    id,
                    size_bytes: model.size,
                    installed: true,
                }
            })
            .collect())
    }

    /// Send a deletion request for the supplied exact model identity; propagate request failures.
    fn delete_model(&self, model_id: &str) -> Result<(), RuntimeError> {
        let body = serde_json::to_vec(&DeleteModelRequest { model: model_id })
            .map_err(|_| RuntimeError("MODEL_DELETE_REQUEST_FAILED"))?;
        self.request("DELETE", "/api/delete", Some(&body))?;
        Ok(())
    }

    /// Fetch a local API response and deserialize its body, preserving typed transport errors.
    fn get_json<T: DeserializeOwned>(&self, path: &'static str) -> Result<T, RuntimeError> {
        let decoded_body = self.request("GET", path, None)?;
        serde_json::from_slice(&decoded_body)
            .map_err(|_| RuntimeError("OLLAMA_INVALID_JSON_RESPONSE"))
    }

    /// Perform a bounded loopback HTTP request and decode a successful response body.
    /// Returns stable transport, size, status, and framing errors without logging response contents.
    fn request(
        &self,
        method: &'static str,
        path: &'static str,
        body: Option<&[u8]>,
    ) -> Result<Vec<u8>, RuntimeError> {
        let mut stream = TcpStream::connect_timeout(&self.address, REQUEST_TIMEOUT)
            .map_err(|_| RuntimeError("OLLAMA_CONNECTION_FAILED"))?;
        stream
            .set_read_timeout(Some(REQUEST_TIMEOUT))
            .map_err(|_| RuntimeError("OLLAMA_CONNECTION_FAILED"))?;
        stream
            .set_write_timeout(Some(REQUEST_TIMEOUT))
            .map_err(|_| RuntimeError("OLLAMA_CONNECTION_FAILED"))?;

        match body {
            Some(body) => {
                write!(
                    stream,
                    "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nAccept: application/json\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    self.address.port(),
                    body.len(),
                )
                .map_err(|_| RuntimeError("OLLAMA_REQUEST_FAILED"))?;
                stream
                    .write_all(body)
                    .map_err(|_| RuntimeError("OLLAMA_REQUEST_FAILED"))?;
            }
            None => {
                write!(
                    stream,
                    "{method} {path} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nAccept: application/json\r\nConnection: close\r\n\r\n",
                    self.address.port()
                )
                .map_err(|_| RuntimeError("OLLAMA_REQUEST_FAILED"))?;
            }
        }

        let mut response = Vec::new();
        let mut buffer = [0; 8 * 1024];
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    response.extend_from_slice(&buffer[..bytes_read]);
                    if response.len() as u64 > MAX_RESPONSE_BYTES {
                        return Err(RuntimeError("OLLAMA_RESPONSE_TOO_LARGE"));
                    }
                    if http_response_complete(&response) {
                        break;
                    }
                }
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::WouldBlock
                            | std::io::ErrorKind::TimedOut
                            | std::io::ErrorKind::ConnectionReset
                    ) && !response.is_empty() =>
                {
                    // Ollama may reset an explicitly closing loopback connection
                    // after its complete, valid response has already been delivered.
                    break;
                }
                Err(_) => return Err(RuntimeError("OLLAMA_RESPONSE_FAILED")),
            }
        }

        let header_end = find_bytes(&response, b"\r\n\r\n")
            .ok_or(RuntimeError("OLLAMA_INVALID_HTTP_RESPONSE"))?;
        let headers = &response[..header_end];
        let body = &response[header_end + 4..];
        let header_text = String::from_utf8_lossy(headers).to_ascii_lowercase();
        if !header_text.starts_with("http/1.1 200 ") && !header_text.starts_with("http/1.0 200 ") {
            return Err(RuntimeError("OLLAMA_HTTP_ERROR"));
        }

        let decoded_body = if header_text.contains("transfer-encoding: chunked") {
            decode_chunked(body)?
        } else {
            body.to_vec()
        };
        Ok(decoded_body)
    }
}

#[derive(Serialize)]
struct DeleteModelRequest<'a> {
    model: &'a str,
}

#[derive(Deserialize)]
struct VersionResponse {
    version: String,
}

#[derive(Deserialize)]
struct TagsResponse {
    #[serde(default)]
    models: Vec<TagModel>,
}

#[derive(Deserialize)]
struct TagModel {
    #[serde(default)]
    name: String,
    #[serde(default)]
    model: String,
    #[serde(default)]
    size: u64,
}

/// Find a byte subsequence; callers must supply a nonempty needle.
fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

/// Recognize an available Content-Length body or the terminal chunked marker.
fn http_response_complete(response: &[u8]) -> bool {
    let Some(header_end) = find_bytes(response, b"\r\n\r\n") else {
        return false;
    };
    let headers = String::from_utf8_lossy(&response[..header_end]).to_ascii_lowercase();
    let body = &response[header_end + 4..];
    if headers.contains("transfer-encoding: chunked") {
        return body.ends_with(b"0\r\n\r\n");
    }
    headers.lines().any(|line| {
        line.strip_prefix("content-length:")
            .and_then(|value| value.trim().parse::<usize>().ok())
            .is_some_and(|length| body.len() >= length)
    })
}

/// Decode complete HTTP chunks with checked bounds and CRLF validation.
/// Rejects invalid lengths, incomplete chunks, or malformed chunk delimiters.
fn decode_chunked(input: &[u8]) -> Result<Vec<u8>, RuntimeError> {
    let mut cursor = 0;
    let mut output = Vec::new();
    loop {
        let line_end = find_bytes(&input[cursor..], b"\r\n")
            .map(|offset| cursor + offset)
            .ok_or(RuntimeError("OLLAMA_INVALID_CHUNKED_RESPONSE"))?;
        let size_text = std::str::from_utf8(&input[cursor..line_end])
            .map_err(|_| RuntimeError("OLLAMA_INVALID_CHUNKED_RESPONSE"))?;
        let size = usize::from_str_radix(size_text.split(';').next().unwrap_or_default(), 16)
            .map_err(|_| RuntimeError("OLLAMA_INVALID_CHUNKED_RESPONSE"))?;
        cursor = line_end + 2;
        if size == 0 {
            return Ok(output);
        }
        let chunk_end = cursor
            .checked_add(size)
            .filter(|end| {
                end.checked_add(2)
                    .is_some_and(|framed_end| framed_end <= input.len())
            })
            .ok_or(RuntimeError("OLLAMA_INVALID_CHUNKED_RESPONSE"))?;
        output.extend_from_slice(&input[cursor..chunk_end]);
        if &input[chunk_end..chunk_end + 2] != b"\r\n" {
            return Err(RuntimeError("OLLAMA_INVALID_CHUNKED_RESPONSE"));
        }
        cursor = chunk_end + 2;
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn oversized_chunk_length_is_rejected_without_arithmetic_panic() {
        let header_len = format!("{:x}\r\n", usize::MAX).len();
        let input = format!("{:x}\r\n", usize::MAX - header_len);
        let error = super::decode_chunked(input.as_bytes()).unwrap_err();
        assert_eq!(error.code(), "OLLAMA_INVALID_CHUNKED_RESPONSE");
    }

    use std::net::SocketAddrV4;

    use super::*;
    use std::net::Ipv4Addr;

    fn serve_once(body: &'static str, chunked: bool) -> u16 {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = Vec::new();
            let mut buffer = [0; 256];
            while find_bytes(&request, b"\r\n\r\n").is_none() {
                let bytes_read = stream.read(&mut buffer).unwrap();
                if bytes_read == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..bytes_read]);
            }
            if chunked {
                write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n{:X}\r\n{}\r\n0\r\n\r\n",
                    body.len(),
                    body
                )
                .unwrap();
            } else {
                write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                )
                .unwrap();
            }
            stream.flush().unwrap();
            stream.shutdown(std::net::Shutdown::Write).unwrap();
        });
        port
    }

    #[test]
    fn reads_version_from_loopback_http() {
        let port = serve_once(r#"{"version":"0.33.2"}"#, false);
        assert_eq!(OllamaApi::new(port).version().unwrap(), "0.33.2");
    }

    #[test]
    fn maps_installed_models_from_chunked_response() {
        let port = serve_once(
            r#"{"models":[{"name":"mira:latest","model":"mira:latest","size":42}]}"#,
            true,
        );
        assert_eq!(
            OllamaApi::new(port).models().unwrap(),
            vec![InstalledModel {
                id: "mira:latest".into(),
                display_name: "mira:latest".into(),
                size_bytes: 42,
                installed: true,
            }]
        );
    }

    #[test]
    fn deletes_only_the_named_model_through_the_loopback_api() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let request = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = Vec::new();
            let mut buffer = [0; 256];
            while !http_response_complete(&request) {
                let bytes_read = stream.read(&mut buffer).unwrap();
                if bytes_read == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..bytes_read]);
            }
            let response = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}";
            stream.write_all(response).unwrap();
            request
        });

        OllamaApi::new(port).delete_model("qwen3:4b").unwrap();
        let request = request.join().unwrap();
        let header_end = find_bytes(&request, b"\r\n\r\n").unwrap();
        let headers = String::from_utf8_lossy(&request[..header_end]);
        assert!(headers.starts_with("DELETE /api/delete HTTP/1.1\r\n"));
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&request[header_end + 4..]).unwrap(),
            serde_json::json!({ "model": "qwen3:4b" })
        );
    }

    #[test]
    fn reserves_a_non_default_loopback_port() {
        let port = reserve_loopback_port().unwrap();
        assert_ne!(port, DEFAULT_OLLAMA_PORT);
        let address = SocketAddrV4::new(Ipv4Addr::LOCALHOST, port);
        assert!(address.ip().is_loopback());
    }

    #[test]
    fn terminates_and_reaps_an_owned_child() {
        let child = ProcessCommand::new("sleep").arg("30").spawn().unwrap();
        terminate_child(child);
    }
}
