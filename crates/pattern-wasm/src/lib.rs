//! Browser FFI for the portable Rust pattern host. No pattern semantics live here.
use wasm_bindgen::prelude::*;

/// Execute one versioned JSON request and return a JSON response or a stable error code.
/// The browser must encrypt and commit returned checkpoints before showing new effects.
#[wasm_bindgen]
pub fn dispatch(request: &str) -> Result<String, JsValue> {
    let bytes = pattern_host::wire::execute(request.as_bytes())
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    String::from_utf8(bytes).map_err(|_| JsValue::from_str("PATTERN_RESPONSE_INVALID"))
}
