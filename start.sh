#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"; [ -f "$project_dir/.env" ] || { echo 'Copy .env.example to .env and configure it.' >&2; exit 1; }
[ -d "$project_dir/backend/node_modules" ] && [ -d "$project_dir/frontend/node_modules" ] || { echo 'Run scripts/bootstrap.sh first.' >&2; exit 1; }
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"; value="${BASH_REMATCH[2]}"
  if [[ "$value" == \"*\" && "$value" == *\" ]] || [[ "$value" == \'*\' && "$value" == *\' ]]; then value="${value:1:${#value}-2}"; fi
  [[ -n "${!key+x}" ]] || export "$key=$value"
done < "$project_dir/.env"
BACKEND_PORT="${BACKEND_PORT:-4000}"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"
if [[ "${NODE_ENV:-}" == test && -z "${PSEUDONYMIZATION_KEY:-}" ]]; then PSEUDONYMIZATION_KEY="${MEMORY_ENCRYPTION_KEY_BASE64:-}"; fi
export BACKEND_PORT FRONTEND_PORT PSEUDONYMIZATION_KEY CORS_ORIGIN="${CORS_ORIGIN:-http://127.0.0.1:$FRONTEND_PORT}"
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $port is already in use; no process was changed." >&2; exit 1; }; done
(cd "$project_dir/backend" && npm start) & backend_pid=$!; (cd "$project_dir/frontend" && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT") & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }; trap cleanup INT TERM EXIT; wait "$backend_pid" "$frontend_pid"
