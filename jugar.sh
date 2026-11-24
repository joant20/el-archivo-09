#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "[1/3] Creando .env desde .env.example..."
  cp .env.example .env
fi

echo "[2/3] Iniciando EL ARCHIVO 09 (MySQL + Backend + Frontend 3D)..."
docker compose up --build -d

echo "[3/3] Juego listo en: http://localhost:5173"
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5173"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5173"
fi
