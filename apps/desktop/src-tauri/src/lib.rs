//! Native ports for Patternverse's local conversation and speech input.
//!
//! The web application owns presentation and encrypted session persistence. This
//! crate owns only app-scoped model processes and local transcription; it never
//! chooses a network provider or stores conversation text.

mod conversation;
mod microphone;
mod model_setup;
mod ollama;
mod privacy;
mod transcription;

use std::sync::Arc;

use conversation::{ChatEvent, ChatMessage, LocalConversation};
use microphone::MicrophonePermission;
use model_setup::{DownloadEvent, ModelSetup, ModelSetupSnapshot};
use ollama::{InstalledModel, ManagedOllama, RuntimeSnapshot};
use tauri::{ipc::Channel, Manager, RunEvent, State};
use transcription::{LocalTranscription, TranscriptionEvent, TranscriptionSnapshot};

#[tauri::command]
/// Report the owned local runtime's current readiness.
fn ollama_status(runtime: State<'_, Arc<ManagedOllama>>) -> RuntimeSnapshot {
    runtime.snapshot()
}

#[tauri::command]
/// List only models installed in this application's local cache.
fn ollama_list_models(runtime: State<'_, Arc<ManagedOllama>>) -> Result<Vec<InstalledModel>, String> {
    runtime.list_models().map_err(|error| error.code().into())
}

#[tauri::command]
/// Delete one exact installed local model after an explicit settings action.
fn ollama_delete_model(
    model_id: String,
    runtime: State<'_, Arc<ManagedOllama>>,
) -> Result<(), String> {
    runtime.delete_model(&model_id).map_err(|error| error.code().into())
}

#[tauri::command]
/// Restart the app-owned model process without changing the selected model.
fn ollama_restart(app: tauri::AppHandle, runtime: State<'_, Arc<ManagedOllama>>) -> RuntimeSnapshot {
    runtime.start(app);
    runtime.snapshot()
}

#[tauri::command]
/// Report hardware, model choices, and the active download for local setup.
fn model_setup_status(
    runtime: State<'_, Arc<ManagedOllama>>,
    setup: State<'_, Arc<ModelSetup>>,
) -> Result<ModelSetupSnapshot, String> {
    setup.snapshot(&runtime).map_err(|error| error.code().into())
}

#[tauri::command]
/// Persist the participant's chosen installed or catalog model.
fn model_select(model_id: String, setup: State<'_, Arc<ModelSetup>>) -> Result<(), String> {
    setup.select_model(&model_id).map_err(|error| error.code().into())
}

#[tauri::command]
/// Explicitly download a local model, emitting progress through the caller's channel.
fn model_download(
    model_id: String,
    on_event: Channel<DownloadEvent>,
    runtime: State<'_, Arc<ManagedOllama>>,
    setup: State<'_, Arc<ModelSetup>>,
) -> Result<u64, String> {
    setup
        .inner()
        .start_download(runtime.inner().clone(), model_id, on_event)
        .map_err(|error| error.code().into())
}

#[tauri::command]
/// Cancel an in-progress local model download.
fn model_download_cancel(setup: State<'_, Arc<ModelSetup>>) -> bool {
    setup.cancel_download()
}

#[tauri::command]
/// Request native microphone permission only in response to a user action.
async fn microphone_request_permission(
    app: tauri::AppHandle,
) -> Result<MicrophonePermission, String> {
    microphone::request_permission(&app).await.map_err(str::to_owned)
}

#[tauri::command]
/// Start an app-owned local generation; no cloud fallback is registered.
fn conversation_chat(
    model_id: String,
    messages: Vec<ChatMessage>,
    on_event: Channel<ChatEvent>,
    runtime: State<'_, Arc<ManagedOllama>>,
    conversation: State<'_, Arc<LocalConversation>>,
) -> Result<u64, String> {
    conversation
        .inner()
        .start(runtime.inner().clone(), model_id, messages, on_event)
        .map_err(|error| error.code().into())
}

#[tauri::command]
/// Cancel only the named generation, or the currently active one.
fn conversation_cancel(
    generation: Option<u64>,
    conversation: State<'_, Arc<LocalConversation>>,
) -> bool {
    generation.map_or_else(
        || conversation.cancel(),
        |generation| conversation.cancel_matching(generation),
    )
}

#[tauri::command]
/// Report whether the bundled local transcription runtime is available.
fn transcription_status(transcription: State<'_, Arc<LocalTranscription>>) -> TranscriptionSnapshot {
    transcription.snapshot()
}

#[tauri::command]
/// Transcribe captured audio with the local Whisper sidecar.
fn transcription_start(
    audio_base64: String,
    mime_type: String,
    language: String,
    on_event: Channel<TranscriptionEvent>,
    transcription: State<'_, Arc<LocalTranscription>>,
) -> Result<u64, String> {
    transcription
        .inner()
        .start(audio_base64, mime_type, language, on_event)
        .map_err(|error| error.code().into())
}

#[tauri::command]
/// Cancel the active transcription worker.
fn transcription_cancel(transcription: State<'_, Arc<LocalTranscription>>) -> bool {
    transcription.cancel()
}

/// Start the native host and stop owned processes on exit.
///
/// # Panics
/// Panics if native runtime initialization or app construction fails.
pub fn run() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let runtime = Arc::new(ManagedOllama::default());
            let model_setup = Arc::new(
                ModelSetup::new(app.handle())
                    .map_err(|error| std::io::Error::other(error.code()))?,
            );
            let conversation = Arc::new(LocalConversation::default());
            let transcription = Arc::new(
                LocalTranscription::new(app.handle())
                    .map_err(|error| std::io::Error::other(error.code()))?,
            );
            app.manage(runtime.clone());
            app.manage(model_setup);
            app.manage(conversation);
            app.manage(transcription);
            runtime.start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ollama_status,
            ollama_list_models,
            ollama_delete_model,
            ollama_restart,
            model_setup_status,
            model_select,
            model_download,
            model_download_cancel,
            microphone_request_permission,
            conversation_chat,
            conversation_cancel,
            transcription_status,
            transcription_start,
            transcription_cancel,
        ])
        .build(tauri::generate_context!())
        .expect("Patternverse desktop could not start");

    application.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit) {
            app_handle.state::<Arc<LocalConversation>>().cancel_all();
            app_handle.state::<Arc<LocalTranscription>>().cancel_all();
            app_handle.state::<Arc<ModelSetup>>().cancel_all();
            app_handle.state::<Arc<ManagedOllama>>().stop();
        }
    });
}
