# ---------------------------------------------------------------------------
# FootballIQ — production-style container image
#
# NOTE: the Prisma client is generated to an absolute path that is baked into
# the schema, so we deliberately use that same path as the container's working
# directory. This keeps everything working without modifying the schema.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base

# OpenSSL is required by the Prisma engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /home/ubuntu/football_iq/nextjs_space

# ----- Install dependencies (cached layer) -----
COPY package.json ./
COPY yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

# ----- Copy source and build -----
COPY . .
RUN yarn prisma generate
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000

# On start, ensure the database schema exists, then launch the server.
CMD ["sh", "-c", "yarn prisma db push --skip-generate --accept-data-loss && yarn start -p 3000"]
