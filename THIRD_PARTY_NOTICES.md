# Third-party notices

This notice is included in every Patternverse desktop bundle. Exact dependency versions are recorded in `pnpm-lock.yaml` and `apps/desktop/src-tauri/Cargo.lock`; checksum-pinned native inputs are recorded in their preparation scripts. License files already present in an upstream runtime archive remain alongside that runtime in the bundle.

## MIT License text

The MIT-licensed components named below are provided under these terms:

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Bundled native components

### Ollama

Patternverse bundles Ollama `v0.33.2` from the checksum-pinned official macOS release archive. Ollama is MIT licensed, copyright Ollama. The archive's notices for its bundled MLX libraries are retained in the runtime resource tree.

- Project: `https://github.com/ollama/ollama`
- License: `https://github.com/ollama/ollama/blob/main/LICENSE`

### whisper.cpp and Whisper model

Patternverse compiles whisper.cpp `v1.9.1` from its checksum-pinned official source archive and bundles the checksum-pinned multilingual `ggml-base-q5_1.bin` model published for whisper.cpp. whisper.cpp is MIT licensed, copyright Georgi Gerganov; the original Whisper code and model weights are MIT licensed, copyright OpenAI.

- whisper.cpp: `https://github.com/ggml-org/whisper.cpp`
- Whisper: `https://github.com/openai/whisper`
- Bundled model source: `https://huggingface.co/ggerganov/whisper.cpp`

## Application framework and interface

Patternverse uses Tauri and official Tauri plugins, which are offered under the Apache License 2.0 or MIT License, copyright The Tauri Programme within The Commons Conservancy. Its interface uses Svelte and SvelteKit, MIT licensed, copyright Rich Harris and contributors.

- Tauri: `https://github.com/tauri-apps/tauri`
- Tauri plugins: `https://github.com/tauri-apps/plugins-workspace`
- Apache License 2.0: `https://www.apache.org/licenses/LICENSE-2.0`
- Svelte: `https://github.com/sveltejs/svelte`
- SvelteKit: `https://github.com/sveltejs/kit`

## Downloadable conversation models

Mira offers `qwen3:1.7b`, `qwen3:4b-instruct`, and `qwen3:8b` through the Ollama model library. These weights are not redistributed in the application bundle; a user chooses whether to download one. The upstream Qwen3 project publishes the models under the Apache License 2.0.

- Upstream project: `https://github.com/QwenLM/Qwen3`
- License: `https://www.apache.org/licenses/LICENSE-2.0`
- Ollama catalog: `https://ollama.com/library/qwen3`

## Additional dependencies

Patternverse also incorporates transitive Rust and JavaScript dependencies recorded in the lockfiles. Their license metadata and source references are available through the corresponding crates.io and npm package records. A release operator must review dependency-license output and the retained upstream notices whenever a pinned dependency or bundled native component changes.
