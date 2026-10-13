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

/// Run a bounded, ephemeral source preview through the same Rust compiler and runtime.
///
/// # Errors
/// Returns source diagnostics or a runtime contract error; makes no model or storage calls.
#[wasm_bindgen]
pub fn preview(source: &str) -> Result<String, JsValue> {
    pattern_host::wire::preview(source).map_err(|error| JsValue::from_str(&error))
}

/// Inspect and test unsaved source locally. No storage, network, or inference.
#[wasm_bindgen]
pub fn editor(request: &str) -> Result<String, JsValue> {
    pattern_host::editor::execute(request).map_err(|error| JsValue::from_str(&error))
}
