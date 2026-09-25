use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    net::{Ipv4Addr, SocketAddrV4},
    path::{Path, PathBuf},
};

/// The only destination normal conversation and native model control may use.
pub fn loopback_address(port: u16) -> SocketAddrV4 {
    SocketAddrV4::new(Ipv4Addr::LOCALHOST, port)
}

/// Create a directory tree and restrict the target directory to its owner on Unix.
///
/// # Errors
/// Returns directory-creation or permission-setting errors.
pub fn ensure_private_directory(path: &Path) -> io::Result<()> {
    fs::create_dir_all(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

/// Restrict an existing regular file to its owner on Unix; absence is acceptable.
///
/// # Errors
/// Rejects symlinks/nonregular files and propagates metadata or permission errors.
pub fn harden_existing_private_file(path: &Path) -> io::Result<()> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    if !metadata.file_type().is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "private storage path is not a regular file",
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}

/// Write private configuration via a synced sibling temporary file and atomic rename.
/// Callers must serialize competing writes to the same path. This helper neither encrypts
/// nor syncs the parent directory and is not the durable checkpoint CAS implementation.
///
/// # Errors
/// Returns directory, write, sync, rename, or permission errors. A post-rename error may
/// mean the new contents are already visible.
pub fn write_private_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        ensure_private_directory(parent)?;
    }
    let temporary = path.with_extension("private.tmp");
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let result: io::Result<()> = (|| {
        let mut file = options.open(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, path)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}

/// Models are redownloadable cache data and should not live in backed-up app support.
/// # Errors
/// Returns directory/permission errors or failure to move an existing legacy model cache.
pub fn prepare_model_cache(cache_root: &Path, app_data_root: &Path) -> io::Result<PathBuf> {
    ensure_private_directory(cache_root)?;
    let target = cache_root.join("models");
    let legacy = app_data_root.join("models");
    if !target.exists() && legacy.exists() {
        fs::rename(&legacy, &target)?;
    }
    ensure_private_directory(&target)?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::SystemTime;

    fn test_directory(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("clock should follow epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("mira-privacy-{label}-{nonce}"))
    }

    #[test]
    fn normal_native_destination_is_always_ipv4_loopback() {
        for port in [1, 11_434, u16::MAX] {
            let address = loopback_address(port);
            assert!(address.ip().is_loopback());
            assert_eq!(address.port(), port);
        }
    }

    #[test]
    fn private_atomic_files_are_not_group_or_world_readable() {
        let directory = test_directory("private-file");
        let path = directory.join("setting.json");
        write_private_atomic(&path, br#"{"enabled":true}"#).unwrap();
        assert_eq!(fs::read(&path).unwrap(), br#"{"enabled":true}"#);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(&directory).unwrap().permissions().mode() & 0o777,
                0o700
            );
            assert_eq!(
                fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn existing_setting_files_are_hardened() {
        let directory = test_directory("existing-file");
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("setting.json");
        fs::write(&path, b"setting").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();
        }
        harden_existing_private_file(&path).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(&path).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn migrates_legacy_models_into_the_cache_directory() {
        let root = test_directory("model-cache");
        let cache = root.join("cache");
        let app_data = root.join("app-data");
        let legacy = app_data.join("models");
        fs::create_dir_all(&legacy).unwrap();
        fs::write(legacy.join("manifest"), b"model data").unwrap();

        let prepared = prepare_model_cache(&cache, &app_data).unwrap();
        assert_eq!(prepared, cache.join("models"));
        assert_eq!(fs::read(prepared.join("manifest")).unwrap(), b"model data");
        assert!(!legacy.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn transcription_source_has_no_network_client() {
        let source = include_str!("transcription.rs");
        assert!(!source.contains("TcpStream"));
        assert!(!source.contains("reqwest"));
        assert!(!source.contains("http://"));
        assert!(!source.contains("https://"));
    }

    #[test]
    fn conversation_source_uses_only_the_shared_loopback_destination() {
        let source = include_str!("conversation.rs");
        assert!(source.contains("let address = loopback_address(port);"));
        assert!(!source.contains("SocketAddrV4::new"));
        assert!(!source.contains("http://"));
        assert!(!source.contains("https://"));
    }

    #[test]
    fn webview_connect_policy_disallows_external_origins() {
        let configuration: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let csp = configuration["app"]["security"]["csp"]
            .as_str()
            .expect("CSP should be configured");
        let connect_source = csp
            .split(';')
            .find(|directive| directive.trim_start().starts_with("connect-src"))
            .expect("connect-src should be explicit");
        assert_eq!(
            connect_source.trim(),
            "connect-src 'self' ipc: http://ipc.localhost"
        );
    }
}
