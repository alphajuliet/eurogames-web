# CLAUDE.md

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project:** Eurogames Web
**Type:** Cloudflare Worker (TypeScript), serving a static frontend and proxying to a backend API
**Purpose:** API gateway between a frontend single-page app and the Eurogames backend API, providing REST endpoints for games management, play recording, and statistics retrieval.

**Requirements and architecture live in [`docs/SPEC.md`](docs/SPEC.md).** That document is intentionally implementation-agnostic (three-tier model: presentation / application / data). This file is the companion for actually working in *this* codebase — concrete files, commands, and code conventions. When the two disagree on behavior, `docs/SPEC.md` is the source of truth for what the system *should* do; this file describes what the code *currently* does and how to change it.

## How the Spec Maps to This Codebase

| SPEC.md tier | Implementation here |
|---|---|
| Presentation | `public/` — Alpine.js 3.14.3 single-page app, no build step |
| Application | `src/index.ts` (routing, auth, request/response shaping) + `src/api.ts` (backend HTTP client) + `src/types.ts` (shared types), deployed as a Cloudflare Worker |
| Data | External Eurogames backend API at `EUROGAMES_API_URL` — owned outside this repo |

## Core Files

### `/src/index.ts` — Worker Entry Point
- HTTP routing (itty-router) and the `fetch()` handler
- Session authentication: `signToken()`, `verifyToken()`, `createSessionToken()`, `verifySession()`, `isAuthenticated()`, `isPublicPath()`
- Shared helpers: `createApiClient()`, `parseRequestBody()`, `jsonResponse()`, `errorResponse()`
- SQL safety guard for `/v1/query`: `isSafeSelectQuery()`
- Routes are grouped into 5 commented sections: Authentication, Games, Plays, Statistics, Utilities — mirroring `docs/SPEC.md` §3

### `/src/api.ts` — Typed Backend Client
- `ApiClient` class; one method per backend operation (`listGames()`, `recordPlay()`, `getWinStats()`, etc.)
- Generic HTTP verbs (`get`, `post`, `put`, `patch`, `delete`) funnel through a private `request()` that handles timeout, JSON parsing, and error wrapping
- Every method returns `ApiResponse<T>` = `{ success, data, error, status }`

### `/src/types.ts` — Shared Types
- Data models (`Game`, `PlayRecord`) and response shapes, imported by both `api.ts` and `index.ts`

## Common Development Tasks

### Start Local Development Server
```bash
cp .env.example .dev.vars   # first time only — then fill in EUROGAMES_API_KEY
npm run dev                 # http://localhost:8787, hot reload via Wrangler
```

### Deploy
```bash
npm run deploy
```

### Type Check Without Building
```bash
npx tsc --noEmit
```

### Set Secrets
```bash
wrangler secret put EUROGAMES_API_KEY
wrangler secret put AUTH_PASSWORD   # optional — omit to leave the site public
wrangler secret put AUTH_SECRET     # optional — required if AUTH_PASSWORD is set
```

There is currently a single (production) deployment target — no named Wrangler environments are configured, so `--env` flags are not needed for `deploy` or `secret put`.

### Test Endpoints Locally
```bash
npm run dev
curl http://localhost:8787/v1/games
curl http://localhost:8787/v1/stats/totals
curl -X POST http://localhost:8787/v1/plays \
  -H "Content-Type: application/json" \
  -d '{"gameId":"1","date":"2025-11-03","players":["Alice"],"winner":"Alice"}'
```

## Adding a New API Endpoint

1. **Types** (if needed) — add response/request shapes to `src/types.ts`.
2. **Client method** (if it calls the backend) — add a method to `ApiClient` in `src/api.ts`.
3. **Route** — add a handler in `src/index.ts` in the appropriate section:
   ```typescript
   router.get('/v1/my-endpoint', async (request, env: Env) => {
     try {
       const client = createApiClient(env);
       const result = await client.getMyData();
       return jsonResponse(result);
     } catch (error) {
       console.error('Error fetching data:', error);
       return errorResponse('Failed to fetch data');
     }
   });
   ```
4. Validate any request body before calling the client (see `docs/SPEC.md` §3.3–3.4 for which fields are required per endpoint) and return 400 on invalid input.
5. If the route should be reachable without auth, add it to `isPublicPath()`.

## Code Conventions

- **Endpoint naming:** `/v1/{resource}/{action}`, REST-style.
- **Method naming:** verb-noun (`addGame()`, `recordPlay()`, `getWinStats()`).
- **Error handling:** wrap handler bodies in try/catch, log with `console.error('<context>:', error)`, respond via `errorResponse()`. Status codes in use: 400 (bad input), 401 (unauthenticated), 404 (not found), 201 (created), 200 (default success), 500 (default error).
- **Responses:** always via `jsonResponse()` / `errorResponse()` so CORS headers and the `{ success, data, error, status }` envelope stay consistent (contract defined in `docs/SPEC.md` §7).
- **Secrets:** never hardcode; read from `Env` (see `wrangler.jsonc` vars / Wrangler secrets / `.dev.vars`).

## Known Gap: CORS

The Worker currently sets `Access-Control-Allow-Origin: *` (see `router.options()` and `jsonResponse()` in `src/index.ts`). `docs/SPEC.md` §4 requires this be restricted to the deployed presentation-tier origin(s) — wildcard is not acceptable as a long-term posture. This has not yet been implemented; when it is, update both the OPTIONS preflight handler and `jsonResponse()`.

## Frontend

- `public/index.html` — SPA shell; `public/login.html` — login page; `public/favicon.svg` — served publicly (pretzel icon)
- `public/js/app.js` — Alpine stores: `games`, `plays`, `lastPlayed`, `stats`
- `public/js/api.js` — frontend fetch wrapper
- `public/css/styles.css` — styling

### Pages
- **Games** — status, ranking, complexity, play count, last played; search; multi-column sort; add game by BGG ID; edit notes.
- **Plays** — date, players, winner, scores, comments; search; multi-column sort; record/delete.
- **Last Played** — games sorted by time since last play, with total plays and days elapsed.
- **Statistics** — overall per-player totals (`/v1/stats/totals`) and per-game breakdown (`/v1/stats/winners`), 7 sortable columns. The frontend flattens/transforms both responses to the shapes above and computes win rates client-side. A play with winner `"Andrew & Trish"` (cooperative joint win) counts toward both players' win columns, so those columns can sum to more than total plays for games with joint wins — expected, not a bug.

## Key Configuration Files

| File | Role |
|---|---|
| `wrangler.jsonc` | Worker entry point, static asset binding (`run_worker_first: true` — Worker auth gate runs before assets are served), `EUROGAMES_API_URL` default, observability toggle |
| `tsconfig.json` | Strict TypeScript settings + Cloudflare Workers types |
| `package.json` | Runtime dep (`itty-router`) and dev tooling (`typescript`, `wrangler`, `@cloudflare/workers-types`) |
| `.env.example` | Template for `.dev.vars` (gitignored) — `EUROGAMES_API_URL`, `EUROGAMES_API_KEY`, `AUTH_PASSWORD`, `AUTH_SECRET` |
