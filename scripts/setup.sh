#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> CareSync AI — Phase 8 Setup"

command -v node >/dev/null || { echo "Node.js required"; exit 1; }
command -v docker >/dev/null || echo "Warning: Docker not found — skipping postgres"

echo "==> Installing frontend dependencies"
(cd "$ROOT/frontend" && npm install)

echo "==> Installing backend dependencies"
(cd "$ROOT/backend" && npm install)

if [ ! -f "$ROOT/frontend/.env" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
  echo "Created frontend/.env"
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "Created backend/.env"
fi

if command -v docker >/dev/null; then
  echo "==> Starting PostgreSQL"
  (cd "$ROOT" && docker compose up postgres -d)
fi

echo ""
echo "Setup complete."
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo "  Docs:     DEPLOYMENT.md"
