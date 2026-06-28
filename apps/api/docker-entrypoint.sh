#!/bin/sh
set -e

echo "→ Aplicando migrations..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "→ Seed (idempotente)..."
  npx tsx prisma/seed.ts || echo "seed falhou (ignorado)"
fi

echo "→ Subindo API..."
exec node dist/server.js
