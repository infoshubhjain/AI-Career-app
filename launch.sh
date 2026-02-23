#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d backend || ! -d frontend ]]; then
  echo "[ERROR] Run this script from the project root containing /backend and /frontend"
  exit 1
fi

print_key_status() {
  local key="$1"
  local value="$2"
  if [[ -n "${value:-}" && "$value" != "your_supabase_project_url" && "$value" != "your_supabase_anon_key" ]]; then
    echo "[ok] $key is set"
  else
    echo "[warn] $key is not set"
  fi
}

read_env_value() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    echo ""
    return
  fi
  local line
  line="$(grep -E "^${key}=" "$file" | head -1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  echo "$value"
}

# Ensure backend venv exists
if [[ ! -d backend/venv ]]; then
  echo "[launch] backend/venv not found; creating it now..."
  python3 -m venv backend/venv
fi

# Read env values for status checks (do not source/export .env files)
BACKEND_SUPABASE_URL="$(read_env_value backend/.env SUPABASE_URL)"
BACKEND_SUPABASE_ANON_KEY="$(read_env_value backend/.env SUPABASE_ANON_KEY)"
BACKEND_SUPABASE_SERVICE_ROLE_KEY="$(read_env_value backend/.env SUPABASE_SERVICE_ROLE_KEY)"
BACKEND_OPENAI_API_KEY="$(read_env_value backend/.env OPENAI_API_KEY)"
BACKEND_GOOGLE_API_KEY="$(read_env_value backend/.env GOOGLE_API_KEY)"
BACKEND_OPENROUTER_API_KEY="$(read_env_value backend/.env OPENROUTER_API_KEY)"

echo "[launch] Key status"
print_key_status "SUPABASE_URL" "$BACKEND_SUPABASE_URL"
print_key_status "SUPABASE_ANON_KEY" "$BACKEND_SUPABASE_ANON_KEY"
print_key_status "SUPABASE_SERVICE_ROLE_KEY" "$BACKEND_SUPABASE_SERVICE_ROLE_KEY"

# Determine active provider from config.yaml
PROVIDER="openai"
if [[ -f backend/config.yaml ]]; then
  PROVIDER_LINE=$(grep -E '^[[:space:]]*provider:' backend/config.yaml | head -1 | awk '{print $2}') || true
  if [[ -n "${PROVIDER_LINE:-}" ]]; then
    PROVIDER="$PROVIDER_LINE"
  fi
fi

echo "[launch] Active LLM provider from backend/config.yaml: $PROVIDER"
case "$PROVIDER" in
  openai)
    print_key_status "OPENAI_API_KEY" "$BACKEND_OPENAI_API_KEY"
    ;;
  google)
    print_key_status "GOOGLE_API_KEY" "$BACKEND_GOOGLE_API_KEY"
    ;;
  openrouter)
    print_key_status "OPENROUTER_API_KEY" "$BACKEND_OPENROUTER_API_KEY"
    ;;
  *)
    echo "[warn] Unknown provider '$PROVIDER'"
    ;;
esac

cleanup() {
  echo ""
  echo "[launch] Shutting down..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start backend
(
  cd backend
  source venv/bin/activate
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

echo "[launch] Backend starting on http://localhost:8000"

# Start frontend
(
  cd frontend
  exec npm run dev
) &
FRONTEND_PID=$!

echo "[launch] Frontend starting on http://localhost:3000"

echo "[launch] Press Ctrl+C to stop both services"
wait "$BACKEND_PID" "$FRONTEND_PID"
