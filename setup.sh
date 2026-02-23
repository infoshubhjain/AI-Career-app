#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d backend || ! -d frontend ]]; then
  echo "[ERROR] Run this script from the project root containing /backend and /frontend"
  exit 1
fi

echo "[setup] Project root: $ROOT_DIR"

# Backend setup
if [[ ! -d backend/venv ]]; then
  echo "[setup] Creating backend virtual environment..."
  python3 -m venv backend/venv
fi

source backend/venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

deactivate || true

# Frontend setup
echo "[setup] Installing frontend dependencies..."
cd frontend
npm install
cd "$ROOT_DIR"

# Env file hints
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "[setup] Created backend/.env from backend/.env.example"
fi
if [[ ! -f frontend/.env.local ]]; then
  cp frontend/.env.local.example frontend/.env.local 2>/dev/null || cp frontend/.env.example frontend/.env.local
  echo "[setup] Created frontend/.env.local"
fi

echo "[setup] Complete."
