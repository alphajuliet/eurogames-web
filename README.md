# Eurogames Web Application

A modern, reactive web application for managing board game collections and tracking plays, built with Alpine.js and Cloudflare Workers.

## Features

### Games Collection Management
- Display all games with detailed information (name, status, BGG ranking, complexity, play count)
- Real-time search and filtering
- Status-based filtering (Playing, Inbox, Evaluating, Owned, Wishlist)
- Sortable columns (name, status, ranking, complexity, times played, last played)
- Direct links to BoardGameGeek

### Play History Tracking
- View all game plays
- Search/filter plays by game name, winner, or comment
- Display play details: date, game, winner, scores, comments
- Record new plays directly from the UI
- Delete play records with confirmation

### Password Authentication
- Simple password-based authentication
- Secure session tokens with HMAC-SHA256 signing
- 30-day session duration
- Login page with redirect support

### Statistics
- Win statistics by game with player breakdown
- Overall player statistics with win rates
- Visual stats cards and tables

## Technology Stack

### Frontend
- **Alpine.js 3.14.3** - Lightweight reactive framework (15KB)
- **Vanilla JavaScript** with JSDoc type hints
- **CSS3** with CSS custom properties
- **Responsive Design** - Mobile-friendly layout

### Backend
- **Cloudflare Workers** - Serverless edge computing
- **TypeScript** - Strict type checking
- **itty-router** - Lightweight HTTP routing

## Project Structure

```
eurogames-web/
├── public/                    # Frontend assets
│   ├── index.html            # Main HTML with Alpine.js templates
│   ├── login.html            # Login page for authentication
│   ├── favicon.svg           # Pretzel favicon
│   ├── css/
│   │   └── styles.css        # Complete styling system
│   └── js/
│       ├── types.js          # JSDoc type definitions
│       ├── api.js            # API client wrapper
│       └── app.js            # Alpine.js stores & components
├── src/                      # Backend worker
│   ├── index.ts              # Worker entry point with API routes
│   ├── api.ts                # Typed API client for backend
│   └── types.ts              # TypeScript type definitions
├── wrangler.jsonc            # Cloudflare Workers configuration
└── package.json              # Dependencies and scripts
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file for local development:

```bash
cp .env.example .dev.vars
```

Edit `.dev.vars` with your credentials:

```
EUROGAMES_API_URL=https://eurogames.web-c10.workers.dev
EUROGAMES_API_KEY=your_bearer_token_here
AUTH_PASSWORD=your_site_password
AUTH_SECRET=your_hmac_secret_key
```

**Note:** `AUTH_PASSWORD` and `AUTH_SECRET` are optional. If not set, the site is publicly accessible.

### 3. Start Development Server

```bash
npm run dev
# or
npm start
```

The application will be available at `http://localhost:8787`

**Important:** Restart the dev server after creating or modifying `.dev.vars` to load environment variables.

## API Endpoints

All endpoints are prefixed with `/v1`. The worker acts as a proxy, transforming backend responses to match frontend expectations.

### Authentication

```
POST   /auth/login            # Authenticate with password (body: {password: string})
POST   /auth/logout           # Clear session cookie
```

### Games Management

```
GET    /v1/games              # List all games
GET    /v1/games/:id          # Get game details
POST   /v1/games              # Add new game from BGG (body: {bggId: number})
PATCH  /v1/games/:id/notes    # Update game notes (body: {notes: string})
PATCH  /v1/games/:id/data     # Update game BGG data (body: {data: object})
PUT    /v1/games/:id/sync     # Sync game data from BoardGameGeek
GET    /v1/games/:id/history  # Get game play history
```

### Play Records

```
GET    /v1/plays              # List plays (supports ?limit=N)
POST   /v1/plays              # Record new game result
GET    /v1/plays/:id          # Get specific play record
PUT    /v1/plays/:id          # Update play record
DELETE /v1/plays/:id          # Delete play record
```

### Statistics

