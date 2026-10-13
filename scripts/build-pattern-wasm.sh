#!/bin/sh
set -eu

# The generated web package is checked in so ordinary web builds need no Rust toolchain.
# Re-run this after changing pattern-core, pattern-host, or pattern-wasm.
# Prefer rustup's target-aware compiler over a separate package-manager Rust.
# Set the LLVM path at the actual process boundary: macOS strips DYLD variables
# when launching /bin/sh, and some Rust distributions need it for rust-lld.
task_rust_lib=""
if command -v rustup >/dev/null 2>&1; then
  task_rust_bin="$(dirname "$(rustup which rustc)")"
  PATH="$task_rust_bin:$PATH"
  export PATH
  task_rust_lib="$task_rust_bin/../lib"
fi
env DYLD_LIBRARY_PATH="${task_rust_lib}${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}" \
wasm-pack build crates/pattern-wasm \
  --target web \
  --release \
  --out-dir ../../apps/web/src/lib/mira/engine

# wasm-pack ignores its output by default; this project ships the generated
# binding so a web-only build does not require Rust on every machine.
rm -f apps/web/src/lib/mira/engine/.gitignore
