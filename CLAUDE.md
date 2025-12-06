# CLAUDE.md

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project:** Eurogames Web Worker
**Type:** Cloudflare Worker (serverless edge computing)
**Purpose:** Acts as an API gateway/proxy between a frontend application and the Eurogames backend API, providing typed REST endpoints for games management, play recording, and statistics retrieval.

## Architecture

The project follows a **layered proxy pattern**:

```
Frontend/Client
    ↓
Cloudflare Worker (src/index.ts)
    ├── Router (itty-router) + Request Handling
    ├── CORS Middleware
    └── 30+ REST Endpoints
         ↓
API Client (src/api.ts)
    └── Type-safe HTTP Communication
         ↓
Backend Eurogames API
    (https://eurogames.web-c10.workers.dev)
```

### Key Design Patterns

- **Stateless Proxy:** Worker acts as a transparent gateway with authentication management
- **Type Safety:** Full TypeScript with strict checking throughout
- **Modular Separation:** Clear boundaries between routing (index.ts), API communication (api.ts), and types (types.ts)
- **Layered Error Handling:** Try-catch blocks with consistent error response format
- **Environment Configuration:** Supports different configs per deployment stage via Wrangler

## Core Files

### `/src/index.ts` - Main Worker Entry Point
- **Responsibility:** HTTP routing and request/response handling
- **Contains:**
  - Route definitions organized into 4 sections: Games, Plays, Statistics, Utilities
  - Helper functions: `createApiClient()`, `parseRequestBody()`, `jsonResponse()`, `errorResponse()`
  - CORS middleware for OPTIONS requests
  - Main `fetch()` handler
- **Endpoints:** 30+ REST endpoints following `/v1/{resource}/{action}` pattern
- **Key Pattern:** Each endpoint follows: parse request → create API client → call method → return response

### `/src/api.ts` - Typed API Client
- **Responsibility:** HTTP communication with backend API
- **Contains:**
  - `ApiClient` class with 20+ high-level methods
  - HTTP method wrappers: `get()`, `post()`, `put()`, `delete()`, `patch()`
  - Core `request()` method handling fetch, timeouts, error wrapping
  - Authentication support: API keys or bearer tokens
- **Methods Organized By:** Games operations, Play operations, Statistics queries, Utilities
- **Response Pattern:** All methods return `ApiResponse<T>` wrapper with `{ success, data, error, status }`

### `/src/types.ts` - Type Definitions
- **Responsibility:** TypeScript interfaces for type safety
- **Contains:** Data models (Game, PlayRecord), response types (GamesListResponse, etc.), statistics types, utility types
- **Usage:** Imported by api.ts and index.ts for type safety

### `wrangler.jsonc` - Worker Configuration
- **Key Settings:**
  - `"main": "src/index.ts"` - Entry point
  - `"compatibility_date": "2025-11-01"` - API version compatibility
  - `"assets": { "directory": "./public" }` - Static file serving
  - `"observability": { "enabled": true }` - Monitoring
- **Environment Variables:** Can be configured per environment (dev/prod)

### `package.json` - Dependencies
- **Key Dependencies:** `itty-router` (lightweight HTTP routing)
- **Dev Dependencies:** `typescript`, `wrangler`, `@cloudflare/workers-types`
- **Scripts:** `dev` (local server), `deploy` (production), `start` (alias for dev)

### `.env.example` - Configuration Template
- **Variables:**
  - `EUROGAMES_API_URL` - Backend API address
  - `EUROGAMES_API_KEY` - Authorization Bearer token

### `.dev.vars` - Local Development Environment
- **Purpose:** Contains actual environment variables for local development
- **Usage:** Automatically loaded by `wrangler dev`
- **Note:** This file is gitignored and should contain your actual API credentials

## Common Development Tasks

### Start Local Development Server
```bash
# First time setup: Create .dev.vars file with your credentials
cp .env.example .dev.vars
# Edit .dev.vars and add your actual EUROGAMES_API_KEY

# Start the dev server
npm run dev
# Server runs on http://localhost:8787
# Wrangler watches for changes and rebuilds automatically
# Environment variables are loaded from .dev.vars
```

### Deploy to Production
```bash
npm run deploy
# Deploys to Cloudflare Workers
```

### Deploy to Specific Environment
```bash
npm run deploy -- --env production
```

### Type Check Without Building
```bash
npx tsc --noEmit
```

### Set Production Secrets
```bash
# Set API key for production
wrangler secret put EUROGAMES_API_KEY --env production

# Set bearer token
wrangler secret put BEARER_TOKEN --env production
```

## Adding New API Endpoints

