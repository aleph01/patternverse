//! One-shot native transport. Personal data enters on stdin and never in process arguments.
use pattern_host::wire;
use std::io::{self, Read, Write};

const MAX_STDIN_BYTES: u64 = 8 * 1024 * 1024 + 64 * 1024 + 1;

/// Execute one request and emit exactly one JSON response, without logging participant data.
fn main() {
    let mut input = Vec::new();
    let result = io::stdin()
        .take(MAX_STDIN_BYTES)
        .read_to_end(&mut input)
        .map_err(|_| "PATTERN_INPUT_UNAVAILABLE".to_owned())
        .and_then(|_| wire::execute(&input).map_err(|error| error.to_string()));
    let (output, success) = match result {
        Ok(bytes) => (bytes, true),
        Err(code) => (
            serde_json::to_vec(&serde_json::json!({ "error": code }))
                .expect("static error response serializes"),
            false,
        ),
    };
    if io::stdout().write_all(&output).is_err() {
        std::process::exit(1);
    }
    if !success {
        std::process::exit(1);
    }
}
