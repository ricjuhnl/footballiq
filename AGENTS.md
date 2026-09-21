# FootballIQ (nextjs_space)

Next.js 16 App Router + React 19 + TypeScript dashboard (standings, predictions, tips)
for six European leagues. Tailwind + Radix/shadcn. No test suite, no CI — verify with
`yarn lint`, `yarn eslint -c eslint.ssr.config.mjs .`, `yarn tsc --noEmit`, and running the app.

## Commands (Yarn 1 classic, Node >= 20.9)
- `yarn dev` / `yarn build` / `yarn start`
- `yarn lint` — flat `eslint.config.mjs`; Next 16 removed `next lint`
- `yarn eslint -c eslint.ssr.config.mjs .` — SSR/hydration lint, run by the platform after
  every build. Never weaken/delete it to silence errors; fix code using the safe patterns in
  `components/client-only.tsx` and `components/safe-format.tsx`.
- `next.config.js` sets `typescript.ignoreBuildErrors: true` — the build does NOT typecheck;
  run `yarn tsc --noEmit` explicitly.

## Setup
- `cp .env.example .env`; set `FOOTBALL_DATA_KEY`, `ODDS_API_KEY`, `DATABASE_URL` (keys are
  server-side only).
- Postgres: `docker compose up -d db` (or whole stack with `docker compose up -d --build`;
  the web image runs `prisma db push` on start).
- Schema sync: `yarn prisma db push`. No migrations (gitignored).
- `prisma/schema.prisma` pins the Prisma client `output` to the absolute deploy path
  `/home/ubuntu/football_iq/nextjs_space/node_modules/.prisma/client`; `yarn prisma generate`
  on other machines fails (EACCES on /home/ubuntu). Workaround: temporarily set `output =
  "../node_modules/.prisma/client"`, run `yarn prisma generate`, then restore the schema —
  `yarn build` needs the generated client to import `lib/db.ts`.
- Seeding: `yarn prisma db seed` → `scripts/safe-seed.ts` aborts if `scripts/seed.ts` contains
  `prisma.*delete*` (dev and production databases can be shared).

## Architecture
- `app/api/league/[id]` → `lib/football-data.ts` (standings).
- `app/api/fixtures/[leagueId]` and `app/api/tips` → `lib/odds-api.ts`, `lib/predictions.ts`,
  `lib/tips.ts`. League ids/Odds-API sportKeys and tip thresholds live in `lib/constants.ts`
  and `lib/tips.ts`.
- All external calls go through `lib/api-cache.ts`: in-memory Map → `ApiCache` Postgres table →
  provider. TTL 24 h (1 h for empty/failed responses). Free-tier rate limits are strict — never
  add code paths that bypass or force-refresh this cache.
- Europa League: predictions/results only; standings need a paid football-data.org plan.
- `components/` = shared shadcn UI + providers; `app/components/` = feature components.
- `STYLE_GUIDE.md` is the UI contract (fonts, design tokens, layout rules) — read before UI work.

## Gotchas
- Dev hydration: Next 16 blocks cross-origin `/_next` HMR websockets. Any host used to browse
  the dev server must be listed in `next.config.js` `allowedDevOrigins`, or the page renders but
  silently never hydrates. Add per-checkout hosts via `next.config.user.json`
  (`{ "allowedDevOrigins": [...] }`, merged into the base list); never use a wildcard.
- `instrumentation-client.js` is system-managed — do not edit, rename, or delete.
- Docker build sets `NEXT_OUTPUT_MODE=standalone`, which retargets `outputFileTracingRoot` in
  `next.config.js` to the parent directory, so the standalone output nests the app under
  `nextjs_space/`. Keep that nesting in the Dockerfile (`WORKDIR /app/nextjs_space`) — Turbopack
  resolves `@prisma/client` via a hashed symlink in `.next/node_modules` pointing at
  `nextjs_space/node_modules`, and flattening the tree breaks it ("Cannot find module
  '@prisma/client-<hash>'", 500s on every API route).
