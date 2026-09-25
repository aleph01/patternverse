#!/bin/sh
set -eu

# The generated web package is checked in so ordinary web builds need no Rust toolchain.
# Re-run this after changing pattern-core, pattern-host, or pattern-wasm.
wasm-pack build crates/pattern-wasm \
  --target web \
  --release \
  --out-dir ../../apps/web/src/lib/mira/engine

# wasm-pack ignores its output by default; this project ships the generated
# binding so a web-only build does not require Rust on every machine.
rm -f apps/web/src/lib/mira/engine/.gitignore
