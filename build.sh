#!/usr/bin/env bash
set -e

echo "==> Node: $(node --version) | npm: $(npm --version)"
echo "==> Working dir: $(pwd)"

echo "==> Installing server deps..."
(cd server && npm ci)

echo "==> Installing client deps (includes vite/tailwind)..."
(cd client && npm ci --include=dev)

echo "==> Building client with vite..."
(cd client && npm run build)

echo "==> Build complete"
ls -la client/dist/
