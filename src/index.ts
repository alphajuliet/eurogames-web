import { Router } from 'itty-router';
import { ApiClient } from './api';

export interface Env {
	EUROGAMES_API_URL?: string;
	EUROGAMES_API_KEY?: string;
}

// Helper to create API client with environment configuration
function createApiClient(env: Env): ApiClient {
	const apiUrl = env.EUROGAMES_API_URL || 'https://eurogames.web-c10.workers.dev';
	const options: Omit<any, 'baseUrl'> & { baseUrl: string } = { baseUrl: apiUrl };

	if (env.EUROGAMES_API_KEY) {
		options.bearerToken = env.EUROGAMES_API_KEY;
	}

	return new ApiClient(options);
}

// Helper to parse JSON body from request
async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		return {};
	}
}

// Helper to create JSON response
function jsonResponse<T>(data: T, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		},
	});
}

// Helper to create error response
function errorResponse(message: string, status = 500): Response {
	return jsonResponse({ error: message }, status);
}

// Create router
const router = Router();

// CORS preflight
router.options('*', () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
});

// ==================== GAMES ====================

/**
 * GET /v1/games - List all games with optional filtering
 * Query params: (optional filters)
 */
router.get('/v1/games', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);
		const result = await client.listGames();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching games:', error);
		return errorResponse('Failed to fetch games');
	}
});

/**
 * GET /v1/games/:id - Get game details
 */
router.get('/v1/games/:id', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.getGame(id);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching game:', error);
		return errorResponse('Failed to fetch game');
	}
});

/**
 * POST /v1/games - Add new game from BoardGameGeek
 * Body: { bggId: number }
 */
router.post('/v1/games', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);
		const bggId = body.bggId as number | undefined;

		if (!bggId || typeof bggId !== 'number') {
			return errorResponse('Invalid or missing bggId', 400);
		}

		const client = createApiClient(env);

		const result = await client.addGame(bggId);
		return jsonResponse(result, 201);
	} catch (error) {
		console.error('Error adding game:', error);
		return errorResponse('Failed to add game');
	}
});

/**
 * PATCH /v1/games/:id/notes - Update game notes
 * Body: { notes: string }
 */
router.patch('/v1/games/:id/notes', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);
		const notes = body.notes as string | undefined;

		if (!notes) {
			return errorResponse('Missing notes field', 400);
		}

		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.updateGameNotes(id, notes);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error updating game notes:', error);
		return errorResponse('Failed to update game notes');
	}
});

/**
 * PATCH /v1/games/:id/data - Update game BGG data
 * Body: { data: Record<string, unknown> }
 */
router.patch('/v1/games/:id/data', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);
		const data = body.data as Record<string, unknown> | undefined;

		if (!data) {
			return errorResponse('Missing data field', 400);
		}

		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.updateGameData(id, data);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error updating game data:', error);
		return errorResponse('Failed to update game data');
	}
});

/**
 * PUT /v1/games/:id/sync - Sync game data from BoardGameGeek
 */
router.put('/v1/games/:id/sync', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.syncGameData(id);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error syncing game:', error);
		return errorResponse('Failed to sync game');
	}
});

/**
 * GET /v1/games/:id/history - Get game play history
 */
router.get('/v1/games/:id/history', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.getGameHistory(id);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching game history:', error);
		return errorResponse('Failed to fetch game history');
	}
});

// ==================== PLAYS ====================

/**
 * GET /v1/plays - List game plays with optional filtering
 */
router.get('/v1/plays', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.listPlays();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching plays:', error);
		return errorResponse('Failed to fetch plays');
	}
});

/**
 * POST /v1/plays - Record new game result
 */
router.post('/v1/plays', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);

		const client = createApiClient(env);

		const result = await client.recordPlay(body as Parameters<typeof client.recordPlay>[0]);
		return jsonResponse(result, 201);
	} catch (error) {
		console.error('Error recording play:', error);
		return errorResponse('Failed to record play');
	}
});

