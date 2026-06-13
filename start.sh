#!/bin/sh
set -e

echo "[Startup] Applying database schema..."
if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "[Startup] Running migrations..."
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "[Startup] No migration files found — pushing schema..."
  node ./node_modules/prisma/build/index.js db push --skip-generate
fi

echo "[Startup] Starting server..."
exec node server.js