1. **Add Type Definitions** (if needed)
   - Edit `src/types.ts` to define response structure
   - Example: `interface MyResponseType { ... }`

2. **Add API Client Method** (if calling backend)
   - Edit `src/api.ts` to add high-level method
   - Example: `async getMyData(): Promise<ApiResponse<MyType>> { ... }`

3. **Add Worker Route** in `src/index.ts`
   - Use appropriate HTTP method: `router.get()`, `router.post()`, etc.
   - Create API client: `const client = createApiClient(env);`
   - Call method: `const result = await client.getMyData();`
   - Return response: `return jsonResponse(result);`

4. **Pattern to Follow:**
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

## Endpoint Organization

Endpoints are grouped into 4 main sections (see comments in index.ts):

### Games (`/v1/games/*`)
- `GET /v1/games` - List all games
- `GET /v1/games/:id` - Get game details
- `POST /v1/games` - Add new game (body: `{bggId: number}`)
- `PATCH /v1/games/:id/notes` - Update notes (body: `{notes: string}`)
- `PATCH /v1/games/:id/data` - Update data (body: `{data: object}`)
- `PUT /v1/games/:id/sync` - Sync from BoardGameGeek
- `GET /v1/games/:id/history` - Get play history

### Plays (`/v1/plays/*`)
- CRUD operations for game play records
- Methods: `recordPlay()`, `getPlay()`, `updatePlay()`, `deletePlay()`, `listPlays()`

### Statistics (`/v1/stats/*`)
- Win statistics, player stats, recent plays, last played dates
- Methods: `getWinStats()`, `getTotalStats()`, `getPlayerStats()`, `getRecentPlays()`, etc.

### Utilities (`/v1/export`, `/v1/query`)
- Data export and custom SQL query execution
- Methods: `exportData()`, `query()`

## Error Handling Conventions

**Endpoint Error Handling:**
- Wrap in try-catch block
- Log errors with context: `console.error('Error doing X:', error)`
- Return consistent error response: `errorResponse('Failed to do X')`

**HTTP Status Codes:**
- 400 - Bad request (missing/invalid fields)
- 404 - Not found
- 201 - Created (for POST success)
- 200 - OK (default success)
- 500 - Server error (default error)

**Response Format:**
```typescript
// Success
{ success: true, data: {...}, error: undefined, status: 200 }

// Error
{ success: false, data: undefined, error: "error message", status: 500 }
```

## Authentication

The worker uses Bearer token authentication via the `EUROGAMES_API_KEY` environment variable:

- **Bearer Token:** Via `EUROGAMES_API_KEY` environment variable
  - Sent as `Authorization: Bearer {token}` header to backend

Authentication is automatically applied to all requests via `createApiClient(env)`.

## CORS Configuration

The worker enables CORS for all origins and methods:
- Access-Control-Allow-Origin: `*`
- Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization

Modify `src/index.ts` router.options() handler to restrict if needed.

## Environment Variables

**Development (.dev.vars):**
```
EUROGAMES_API_URL=https://eurogames.web-c10.workers.dev
EUROGAMES_API_KEY=your_bearer_token_here
```

**Production (via Wrangler Secrets):**
```bash
# Set the bearer token as a secret
wrangler secret put EUROGAMES_API_KEY

# For specific environment
wrangler secret put EUROGAMES_API_KEY --env production
```

Note:
- `.dev.vars` is used for local development with `wrangler dev`
- Production secrets are set via `wrangler secret put` command
- The `EUROGAMES_API_URL` can be configured in `wrangler.jsonc` under `vars` if different from default

## Frontend Integration

The frontend is a minimal HTML shell (`public/index.html`):
- Includes HTMX.org 2.0.8 for dynamic content loading
- No backend-dependent framework
- Static assets served by the Worker

To call API endpoints from frontend:
```javascript
// GET request
const response = await fetch('/v1/games');
const data = await response.json();

// POST request with data
const result = await fetch('/v1/plays', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: 'game-id',
    date: '2025-11-03',
    players: ['Alice', 'Bob'],
    winner: 'Alice'
  })
});
```

### Frontend Architecture

**Main Files:**
- `public/index.html` - Single-page app with Alpine.js for state management
- `public/js/app.js` - Alpine stores for Games, Plays, Last Played, and Statistics
- `public/js/api.js` - Frontend API client wrapper
- `public/css/styles.css` - Responsive styling

**State Management (Alpine.js Stores):**
- `games` - Game library management with filtering/sorting
- `plays` - Play record CRUD with filtering/sorting
- `lastPlayed` - Last played tracking with calculated elapsed days
- `stats` - Statistics data with sorting capabilities

### Frontend Pages

