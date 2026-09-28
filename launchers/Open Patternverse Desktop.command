#!/bin/zsh

set -eu

installed_app="/Applications/Patternverse.app"
project_app="$(cd "$(dirname "$0")/.." && pwd)/apps/desktop/src-tauri/target/release/bundle/macos/Patternverse.app"

if [[ -d "$installed_app" ]]; then
  open "$installed_app"
elif [[ -d "$project_app" ]]; then
  open "$project_app"
else
  echo "Patternverse desktop is not installed yet. Ask Codex to build it first."
  read -r "?Press Return to close."
  exit 1
fi
