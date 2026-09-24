#!/bin/sh
# Container entrypoint: apply committed SQL migrations, then exec the server.
# Replaces the old `prisma db push --accept-data-loss` startup, which could
# silently drop columns on a shared/dev-prod database.
set -e

PRISMA="node node_modules/prisma/build/index.js"

# `exec` so node replaces this shell and becomes PID 1 (receives SIGTERM).
if out=$($PRISMA migrate deploy 2>&1); then
  exec node server.js
fi

# P3005: the schema exists but has no _prisma_migrations history — i.e. this
# database was created by the old `prisma db push` flow. Baseline the init
# migration instead of failing (the SQL is already present), then deploy.
if echo "$out" | grep -q "P3005"; then
  echo "Existing database without migration history (created by 'prisma db push') — baselining 20260924000000_init."
  $PRISMA migrate resolve --applied 20260924000000_init
  $PRISMA migrate deploy
  exec node server.js
fi

echo "$out"
exit 1
