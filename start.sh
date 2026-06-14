#!/bin/sh
set -e

echo "[Startup] Applying database schema..."
if prisma migrate deploy; then
  echo "[Startup] Migrations applied."
else
  echo "[Startup] No migration files found — pushing schema..."
  prisma db push
fi

echo "[Startup] Starting server..."
exec node server.js
