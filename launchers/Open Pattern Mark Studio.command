#!/bin/zsh
set -eu
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
studio_url="http://127.0.0.1:4202"
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
if ! command -v corepack >/dev/null 2>&1; then
  echo "This tool needs Node.js 22 and Corepack installed."
  read -r "?Press Return to close."
  exit 1
fi
if curl --fail --silent --max-time 2 "$studio_url/__pattern-mark-studio/catalog" 2>/dev/null | /usr/bin/grep -q '"patterns"'; then
  open "$studio_url"
  exit 0
fi
cd "$project_dir"
echo "Opening your private pattern icon studio. Keep this window open while using it."
corepack pnpm --filter @patternverse/web studio --port 4202 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in {1..80}; do
  if curl --fail --silent --max-time 2 "$studio_url/__pattern-mark-studio/catalog" 2>/dev/null | /usr/bin/grep -q '"patterns"'; then
    open "$studio_url"
    wait "$server_pid"
    exit $?
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit $?
  fi
  sleep 0.25
done
echo "The studio did not start. Check the messages above."
exit 1
