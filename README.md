# FootballIQ ⚽

A football analysis dashboard covering six major European leagues — **Premier League, La Liga, Bundesliga, Serie A, Ligue 1, and Eredivisie**. It shows live league standings, recent results, and data-driven match predictions built from real bookmaker odds.

---

## Features

- **Live standings** for the six domestic leagues plus the Champions League (current season, current matchday) with official club crests. The Europa League is included for predictions and results only (standings require a paid football-data.org plan).
- **Recent results** sourced from a live scores feed.
- **Match predictions** derived from live bookmaker odds — 1X2 (home / draw / away), Over/Under 2.5 goals, and Both Teams To Score — each with probability bars, a recommended bet, and a confidence badge.
- Fast, dark-themed, fully responsive UI.

---

## Tech overview

- A modern React-based full-stack web framework (App Router).
- TypeScript + Tailwind CSS + Radix UI components.
- PostgreSQL via Prisma (used for a lightweight API response cache; an in-memory cache is the primary layer).

---

## Prerequisites

You need free API keys from two providers (both have free tiers):

| Variable | Used for | Get a key |
|---|---|---|
| `FOOTBALL_DATA_KEY` | League standings | https://www.football-data.org/client/register |
| `ODDS_API_KEY` | Predictions & recent results | https://the-odds-api.com/ |

A PostgreSQL connection string (`DATABASE_URL`) is also required. If you use the Docker Compose setup below, a database is provided for you automatically.

---

## Option A — Run with Docker (recommended)

This is the easiest way to run the app. It starts both the web app and a PostgreSQL database in containers.

### 1. Install Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) or Docker Engine + the Compose plugin (Linux).

### 2. Provide your API keys

From the project directory (the folder containing `package.json`), create a `.env` file:

```bash
cp .env.example .env
```

Then open `.env` and fill in `FOOTBALL_DATA_KEY` and `ODDS_API_KEY`. Leave `DATABASE_URL` as-is — it already points at the bundled database container.

### 3. Build and start

```bash
docker compose up --build
```

The first build takes a few minutes. When it finishes, open:

**http://localhost:3000**

### 4. Stop

Press `Ctrl+C`, then (to remove the containers):

```bash
docker compose down
```

To also delete the stored database data, add `-v`:

```bash
docker compose down -v
```

> The Compose file reads `FOOTBALL_DATA_KEY` and `ODDS_API_KEY` from your `.env` file and passes them into the web container. The database is created automatically and the required table is set up on first start.

---

## Option B — Run locally without Docker

### 1. Install Node.js

Install **Node.js 20 LTS** (Node 18.18+ also works). Verify:

```bash
node -v
```

This project uses **Yarn**. If you don't have it:

```bash
npm install -g yarn
```

### 2. Start a PostgreSQL database

Use any PostgreSQL 14+ instance. The quickest option is Docker:

```bash
docker run --name footballiq-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=football_iq -p 5432:5432 -d postgres:16-alpine
```

(Or install Postgres natively and create a `football_iq` database.)

### 3. Configure environment variables

From the project directory:

```bash
cp .env.example .env
```

Edit `.env`:
- Set the three API keys.
- Set `DATABASE_URL` to point at your local database, e.g.
  `postgresql://postgres:postgres@localhost:5432/football_iq?connect_timeout=15`

### 4. Install dependencies

```bash
yarn install
```

### 5. Set up the database schema

```bash
yarn prisma generate
yarn prisma db push
```

### 6. Run the app

**Development mode** (hot reload):

```bash
yarn dev
```

**Production mode:**

```bash
yarn build
yarn start
```

Open **http://localhost:3000**.

---

## Available scripts

| Command | Description |
|---|---|
| `yarn dev` | Start the dev server with hot reload |
| `yarn build` | Create a production build |
| `yarn start` | Run the production build |
| `yarn lint` | Run the linter |
| `yarn prisma db push` | Sync the database schema |

---

## Project structure

```
app/                    Pages and API routes
  api/league/[id]       Standings endpoint (football-data.org)
  api/fixtures/[id]     Predictions & recent results (The Odds API)
  components/           UI: standings table, predictions, results
lib/
  football-data.ts      football-data.org client (standings)
  odds-api.ts           The Odds API client (odds, scores, predictions)
  predictions.ts        Prediction engine
  constants.ts          League configuration
prisma/schema.prisma    Database schema (API cache table)
```

---

## Troubleshooting

- **Standings/predictions are empty:** double-check the API keys in `.env`. Free tiers have request limits — if you hit one, wait a while and refresh. The app caches responses for one hour to reduce calls.
- **Database connection errors:** make sure Postgres is running and `DATABASE_URL` matches its host, port, user, password, and database name. Inside Docker Compose the host is `db`; running natively it is `localhost`.
- **Port 3000 already in use:** stop whatever is using it, or run the dev server on another port with `yarn dev -p 3001`.

---

## Notes

- Standings come from football-data.org and reflect the current season and matchday.
- All API keys are read server-side only and are never exposed to the browser. Never commit your real `.env` file.
