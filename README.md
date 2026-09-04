# Smart Market Watchlist

Smart Market Watchlist is an attention system for market watchers. It detects meaningful changes in a personal watchlist, ranks them with transparent rules, explains observable signals, and remembers explicit checkpoints.

It intentionally does not provide buy/sell recommendations, predictions, trading execution, financial advice, or opaque AI conclusions.

## Run locally

1. Install Node.js and pnpm.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` (or `SESSION_SECRET`).
3. Optionally set `MONGODB_URI` for durable MongoDB persistence. Without it, the app uses a clearly labeled in-memory demo store.
4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Start the API and web app in separate terminals:

   ```bash
   pnpm --filter @workspace/api-server run dev
   pnpm --filter @workspace/smart-market-watchlist run dev
   ```

   The managed preview workflow supplies `PORT` and `BASE_PATH` automatically.

## Environment variables

- `JWT_SECRET` or `SESSION_SECRET` — server-only signing secret.
- `MONGODB_URI` — optional MongoDB connection string.
- `MARKET_PROVIDER` — `mock` (default) or `real`.
- `MOCK_SCENARIO` — `NORMAL`, `HIGH_ATTENTION`, `MARKET_WIDE`, or `UNAVAILABLE`.
- `MARKET_CACHE_TTL_MS` — shared provider cache lifetime; default 45 seconds.
- `MARKET_API_URL` and `MARKET_API_KEY` — server-only settings for the real provider adapter.
- `CLIENT_URL` — allowed frontend origin(s), comma-separated if needed.

## Demo mode

The deterministic mock provider makes the core loop repeatable:

- `NORMAL` — +0.4% price, 1.1× volume, +0.2% sector context.
- `HIGH_ATTENTION` — +4.2% price, 3.1× volume, +1.8% sector context.
- `MARKET_WIDE` — +3.5% price, 2.1× volume, +2.1% sector context.
- `UNAVAILABLE` — provider failure so the controlled unavailable state can be demonstrated.

The real provider is only used when `MARKET_PROVIDER=real` and its server-side settings are configured. No market values are fabricated when that adapter is unavailable.

## Architecture

- `artifacts/smart-market-watchlist` — React + Vite frontend with TanStack Query and Wouter.
- `artifacts/api-server` — Express REST API, authentication, rate limiting, market provider/cache, detection, scoring, explanations, checkpoints, and events.
- `artifacts/api-server/src/engine` — pure deterministic signal and scoring functions.
- `artifacts/api-server/src/providers` — mock and real market data adapters behind one interface.
- `artifacts/api-server/src/store` — Mongoose persistence with in-memory demo fallback.
- `lib/api-spec/openapi.yaml` — REST contract used to generate typed client/Zod helpers.

## Tests and builds

```bash
pnpm test
pnpm run typecheck
   pnpm run build
pnpm --filter @workspace/api-server run build
```

The unit suite covers exact score bands, the documented 80/100 example, meaningful-event rules, missing volume handling, and deterministic explanations. The API can be checked at `/api/healthz`.