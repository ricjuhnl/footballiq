# ---------------------------------------------------------------------------
# FootballIQ — optimized production image with standalone output
# ---------------------------------------------------------------------------

# ---- Build stage ----
FROM node:22-bookworm-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/ricjuhnl/footballiq

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/ubuntu/football_iq/nextjs_space

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma generate
RUN NEXT_OUTPUT_MODE=standalone yarn build

# ---- Production stage ----
FROM node:22-bookworm-slim AS production

LABEL org.opencontainers.image.source=https://github.com/ricjuhnl/footballiq

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output from builder. NEXT_OUTPUT_MODE=standalone makes next.config.js
# retarget outputFileTracingRoot to ../, so the app is nested under nextjs_space/ inside the
# standalone output — keep that nesting! Turbopack resolves serverExternalPackages (e.g.
# @prisma/client) through hashed symlinks in .next/node_modules that point back into
# nextjs_space/node_modules; flattening the tree breaks those links and every API route
# 500s with "Cannot find module '@prisma/client-<hash>'" (see vercel/next.js#91654).
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/.next/standalone ./
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/.next/static ./nextjs_space/.next/static
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/prisma ./nextjs_space/prisma
# The standalone trace contains @prisma/client and the generated .prisma/client (incl. the
# query engine), but NOT the prisma CLI needed by the entrypoint's `migrate deploy`. These lines add the
# CLI's dependency closure: prisma, @prisma/* (engines, config, fetch-engine, get-platform,
# ...), the generated client, and esbuild/debug/ms. If a prisma upgrade breaks this, the
# `--version` guard below fails the build with a missing-module error.
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/prisma ./nextjs_space/node_modules/prisma
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/@prisma ./nextjs_space/node_modules/@prisma
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/.prisma ./nextjs_space/node_modules/.prisma
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/esbuild ./nextjs_space/node_modules/esbuild
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/esbuild-register ./nextjs_space/node_modules/esbuild-register
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/@esbuild ./nextjs_space/node_modules/@esbuild
COPY docker-entrypoint.sh ./nextjs_space/docker-entrypoint.sh

WORKDIR /app/nextjs_space

# Fail the image build if the copied prisma CLI closure is incomplete.
RUN node node_modules/prisma/build/index.js --version

EXPOSE 3000

# On start, apply committed SQL migrations (prisma/migrations), then launch the server.
# The entrypoint baselines databases created by the old `db push` flow and `exec`s node
# so it becomes PID 1 and receives SIGTERM (docker stop) for a graceful shutdown.
CMD ["sh", "./docker-entrypoint.sh"]