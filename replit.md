# Smart Market Watchlist

An attention-first market watchlist that detects meaningful change, explains observable signals, and remembers explicit checkpoints.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/smart-market-watchlist run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm test` — deterministic business-logic tests
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `JWT_SECRET` or `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + TypeScript
- DB: MongoDB + Mongoose, with an in-memory fallback for deterministic demos
- Validation: Zod
- Auth: JWT + bcryptjs
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/smart-market-watchlist` — React/Vite app, routes, UI components, and design tokens.
- `artifacts/api-server/src/engine` — deterministic signal detection, scoring, and explanation.
- `artifacts/api-server/src/providers` — real/mock market-data adapters and shared cache.
- `artifacts/api-server/src/store` — Mongoose models and persistence boundary.
- `lib/api-spec/openapi.yaml` — source-of-truth API contract.

## Architecture decisions

- The server owns detection, score calculation, event status, and checkpoints; the browser only renders authoritative results.
- The mock provider is selected by `MOCK_SCENARIO` and stays behind the same interface as the real provider.
- Opening the dashboard only evaluates current data; it never changes a checkpoint or acknowledges an event.
- The MongoDB store falls back to an in-memory demo store only when `MONGODB_URI` is not configured.

## Product

Authenticated users can build a watchlist, search supported stocks, see ranked attention events, open structured explanations and timelines, set personal thresholds, mark a stock checked, and acknowledge detected events.

## User preferences

- Keep the product calm, explainable, and attention-first; never add trading, prediction, or financial-advice features.

## Gotchas

- Run OpenAPI codegen after changing `lib/api-spec/openapi.yaml`.
- `PORT` and `BASE_PATH` are supplied by managed workflows for the web artifact.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
