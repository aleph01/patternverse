use std::{
    io::{BufRead, BufReader, Read, Write},
    net::TcpStream,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, MutexGuard,
    },
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

use crate::ollama::{ManagedOllama, RuntimeError};
use crate::privacy::loopback_address;

const CHAT_IO_TIMEOUT: Duration = Duration::from_millis(600);
const MAX_HEADER_BYTES: usize = 32 * 1024;
const MAX_STREAM_LINE_BYTES: usize = 256 * 1024;
const MAX_MESSAGE_BYTES: usize = 32 * 1024;
const MAX_REQUEST_BYTES: usize = 512 * 1024;
const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const MAX_MESSAGES: usize = 64;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ChatEventKind {
    Started,
    Text,
    Done,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatEvent {
    kind: ChatEventKind,
    text: String,
    detail_code: Option<&'static str>,
}

#[derive(Default)]
struct ConversationInner {
    active_generation: Option<u64>,
}

#[derive(Default)]
pub struct LocalConversation {
    generation: AtomicU64,
    inner: Mutex<ConversationInner>,
}

impl LocalConversation {
    /// Validate messages and the installed model, then stream one local generation on a worker.
    /// Returns its identity for scoped cancellation; later failures arrive on `on_event`.
    ///
    /// # Errors
    /// Rejects invalid or oversized input, unavailable models/runtime, concurrent generation,
    /// or a closed event channel before startup.
    pub fn start(
        self: &Arc<Self>,
        runtime: Arc<ManagedOllama>,
        model_id: String,
        messages: Vec<ChatMessage>,
        on_event: Channel<ChatEvent>,
    ) -> Result<u64, RuntimeError> {
        validate_messages(&messages)?;
        let port = runtime.endpoint_port()?;
        let installed = runtime.list_models()?;
        if !installed.iter().any(|model| model.id == model_id) {
            return Err(RuntimeError("CHAT_MODEL_NOT_INSTALLED"));
        }

        let generation = {
            let mut inner = self.lock_inner();
            if inner.active_generation.is_some() {
                return Err(RuntimeError("CHAT_GENERATION_IN_PROGRESS"));
            }
            let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
            inner.active_generation = Some(generation);
            generation
        };

        if on_event.send(started_event()).is_err() {
            self.clear(generation);
            return Err(RuntimeError("CHAT_EVENT_CHANNEL_CLOSED"));
        }

        let conversation = Arc::clone(self);
        thread::spawn(move || {
            let mut response_bytes = 0_usize;
            let result = stream_chat(
                port,
                &model_id,
                &messages,
                || !conversation.is_current(generation),
                |text| {
                    response_bytes = response_bytes.saturating_add(text.len());
                    if response_bytes > MAX_RESPONSE_BYTES {
                        return Err(RuntimeError("CHAT_RESPONSE_TOO_LARGE"));
                    }
                    on_event
                        .send(ChatEvent {
                            kind: ChatEventKind::Text,
                            text,
                            detail_code: None,
                        })
                        .map_err(|_| RuntimeError("CHAT_EVENT_CHANNEL_CLOSED"))
                },
            );

            let cancelled = !conversation.is_current(generation)
                || matches!(result, Err(error) if error.code() == "CHAT_CANCELLED");
            conversation.clear(generation);

            let event = if cancelled {
                ChatEvent {
                    kind: ChatEventKind::Cancelled,
                    text: String::new(),
                    detail_code: None,
                }
            } else {
                match result {
                    Ok(()) => ChatEvent {
                        kind: ChatEventKind::Done,
                        text: String::new(),
                        detail_code: None,
                    },
                    Err(error) => ChatEvent {
                        kind: ChatEventKind::Failed,
                        text: String::new(),
                        detail_code: Some(error.code()),
                    },
                }
            };
            let _ = on_event.send(event);
        });

        Ok(generation)
    }

    /// Invalidate the current generation token if a request is active; the worker exits cooperatively.
    pub fn cancel(&self) -> bool {
        let active = self.lock_inner().active_generation.is_some();
        if active {
            self.generation.fetch_add(1, Ordering::SeqCst);
        }
        active
    }

    /// Invalidate all outstanding generation tokens during application shutdown.
    pub fn cancel_all(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
    }

    /// A closing preview must never cancel a different, newer conversation request.
    pub fn cancel_matching(&self, generation: u64) -> bool {
        let inner = self.lock_inner();
        if inner.active_generation == Some(generation) && self.is_current(generation) {
            self.generation.fetch_add(1, Ordering::SeqCst);
            true
        } else {
            false
        }
    }

    /// Check whether a worker still owns the current generation token.
    fn is_current(&self, generation: u64) -> bool {
        self.generation.load(Ordering::SeqCst) == generation
    }

    /// Clear activity only for the finishing generation, never for a newer request.
    fn clear(&self, generation: u64) {
        let mut inner = self.lock_inner();
        if inner.active_generation == Some(generation) {
            inner.active_generation = None;
        }
    }

    /// Lock lifecycle state, recovering the contained bookkeeping after mutex poisoning.
    fn lock_inner(&self) -> MutexGuard<'_, ConversationInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

/// Create a content-free notification that generation has begun.
fn started_event() -> ChatEvent {
    ChatEvent {
        kind: ChatEventKind::Started,
        text: String::new(),
        detail_code: None,
    }
}

/// Require recognized roles, nonblank bounded messages, and a bounded aggregate request.
fn validate_messages(messages: &[ChatMessage]) -> Result<(), RuntimeError> {
    if messages.is_empty() || messages.len() > MAX_MESSAGES {
        return Err(RuntimeError("CHAT_INVALID_MESSAGES"));
    }
    let mut request_bytes = 0_usize;
    for message in messages {
        if !matches!(message.role.as_str(), "system" | "user" | "assistant")
            || message.content.trim().is_empty()
            || message.content.len() > MAX_MESSAGE_BYTES
        {
            return Err(RuntimeError("CHAT_INVALID_MESSAGES"));
        }
        request_bytes = request_bytes.saturating_add(message.role.len() + message.content.len());
    }
    if request_bytes > MAX_REQUEST_BYTES {
        return Err(RuntimeError("CHAT_REQUEST_TOO_LARGE"));
    }
    Ok(())
}

#[derive(Deserialize)]
struct ChatResponse {
    #[serde(default)]
    message: ResponseMessage,
    #[serde(default)]
    done: bool,
    error: Option<String>,
}

#[derive(Default, Deserialize)]
struct ResponseMessage {
    #[serde(default)]
    content: String,
    #[serde(default)]
    thinking: String,
}

#[derive(Default)]
struct VisibleResponse {
    trust_content: bool,
    visible_started: bool,
    pending: String,
}

/// Stream a bounded local Ollama response through a visible-text callback.
/// Uses loopback only; propagates cancellation, HTTP/decoding, empty/incomplete response,
/// and callback failures. Does not persist messages or reasoning text.
fn stream_chat<FIsCancelled, FText>(
    port: u16,
    model_id: &str,
    messages: &[ChatMessage],
    is_cancelled: FIsCancelled,
    mut on_text: FText,
) -> Result<(), RuntimeError>
where
    FIsCancelled: Fn() -> bool,
    FText: FnMut(String) -> Result<(), RuntimeError>,
{
    let address = loopback_address(port);
    let mut stream = TcpStream::connect_timeout(&address.into(), CHAT_IO_TIMEOUT)
        .map_err(|_| RuntimeError("CHAT_CONNECTION_FAILED"))?;
    stream
        .set_read_timeout(Some(CHAT_IO_TIMEOUT))
        .map_err(|_| RuntimeError("CHAT_CONNECTION_FAILED"))?;
    stream
        .set_write_timeout(Some(CHAT_IO_TIMEOUT))
        .map_err(|_| RuntimeError("CHAT_CONNECTION_FAILED"))?;

    let mut request = serde_json::json!({
        "model": model_id,
        "messages": messages,
        "stream": true
    });
    if !model_id.contains("-instruct") {
        // Some Qwen 3 releases leak their full reasoning into `content` when
        // thinking is disabled. The lowest reasoning level keeps that trace in
        // Ollama's separate `thinking` field, which is intentionally discarded.
        request["think"] = serde_json::json!("low");
    }
    let body = serde_json::to_vec(&request).map_err(|_| RuntimeError("CHAT_REQUEST_FAILED"))?;
    if body.len() > MAX_REQUEST_BYTES {
        return Err(RuntimeError("CHAT_REQUEST_TOO_LARGE"));
    }
    write!(
        stream,
        "POST /api/chat HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nAccept: application/x-ndjson\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .and_then(|_| stream.write_all(&body))
    .map_err(|_| RuntimeError("CHAT_REQUEST_FAILED"))?;

    let mut reader = BufReader::new(stream);
    let status_line = read_line_cancelable(&mut reader, &is_cancelled)?;
    if !status_line.starts_with("HTTP/1.1 200 ") && !status_line.starts_with("HTTP/1.0 200 ") {
        return Err(RuntimeError("CHAT_HTTP_ERROR"));
    }

    let mut chunked = false;
    let mut header_bytes = status_line.len();
    loop {
        let line = read_line_cancelable(&mut reader, &is_cancelled)?;
        header_bytes = header_bytes.saturating_add(line.len());
        if header_bytes > MAX_HEADER_BYTES {
            return Err(RuntimeError("CHAT_INVALID_RESPONSE"));
        }
        if line == "\r\n" || line == "\n" || line.is_empty() {
            break;
        }
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("transfer-encoding:") && lower.contains("chunked") {
            chunked = true;
        }
    }

    let mut pending = Vec::new();
    let mut done = false;
    let mut has_content = false;
    let mut visible_response = VisibleResponse::new(model_id.contains("-instruct"));
    if chunked {
        loop {
            let size_line = read_line_cancelable(&mut reader, &is_cancelled)?;
            let size =
                usize::from_str_radix(size_line.trim().split(';').next().unwrap_or_default(), 16)
                    .map_err(|_| RuntimeError("CHAT_INVALID_RESPONSE"))?;
            if size == 0 {
                break;
            }
            if size > MAX_STREAM_LINE_BYTES {
                return Err(RuntimeError("CHAT_INVALID_RESPONSE"));
            }
            let mut chunk = vec![0_u8; size];
            read_exact_cancelable(&mut reader, &mut chunk, &is_cancelled)?;
            let mut ending = [0_u8; 2];
            read_exact_cancelable(&mut reader, &mut ending, &is_cancelled)?;
            if ending != *b"\r\n" {
                return Err(RuntimeError("CHAT_INVALID_RESPONSE"));
            }
            process_bytes(
                &chunk,
                &mut pending,
                &mut done,
                &mut has_content,
                &mut visible_response,
                &mut on_text,
            )?;
        }
    } else {
        let mut buffer = [0_u8; 8 * 1024];
        loop {
            if is_cancelled() {
                return Err(RuntimeError("CHAT_CANCELLED"));
            }
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(read) => process_bytes(
                    &buffer[..read],
                    &mut pending,
                    &mut done,
                    &mut has_content,
                    &mut visible_response,
                    &mut on_text,
                )?,
                Err(error) if is_retryable_io(&error) => continue,
                Err(_) => return Err(RuntimeError("CHAT_RESPONSE_FAILED")),
            }
        }
    }
    process_final(
        &mut pending,
        &mut done,
        &mut has_content,
        &mut visible_response,
        &mut on_text,
    )?;
    if let Some(content) = visible_response.finish() {
        send_visible(content, &mut has_content, &mut on_text)?;
    }
    if done && has_content {
        Ok(())
    } else if done {
        Err(RuntimeError("CHAT_EMPTY_RESPONSE"))
    } else {
        Err(RuntimeError("CHAT_INCOMPLETE"))
    }
}

/// Read a protocol line with cancellation checks between retryable I/O attempts.
/// Rejects EOF, oversized returned lines, and nonretryable read errors.
fn read_line_cancelable<R: BufRead, F: Fn() -> bool>(
    reader: &mut R,
    is_cancelled: &F,
) -> Result<String, RuntimeError> {
    loop {
        if is_cancelled() {
            return Err(RuntimeError("CHAT_CANCELLED"));
        }
        let mut line = String::new();
        match reader.read_line(&mut line) {
            Ok(0) => return Err(RuntimeError("CHAT_INCOMPLETE")),
            Ok(_) if line.len() <= MAX_STREAM_LINE_BYTES => return Ok(line),
            Ok(_) => return Err(RuntimeError("CHAT_INVALID_RESPONSE")),
            Err(error) if is_retryable_io(&error) => continue,
            Err(_) => return Err(RuntimeError("CHAT_RESPONSE_FAILED")),
        }
    }
}

/// Fill the supplied buffer while polling cancellation between reads; reject early EOF.
fn read_exact_cancelable<R: Read, F: Fn() -> bool>(
    reader: &mut R,
    output: &mut [u8],
    is_cancelled: &F,
) -> Result<(), RuntimeError> {
    let mut offset = 0;
    while offset < output.len() {
        if is_cancelled() {
            return Err(RuntimeError("CHAT_CANCELLED"));
        }
        match reader.read(&mut output[offset..]) {
            Ok(0) => return Err(RuntimeError("CHAT_INCOMPLETE")),
            Ok(read) => offset += read,
            Err(error) if is_retryable_io(&error) => continue,
            Err(_) => return Err(RuntimeError("CHAT_RESPONSE_FAILED")),
        }
    }
    Ok(())
}

/// Classify timeout and would-block reads as opportunities to poll cancellation and retry.
fn is_retryable_io(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
    )
}

/// Accumulate bounded NDJSON bytes and dispatch complete lines, retaining a partial tail.
fn process_bytes<F: FnMut(String) -> Result<(), RuntimeError>>(
    bytes: &[u8],
    pending: &mut Vec<u8>,
    done: &mut bool,
    has_content: &mut bool,
    visible_response: &mut VisibleResponse,
    on_text: &mut F,
) -> Result<(), RuntimeError> {
    pending.extend_from_slice(bytes);
    if pending.len() > MAX_STREAM_LINE_BYTES {
        return Err(RuntimeError("CHAT_INVALID_RESPONSE"));
    }
    while let Some(newline) = pending.iter().position(|byte| *byte == b'\n') {
        let line: Vec<u8> = pending.drain(..=newline).collect();
        process_line(&line, done, has_content, visible_response, on_text)?;
    }
    Ok(())
}

/// Process the final nonblank NDJSON tail even if it lacks a trailing newline.
fn process_final<F: FnMut(String) -> Result<(), RuntimeError>>(
    pending: &mut Vec<u8>,
    done: &mut bool,
    has_content: &mut bool,
    visible_response: &mut VisibleResponse,
    on_text: &mut F,
) -> Result<(), RuntimeError> {
    if !pending.iter().all(u8::is_ascii_whitespace) {
        let line = std::mem::take(pending);
        process_line(&line, done, has_content, visible_response, on_text)?;
    }
    Ok(())
}

/// Decode one response record, filter reasoning, and accumulate the completion marker.
fn process_line<F: FnMut(String) -> Result<(), RuntimeError>>(
    line: &[u8],
    done: &mut bool,
    has_content: &mut bool,
    visible_response: &mut VisibleResponse,
    on_text: &mut F,
) -> Result<(), RuntimeError> {
    let Some(response) = decode_response_line(line)? else {
        return Ok(());
    };
    if let Some(content) = visible_response.accept_message(response.message)? {
        send_visible(content, has_content, on_text)?;
    }
    // Completion is accepted only after the consumer accepts this record's text.
    *done |= response.done;
    Ok(())
}

/// Decode a response record and reject provider errors before changing stream state.
fn decode_response_line(line: &[u8]) -> Result<Option<ChatResponse>, RuntimeError> {
    let line = line
        .strip_suffix(b"\n")
        .unwrap_or(line)
        .strip_suffix(b"\r")
        .unwrap_or(line);
    if line.is_empty() {
        return Ok(None);
    }
    let response: ChatResponse =
        serde_json::from_slice(line).map_err(|_| RuntimeError("CHAT_INVALID_RESPONSE"))?;
    if response.error.is_some() {
        return Err(RuntimeError("CHAT_MODEL_ERROR"));
    }
    Ok(Some(response))
}

/// Mark and forward nonempty visible text; propagate the consumer's delivery error.
fn send_visible<F: FnMut(String) -> Result<(), RuntimeError>>(
    content: String,
    has_content: &mut bool,
    on_text: &mut F,
) -> Result<(), RuntimeError> {
    if content.is_empty() {
        return Ok(());
    }
    *has_content = true;
    on_text(content)
}

impl VisibleResponse {
    /// Initialize the visible-text filter with the model's content-channel trust policy.
    fn new(trust_content: bool) -> Self {
        Self {
            trust_content,
            ..Self::default()
        }
    }

    /// Interpret one message using the reasoning policy, without delivering UI events.
    fn accept_message(&mut self, message: ResponseMessage) -> Result<Option<String>, RuntimeError> {
        if !message.thinking.is_empty() {
            self.observe_thinking();
        }
        if message.content.is_empty() {
            return Ok(None);
        }
        self.push(message.content)
    }

    /// Mark content as separated from reasoning after a dedicated thinking field is observed.
    fn observe_thinking(&mut self) {
        self.trust_content = true;
    }

    /// Buffer untrusted content until a closing reasoning tag, then emit only visible text.
    /// Rejects an oversized buffered response.
    fn push(&mut self, content: String) -> Result<Option<String>, RuntimeError> {
        if self.trust_content || self.visible_started {
            self.visible_started = true;
            return Ok(Some(content));
        }

        self.pending.push_str(&content);
        if self.pending.len() > MAX_RESPONSE_BYTES {
            return Err(RuntimeError("CHAT_RESPONSE_TOO_LARGE"));
        }

        let Some((boundary, marker_len)) = closing_think_tag(&self.pending) else {
            return Ok(None);
        };
        let visible = self.pending[(boundary + marker_len)..]
            .trim_start()
            .to_owned();
        self.pending.clear();
        self.visible_started = true;
        Ok((!visible.is_empty()).then_some(visible))
    }

    /// Flush unclassified text at completion, but discard a visibly unclosed reasoning block.
    fn finish(&mut self) -> Option<String> {
        if self.visible_started || self.pending.is_empty() {
            return None;
        }
        if self.pending.to_ascii_lowercase().contains("<think>") {
            self.pending.clear();
            return None;
        }
        Some(std::mem::take(&mut self.pending))
    }
}

/// Locate the earliest case-insensitive closing reasoning marker and its byte length.
fn closing_think_tag(content: &str) -> Option<(usize, usize)> {
    let lowercase = content.to_ascii_lowercase();
    ["</think>", "\\</think>"]
        .into_iter()
        .filter_map(|marker| lowercase.find(marker).map(|index| (index, marker.len())))
        .min_by_key(|(index, _)| *index)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{Ipv4Addr, TcpListener};

    #[test]
    fn decoder_distinguishes_empty_invalid_and_provider_error_records() {
        assert!(decode_response_line(b"").unwrap().is_none());
        assert!(decode_response_line(b"\r\n").unwrap().is_none());
        assert_eq!(
            decode_response_line(b"not json").err().unwrap().code(),
            "CHAT_INVALID_RESPONSE"
        );
        assert_eq!(
            decode_response_line(br#"{"error":"synthetic"}"#)
                .err()
                .unwrap()
                .code(),
            "CHAT_MODEL_ERROR"
        );
        let response = decode_response_line(b"{\"done\":true}\n").unwrap().unwrap();
        assert!(response.done);
    }

    #[test]
    fn failed_delivery_does_not_accept_completion() {
        let mut done = false;
        let mut has_content = false;
        let mut visible = VisibleResponse::new(true);
        let result = process_line(
            br#"{"message":{"content":"Hello"},"done":true}"#,
            &mut done,
            &mut has_content,
            &mut visible,
            &mut |_| Err(RuntimeError("CHAT_CANCELLED")),
        );
        assert_eq!(result.unwrap_err().code(), "CHAT_CANCELLED");
        assert!(!done);
        assert!(has_content);
    }

    #[test]
    fn remote_error_is_rejected_before_filter_or_delivery_changes() {
        let mut done = false;
        let mut has_content = false;
        let mut visible = VisibleResponse::default();
        let result = process_line(br#"{"error":"synthetic","message":{"thinking":"hidden","content":"Hello"},"done":true}"#,
            &mut done, &mut has_content, &mut visible, &mut |_| panic!("must not deliver"));
        assert_eq!(result.unwrap_err().code(), "CHAT_MODEL_ERROR");
        assert!(!done && !has_content && !visible.trust_content && !visible.visible_started);
        assert!(visible.pending.is_empty());
    }

    #[test]
    fn scoped_cancellation_cannot_cancel_a_newer_request() {
        let conversation = LocalConversation::default();
        conversation.generation.store(7, Ordering::SeqCst);
        conversation.lock_inner().active_generation = Some(7);
        assert!(!conversation.cancel_matching(6));
        assert!(conversation.is_current(7));
        assert!(conversation.cancel_matching(7));
        assert!(!conversation.is_current(7));
        assert!(!conversation.cancel_matching(7));
    }

    fn read_request(stream: &mut TcpStream) -> Vec<u8> {
        let mut request = Vec::new();
        let mut buffer = [0_u8; 512];
        loop {
            let read = stream.read(&mut buffer).unwrap();
            if read == 0 {
                break;
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
                break;
            }
        }
        request
    }

    #[test]
    fn validates_message_roles_and_limits() {
        assert!(validate_messages(&[ChatMessage {
            role: "user".into(),
            content: "Hello".into(),
        }])
        .is_ok());
        assert_eq!(
            validate_messages(&[ChatMessage {
                role: "tool".into(),
                content: "Hello".into(),
            }])
            .unwrap_err()
            .code(),
            "CHAT_INVALID_MESSAGES"
        );
    }

    #[test]
    fn streams_only_assistant_content_to_completion() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let request = read_request(&mut stream);
            let request = String::from_utf8_lossy(&request);
            assert!(request.starts_with("POST /api/chat HTTP/1.1"));
            assert!(request.contains("\"think\":\"low\""));
            let body = concat!(
                "{\"message\":{\"role\":\"assistant\",\"thinking\":\"private\",\"content\":\"Hello\"},\"done\":false}\n",
                "{\"message\":{\"role\":\"assistant\",\"content\":\" there\"},\"done\":false}\n",
                "{\"message\":{\"role\":\"assistant\",\"content\":\"\"},\"done\":true}\n"
            );
            write!(
                stream,
                "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n{:X}\r\n{}\r\n0\r\n\r\n",
                body.len(),
                body
            )
            .unwrap();
        });

        let mut text = String::new();
        stream_chat(
            port,
            "qwen3:1.7b",
            &[ChatMessage {
                role: "user".into(),
                content: "Hi".into(),
            }],
            || false,
            |chunk| {
                text.push_str(&chunk);
                Ok(())
            },
        )
        .unwrap();
        assert_eq!(text, "Hello there");
    }

    #[test]
    fn strips_legacy_reasoning_spilled_into_content() {
        let mut response = VisibleResponse::default();

        assert_eq!(response.push("private reasoning".into()).unwrap(), None);
        assert_eq!(response.push("\\</thi".into()).unwrap(), None);
        assert_eq!(
            response.push("nk>\n\nHello there".into()).unwrap(),
            Some("Hello there".into())
        );
        assert_eq!(response.finish(), None);
    }

    #[test]
    fn preserves_content_when_the_server_separates_thinking() {
        let mut response = VisibleResponse::default();
        response.observe_thinking();

        assert_eq!(
            response.push("Hello there".into()).unwrap(),
            Some("Hello there".into())
        );
    }

    #[test]
    fn preserves_direct_non_thinking_responses_at_completion() {
        let mut response = VisibleResponse::default();

        assert_eq!(response.push("Hello there".into()).unwrap(), None);
        assert_eq!(response.finish(), Some("Hello there".into()));
    }

    #[test]
    fn cancellation_interrupts_a_stalled_chat() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let _ = read_request(&mut stream);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n")
                .unwrap();
            thread::sleep(Duration::from_secs(2));
        });
        let started = std::time::Instant::now();
        let result = stream_chat(
            port,
            "qwen3:1.7b",
            &[ChatMessage {
                role: "user".into(),
                content: "Hi".into(),
            }],
            || started.elapsed() > Duration::from_millis(100),
            |_| Ok(()),
        );
        assert_eq!(result.unwrap_err().code(), "CHAT_CANCELLED");
    }
}
