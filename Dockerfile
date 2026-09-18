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

# Copy standalone output from builder
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/.next/standalone ./
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/.next/static ./.next/static
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/prisma ./prisma
COPY --from=builder /home/ubuntu/football_iq/nextjs_space/node_modules/prisma ./node_modules/prisma

EXPOSE 3000

# On start, ensure the database schema exists, then launch the server.
CMD ["sh", "-c", "/app/node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss && node server.js"]