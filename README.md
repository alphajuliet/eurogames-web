# Eurogames Worker

A Cloudflare Worker project in TypeScript that serves as a proxy for the Eurogames API, enabling a web frontend to communicate with the backend.

## Project Structure

```
src/
  ├── index.ts       # Main worker entry point with all API endpoints
  ├── api.ts         # Typed API client for Eurogames API
  └── types.ts       # TypeScript type definitions for API responses
public/              # Static assets served by the worker
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your backend API URL and any authentication credentials.

3. **Update wrangler.jsonc (for deployment):**
   - Add your Cloudflare account ID
   - Configure environment variables for production/staging

## Development

Start the local development server:

```bash
npm run dev
# or
npm start
```

The worker will be available at `http://localhost:8787`

## API Endpoints

All endpoints are prefixed with `/api`. The worker forwards requests to the backend Eurogames API.

### Games Management

```
GET    /api/games              # List all games
GET    /api/games/:id          # Get game details
POST   /api/games              # Add new game from BoardGameGeek (body: {bggId: number})
PATCH  /api/games/:id/notes    # Update game notes (body: {notes: string})
PATCH  /api/games/:id/data     # Update game BGG data (body: {data: object})
PUT    /api/games/:id/sync     # Sync game data from BoardGameGeek
GET    /api/games/:id/history  # Get game play history
```

### Play Records

```
GET    /api/plays              # List all plays
POST   /api/plays              # Record new game result
GET    /api/plays/:id          # Get specific play record
PUT    /api/plays/:id          # Update play record
DELETE /api/plays/:id          # Delete play record
```

### Statistics

```
GET    /api/stats/winners      # Win statistics by game
GET    /api/stats/totals       # Overall win totals by player
GET    /api/stats/last-played  # Last played dates for all games
GET    /api/stats/recent       # Recent game plays (supports ?limit=N)
GET    /api/stats/players/:player  # Player-specific statistics
GET    /api/stats/games        # Game collection statistics
```

### Utilities

```
GET    /api/export             # Export all data as JSON
POST   /api/query              # Execute custom SELECT query (body: {sql: string})
```

## Usage Examples

### Using the TypeScript API Client

```typescript
import { ApiClient } from './src/api';

const api = new ApiClient({
  baseUrl: 'https://eurogames.web-c10.workers.dev',
  apiKey: 'your-api-key', // optional
  bearerToken: 'your-token' // optional
});

// List all games
const gamesResult = await api.listGames();
if (gamesResult.success) {
  console.log(gamesResult.data.games);
}

// Get game details
const gameResult = await api.getGame('game-id');

// Record a new play
const playResult = await api.recordPlay({
  gameId: 'game-id',
  date: '2025-11-03',
  players: ['Alice', 'Bob', 'Charlie'],
  winner: 'Alice'
});

// Get player statistics
const statsResult = await api.getPlayerStats('Alice');

// Get recent plays (limit to 10)
const recentResult = await api.getRecentPlays(10);
```

### Using the Worker Endpoints from Frontend

```javascript
// Fetch games
const response = await fetch('/api/games');
const { success, data } = await response.json();

// Record a play
const result = await fetch('/api/plays', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameId: 'monopoly',
    date: '2025-11-03',
    players: ['Alice', 'Bob'],
    winner: 'Alice'
  })
});

// Get player stats
const stats = await fetch('/api/stats/players/Alice');
const playerData = await stats.json();
```

## Configuration

### Environment Variables

In `wrangler.jsonc`, configure environment variables:

```json
{
  "name": "eurogames-worker",
  "env": {
    "production": {
      "vars": {
        "EUROGAMES_API_URL": "https://eurogames.web-c10.workers.dev"
      }
    },
    "staging": {
      "vars": {
        "EUROGAMES_API_URL": "https://staging-eurogames.workers.dev"
      }
    }
  }
}
```

### Secrets

For sensitive data, use Wrangler secrets:

```bash
# Set API key
wrangler secret put EUROGAMES_API_KEY --env production

# Set bearer token
wrangler secret put BEARER_TOKEN --env production
```

## Type Definitions

All API response types are fully typed in `src/types.ts`:

- `Game` - Individual game with metadata
- `GameDetailsResponse` - Game with history
- `PlayRecord` - Individual play record
- `WinStatsResponse` - Win statistics by game
- `TotalStatsResponse` - Overall player statistics
- `PlayerStats` - Player-specific statistics
- And more...

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Deploy to a specific environment:

```bash
npm run deploy -- --env production
```

## Building for Production

Wrangler automatically builds and bundles your TypeScript code when deploying or running the dev server. The TypeScript is transpiled to JavaScript and bundled for the Workers environment.

## CORS

The worker enables CORS for all origins and methods (GET, POST, PUT, PATCH, DELETE, OPTIONS). This allows your frontend to make requests from any domain. Adjust the `Access-Control-Allow-Origin` header in `index.ts` if you need to restrict access.

## Learn More

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [itty-router Documentation](https://itty-router.dev/)
- [Cloudflare Workers Types](https://github.com/cloudflare/workers-types)

## License

Private project
