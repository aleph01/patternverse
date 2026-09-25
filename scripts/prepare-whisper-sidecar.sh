#!/bin/sh

set -eu

WHISPER_VERSION="1.9.1"
WHISPER_SOURCE_SHA256="147267177eef7b22ec3d2476dd514d1b12e160e176230b740e3d1bd600118447"
WHISPER_SOURCE_URL="https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v${WHISPER_VERSION}.tar.gz"
MODEL_NAME="ggml-base-q5_1.bin"
MODEL_SHA256="422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
BINARY_DIR="$PROJECT_DIR/apps/desktop/src-tauri/binaries"
MODEL_DIR="$BINARY_DIR/whisper-model"
TARGET_TRIPLE=$(rustc -vV | awk '/^host:/ { print $2 }')
SIDECAR_PATH="$BINARY_DIR/whisper-cli-$TARGET_TRIPLE"
MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
VERSION_FILE="$MODEL_DIR/.version"
WORKER_SHA256=$(shasum -a 256 "$SCRIPT_DIR/whisper-worker.cpp" | awk '{ print $1 }')

case "$TARGET_TRIPLE" in
  aarch64-apple-darwin | x86_64-apple-darwin) ;;
  *)
    echo "The bundled whisper.cpp runtime currently supports macOS arm64 and x86_64 only." >&2
    exit 1
    ;;
esac

if [ -x "$SIDECAR_PATH" ] && [ -f "$MODEL_PATH" ] && [ -f "$VERSION_FILE" ] &&
  [ "$(sed -n '1p' "$VERSION_FILE")" = "$WHISPER_VERSION:$MODEL_SHA256:$WORKER_SHA256" ]; then
  exit 0
fi

STAGING_DIR=$(mktemp -d "${TMPDIR:-/tmp}/mira-whisper.XXXXXX")
trap 'rm -rf "$STAGING_DIR"' EXIT INT TERM

ARCHIVE_PATH="$STAGING_DIR/whisper.tar.gz"
SOURCE_DIR="$STAGING_DIR/source"
BUILD_DIR="$STAGING_DIR/build"
STAGED_MODEL="$STAGING_DIR/$MODEL_NAME"

echo "Preparing pinned whisper.cpp ${WHISPER_VERSION} runtime for ${TARGET_TRIPLE}..."
curl --fail --location --silent --show-error "$WHISPER_SOURCE_URL" --output "$ARCHIVE_PATH"

ACTUAL_SOURCE_SHA256=$(shasum -a 256 "$ARCHIVE_PATH" | awk '{ print $1 }')
if [ "$ACTUAL_SOURCE_SHA256" != "$WHISPER_SOURCE_SHA256" ]; then
  echo "whisper.cpp source checksum mismatch; refusing to build the runtime." >&2
  exit 1
fi

mkdir -p "$SOURCE_DIR" "$BUILD_DIR" "$BINARY_DIR" "$MODEL_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$SOURCE_DIR" --strip-components=1
# Keep the packaged sidecar name, replacing only its entry point with our private persistent worker.
cp "$SCRIPT_DIR/whisper-worker.cpp" "$SOURCE_DIR/examples/cli/cli.cpp"

SDK_PATH=$(xcrun --show-sdk-path)
CXXFLAGS="${CXXFLAGS:-} -isystem $SDK_PATH/usr/include/c++/v1" \
  cmake -S "$SOURCE_DIR" -B "$BUILD_DIR" \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DWHISPER_BUILD_TESTS=OFF \
  -DWHISPER_BUILD_EXAMPLES=ON \
  -DWHISPER_SDL2=OFF
cmake --build "$BUILD_DIR" --config Release --target whisper-cli --parallel

if [ ! -x "$BUILD_DIR/bin/whisper-cli" ]; then
  echo "The whisper.cpp build did not produce whisper-cli." >&2
  exit 1
fi

echo "Downloading the pinned multilingual transcription model..."
if [ -f "$MODEL_PATH" ] && [ "$(shasum -a 256 "$MODEL_PATH" | awk '{ print $1 }')" = "$MODEL_SHA256" ]; then
  cp "$MODEL_PATH" "$STAGED_MODEL"
else
  curl --fail --location --silent --show-error "$MODEL_URL" --output "$STAGED_MODEL"
fi
ACTUAL_MODEL_SHA256=$(shasum -a 256 "$STAGED_MODEL" | awk '{ print $1 }')
if [ "$ACTUAL_MODEL_SHA256" != "$MODEL_SHA256" ]; then
  echo "Whisper model checksum mismatch; refusing to stage the model." >&2
  exit 1
fi

cp "$BUILD_DIR/bin/whisper-cli" "$SIDECAR_PATH"
chmod 755 "$SIDECAR_PATH"
mv "$STAGED_MODEL" "$MODEL_PATH"
printf '%s:%s:%s\n' "$WHISPER_VERSION" "$MODEL_SHA256" "$WORKER_SHA256" > "$VERSION_FILE"

echo "whisper.cpp runtime and multilingual model staged and checksum verified."
