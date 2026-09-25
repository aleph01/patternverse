#!/bin/sh

set -eu

OLLAMA_VERSION="0.33.2"
OLLAMA_ARCHIVE_SHA256="5751e296a2cd545939bdd51b700de0c20d319f0e723c9d7f48bebb5ab0b731d4"
OLLAMA_ARCHIVE_URL="https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-darwin.tgz"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
BINARY_DIR="$PROJECT_DIR/apps/desktop/src-tauri/binaries"
TARGET_TRIPLE=$(rustc -vV | awk '/^host:/ { print $2 }')
SIDECAR_PATH="$BINARY_DIR/ollama-$TARGET_TRIPLE"
RUNTIME_DIR="$BINARY_DIR/ollama-runtime/dist/darwin"
VERSION_FILE="$BINARY_DIR/ollama-runtime/.version"
LAUNCHER_SOURCE="$SCRIPT_DIR/ollama-sidecar-launcher.c"

case "$TARGET_TRIPLE" in
  aarch64-apple-darwin | x86_64-apple-darwin) ;;
  *)
    echo "The bundled Ollama runtime currently supports macOS arm64 and x86_64 only." >&2
    exit 1
    ;;
esac

build_launcher() {
  if [ ! -x "$SIDECAR_PATH" ] || [ "$LAUNCHER_SOURCE" -nt "$SIDECAR_PATH" ] ||
    ! file "$SIDECAR_PATH" | grep -q 'Mach-O'; then
    cc -std=c11 -O2 -Wall -Wextra -Werror -mmacosx-version-min=12.0 \
      "$LAUNCHER_SOURCE" -o "$SIDECAR_PATH"
    chmod 755 "$SIDECAR_PATH"
  fi
}

if [ -x "$RUNTIME_DIR/ollama" ] && [ -f "$VERSION_FILE" ] && [ "$(sed -n '1p' "$VERSION_FILE")" = "$OLLAMA_VERSION" ]; then
  build_launcher
  exit 0
fi

STAGING_DIR=$(mktemp -d "${TMPDIR:-/tmp}/mira-ollama.XXXXXX")
trap 'rm -rf "$STAGING_DIR"' EXIT INT TERM

ARCHIVE_PATH="$STAGING_DIR/ollama-darwin.tgz"
EXTRACT_DIR="$STAGING_DIR/extracted"

echo "Preparing pinned Ollama ${OLLAMA_VERSION} runtime for ${TARGET_TRIPLE}..."
curl --fail --location --silent --show-error "$OLLAMA_ARCHIVE_URL" --output "$ARCHIVE_PATH"

ACTUAL_SHA256=$(shasum -a 256 "$ARCHIVE_PATH" | awk '{ print $1 }')
if [ "$ACTUAL_SHA256" != "$OLLAMA_ARCHIVE_SHA256" ]; then
  echo "Ollama archive checksum mismatch; refusing to stage the runtime." >&2
  exit 1
fi

mkdir -p "$EXTRACT_DIR" "$BINARY_DIR"

# Keep a working cached runtime when the network or checksum step fails. Once
# the archive is verified, remove the old tree before extraction to avoid
# requiring space for two complete runtimes during an upgrade.
rm -rf "$RUNTIME_DIR"
rm -f "$SIDECAR_PATH"
tar -xzf "$ARCHIVE_PATH" -C "$EXTRACT_DIR"

if [ ! -x "$EXTRACT_DIR/ollama" ] || [ ! -x "$EXTRACT_DIR/llama-server" ]; then
  echo "The pinned Ollama archive does not contain the expected macOS runtime layout." >&2
  exit 1
fi

build_launcher

mkdir -p "$(dirname "$RUNTIME_DIR")"
mv "$EXTRACT_DIR" "$RUNTIME_DIR"
printf '%s\n' "$OLLAMA_VERSION" > "$VERSION_FILE"

echo "Ollama runtime staged and checksum verified."