/**
 * GET /v1/plays/:id - Get specific play record
 */
router.get('/v1/plays/:id', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.getPlay(id);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching play:', error);
		return errorResponse('Failed to fetch play');
	}
});

/**
 * PUT /v1/plays/:id - Update play record
 */
router.put('/v1/plays/:id', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);

		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.updatePlay(id, body as Parameters<typeof client.updatePlay>[1]);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error updating play:', error);
		return errorResponse('Failed to update play');
	}
});

/**
 * DELETE /v1/plays/:id - Delete play record
 */
router.delete('/v1/plays/:id', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { id } = request.params as { id: string };
		const result = await client.deletePlay(id);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error deleting play:', error);
		return errorResponse('Failed to delete play');
	}
});

// ==================== STATISTICS ====================

/**
 * GET /v1/stats/winners - Win statistics by game
 */
router.get('/v1/stats/winners', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.getWinStats();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching win stats:', error);
		return errorResponse('Failed to fetch win stats');
	}
});

/**
 * GET /v1/stats/totals - Overall win totals
 */
router.get('/v1/stats/totals', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.getTotalStats();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching total stats:', error);
		return errorResponse('Failed to fetch total stats');
	}
});

/**
 * GET /v1/stats/last-played - Last played dates
 */
router.get('/v1/stats/last-played', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.getLastPlayed();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching last played:', error);
		return errorResponse('Failed to fetch last played');
	}
});

/**
 * GET /v1/stats/recent - Recent game plays
 * Query param: limit (optional)
 */
router.get('/v1/stats/recent', async (request, env: Env) => {
	try {
		const url = new URL(request.url);
		const limit = url.searchParams.get('limit');

		const client = createApiClient(env);

		const result = await client.getRecentPlays(limit ? parseInt(limit, 10) : undefined);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching recent plays:', error);
		return errorResponse('Failed to fetch recent plays');
	}
});

/**
 * GET /v1/stats/players/:player - Player-specific statistics
 */
router.get('/v1/stats/players/:player', async (request, env: Env) => {
	try {
		const client = createApiClient(env);

		const { player } = request.params as { player: string };
		const result = await client.getPlayerStats(player);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching player stats:', error);
		return errorResponse('Failed to fetch player stats');
	}
});

/**
 * GET /v1/stats/games - Game collection statistics
 */
router.get('/v1/stats/games', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.getGameStats();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error fetching game stats:', error);
		return errorResponse('Failed to fetch game stats');
	}
});

// ==================== UTILITIES ====================

/**
 * GET /v1/export - Export all data as JSON
 */
router.get('/v1/export', async (_request, env: Env) => {
	try {
		const client = createApiClient(env);

		const result = await client.exportData();
		return jsonResponse(result);
	} catch (error) {
		console.error('Error exporting data:', error);
		return errorResponse('Failed to export data');
	}
});

/**
 * POST /v1/query - Execute custom SELECT query
 * Body: { sql: string }
 */
router.post('/v1/query', async (request, env: Env) => {
	try {
		const body = await parseRequestBody(request);
		const sql = body.sql as string | undefined;

		if (!sql) {
			return errorResponse('Missing sql field', 400);
		}

		const client = createApiClient(env);

		const result = await client.query(sql);
		return jsonResponse(result);
	} catch (error) {
		console.error('Error executing query:', error);
		return errorResponse('Failed to execute query');
	}
});

/**
 * Catch-all handler
 */
router.all('*', () => {
	return errorResponse('Not Found', 404);
});

/**
 * Fetch handler - serves static assets and routes API requests
 */
export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		try {
			const response = await router.handle(request, env);
			return response || errorResponse('Not Found', 404);
		} catch (error) {
			console.error('Worker error:', error);
			return errorResponse('Internal Server Error');
		}
	},
} satisfies ExportedHandler<Env>;
