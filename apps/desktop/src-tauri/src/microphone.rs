use serde::Serialize;
use tauri::AppHandle;

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum MicrophonePermission {
    Granted,
    Denied,
    Restricted,
}

#[cfg(target_os = "macos")]
/// Delegate to macOS microphone authorization; a denied result is not a transport error.
///
/// # Errors
/// Returns dispatch, worker, or permission-response timeout errors.
pub async fn request_permission(app: &AppHandle) -> Result<MicrophonePermission, &'static str> {
    platform::request_permission(app).await
}

#[cfg(not(target_os = "macos"))]
/// Leave permission prompting to the capture layer on other platforms.
///
/// # Errors
/// This adapter currently returns no errors; `Granted` does not itself authorize hardware capture.
pub async fn request_permission(_app: &AppHandle) -> Result<MicrophonePermission, &'static str> {
    Ok(MicrophonePermission::Granted)
}

#[cfg(target_os = "macos")]
mod platform {
    use std::{
        sync::mpsc::{sync_channel, RecvTimeoutError},
        time::Duration,
    };

    use block2::RcBlock;
    use objc2::{
        class, msg_send,
        runtime::{AnyObject, Bool},
    };
    use tauri::AppHandle;

    use super::MicrophonePermission;

    const NOT_DETERMINED: isize = 0;
    const RESTRICTED: isize = 1;
    const DENIED: isize = 2;
    const AUTHORIZED: isize = 3;

    #[link(name = "AVFoundation", kind = "framework")]
    unsafe extern "C" {
        static AVMediaTypeAudio: *const AnyObject;
    }

    /// Read existing authorization or request it on the main thread, waiting on a blocking worker.
    ///
    /// # Errors
    /// Returns dispatch/channel failures or a 60-second response timeout.
    pub async fn request_permission(app: &AppHandle) -> Result<MicrophonePermission, &'static str> {
        let current = authorization_status();
        if current != NOT_DETERMINED {
            return Ok(map_authorization_status(current));
        }

        let (sender, receiver) = sync_channel(1);
        app.run_on_main_thread(move || {
            let completion = RcBlock::new(move |granted: Bool| {
                let _ = sender.send(granted.as_bool());
            });
            // SAFETY: AVFoundation provides the linked audio constant and class selector.
            // This runs on the main thread; requestAccess copies the completion block.
            unsafe {
                let media_type = &*AVMediaTypeAudio;
                let _: () = msg_send![class!(AVCaptureDevice),
                    requestAccessForMediaType: media_type,
                    completionHandler: &*completion
                ];
            }
        })
        .map_err(|_| "MICROPHONE_PERMISSION_REQUEST_FAILED")?;

        tauri::async_runtime::spawn_blocking(move || {
            match receiver.recv_timeout(Duration::from_secs(60)) {
                Ok(true) => Ok(MicrophonePermission::Granted),
                Ok(false) => Ok(MicrophonePermission::Denied),
                Err(RecvTimeoutError::Timeout) => Err("MICROPHONE_PERMISSION_TIMEOUT"),
                Err(RecvTimeoutError::Disconnected) => Err("MICROPHONE_PERMISSION_REQUEST_FAILED"),
            }
        })
        .await
        .map_err(|_| "MICROPHONE_PERMISSION_REQUEST_FAILED")?
    }

    /// Read AVFoundation's audio authorization status without prompting the user.
    fn authorization_status() -> isize {
        // SAFETY: the linked AVFoundation constant is a live NSString and the class
        // selector accepts that media type and returns an authorization enum integer.
        unsafe {
            let media_type = &*AVMediaTypeAudio;
            msg_send![class!(AVCaptureDevice), authorizationStatusForMediaType: media_type]
        }
    }

    /// Translate native authorization values, treating unknown or undetermined states as denied.
    fn map_authorization_status(status: isize) -> MicrophonePermission {
        match status {
            AUTHORIZED => MicrophonePermission::Granted,
            RESTRICTED => MicrophonePermission::Restricted,
            DENIED | NOT_DETERMINED => MicrophonePermission::Denied,
            _ => MicrophonePermission::Denied,
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn maps_every_terminal_authorization_state_conservatively() {
            assert_eq!(
                map_authorization_status(AUTHORIZED),
                MicrophonePermission::Granted
            );
            assert_eq!(
                map_authorization_status(RESTRICTED),
                MicrophonePermission::Restricted
            );
            assert_eq!(
                map_authorization_status(DENIED),
                MicrophonePermission::Denied
            );
            assert_eq!(
                map_authorization_status(NOT_DETERMINED),
                MicrophonePermission::Denied
            );
            assert_eq!(map_authorization_status(99), MicrophonePermission::Denied);
        }
    }
}