```
GET    /v1/stats/winners      # Win statistics by game
GET    /v1/stats/totals       # Overall win totals by player
GET    /v1/stats/last-played  # Last played dates for all games
GET    /v1/stats/recent       # Recent game plays (supports ?limit=N)
GET    /v1/stats/players/:player  # Player-specific statistics
GET    /v1/stats/games        # Game collection statistics
```

### Utilities

```
GET    /v1/export             # Export all data as JSON
POST   /v1/query              # Execute custom SELECT query (body: {sql: string})
```

## Using the Application

### Authentication

1. **Login** - Enter the site password on the login page
2. **Sign Out** - Click "Sign Out" button in the header

### Games View

1. **Browse Games** - Automatically loads on page load
2. **Search** - Type in the search box to filter by name or status
3. **Filter by Status** - Use dropdown to filter by game status
4. **Sort** - Click column headers to sort (name, status, ranking, complexity, times played, last played)
5. **View on BGG** - Click "BGG →" link to open game on BoardGameGeek

### Plays View

1. **View History** - See all plays automatically
2. **Search** - Filter plays by game name, winner, or comment
3. **Add New Play** - Use the form to record a new game play (date, game, winner, scores, comments)
4. **Delete Plays** - Click 🗑️ button (with confirmation)

### Last Played View

1. **Browse** - See all games sorted by time since last played
2. **Sort** - Click column headers to sort (game name, times played, last played date, days since)

### Statistics View

1. **Load Stats** - Click "Load Statistics" button
2. **Win Stats** - View win counts by game and player
3. **Overall Stats** - See total wins, plays, and win rates per player
4. **Sort** - Click column headers to sort statistics tables

## Frontend Architecture

### Data Flow

```
User Action → Alpine Component → Frontend API Client → Worker Endpoint
                                                             ↓
                                                    Worker's ApiClient
                                                             ↓
                                                    Backend API Call
                                                             ↓
                                                    Response Transform
                                                             ↓
                                                    Frontend Receives
                                                             ↓
                                                    Alpine Store Updates
                                                             ↓
                                                    View Auto-Renders
```

### Alpine.js Stores

**App Store** - Global state (loading, errors, current view)
```javascript
$store.app.setView('games')
$store.app.setLoading(true, 'Loading...')
$store.app.setError('Error message')
```

**Games Store** - Game collection management
```javascript
$store.games.load()           // Load games from API
$store.games.filter = 'text'  // Set search filter
$store.games.statusFilter = 'Playing'
$store.games.filtered         // Get filtered/sorted games
```

**Plays Store** - Play history management
```javascript
$store.plays.load()           // Load plays from API
$store.plays.filter = 'text'  // Set search filter
$store.plays.delete(id)       // Delete a play
$store.plays.filtered         // Get filtered/sorted plays
```

**Stats Store** - Statistics management
```javascript
$store.stats.loadAll()        // Load all statistics
$store.stats.loadWinStats()   // Load win stats only
$store.stats.loadTotalStats() // Load player totals only
```

## Response Transformation

The worker transforms backend responses to match frontend expectations:

**Backend Response:**
```json
{
  "data": [
    { "id": 173346, "name": "7 Wonders Duel", ... }
  ],
  "limit": 100,
  "offset": 0
}
```

**Worker Transforms To:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "games": [
      { "id": 173346, "name": "7 Wonders Duel", ... }
    ],
    "total": 1
  }
}
```

## Type Safety

- **Backend**: Full TypeScript with strict checking
- **Frontend**: JSDoc comments for IDE autocomplete
- **Runtime**: No type checking (vanilla JavaScript)
- **Development**: VSCode provides autocomplete from JSDoc

## Configuration

### Environment Variables (Development)

Create `.dev.vars` for local development:

```
EUROGAMES_API_URL=https://eurogames.web-c10.workers.dev
EUROGAMES_API_KEY=your_bearer_token_here
AUTH_PASSWORD=your_site_password
AUTH_SECRET=your_hmac_secret_key
```

### Environment Variables (Production)

Set secrets via Wrangler CLI:

```bash
# Set API key
wrangler secret put EUROGAMES_API_KEY

# Set authentication secrets
wrangler secret put AUTH_PASSWORD
wrangler secret put AUTH_SECRET