#### Games Page
- Lists all games with status, ranking, complexity, play count, and last played date
- Search filter by name or status
- Multi-column sorting (name, status, ranking, complexity, games, lastPlayed)
- Features: Add game via BGG ID, update notes

#### Plays Page
- Records of all game plays with date, players, winner, scores, comments
- Search filter by game name, winner, comment, or players
- Multi-column sorting (date, game name, players, winner)
- Features: Record new play, delete play record

#### Last Played Page
- Sorted list of games by time since last play
- Shows game name, last played date, total times played, days elapsed
- Multi-column sorting
- Helps identify which games haven't been played recently

#### Statistics Page
- **Overall Statistics Table:** Shows player totals (Player, Wins, Total Games, Win Rate)
  - Loads from `/v1/stats/totals` endpoint
  - Data structure: `{data: {totalGames, players: {Andrew, Trish, Draw}}}`

- **Game Statistics Table:** Detailed per-game statistics with 6 sortable columns:
  - Game Name (alphabetical sort)
  - Total Plays (numeric sort)
  - Andrew Wins (numeric sort)
  - Trish Wins (numeric sort)
  - Draws (numeric sort)
  - Andrew's Win Rate (percentage sort)

  Loads from `/v1/stats/winners` endpoint
  - Data structure: `{data: [{gameId, gameName, totalGames, andrew, trish, draw}, ...]}`
  - Transformed in frontend to calculate win rates
  - All columns are clickable to sort/reverse sort
  - Visual indicators (▲ ▼) show current sort column and direction

## Key Configuration Files and Their Relationships

1. **wrangler.jsonc** → Defines Worker configuration, entry point, assets
2. **tsconfig.json** → TypeScript compilation settings, Cloudflare Workers types
3. **package.json** → Dependencies (itty-router), dev tools (Wrangler, TypeScript)
4. **.env.example/.env.local** → Runtime configuration (API URL, credentials)
5. **src/index.ts** → Uses environment variables via `Env` interface
6. **public/** → Static assets served by the Worker

## Build and Deployment

**Development:**
- `npm install` - Install dependencies once
- `npm run dev` - Start local server with hot reload
- TypeScript errors block deployment (strict mode enabled)

**Production:**
- `npm run deploy` - Compiles TypeScript and deploys to Cloudflare Workers
- Wrangler handles bundling, minification, and deployment
- Code deployed to Cloudflare's global edge network

**Observability:**
- Console logs accessible via Cloudflare dashboard
- `"observability": { "enabled": true }` in wrangler.jsonc enables metrics

## Testing API Endpoints Locally

```bash
# Start dev server
npm run dev

# In another terminal, test endpoints
curl http://localhost:8787/v1/games
curl http://localhost:8787/v1/stats/totals
curl -X POST http://localhost:8787/v1/plays \
  -H "Content-Type: application/json" \
  -d '{"gameId":"1","date":"2025-11-03","players":["Alice"],"winner":"Alice"}'
```

## Best Practices When Modifying Code

1. **Type Safety First:** Always provide proper TypeScript types. Use generics like `ApiResponse<T>`.
2. **Error Handling:** Wrap async operations in try-catch, log errors, return consistent error responses.
3. **Naming Conventions:**
   - Endpoints: `/v1/{resource}/{action}` (REST style)
   - Methods: verb-noun format (`addGame()`, `recordPlay()`, `getWinStats()`)
4. **Request Validation:** Check for required fields before processing, return 400 for bad requests.
5. **Authentication:** Always respect EUROGAMES_API_KEY and BEARER_TOKEN from environment.
6. **No Secrets in Code:** Never commit API keys or tokens; use Wrangler secrets.
7. **CORS Headers:** Responses automatically include CORS headers via `jsonResponse()`.
8. **Response Consistency:** All responses should use `jsonResponse()` helper.

## Important Notes

- **Frontend Architecture:** Single-page app using Alpine.js (lightweight, no build step required). See Frontend Pages section for details on Games, Plays, Last Played, and Statistics views.
- **Data Transformation:** Frontend transforms API responses to match expected format:
  - `/v1/stats/winners` response flattened from `{data: []}` with individual player fields to normalized `wins: {andrew, trish, draw}` object
  - `/v1/stats/totals` response transformed from player counts to array format for table display
- **Minimal Dependencies:** Backend uses only itty-router (not Express). Frontend uses Alpine.js only. Keeps bundle size small.
- **Edge Computing:** Worker runs on Cloudflare's edge network globally, not on a central server.
- **Stateless:** Worker has no persistent state; each request is independent.
- **Version API:** All endpoints use `/v1/` prefix for API versioning.
- **Favicon:** SVG favicon of a pretzel is served at `/favicon.svg`.
