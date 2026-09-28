#!/bin/zsh

set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
web_port="${PATTERNVERSE_WEB_PORT:-5175}"
web_url="http://127.0.0.1:${web_port}/mira"
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

if ! command -v corepack >/dev/null 2>&1; then
  echo "The web app needs Node.js 22 and Corepack installed on this Mac."
  read -r "?Press Return to close."
  exit 1
fi

if curl --fail --silent --show-error --max-time 2 "$web_url" 2>/dev/null | /usr/bin/grep -qi 'patternverse'; then
  open "$web_url"
  exit 0
fi

cd "$project_dir"
echo "Opening the latest local Patternverse web app. Keep this window open while using it."
corepack pnpm --filter @patternverse/web dev --host 127.0.0.1 --port "$web_port" --strictPort &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for attempt in {1..80}; do
  if curl --fail --silent --max-time 2 "$web_url" 2>/dev/null | /usr/bin/grep -qi 'patternverse'; then
    open "$web_url"
    wait "$server_pid"
    exit $?
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit $?
  fi
  sleep 0.25
done

echo "The local web app did not start. Check the messages above."
exit 1