# For specific environment
wrangler secret put EUROGAMES_API_KEY --env production
wrangler secret put AUTH_PASSWORD --env production
wrangler secret put AUTH_SECRET --env production
```

**Note:** If `AUTH_PASSWORD` and `AUTH_SECRET` are not set, authentication is disabled and the site is publicly accessible.

### Worker Configuration

`wrangler.jsonc` contains worker settings:

```jsonc
{
  "name": "eurogames-web",
  "main": "src/index.ts",
  "compatibility_date": "2025-11-01",
  "assets": {
    "directory": "./public"
  },
  "observability": {
    "enabled": true
  }
}
```

## Deployment

### Deploy to Production

```bash
npm run deploy
```

### Deploy to Specific Environment

```bash
npm run deploy -- --env production
```

### Set Production Secrets

```bash
wrangler secret put EUROGAMES_API_KEY --env production
```

## Performance

### Bundle Sizes
- Alpine.js CDN: ~15KB gzipped
- Application JS: ~20KB (types.js + api.js + app.js)
- CSS: ~8KB
- **Total Initial Load: ~43KB + HTML**

### API Performance
- Games List: ~196ms (includes backend call + transformation)
- Authentication: Bearer token cached in worker instance
- Caching: Client-side in Alpine stores (no server caching yet)

## Browser Compatibility

**Tested and Working:**
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**Requires:**
- ES6+ support
- Fetch API
- Promises
- Template literals

## CORS

The worker enables CORS for all origins and methods:
- Access-Control-Allow-Origin: `*`
- Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization

Modify `src/index.ts` router.options() handler to restrict if needed.

## Development Tips

### Testing API Endpoints Locally

```bash
# Start dev server
npm run dev

# In another terminal, test endpoints
curl http://localhost:8787/v1/games
curl http://localhost:8787/v1/plays?limit=50
curl http://localhost:8787/v1/stats/totals

# POST example
curl -X POST http://localhost:8787/v1/plays \
  -H "Content-Type: application/json" \
  -d '{"gameId":"1","date":"2025-11-03","players":["Alice"],"winner":"Alice"}'
```

### Type Checking Without Building

```bash
npx tsc --noEmit
```

### Viewing Console Logs

- **Local Development**: Check terminal running `npm run dev`
- **Production**: View logs in Cloudflare Dashboard

## Documentation

- [Alpine.js Documentation](https://alpinejs.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [itty-router Documentation](https://itty-router.dev/)

## Additional Documentation

- [CLAUDE.md](./CLAUDE.md) - Project instructions for AI assistance
- [AGENTS.md](./AGENTS.md) - Workflow and issue tracking with beads

## Known Limitations

1. **No Backend Pagination**: Currently loads all games/plays at once
2. **No Client Caching**: Every view switch refetches data
3. **Type Safety**: Frontend uses JSDoc (loose typing) vs backend's strict TypeScript
4. **Error Messages**: Generic HTTP error codes; backend doesn't return detailed error messages

## Troubleshooting

### Issue: Redirected to Login Page Unexpectedly
- **Check**: Session may have expired (30-day duration)
- **Fix**: Log in again with the site password
- **Note**: Clear cookies if you're seeing stale sessions

### Issue: 401 Errors in Console
- **Check**: `.dev.vars` file exists with correct API key
- **Check**: Dev server was restarted after creating `.dev.vars`
- **Check**: `AUTH_PASSWORD` and `AUTH_SECRET` are set if authentication is intended
- **Fix**: Restart with `npm run dev`

### Issue: Games/Plays Not Loading
- **Check**: Backend API is accessible
- **Check**: Network tab shows successful API calls
- **Check**: Console logs show "Loaded games:" or "Loaded plays:" messages
- **Debug**: Open console and run `api.getGames()` or `api.getPlays()` manually

### Issue: Alpine Directives Not Working
- **Check**: Alpine.js CDN loaded successfully (network tab)
- **Check**: Script order: types.js → api.js → app.js → Alpine.js
- **Fix**: Hard refresh browser cache (Cmd+Shift+R / Ctrl+Shift+F5)

## License

Private project
